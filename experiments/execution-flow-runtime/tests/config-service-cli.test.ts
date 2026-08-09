import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PATH = path.join(PACKAGE_ROOT, "cli.ts");

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return port;
}

function runCli(runtimeHome: string, args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, EXECUTION_FLOW_RUNTIME_HOME: runtimeHome },
    encoding: "utf8",
    timeout: 20_000,
  });
}

function json(result: ReturnType<typeof runCli>) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout) as any;
}

test("CLI persists MLXHub role mapping and normal execution goes through the single managed service", async () => {
  const runtimeHome = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-config-home-"));
  const port = await freePort();
  await fs.writeFile(
    path.join(runtimeHome, "config.json"),
    JSON.stringify({
      host: "127.0.0.1",
      port,
      workspace_root: PACKAGE_ROOT,
      max_node_runs: 16,
    }, null, 2) + "\n"
  );

  const configured = json(runCli(runtimeHome, [
    "config", "mlxhub", "set",
    "--base-url", "http://192.168.0.104:8080/",
    "--fast-model", "fast-model",
    "--reason-model", "reason-model",
    "--json",
  ]));
  assert.equal(configured.action, "mlxhub-config-updated");
  assert.equal(configured.config.inference.mlxhub.base_url, "http://192.168.0.104:8080");
  assert.equal(configured.config.inference.mlxhub.roles.fast.model, "fast-model");
  assert.equal(configured.config.inference.mlxhub.roles.fast.max_tokens, 1024);
  assert.equal(configured.config.inference.mlxhub.roles.reason.model, "reason-model");
  assert.equal("max_tokens" in configured.config.inference.mlxhub.roles.reason, false);

  let started = false;
  try {
    const start = json(runCli(runtimeHome, ["start", "--json"]));
    assert.equal(start.status, "started");
    started = true;

    const providers = json(runCli(runtimeHome, ["providers", "--json"]));
    assert.deepEqual(providers.inference_backends, ["mlxhub"]);

    const runPath = path.join(runtimeHome, "deterministic-run.json");
    await fs.writeFile(runPath, JSON.stringify({
      contract: "execution.run.v0",
      execution_id: "managed-cli-run",
      flow: {
        contract: "execution.flow.v0",
        flow_id: "managed-cli-flow",
        version: 1,
        entry_node: "done",
        nodes: [{ id: "done", type: "return", output: { ok: true } }],
      },
      inputs: {},
      authorization: { allowed_capabilities: [] },
    }, null, 2));

    const result = json(runCli(runtimeHome, ["run", "--file", runPath, "--json"]));
    assert.equal(result.status, "completed");
    assert.deepEqual(result.output, { ok: true });
  } finally {
    if (started) runCli(runtimeHome, ["stop", "--json"]);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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
    env: {
      ...process.env,
      EXECUTION_FLOW_RUNTIME_HOME: runtimeHome,
    },
    encoding: "utf8",
    timeout: 12_000,
  });
}

async function prepareRuntimeHome(runtimeHome: string, port: number): Promise<void> {
  await fs.mkdir(runtimeHome, { recursive: true });
  await fs.writeFile(
    path.join(runtimeHome, "config.json"),
    JSON.stringify(
      {
        host: "127.0.0.1",
        port,
        workspace_root: PACKAGE_ROOT,
        max_node_runs: 16,
      },
      null,
      2
    ) + "\n"
  );
}

test("managed CLI start is singleton/idempotent per runtime home", async () => {
  const runtimeHome = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-runtime-home-"));
  await prepareRuntimeHome(runtimeHome, await freePort());

  try {
    const first = runCli(runtimeHome, ["start", "--json"]);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstBody = JSON.parse(first.stdout) as {
      status: string;
      state: { pid: number; instance_id: string };
    };
    assert.equal(firstBody.status, "started");

    const second = runCli(runtimeHome, ["start", "--json"]);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const secondBody = JSON.parse(second.stdout) as {
      status: string;
      state: { pid: number; instance_id: string };
    };
    assert.equal(secondBody.status, "already-running");
    assert.equal(secondBody.state.pid, firstBody.state.pid);
    assert.equal(secondBody.state.instance_id, firstBody.state.instance_id);
  } finally {
    runCli(runtimeHome, ["stop", "--force", "--json"]);
  }
});

test("stop --force never kills an unverified PID", async () => {
  const runtimeHome = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-stop-home-"));
  const port = await freePort();
  await prepareRuntimeHome(runtimeHome, port);

  const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
  });
  assert.ok(unrelated.pid);

  try {
    await fs.writeFile(
      path.join(runtimeHome, "runtime.json"),
      JSON.stringify(
        {
          instance_id: "not-the-unrelated-process",
          pid: unrelated.pid,
          host: "127.0.0.1",
          port,
          started_at: new Date().toISOString(),
        },
        null,
        2
      ) + "\n"
    );

    const stopped = runCli(runtimeHome, ["stop", "--force", "--json"]);
    assert.equal(stopped.status, 0, stopped.stderr || stopped.stdout);
    const body = JSON.parse(stopped.stdout) as {
      status: string;
      killed: boolean;
    };
    assert.equal(body.status, "stale-state-removed-unverified-process-left-running");
    assert.equal(body.killed, false);
    assert.doesNotThrow(() => process.kill(unrelated.pid!, 0));
  } finally {
    unrelated.kill("SIGKILL");
  }
});

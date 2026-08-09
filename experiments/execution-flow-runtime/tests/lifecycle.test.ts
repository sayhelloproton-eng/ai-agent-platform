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
    timeout: 15_000,
  });
}

function parseJson(result: ReturnType<typeof runCli>) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout) as Record<string, any>;
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

test("managed service lifecycle is singleton, restartable, and cleanly stoppable", async () => {
  const runtimeHome = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-runtime-home-"));
  await prepareRuntimeHome(runtimeHome, await freePort());

  let currentPid: number | undefined;
  try {
    const first = parseJson(runCli(runtimeHome, ["start", "--json"]));
    assert.equal(first.status, "started");
    assert.equal(typeof first.state.pid, "number");
    assert.equal(typeof first.state.instance_id, "string");
    assert.ok(first.state.instance_id);
    currentPid = first.state.pid;
    const firstPid = first.state.pid as number;
    const firstInstance = first.state.instance_id as string;
    assert.equal(pidAlive(firstPid), true);

    const status = parseJson(runCli(runtimeHome, ["status", "--json"]));
    assert.equal(status.status, "running");
    assert.equal(status.pid_alive, true);
    assert.equal(status.identity_match, true);
    assert.equal(status.state.pid, firstPid);
    assert.equal(status.state.instance_id, firstInstance);

    const second = parseJson(runCli(runtimeHome, ["start", "--json"]));
    assert.equal(second.status, "already-running");
    assert.equal(second.state.pid, firstPid);
    assert.equal(second.state.instance_id, firstInstance);

    const restartRaw = runCli(runtimeHome, ["restart", "--json"]);
    const restart = parseJson(restartRaw);
    assert.equal(restart.status, "restarted");
    assert.equal(restart.previous.status, "stopped");
    assert.equal(restart.previous.pid, firstPid);
    assert.equal(restart.current.status, "started");
    assert.equal(typeof restart.current.state.pid, "number");
    assert.equal(typeof restart.current.state.instance_id, "string");
    assert.notEqual(restart.current.state.instance_id, firstInstance);
    assert.notEqual(restart.current.state.pid, firstPid);
    currentPid = restart.current.state.pid;
    assert.equal(pidAlive(firstPid), false);
    assert.equal(pidAlive(currentPid!), true);

    const restartedStatus = parseJson(runCli(runtimeHome, ["status", "--json"]));
    assert.equal(restartedStatus.status, "running");
    assert.equal(restartedStatus.state.pid, currentPid);
    assert.equal(
      restartedStatus.state.instance_id,
      restart.current.state.instance_id
    );

    const stopped = parseJson(runCli(runtimeHome, ["stop", "--json"]));
    assert.equal(stopped.status, "stopped");
    assert.equal(stopped.pid, currentPid);
    assert.equal(pidAlive(currentPid!), false);
    currentPid = undefined;

    const finalStatus = parseJson(runCli(runtimeHome, ["status", "--json"]));
    assert.equal(finalStatus.status, "stopped");
  } finally {
    if (currentPid && pidAlive(currentPid)) {
      runCli(runtimeHome, ["stop", "--force", "--json"]);
    }
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

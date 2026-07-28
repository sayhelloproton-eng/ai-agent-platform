import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

import {
  resolveActionGatewayConfiguration,
} from "../apps/action-gateway/dist/server.js";
import {
  resolveLocalRuntimeConfiguration,
} from "../apps/local-runtime/dist/server.js";

const EXTERNAL_KEY = "stack-external-key-0123456789abcdef";
const INTERNAL_KEY = "stack-internal-key-0123456789abcdef";
const WRONG_INTERNAL_KEY = "stack-wrong-internal-0123456789abcd";
const CONFIGURATION_KEYS = [
  "ACTION_GATEWAY_API_KEY",
  "ACTION_GATEWAY_RUNTIME_API_KEY",
  "LOCAL_RUNTIME_API_KEY",
  "ACTION_GATEWAY_HOST",
  "ACTION_GATEWAY_PORT",
  "ACTION_GATEWAY_RUNTIME_URL",
  "ACTION_GATEWAY_RUNTIME_TIMEOUT_MS",
  "ACTION_GATEWAY_MAX_CONCURRENT_TASKS",
  "LOCAL_RUNTIME_HOST",
  "LOCAL_RUNTIME_PORT",
  "LOCAL_RUNTIME_MAX_CONCURRENT_TASKS",
];

function cleanEnvironment(overrides = {}) {
  const environment = { ...process.env };
  for (const key of CONFIGURATION_KEYS) {
    delete environment[key];
  }
  return { ...environment, ...overrides };
}

function spawnStack(environment) {
  const child = spawn(process.execPath, ["scripts/local-stack.mjs"], {
    cwd: process.cwd(),
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const state = { output: "" };
  child.stdout.on("data", (chunk) => {
    state.output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    state.output += chunk.toString();
  });
  return { child, state };
}

function waitForExit(child, timeoutMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({
      code: child.exitCode,
      signal: child.signalCode,
    });
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Local stack did not exit in time."));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

async function waitForOutput(child, state, pattern, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pattern.test(state.output)) {
      return;
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Local stack exited early: ${state.output}`);
    }
    await delay(25);
  }
  throw new Error(`Local stack output was not observed: ${pattern}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function assertPortCanBind(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
}

function assertProcessExited(pid) {
  assert.throws(
    () => process.kill(pid, 0),
    (error) => error?.code === "ESRCH",
  );
}

async function assertConfigurationFailure(overrides) {
  const { child, state } = spawnStack(cleanEnvironment(overrides));
  const result = await waitForExit(child);
  assert.notEqual(result.code, 0);
  for (const key of [EXTERNAL_KEY, INTERNAL_KEY, WRONG_INTERNAL_KEY]) {
    assert.equal(state.output.includes(key), false);
  }
}

test("Local Stack rejects mismatched internal API keys safely", async () => {
  await assertConfigurationFailure({
    ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
    ACTION_GATEWAY_RUNTIME_API_KEY: WRONG_INTERNAL_KEY,
    LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
  });
});

test("Local Stack rejects a missing external API key", async () => {
  await assertConfigurationFailure({
    ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
    LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
  });
});

test("Local Stack rejects a missing internal API key", async () => {
  await assertConfigurationFailure({
    ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
    ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
  });
});

test("Local Stack uses default Gateway and Runtime concurrency limits", () => {
  const gateway = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
    ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
  });
  const runtime = resolveLocalRuntimeConfiguration({
    LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
  });

  assert.equal(gateway.maxConcurrentTasks, 2);
  assert.equal(runtime.maxConcurrentTasks, 1);
});

test("Local Stack starts in order, serves a task, and shuts down cleanly", async () => {
  const runtimePort = await getFreePort();
  const gatewayPort = await getFreePort();
  const { child, state } = spawnStack(
    cleanEnvironment({
      ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
      ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
      ACTION_GATEWAY_HOST: "127.0.0.1",
      ACTION_GATEWAY_PORT: String(gatewayPort),
      LOCAL_RUNTIME_HOST: "127.0.0.1",
      LOCAL_RUNTIME_PORT: String(runtimePort),
    }),
  );

  try {
    await waitForOutput(child, state, /Local stack ready:/);
    assert.notEqual(EXTERNAL_KEY, INTERNAL_KEY);
    assert.ok(
      state.output.indexOf("Local Runtime ready") <
        state.output.indexOf("Action Gateway ready"),
    );

    const response = await fetch(
      `http://127.0.0.1:${gatewayPort}/v1/tasks`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${EXTERNAL_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contractVersion: "1.0",
          taskId: "local-stack-runtime-status",
          capability: "runtime.status",
          input: {},
          requestedBy: {
            type: "custom-gpt",
            subject: "local-stack-test",
          },
          metadata: {
            requestedAt: new Date().toISOString(),
          },
        }),
      },
    );
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.status, "succeeded");
    assert.equal(result.output.runtime, "local-runtime");

    const runtimePid = Number(
      /Local Runtime started pid=(\d+)/.exec(state.output)?.[1],
    );
    const gatewayPid = Number(
      /Action Gateway started pid=(\d+)/.exec(state.output)?.[1],
    );
    assert.equal(Number.isInteger(runtimePid), true);
    assert.equal(Number.isInteger(gatewayPid), true);

    child.kill("SIGTERM");
    const exit = await waitForExit(child);
    assert.equal(exit.code, 0);
    assert.match(state.output, /Local stack shutdown complete/);
    for (const key of [EXTERNAL_KEY, INTERNAL_KEY]) {
      assert.equal(state.output.includes(key), false);
    }

    await assertPortCanBind(runtimePort);
    await assertPortCanBind(gatewayPort);
    assertProcessExited(runtimePid);
    assertProcessExited(gatewayPid);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await waitForExit(child);
    }
  }
});

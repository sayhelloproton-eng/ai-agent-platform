import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { createCapabilityPolicy } from "@ai-agent-platform/policy";
import { createGatewayServer } from "../apps/action-gateway/dist/app.js";
import {
  createHttpRuntimeClient,
} from "../apps/action-gateway/dist/runtime-client.js";
import {
  createRuntimeServer,
} from "../apps/local-runtime/dist/app.js";

const EXTERNAL_API_KEY =
  "local-chain-external-key-0123456789abcdef";
const INTERNAL_API_KEY =
  "local-chain-internal-key-0123456789abcdef";
const WRONG_INTERNAL_API_KEY =
  "local-chain-wrong-key-0123456789abcdef";

function createTask(overrides = {}) {
  return {
    contractVersion: "1.0",
    taskId: `local-chain-${randomUUID()}`,
    capability: "gateway.ping",
    input: {},
    requestedBy: {
      type: "custom-gpt",
      subject: "local-chain-test",
    },
    metadata: {
      requestedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function withLocalChain(run, options = {}) {
  const runtimeServer = createRuntimeServer({
    apiKey: INTERNAL_API_KEY,
    ...(options.runtimePolicy === undefined
      ? {}
      : { policy: options.runtimePolicy }),
  });
  await listen(runtimeServer);

  const runtimeAddress = runtimeServer.address();
  assert.ok(runtimeAddress && typeof runtimeAddress === "object");

  const runtimeClient = createHttpRuntimeClient({
    baseUrl: `http://127.0.0.1:${runtimeAddress.port}`,
    apiKey: options.runtimeClientApiKey ?? INTERNAL_API_KEY,
    timeoutMs: 1_000,
  });
  const gatewayServer = createGatewayServer({
    apiKey: EXTERNAL_API_KEY,
    runtimeClient,
    ...(options.gatewayPolicy === undefined
      ? {}
      : { policy: options.gatewayPolicy }),
  });
  await listen(gatewayServer);

  const gatewayAddress = gatewayServer.address();
  assert.ok(gatewayAddress && typeof gatewayAddress === "object");

  try {
    await run(`http://127.0.0.1:${gatewayAddress.port}`);
  } finally {
    await close(gatewayServer);
    await close(runtimeServer);
  }
}

async function submitTask(baseUrl, task) {
  return fetch(`${baseUrl}/v1/tasks`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${EXTERNAL_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(task),
  });
}

test("gateway.ping completes through Gateway and Local Runtime", async () => {
  await withLocalChain(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "succeeded");
    assert.deepEqual(result.output, {
      capability: "gateway.ping",
      status: "ok",
      runtime: "local-runtime",
    });
    assert.equal(result.metadata.executor, "local-runtime");
  });
});

test("runtime.status completes through the real local chain", async () => {
  await withLocalChain(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "runtime.status" }),
    );
    const result = await response.json();

    assert.equal(result.status, "succeeded");
    assert.equal(result.output.runtime, "local-runtime");
    assert.equal(result.output.status, "ready");
  });
});

test("different external and internal API keys authenticate both hops", async () => {
  assert.notEqual(EXTERNAL_API_KEY, INTERNAL_API_KEY);

  await withLocalChain(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const bodyText = await response.text();

    assert.equal(response.status, 200);
    assert.equal(bodyText.includes(EXTERNAL_API_KEY), false);
    assert.equal(bodyText.includes(INTERNAL_API_KEY), false);
  });
});

test("Gateway Policy rejects system.info.safe before Runtime execution", async () => {
  const gatewayPolicy = createCapabilityPolicy([
    "gateway.ping",
    "runtime.status",
  ]);
  const runtimePolicy = createCapabilityPolicy([
    "gateway.ping",
    "runtime.status",
    "system.info.safe",
  ]);

  await withLocalChain(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "rejected");
    assert.equal(result.error.code, "FORBIDDEN");
    assert.equal(result.metadata.executor, "action-gateway");
  }, { gatewayPolicy, runtimePolicy });
});

test("wrong internal API key maps Runtime 401 to safe Gateway 502", async () => {
  await withLocalChain(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const bodyText = await response.text();
    const body = JSON.parse(bodyText);

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "RUNTIME_UNAVAILABLE");
    assert.equal(body.error.message, "Local Runtime is unavailable.");
    assert.equal(bodyText.includes(WRONG_INTERNAL_API_KEY), false);
    assert.equal(bodyText.includes(INTERNAL_API_KEY), false);
  }, { runtimeClientApiKey: WRONG_INTERNAL_API_KEY });
});

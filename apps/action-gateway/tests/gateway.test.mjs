import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { test } from "node:test";

import { validateTaskResult } from "@ai-agent-platform/contracts";
import { createCapabilityPolicy } from "@ai-agent-platform/policy";
import { createGatewayServer } from "../dist/app.js";
import { createHttpRuntimeClient } from "../dist/runtime-client.js";

const API_KEY = "test-api-key-0123456789abcdef-xyz";
const WRONG_API_KEY = "wrong-api-key-0123456789abcdef-xyz";

function createTask(overrides = {}) {
  return {
    contractVersion: "1.0",
    taskId: `gateway-task-${randomUUID()}`,
    capability: "gateway.ping",
    input: {},
    requestedBy: {
      type: "custom-gpt",
      subject: "gateway-tests",
    },
    metadata: {
      requestedAt: new Date().toISOString(),
      requestId: "untrusted-client-request-id",
    },
    ...overrides,
  };
}

function createSucceededResult(task) {
  const timestamp = new Date().toISOString();
  return {
    contractVersion: "1.0",
    taskId: task.taskId,
    status: "succeeded",
    output: {
      capability: task.capability,
      source: "fake-runtime",
    },
    error: null,
    evidence: [],
    metadata: {
      startedAt: timestamp,
      completedAt: timestamp,
      durationMs: 0,
      executor: "fake-runtime",
    },
  };
}

function createFakeRuntimeClient(options = {}) {
  const calls = [];
  return {
    calls,
    async executeTask(task, requestId) {
      calls.push({ task, requestId });
      if (options.reason !== undefined) {
        return { ok: false, reason: options.reason };
      }

      return {
        ok: true,
        result: options.result ?? createSucceededResult(task),
      };
    },
  };
}

async function submitTask(baseUrl, task, options = {}) {
  return fetch(`${baseUrl}/v1/tasks`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body ?? JSON.stringify(task),
  });
}

async function sendDeclaredOversizedTask(port) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/v1/tasks",
        method: "POST",
        headers: {
          authorization: `Bearer ${API_KEY}`,
          "content-type": "application/json",
          "content-length": "65537",
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          });
        });
      },
    );

    request.once("error", reject);
    request.end();
  });
}

async function sendChunkedOversizedTask(port) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/v1/tasks",
        method: "POST",
        headers: {
          authorization: `Bearer ${API_KEY}`,
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          });
        });
      },
    );

    request.once("error", reject);
    request.write("x".repeat(40_000));
    request.write("x".repeat(30_000));
    request.end();
  });
}

async function withHttpEndpoint(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function withGateway(run, options = {}) {
  const server = createGatewayServer({ apiKey: API_KEY, ...options });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    await run(`http://127.0.0.1:${address.port}`, address.port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

test("GET /health returns the success envelope", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.service, "action-gateway");
    assert.equal(body.data.status, "ok");
    assert.equal(new Date(body.data.timestamp).toISOString(), body.data.timestamp);
  });
});

test("GET /ready exposes the Contracts version", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.contractVersion, "1.0");
  });
});

test("GET /ready exposes the Contracts capability allowlist", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.deepEqual(body.data.capabilities, [
      "gateway.ping",
      "runtime.status",
    ]);
    assert.equal(new Date(body.data.timestamp).toISOString(), body.data.timestamp);
  });
});

test("a valid x-request-id is preserved", async () => {
  await withGateway(async (baseUrl) => {
    const requestId = "client_Request-1.0:health";
    const response = await fetch(`${baseUrl}/health`, {
      headers: { "x-request-id": requestId },
    });
    const body = await response.json();

    assert.equal(body.requestId, requestId);
  });
});

test("an invalid x-request-id is replaced", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { "x-request-id": "invalid request id" },
    });
    const body = await response.json();

    assert.notEqual(body.requestId, "invalid request id");
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  });
});

test("the response header and body use the same requestId", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.headers.get("x-request-id"), body.requestId);
  });
});

test("an unknown route returns a safe 404", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/unknown`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body.error, {
      code: "NOT_FOUND",
      message: "Route not found.",
    });
  });
});

test("POST /health returns 405 without reading a body", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      method: "POST",
      body: "ignored",
    });
    const body = await response.json();

    assert.equal(response.status, 405);
    assert.deepEqual(body.error, {
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    });
  });
});

test("405 responses include Allow: GET", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`, { method: "DELETE" });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
  });
});

test("all route responses use JSON headers and disable caching", async () => {
  await withGateway(async (baseUrl) => {
    for (const path of ["/health", "/ready", "/missing"]) {
      const response = await fetch(`${baseUrl}${path}`);

      assert.equal(
        response.headers.get("content-type"),
        "application/json; charset=utf-8",
      );
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  });
});

test("error responses do not expose stack details", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`);
    const bodyText = await response.text();

    assert.equal(bodyText.includes("stack"), false);
    assert.equal(bodyText.includes("/Users/"), false);
  });
});

test("requests without a valid incoming id receive independent ids", async () => {
  await withGateway(async (baseUrl) => {
    const first = await fetch(`${baseUrl}/health`).then((response) =>
      response.json(),
    );
    const second = await fetch(`${baseUrl}/health`).then((response) =>
      response.json(),
    );

    assert.notEqual(first.requestId, second.requestId);
  });
});

test("a 128-character request id is accepted", async () => {
  await withGateway(async (baseUrl) => {
    const requestId = "a".repeat(128);
    const response = await fetch(`${baseUrl}/ready`, {
      headers: { "x-request-id": requestId },
    });
    const body = await response.json();

    assert.equal(body.requestId, requestId);
    assert.equal(response.headers.get("x-request-id"), requestId);
  });
});

test("GET /v1/capabilities requires authentication", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body.error, {
      code: "UNAUTHENTICATED",
      message: "Authentication required.",
    });
  });
});

test("GET /v1/capabilities rejects an incorrect token", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Bearer ${WRONG_API_KEY}` },
    });

    assert.equal(response.status, 401);
  });
});

test("GET /v1/capabilities rejects a malformed header", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Basic ${API_KEY}` },
    });

    assert.equal(response.status, 401);
  });
});

test("401 responses advertise Bearer authentication", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`);

    assert.equal(response.headers.get("www-authenticate"), "Bearer");
  });
});

test("401 responses do not expose the presented token", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Bearer ${WRONG_API_KEY}` },
    });
    const bodyText = await response.text();

    assert.equal(bodyText.includes(WRONG_API_KEY), false);
    assert.equal(bodyText.includes(API_KEY), false);
  });
});

test("a correct token accesses GET /v1/capabilities", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
  });
});

test("the protected route exposes the Contracts version", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    const body = await response.json();

    assert.equal(body.data.contractVersion, "1.0");
  });
});

test("the protected route exposes the Capability allowlist", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    const body = await response.json();

    assert.deepEqual(body.data.capabilities, [
      "gateway.ping",
      "runtime.status",
    ]);
  });
});

test("an authenticated POST to the protected route returns 405", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      method: "POST",
      headers: { authorization: `Bearer ${API_KEY}` },
    });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
  });
});

test("an unauthenticated POST does not disclose method handling", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      method: "POST",
    });

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("allow"), null);
  });
});

test("a 401 response preserves a valid request id", async () => {
  await withGateway(async (baseUrl) => {
    const requestId = "auth_request-401";
    const response = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { "x-request-id": requestId },
    });
    const body = await response.json();

    assert.equal(body.requestId, requestId);
    assert.equal(response.headers.get("x-request-id"), requestId);
  });
});

test("the default Policy includes runtime.status", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.equal(body.data.capabilities.includes("runtime.status"), true);
  });
});

test("the default Policy excludes system.info.safe", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.equal(body.data.capabilities.includes("system.info.safe"), false);
  });
});

test("a custom Policy can allow system.info.safe", async () => {
  const policy = createCapabilityPolicy(["system.info.safe"]);

  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.deepEqual(body.data.capabilities, ["system.info.safe"]);
  }, { policy });
});

test("/ready and /v1/capabilities use the same Policy", async () => {
  const policy = createCapabilityPolicy([
    "gateway.ping",
    "system.info.safe",
  ]);

  await withGateway(async (baseUrl) => {
    const readyResponse = await fetch(`${baseUrl}/ready`);
    const readyBody = await readyResponse.json();
    const capabilitiesResponse = await fetch(
      `${baseUrl}/v1/capabilities`,
      { headers: { authorization: `Bearer ${API_KEY}` } },
    );
    const capabilitiesBody = await capabilitiesResponse.json();

    assert.deepEqual(
      readyBody.data.capabilities,
      capabilitiesBody.data.capabilities,
    );
  }, { policy });
});

test("a custom Policy does not bypass protected-route authentication", async () => {
  const policy = createCapabilityPolicy([
    "gateway.ping",
    "runtime.status",
    "system.info.safe",
  ]);

  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/capabilities`);

    assert.equal(response.status, 401);
  }, { policy });
});

test("Policy changes do not affect /health", async () => {
  const policy = createCapabilityPolicy([]);

  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.status, "ok");
  }, { policy });
});

test("POST /v1/tasks requires external authentication", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/tasks`, {
      method: "POST",
    });

    assert.equal(response.status, 401);
  });
});

test("POST /v1/tasks rejects an incorrect external key", async () => {
  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      headers: { authorization: `Bearer ${WRONG_API_KEY}` },
    });

    assert.equal(response.status, 401);
  });
});

test("POST /v1/tasks rejects a non-JSON Content-Type", async () => {
  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      headers: { "content-type": "text/plain" },
    });

    assert.equal(response.status, 415);
  });
});

test("POST /v1/tasks rejects invalid JSON", async () => {
  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      body: "{invalid",
    });

    assert.equal(response.status, 400);
  });
});

test("POST /v1/tasks rejects an invalid Contract", async () => {
  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, { taskId: "incomplete" });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_TASK");
  });
});

test("POST /v1/tasks only accepts custom-gpt requesters", async () => {
  await withGateway(async (baseUrl) => {
    for (const type of ["internal", "test"]) {
      const response = await submitTask(
        baseUrl,
        createTask({ requestedBy: { type } }),
      );
      assert.equal(response.status, 400);
    }
  });
});

test("POST /v1/tasks rejects an oversized Content-Length", async () => {
  await withGateway(async (_baseUrl, port) => {
    const response = await sendDeclaredOversizedTask(port);

    assert.equal(response.status, 413);
    assert.equal(response.body.error.code, "PAYLOAD_TOO_LARGE");
  });
});

test("POST /v1/tasks rejects an oversized streamed body", async () => {
  await withGateway(async (_baseUrl, port) => {
    const response = await sendChunkedOversizedTask(port);

    assert.equal(response.status, 413);
    assert.equal(response.body.error.code, "PAYLOAD_TOO_LARGE");
  });
});

test("gateway.ping is forwarded to the Runtime Client", async () => {
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "succeeded");
    assert.equal(runtimeClient.calls.length, 1);
    assert.equal(runtimeClient.calls[0].task.capability, "gateway.ping");
  }, { runtimeClient });
});

test("runtime.status is forwarded to the Runtime Client", async () => {
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    await submitTask(
      baseUrl,
      createTask({ capability: "runtime.status" }),
    );

    assert.equal(runtimeClient.calls.length, 1);
    assert.equal(runtimeClient.calls[0].task.capability, "runtime.status");
  }, { runtimeClient });
});

test("Gateway Request ID overrides Task metadata.requestId", async () => {
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    const requestId = "gateway-http-request-id";
    await submitTask(baseUrl, createTask(), {
      headers: { "x-request-id": requestId },
    });

    assert.equal(runtimeClient.calls[0].requestId, requestId);
    assert.equal(runtimeClient.calls[0].task.metadata.requestId, requestId);
  }, { runtimeClient });
});

test("Gateway preserves Task correlationId", async () => {
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    await submitTask(
      baseUrl,
      createTask({
        metadata: {
          requestedAt: new Date().toISOString(),
          requestId: "untrusted",
          correlationId: "correlation-7",
        },
      }),
    );

    assert.equal(
      runtimeClient.calls[0].task.metadata.correlationId,
      "correlation-7",
    );
  }, { runtimeClient });
});

test("Gateway Policy denial does not call Runtime", async () => {
  const runtimeClient = createFakeRuntimeClient();
  const policy = createCapabilityPolicy(["gateway.ping"]);

  await withGateway(async (baseUrl) => {
    await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );

    assert.equal(runtimeClient.calls.length, 0);
  }, { policy, runtimeClient });
});

test("Gateway Policy denial returns a valid rejected TaskResult", async () => {
  const policy = createCapabilityPolicy(["gateway.ping"]);

  await withGateway(async (baseUrl) => {
    const task = createTask({ capability: "system.info.safe" });
    const response = await submitTask(baseUrl, task);
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "rejected");
    assert.equal(result.error.code, "FORBIDDEN");
    assert.equal(result.error.retryable, false);
    assert.equal(result.metadata.executor, "action-gateway");
    assert.equal(validateTaskResult(result).ok, true);
  }, { policy });
});

test("a valid Runtime TaskResult is returned unchanged", async () => {
  const task = createTask();
  const expected = createSucceededResult(task);
  const runtimeClient = createFakeRuntimeClient({ result: expected });

  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, task);
    const result = await response.json();

    assert.deepEqual(result, expected);
    assert.equal(response.headers.get("x-request-id")?.length > 0, true);
  }, { runtimeClient });
});

test("Runtime timeout maps to safe HTTP 504", async () => {
  const runtimeClient = createFakeRuntimeClient({ reason: "timeout" });

  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const body = await response.json();

    assert.equal(response.status, 504);
    assert.equal(body.error.code, "TIMEOUT");
  }, { runtimeClient });
});

test("Runtime unavailability maps to safe HTTP 502", async () => {
  const runtimeClient = createFakeRuntimeClient({ reason: "unavailable" });

  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error.message, "Local Runtime is unavailable.");
  }, { runtimeClient });
});

test("invalid Runtime response maps to safe HTTP 502", async () => {
  const runtimeClient = createFakeRuntimeClient({
    reason: "invalid-response",
  });

  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(
      body.error.message,
      "Local Runtime returned an invalid response.",
    );
  }, { runtimeClient });
});

test("Fake Runtime receives no external Authorization value", async () => {
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    await submitTask(baseUrl, createTask(), {
      headers: { authorization: `Bearer ${API_KEY}` },
    });

    assert.deepEqual(Object.keys(runtimeClient.calls[0]).sort(), [
      "requestId",
      "task",
    ]);
    assert.equal(
      JSON.stringify(runtimeClient.calls[0]).includes(API_KEY),
      false,
    );
  }, { runtimeClient });
});

test("/health succeeds when no Runtime Client is configured", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
  });
});

test("/v1/capabilities still uses external authentication", async () => {
  await withGateway(async (baseUrl) => {
    const unauthorized = await fetch(`${baseUrl}/v1/capabilities`);
    const authorized = await fetch(`${baseUrl}/v1/capabilities`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });

    assert.equal(unauthorized.status, 401);
    assert.equal(authorized.status, 200);
  });
});

test("missing Runtime Client maps task requests to HTTP 502", async () => {
  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    assert.equal(response.status, 502);
  });
});

test("Runtime Client rejects non-Loopback and credentialed URLs", () => {
  for (const baseUrl of [
    "http://192.168.1.10:8790",
    "http://0.0.0.0:8790",
    "https://example.com",
    "http://user:password@127.0.0.1:8790",
    "http://127.0.0.1:8790/path",
    "http://127.0.0.1:8790?token=value",
    "file:///tmp/runtime",
  ]) {
    assert.throws(() =>
      createHttpRuntimeClient({ baseUrl, apiKey: API_KEY }),
    );
  }
});

test("Runtime Client accepts supported Loopback URL forms", () => {
  for (const baseUrl of [
    "http://127.0.0.1:8790",
    "http://localhost:8790",
    "http://[::1]:8790",
  ]) {
    assert.doesNotThrow(() =>
      createHttpRuntimeClient({ baseUrl, apiKey: API_KEY }),
    );
  }
});

test("Runtime Client rejects invalid internal keys safely", () => {
  const secret = "short-secret";

  assert.throws(
    () =>
      createHttpRuntimeClient({
        baseUrl: "http://127.0.0.1:8790",
        apiKey: secret,
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test("Runtime Client rejects timeout values outside 100 to 30000 ms", () => {
  for (const timeoutMs of [99, 30_001, 100.5, Number.NaN]) {
    assert.throws(() =>
      createHttpRuntimeClient({
        baseUrl: "http://127.0.0.1:8790",
        apiKey: API_KEY,
        timeoutMs,
      }),
    );
  }
});

test("Runtime Client validates the returned TaskResult", async () => {
  await withHttpEndpoint((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ invalid: true }));
  }, async (baseUrl) => {
    const client = createHttpRuntimeClient({
      baseUrl,
      apiKey: API_KEY,
    });
    const result = await client.executeTask(createTask(), "request-id");

    assert.deepEqual(result, {
      ok: false,
      reason: "invalid-response",
    });
  });
});

test("Runtime Client rejects streamed responses over 65536 bytes", async () => {
  await withHttpEndpoint((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write("x".repeat(40_000));
    response.end("x".repeat(30_000));
  }, async (baseUrl) => {
    const client = createHttpRuntimeClient({
      baseUrl,
      apiKey: API_KEY,
    });
    const result = await client.executeTask(createTask(), "request-id");

    assert.deepEqual(result, {
      ok: false,
      reason: "invalid-response",
    });
  });
});

test("Runtime Client enforces its AbortController timeout", async () => {
  await withHttpEndpoint((_request, response) => {
    setTimeout(() => response.end("{}"), 250);
  }, async (baseUrl) => {
    const client = createHttpRuntimeClient({
      baseUrl,
      apiKey: API_KEY,
      timeoutMs: 100,
    });
    const result = await client.executeTask(createTask(), "request-id");

    assert.deepEqual(result, {
      ok: false,
      reason: "timeout",
    });
  });
});

test("Runtime Client refuses redirects outside its validated base URL", async () => {
  await withHttpEndpoint((_request, response) => {
    response.writeHead(302, {
      location: "http://192.0.2.1/runtime",
    });
    response.end();
  }, async (baseUrl) => {
    const client = createHttpRuntimeClient({
      baseUrl,
      apiKey: API_KEY,
    });
    const result = await client.executeTask(createTask(), "request-id");

    assert.deepEqual(result, {
      ok: false,
      reason: "unavailable",
    });
  });
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { test } from "node:test";

import { validateTaskResult } from "@ai-agent-platform/contracts";
import { createCapabilityPolicy } from "@ai-agent-platform/policy";
import { createGatewayServer } from "../dist/app.js";
import { createConcurrencyGate } from "../dist/concurrency.js";
import {
  createInMemoryControllerTaskControl,
} from "../dist/controller-task-control.js";
import {
  createFixedWindowRateLimiter,
} from "../dist/rate-limit.js";
import { createHttpRuntimeClient } from "../dist/runtime-client.js";
import {
  configureGatewayServerTimeouts,
  GATEWAY_HEADERS_TIMEOUT_MS,
  GATEWAY_KEEP_ALIVE_TIMEOUT_MS,
  GATEWAY_REQUEST_TIMEOUT_MS,
  GATEWAY_SOCKET_TIMEOUT_MS,
  resolveActionGatewayConfiguration,
} from "../dist/server.js";

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

function createDeferred() {
  let resolve;
  const promise = new Promise((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

async function waitForCallCount(calls, count) {
  while (calls.length < count) {
    await new Promise((resolve) => setImmediate(resolve));
  }
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

async function submitRuntimeStatus(baseUrl, options = {}) {
  const headers = {
    ...options.headers,
  };
  if (options.authenticated !== false) {
    headers.authorization = `Bearer ${API_KEY}`;
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  return fetch(`${baseUrl}/v1/runtime/status`, {
    method: "POST",
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });
}



async function submitController(baseUrl, route, body, options = {}) {
  const headers = {
    authorization: `Bearer ${API_KEY}`,
    "content-type": "application/json",
    ...options.headers,
  };
  return fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
  });
}

function controllerGatewayOptions() {
  return {
    controllerTaskControl: createInMemoryControllerTaskControl(),
    controllerIdentity: {
      profileId: "ai-agent-platform-controller",
      roleId: "controller",
      projectIds: ["ai-agent-platform"],
    },
  };
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
  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    for (const socket of sockets) {
      socket.destroy();
    }
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

function requestWithAgent(port, agent, options, body) {
  return new Promise((resolve, reject) => {
    let connection;
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        agent,
        ...options,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
            connection,
          });
        });
      },
    );

    request.once("socket", (socket) => {
      connection = socket;
    });
    request.once("error", reject);
    request.end(body);
  });
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

test("POST /v1/runtime/status requires Gateway authentication", async () => {
  await withGateway(async (baseUrl) => {
    const response = await submitRuntimeStatus(baseUrl, {
      authenticated: false,
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });
});

test("POST /v1/runtime/status constructs and forwards a safe Task", async () => {
  const runtimeClient = createFakeRuntimeClient();
  const auditEntries = [];

  await withGateway(async (baseUrl) => {
    const response = await submitRuntimeStatus(baseUrl);
    const result = await response.json();
    const call = runtimeClient.calls[0];

    assert.equal(response.status, 200);
    assert.equal(runtimeClient.calls.length, 1);
    assert.equal(call.task.contractVersion, "1.0");
    assert.equal(call.task.capability, "runtime.status");
    assert.deepEqual(call.task.input, {});
    assert.equal(call.task.requestedBy.type, "custom-gpt");
    assert.equal(call.task.requestedBy.subject, "custom-gpt-action");
    assert.equal(
      new Date(call.task.metadata.requestedAt).toISOString(),
      call.task.metadata.requestedAt,
    );
    assert.match(
      call.task.taskId,
      /^custom-gpt-runtime-status-[0-9a-f-]+$/u,
    );
    assert.equal(result.taskId, call.task.taskId);
    assert.equal(auditEntries.length, 1);
    assert.equal(
      JSON.parse(auditEntries[0]).taskId,
      call.task.taskId,
    );
  }, {
    runtimeClient,
    auditLog: (entry) => auditEntries.push(entry),
  });
});

test("POST /v1/runtime/status ignores all client Task fields", async () => {
  const runtimeClient = createFakeRuntimeClient();
  const untrustedTaskId = "client-controlled-task";

  await withGateway(async (baseUrl) => {
    const response = await submitRuntimeStatus(baseUrl, {
      body: {
        contractVersion: "9.9",
        taskId: untrustedTaskId,
        capability: "system.info.safe",
        input: { unsafe: true },
        requestedBy: {
          type: "user",
          subject: "chat-user",
        },
        metadata: {
          requestedAt: "2000-01-01T00:00:00.000Z",
        },
      },
    });
    const result = await response.json();
    const task = runtimeClient.calls[0].task;

    assert.equal(response.status, 200);
    assert.notEqual(task.taskId, untrustedTaskId);
    assert.equal(task.capability, "runtime.status");
    assert.deepEqual(task.input, {});
    assert.deepEqual(task.requestedBy, {
      type: "custom-gpt",
      subject: "custom-gpt-action",
    });
    assert.notEqual(
      task.metadata.requestedAt,
      "2000-01-01T00:00:00.000Z",
    );
    assert.equal(result.taskId, task.taskId);
  }, { runtimeClient });
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

test("Runtime Client rejects a valid TaskResult for another task", async () => {
  const task = createTask();
  const wrongTaskId = `other-${randomUUID()}`;
  const wrongResult = createSucceededResult({
    ...task,
    taskId: wrongTaskId,
  });

  await withHttpEndpoint((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(wrongResult));
  }, async (baseUrl) => {
    const runtimeClient = createHttpRuntimeClient({
      baseUrl,
      apiKey: API_KEY,
    });

    await withGateway(async (gatewayUrl) => {
      const response = await submitTask(gatewayUrl, task);
      const bodyText = await response.text();
      const body = JSON.parse(bodyText);

      assert.equal(response.status, 502);
      assert.equal(body.error.code, "RUNTIME_UNAVAILABLE");
      assert.equal(
        body.error.message,
        "Local Runtime returned an invalid response.",
      );
      assert.equal(bodyText.includes(wrongTaskId), false);
      assert.equal(bodyText.includes("fake-runtime"), false);
    }, { runtimeClient });
  });
});

test("Runtime Body-stage timeout maps through Gateway to safe HTTP 504", async () => {
  await withHttpEndpoint((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"contractVersion":"1.0",');
  }, async (baseUrl) => {
    const runtimeClient = createHttpRuntimeClient({
      baseUrl,
      apiKey: API_KEY,
      timeoutMs: 100,
    });

    await withGateway(async (gatewayUrl) => {
      const response = await submitTask(gatewayUrl, createTask());
      const bodyText = await response.text();
      const body = JSON.parse(bodyText);

      assert.equal(response.status, 504);
      assert.equal(body.error.code, "TIMEOUT");
      assert.equal(bodyText.includes(baseUrl), false);
      assert.equal(bodyText.includes("AbortError"), false);
    }, { runtimeClient });
  });
});

test("unauthenticated task Body is drained and Keep-Alive remains reusable", async () => {
  await withGateway(async (_baseUrl, port) => {
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const secretBody = "untrusted-body-must-not-appear";

    try {
      const unauthorized = await requestWithAgent(
        port,
        agent,
        {
          method: "POST",
          path: "/v1/tasks",
          headers: {
            "content-length": Buffer.byteLength(secretBody),
            "content-type": "application/json",
          },
        },
        secretBody,
      );
      const health = await requestWithAgent(
        port,
        agent,
        {
          method: "GET",
          path: "/health",
        },
      );

      assert.equal(unauthorized.status, 401);
      assert.equal(unauthorized.body.includes(secretBody), false);
      assert.equal(health.status, 200);
      assert.equal(unauthorized.connection, health.connection);
    } finally {
      agent.destroy();
    }
  });
});

test("Gateway Server uses the fixed inbound timeout baseline", () => {
  const server = configureGatewayServerTimeouts(
    createGatewayServer({ apiKey: API_KEY }),
  );

  try {
    assert.equal(server.headersTimeout, GATEWAY_HEADERS_TIMEOUT_MS);
    assert.equal(server.requestTimeout, GATEWAY_REQUEST_TIMEOUT_MS);
    assert.equal(server.keepAliveTimeout, GATEWAY_KEEP_ALIVE_TIMEOUT_MS);
    assert.equal(server.timeout, GATEWAY_SOCKET_TIMEOUT_MS);
    assert.equal(server.headersTimeout > server.keepAliveTimeout, true);
  } finally {
    server.close();
  }
});

test("Fixed Window Rate Limiter validates configuration and resets safely", () => {
  for (const options of [
    { limit: 0, windowMs: 1_000 },
    { limit: 10_001, windowMs: 1_000 },
    { limit: 1.5, windowMs: 1_000 },
    { limit: 1, windowMs: 999 },
    { limit: 1, windowMs: 3_600_001 },
  ]) {
    assert.throws(() => createFixedWindowRateLimiter(options));
  }

  let now = 10_000;
  const limiter = createFixedWindowRateLimiter({
    limit: 2,
    windowMs: 1_000,
    now: () => now,
  });
  const first = limiter.consume("route");
  const second = limiter.consume("route");
  const denied = limiter.consume("route");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 0);
  assert.equal(denied.retryAfterSeconds, 1);
  assert.equal(Object.isFrozen(denied), true);

  now = 11_000;
  assert.equal(limiter.consume("route").allowed, true);
  now = 9_000;
  assert.equal(limiter.consume("route").allowed, true);
});

test("Task Rate Limit returns safe 429 with Retry-After", async () => {
  const secret = "limiter-secret-that-must-not-appear";
  const taskRateLimiter = createFixedWindowRateLimiter({
    limit: 2,
    windowMs: 60_000,
  });
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    assert.equal((await submitTask(baseUrl, createTask())).status, 200);
    assert.equal((await submitTask(baseUrl, createTask())).status, 200);
    const response = await submitTask(baseUrl, createTask());
    const bodyText = await response.text();
    const body = JSON.parse(bodyText);

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(response.headers.get("x-request-id"));
    assert.deepEqual(body.error, {
      code: "RATE_LIMITED",
      message: "Too many requests.",
    });
    assert.equal(bodyText.includes(API_KEY), false);
    assert.equal(bodyText.includes(secret), false);
    assert.equal(bodyText.includes("authenticated:/v1/tasks"), false);
  }, { runtimeClient, taskRateLimiter });
});

test("Health, authentication failures, and wrong methods do not consume Task quota", async () => {
  const taskRateLimiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 60_000,
  });
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/v1/tasks`, {
      method: "GET",
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    await submitTask(baseUrl, createTask(), {
      headers: { authorization: `Bearer ${WRONG_API_KEY}` },
    });

    assert.equal((await submitTask(baseUrl, createTask())).status, 200);
    assert.equal((await submitTask(baseUrl, createTask())).status, 429);
  }, { runtimeClient, taskRateLimiter });
});

test("Rate-limited task Body is drained and Keep-Alive remains reusable", async () => {
  const taskRateLimiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 60_000,
  });
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl, port) => {
    await submitTask(baseUrl, createTask());
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const body = JSON.stringify(createTask());

    try {
      const limited = await requestWithAgent(
        port,
        agent,
        {
          method: "POST",
          path: "/v1/tasks",
          headers: {
            authorization: `Bearer ${API_KEY}`,
            "content-length": Buffer.byteLength(body),
            "content-type": "application/json",
          },
        },
        body,
      );
      const health = await requestWithAgent(port, agent, {
        method: "GET",
        path: "/health",
      });

      assert.equal(limited.status, 429);
      assert.equal(health.status, 200);
      assert.equal(limited.connection, health.connection);
    } finally {
      agent.destroy();
    }
  }, { runtimeClient, taskRateLimiter });
});

test("Task and Capabilities routes use independent Rate Limit quotas", async () => {
  const taskRateLimiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 60_000,
  });
  const capabilitiesRateLimiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 60_000,
  });
  const runtimeClient = createFakeRuntimeClient();

  await withGateway(async (baseUrl) => {
    const capabilityHeaders = {
      authorization: `Bearer ${API_KEY}`,
    };
    assert.equal(
      (await fetch(`${baseUrl}/v1/capabilities`, {
        headers: capabilityHeaders,
      })).status,
      200,
    );
    assert.equal((await submitTask(baseUrl, createTask())).status, 200);
    assert.equal(
      (await fetch(`${baseUrl}/v1/capabilities`, {
        headers: capabilityHeaders,
      })).status,
      429,
    );
    assert.equal((await submitTask(baseUrl, createTask())).status, 429);
  }, {
    runtimeClient,
    taskRateLimiter,
    capabilitiesRateLimiter,
  });
});

test("Gateway concurrency fails fast and releases after completion", async () => {
  const deferred = createDeferred();
  const calls = [];
  const runtimeClient = {
    calls,
    async executeTask(task, requestId) {
      calls.push({ task, requestId });
      await deferred.promise;
      return { ok: true, result: createSucceededResult(task) };
    },
  };
  const concurrencyGate = createConcurrencyGate(1);

  await withGateway(async (baseUrl) => {
    const first = submitTask(baseUrl, createTask());
    await waitForCallCount(calls, 1);

    const second = await submitTask(baseUrl, createTask());
    const secondBody = await second.json();
    assert.equal(second.status, 503);
    assert.equal(second.headers.get("retry-after"), "1");
    assert.equal(secondBody.error.code, "BUSY");
    assert.equal(calls.length, 1);

    deferred.resolve();
    assert.equal((await first).status, 200);
    assert.equal(concurrencyGate.activeCount, 0);
    assert.equal((await submitTask(baseUrl, createTask())).status, 200);
    assert.equal(calls.length, 2);
  }, { runtimeClient, concurrencyGate });
});

test("Gateway releases concurrency slots after safe Runtime failures", async () => {
  for (const reason of ["timeout", "unavailable"]) {
    const concurrencyGate = createConcurrencyGate(1);
    const runtimeClient = createFakeRuntimeClient({ reason });
    await withGateway(async (baseUrl) => {
      await submitTask(baseUrl, createTask());
      assert.equal(concurrencyGate.activeCount, 0);
      await submitTask(baseUrl, createTask());
      assert.equal(runtimeClient.calls.length, 2);
    }, { runtimeClient, concurrencyGate });
  }
});

test("Gateway releases concurrency slots when Runtime Client throws", async () => {
  const concurrencyGate = createConcurrencyGate(1);
  const runtimeClient = {
    calls: 0,
    async executeTask() {
      this.calls += 1;
      throw new Error("unexpected internal failure");
    },
  };

  await withGateway(async (baseUrl) => {
    const first = await submitTask(baseUrl, createTask());
    const bodyText = await first.text();
    assert.equal(first.status, 502);
    assert.equal(bodyText.includes("unexpected internal failure"), false);
    assert.equal(concurrencyGate.activeCount, 0);
    await submitTask(baseUrl, createTask());
    assert.equal(runtimeClient.calls, 2);
  }, { runtimeClient, concurrencyGate });
});

test("Policy and Contract rejections do not acquire Gateway concurrency", async () => {
  const concurrencyGate = {
    activeCount: 0,
    limit: 1,
    calls: 0,
    tryAcquire() {
      this.calls += 1;
      return () => {};
    },
  };
  const policy = createCapabilityPolicy(["gateway.ping"]);

  await withGateway(async (baseUrl) => {
    await submitTask(baseUrl, { taskId: "invalid" });
    await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );
    assert.equal(concurrencyGate.calls, 0);
  }, { concurrencyGate, policy });
});

test("Runtime Busy maps to safe Gateway 503", async () => {
  const runtimeClient = createFakeRuntimeClient({ reason: "busy" });
  await withGateway(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "1");
    assert.deepEqual(body.error, {
      code: "RUNTIME_BUSY",
      message: "Local Runtime task capacity is full.",
    });
  }, { runtimeClient });
});

test("HTTP Runtime Client classifies 503 as Busy without reading its Body", async () => {
  const unsafeBody = `unsafe-${API_KEY}`;
  await withHttpEndpoint((_request, response) => {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(unsafeBody);
  }, async (baseUrl) => {
    const client = createHttpRuntimeClient({ baseUrl, apiKey: API_KEY });
    const result = await client.executeTask(createTask(), "busy-request");
    assert.deepEqual(result, { ok: false, reason: "busy" });
    assert.equal(JSON.stringify(result).includes(unsafeBody), false);
  });
});

test("Gateway concurrency Server configuration is bounded and safe", () => {
  const baseEnvironment = {
    ACTION_GATEWAY_API_KEY: API_KEY,
    ACTION_GATEWAY_RUNTIME_API_KEY: API_KEY,
  };
  assert.equal(
    resolveActionGatewayConfiguration(baseEnvironment).maxConcurrentTasks,
    2,
  );
  assert.equal(
    resolveActionGatewayConfiguration({
      ...baseEnvironment,
      ACTION_GATEWAY_MAX_CONCURRENT_TASKS: "7",
    }).maxConcurrentTasks,
    7,
  );

  const secret = "not-a-valid-limit-secret";
  assert.throws(
    () =>
      resolveActionGatewayConfiguration({
        ...baseEnvironment,
        ACTION_GATEWAY_MAX_CONCURRENT_TASKS: secret,
      }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
  for (const value of ["0", "33", "1.5"]) {
    assert.throws(() =>
      resolveActionGatewayConfiguration({
        ...baseEnvironment,
        ACTION_GATEWAY_MAX_CONCURRENT_TASKS: value,
      }),
    );
  }
});

test("Controller Action enforces query-before-claim and server-derived identity", async () => {
  await withGateway(async (baseUrl) => {
    const earlyClaim = await submitController(
      baseUrl,
      "/v1/controller/task-claim",
      {
        taskId: "task-ctl-001",
        expectedTaskVersion: 1,
        idempotencyKey: "early-claim",
      },
    );
    assert.equal(earlyClaim.status, 409);
    assert.equal(
      (await earlyClaim.json()).error.code,
      "CONTROLLER_CONTEXT_REQUIRED",
    );

    const forgedContext = await submitController(
      baseUrl,
      "/v1/controller/task-context",
      {
        taskId: "task-ctl-001",
        profileId: "forged-profile",
      },
    );
    assert.equal(forgedContext.status, 400);
    assert.equal(
      (await forgedContext.json()).error.code,
      "CONTROLLER_INVALID_REQUEST",
    );
  }, controllerGatewayOptions());
});

test("Controller Action runs context, claim, plan, advance, and completion loop", async () => {
  await withGateway(async (baseUrl) => {
    const contextResponse = await submitController(
      baseUrl,
      "/v1/controller/task-context",
      { taskId: "task-ctl-001" },
    );
    assert.equal(contextResponse.status, 200);
    const context = (await contextResponse.json()).data;
    assert.equal(context.task.plan, null);
    assert.ok(context.allowedControllerCommands.includes("CREATE_PLAN"));

    const claimResponse = await submitController(
      baseUrl,
      "/v1/controller/task-claim",
      {
        taskId: "task-ctl-001",
        expectedTaskVersion: context.task.taskVersion,
        idempotencyKey: "http-claim-001",
      },
    );
    assert.equal(claimResponse.status, 200);
    const claim = (await claimResponse.json()).data;
    assert.equal(claim.claim.claimedByProfile, "ai-agent-platform-controller");

    const createPlanBody = {
      taskId: "task-ctl-001",
      claimToken: claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      expectedPlanVersion: null,
      idempotencyKey: "http-create-plan-001",
      command: {
        type: "CREATE_PLAN",
        reasonSummary: "Create the Controller MVP plan.",
        payload: {
          nodes: [
            {
              nodeId: "inspect-context",
              title: "Inspect the decision context",
              kind: "DECISION",
              requiredRole: "controller",
            },
            {
              nodeId: "finalize",
              title: "Finalize the Controller MVP",
              kind: "FINALIZE",
              requiredRole: "controller",
            },
          ],
        },
      },
    };
    const createResponse = await submitController(
      baseUrl,
      "/v1/controller/task-command",
      createPlanBody,
    );
    assert.equal(createResponse.status, 200);
    const created = (await createResponse.json()).data;
    assert.equal(created.task.plan.planVersion, 1);
    assert.equal(created.event.eventType, "task.plan.created");

    const replayResponse = await submitController(
      baseUrl,
      "/v1/controller/task-command",
      createPlanBody,
    );
    const replay = (await replayResponse.json()).data;
    assert.equal(replay.commandId, created.commandId);
    assert.equal(replay.idempotentReplay, true);

    const advanceFirstResponse = await submitController(
      baseUrl,
      "/v1/controller/task-command",
      {
        taskId: "task-ctl-001",
        claimToken: claim.claimToken,
        expectedTaskVersion: created.task.taskVersion,
        expectedPlanVersion: created.task.plan.planVersion,
        idempotencyKey: "http-advance-001",
        command: {
          type: "ADVANCE_PLAN_NODE",
          reasonSummary: "Decision context has been inspected.",
          payload: {
            nodeId: "inspect-context",
            resultRefs: ["result-fixture-context-001"],
          },
        },
      },
    );
    assert.equal(advanceFirstResponse.status, 200);
    const advancedFirst = (await advanceFirstResponse.json()).data;
    assert.equal(advancedFirst.task.plan.currentNodeId, "finalize");

    const advanceFinalResponse = await submitController(
      baseUrl,
      "/v1/controller/task-command",
      {
        taskId: "task-ctl-001",
        claimToken: claim.claimToken,
        expectedTaskVersion: advancedFirst.task.taskVersion,
        expectedPlanVersion: advancedFirst.task.plan.planVersion,
        idempotencyKey: "http-advance-002",
        command: {
          type: "ADVANCE_PLAN_NODE",
          reasonSummary: "Controller MVP acceptance is satisfied.",
          payload: { nodeId: "finalize" },
        },
      },
    );
    assert.equal(advanceFinalResponse.status, 200);
    const advancedFinal = (await advanceFinalResponse.json()).data;
    assert.equal(advancedFinal.task.plan.currentNodeId, null);

    const completeResponse = await submitController(
      baseUrl,
      "/v1/controller/task-command",
      {
        taskId: "task-ctl-001",
        claimToken: claim.claimToken,
        expectedTaskVersion: advancedFinal.task.taskVersion,
        expectedPlanVersion: advancedFinal.task.plan.planVersion,
        idempotencyKey: "http-complete-001",
        command: {
          type: "COMPLETE_TASK",
          reasonSummary: "All required Controller MVP nodes are complete.",
          payload: { summary: "Controller MVP fixture completed." },
        },
      },
    );
    assert.equal(completeResponse.status, 200);
    const completed = (await completeResponse.json()).data;
    assert.equal(completed.task.lifecycleStatus, "COMPLETED");
    assert.equal(completed.task.plan.status, "COMPLETED");
    assert.equal(completed.task.claim, null);
  }, controllerGatewayOptions());
});

test("Controller routes require Bearer authentication", async () => {
  await withGateway(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/controller/task-context`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId: "task-ctl-001" }),
    });
    assert.equal(response.status, 401);
  }, controllerGatewayOptions());
});


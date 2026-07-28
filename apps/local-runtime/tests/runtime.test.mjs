import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { test } from "node:test";

import {
  validateTaskResult,
} from "@ai-agent-platform/contracts";
import { createCapabilityPolicy } from "@ai-agent-platform/policy";
import { createRuntimeServer } from "../dist/app.js";
import {
  resolveLocalRuntimeConfiguration,
} from "../dist/server.js";

const API_KEY = "runtime-test-key-0123456789abcdef-xyz";
const WRONG_API_KEY = "wrong-runtime-key-0123456789abcdef-xyz";

function createTask(overrides = {}) {
  return {
    contractVersion: "1.0",
    taskId: `task-${randomUUID()}`,
    capability: "gateway.ping",
    input: {},
    requestedBy: {
      type: "test",
      subject: "local-runtime-tests",
    },
    metadata: {
      requestedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

async function withRuntime(run, options = {}) {
  const server = createRuntimeServer({ apiKey: API_KEY, ...options });

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

async function submitTask(baseUrl, task, headers = {}) {
  return fetch(`${baseUrl}/v1/tasks`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(task),
  });
}

async function sendChunkedOversizedBody(port) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/v1/tasks",
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${API_KEY}`,
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

async function sendDeclaredOversizedBody(port) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/v1/tasks",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "65537",
          authorization: `Bearer ${API_KEY}`,
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

test("GET /health returns 200 and runtime health", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.service, "local-runtime");
    assert.equal(body.data.status, "ok");
    assert.equal(new Date(body.data.timestamp).toISOString(), body.data.timestamp);
  });
});

test("GET /ready returns 200 and the Contract version", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.service, "local-runtime");
    assert.equal(body.data.status, "ready");
    assert.equal(body.data.contractVersion, "1.0");
  });
});

test("GET /ready only exposes capabilities allowed by Runtime Policy", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    const body = await response.json();

    assert.deepEqual(body.data.capabilities, [
      "gateway.ping",
      "runtime.status",
    ]);
  });
});

test("an unknown route returns a safe 404", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/unknown`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body.error, {
      code: "NOT_FOUND",
      message: "Route not found.",
    });
  });
});

test("a wrong method returns 405", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, { method: "POST" });
    const body = await response.json();

    assert.equal(response.status, 405);
    assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
  });
});

test("405 responses include the route-specific Allow header", async () => {
  await withRuntime(async (baseUrl) => {
    const cases = [
      ["/health", "DELETE", "GET"],
      ["/ready", "POST", "GET"],
      ["/v1/tasks", "GET", "POST"],
    ];

    for (const [path, method, allow] of cases) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers:
          path === "/v1/tasks"
            ? { authorization: `Bearer ${API_KEY}` }
            : {},
      });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), allow);
    }
  });
});

test("a valid x-request-id is preserved in envelope and header", async () => {
  await withRuntime(async (baseUrl) => {
    const requestId = "runtime_Request-1.0:health";
    const response = await fetch(`${baseUrl}/health`, {
      headers: { "x-request-id": requestId },
    });
    const body = await response.json();

    assert.equal(body.requestId, requestId);
    assert.equal(response.headers.get("x-request-id"), requestId);
  });
});

test("an invalid x-request-id is replaced", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { "x-request-id": "invalid request id" },
    });
    const body = await response.json();

    assert.notEqual(body.requestId, "invalid request id");
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  });
});

test("invalid JSON returns 400 INVALID_TASK", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/tasks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
      },
      body: "{invalid",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_TASK");
  });
});

test("a non-JSON Content-Type returns 415", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/tasks`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "text/plain",
      },
      body: "{}",
    });
    const body = await response.json();

    assert.equal(response.status, 415);
    assert.deepEqual(body.error, {
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Content-Type must be application/json.",
    });
  });
});

test("an invalid Task Contract returns 400", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, { taskId: "incomplete" });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_TASK");
  });
});

test("an oversized Content-Length returns 413", async () => {
  await withRuntime(async (_baseUrl, port) => {
    const response = await sendDeclaredOversizedBody(port);

    assert.equal(response.status, 413);
    assert.equal(response.body.error.code, "PAYLOAD_TOO_LARGE");
  });
});

test("an oversized chunked body returns 413 while streaming", async () => {
  await withRuntime(async (_baseUrl, port) => {
    const response = await sendChunkedOversizedBody(port);

    assert.equal(response.status, 413);
    assert.equal(response.body.error.code, "PAYLOAD_TOO_LARGE");
  });
});

test("an unknown Capability is rejected by Contract validation", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "unknown.capability" }),
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_TASK");
  });
});

test("gateway.ping succeeds", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "succeeded");
    assert.deepEqual(result.output, {
      capability: "gateway.ping",
      status: "ok",
      runtime: "local-runtime",
    });
  });
});

test("runtime.status succeeds", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "runtime.status" }),
    );
    const result = await response.json();

    assert.equal(result.status, "succeeded");
    assert.equal(result.output.runtime, "local-runtime");
    assert.equal(result.output.version, "0.1.0");
    assert.equal(result.output.status, "ready");
  });
});

test("runtime.status reports Runtime Policy capabilities", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "runtime.status" }),
    );
    const result = await response.json();

    assert.deepEqual(result.output.capabilities, [
      "gateway.ping",
      "runtime.status",
    ]);
  });
});

test("non-empty input returns failed INVALID_TASK", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ input: { command: "not-allowed" } }),
    );
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "failed");
    assert.equal(result.error.code, "INVALID_TASK");
    assert.equal(result.error.retryable, false);
  });
});

test("system.info.safe is denied by default Runtime Policy", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.status, "rejected");
  });
});

test("Policy denial returns rejected FORBIDDEN with the safe message", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );
    const result = await response.json();

    assert.deepEqual(result.error, {
      code: "FORBIDDEN",
      message: "Capability is not allowed.",
      retryable: false,
    });
  });
});

test("a successful TaskResult satisfies the Contracts validator", async () => {
  await withRuntime(async (baseUrl) => {
    const task = createTask();
    const response = await submitTask(baseUrl, task);
    const result = await response.json();

    assert.equal(validateTaskResult(result).ok, true);
    assert.equal(result.taskId, task.taskId);
    assert.deepEqual(result.evidence, []);
    assert.equal(result.metadata.executor, "local-runtime");
    assert.equal(result.error, null);
  });
});

test("a rejected TaskResult satisfies the Contracts validator", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );
    const result = await response.json();

    assert.equal(validateTaskResult(result).ok, true);
    assert.equal(result.output, null);
  });
});

test("TaskResult uses safe headers and contains no stack or requestId field", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const bodyText = await response.text();
    const result = JSON.parse(bodyText);

    assert.equal(
      response.headers.get("content-type"),
      "application/json; charset=utf-8",
    );
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(response.headers.get("x-request-id"));
    assert.equal(Object.hasOwn(result, "requestId"), false);
    assert.equal(bodyText.includes("stack"), false);
    assert.equal(bodyText.includes("/Users/"), false);
  });
});

test("requests without incoming ids receive independent Request IDs", async () => {
  await withRuntime(async (baseUrl) => {
    const first = await fetch(`${baseUrl}/health`);
    const second = await fetch(`${baseUrl}/health`);

    assert.notEqual(
      first.headers.get("x-request-id"),
      second.headers.get("x-request-id"),
    );
  });
});

test("a custom empty Policy rejects every supported Capability", async () => {
  const policy = createCapabilityPolicy([]);

  await withRuntime(async (baseUrl) => {
    for (const capability of [
      "gateway.ping",
      "runtime.status",
      "system.info.safe",
    ]) {
      const response = await submitTask(
        baseUrl,
        createTask({ capability }),
      );
      const result = await response.json();

      assert.equal(result.status, "rejected");
      assert.equal(result.error.code, "FORBIDDEN");
    }
  }, { policy });
});

test("an allowed Capability without a handler fails safely", async () => {
  const policy = createCapabilityPolicy(["system.info.safe"]);

  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "system.info.safe" }),
    );
    const result = await response.json();

    assert.equal(result.status, "failed");
    assert.deepEqual(result.error, {
      code: "CAPABILITY_NOT_FOUND",
      message: "Capability handler was not found.",
      retryable: false,
    });
    assert.equal(validateTaskResult(result).ok, true);
  }, { policy });
});

test("GET /health remains public without internal authentication", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
  });
});

test("GET /ready remains public without internal authentication", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ready`);
    assert.equal(response.status, 200);
  });
});

test("POST /v1/tasks without an internal key returns 401", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      authorization: "",
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body.error, {
      code: "UNAUTHENTICATED",
      message: "Authentication required.",
    });
  });
});

test("POST /v1/tasks rejects an incorrect internal key", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      authorization: `Bearer ${WRONG_API_KEY}`,
    });
    assert.equal(response.status, 401);
  });
});

test("POST /v1/tasks rejects a malformed Bearer header", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      authorization: `Basic ${API_KEY}`,
    });
    assert.equal(response.status, 401);
  });
});

test("Runtime 401 advertises Bearer authentication", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      authorization: "",
    });
    assert.equal(response.headers.get("www-authenticate"), "Bearer");
  });
});

test("Runtime 401 does not expose either internal key", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask(), {
      authorization: `Bearer ${WRONG_API_KEY}`,
    });
    const bodyText = await response.text();

    assert.equal(bodyText.includes(API_KEY), false);
    assert.equal(bodyText.includes(WRONG_API_KEY), false);
  });
});

test("the correct internal key executes gateway.ping", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(baseUrl, createTask());
    const result = await response.json();

    assert.equal(result.status, "succeeded");
    assert.equal(result.output.capability, "gateway.ping");
  });
});

test("the correct internal key executes runtime.status", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await submitTask(
      baseUrl,
      createTask({ capability: "runtime.status" }),
    );
    const result = await response.json();

    assert.equal(result.status, "succeeded");
    assert.equal(result.output.runtime, "local-runtime");
  });
});

test("unauthenticated GET /v1/tasks returns 401 before method handling", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/tasks`);

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("allow"), null);
  });
});

test("authenticated GET /v1/tasks returns 405", async () => {
  await withRuntime(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/tasks`, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  });
});

test("missing LOCAL_RUNTIME_API_KEY fails configuration safely", () => {
  assert.throws(
    () => resolveLocalRuntimeConfiguration({}),
    (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(API_KEY), false);
      assert.equal(error.message.includes("undefined"), false);
      assert.match(error.message, /Runtime API key/);
      return true;
    },
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { createGatewayServer } from "../dist/app.js";

async function withGateway(run) {
  const server = createGatewayServer();

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
      "system.info.safe",
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

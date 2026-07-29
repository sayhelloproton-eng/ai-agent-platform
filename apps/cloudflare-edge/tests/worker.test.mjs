import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../src/index.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const wranglerUrl = new URL("../wrangler.jsonc", import.meta.url);
const wranglerSource = await readFile(wranglerUrl, "utf8");
const wranglerConfiguration = JSON.parse(wranglerSource);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "index.ts",
});
const workerModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`
);
const {
  handleRequest,
  MAX_API_KEY_LENGTH,
  MAX_ORIGIN_RESPONSE_BYTES,
  MAX_REQUEST_BODY_BYTES,
  MAX_REQUEST_ID_LENGTH,
  MIN_API_KEY_LENGTH,
  ORIGIN_TIMEOUT_MS,
} = workerModule;
const worker = workerModule.default;

const CLIENT_KEY = "c".repeat(MIN_API_KEY_LENGTH);
const ORIGIN_KEY = "o".repeat(MIN_API_KEY_LENGTH);
const ORIGIN_BASE_URL = "https://unit-test-tunnel.trycloudflare.com";
const UUID = "11111111-1111-4111-8111-111111111111";

test("Wrangler enables only the approved public Fetch compatibility flag", () => {
  assert.equal(wranglerConfiguration.name, "edge");
  assert.equal(wranglerConfiguration.workers_dev, true);
  assert.deepEqual(wranglerConfiguration.compatibility_flags, [
    "global_fetch_strictly_public",
  ]);
});

test("Wrangler configuration contains no deployment identity or Origin binding", () => {
  assert.equal("account_id" in wranglerConfiguration, false);
  assert.equal("zone_id" in wranglerConfiguration, false);
  assert.equal("vars" in wranglerConfiguration, false);
  assert.equal("secrets" in wranglerConfiguration, false);
  assert.doesNotMatch(wranglerSource, /trycloudflare\.com/iu);
  assert.doesNotMatch(
    wranglerSource,
    /EDGE_(?:CLIENT_API_KEY|ORIGIN_API_KEY|ORIGIN_BASE_URL)/u,
  );
});

function bindings(overrides = {}) {
  return {
    EDGE_CLIENT_API_KEY: CLIENT_KEY,
    EDGE_ORIGIN_BASE_URL: ORIGIN_BASE_URL,
    EDGE_ORIGIN_API_KEY: ORIGIN_KEY,
    ...overrides,
  };
}

function authorizedHeaders(overrides = {}) {
  return {
    authorization: `Bearer ${CLIENT_KEY}`,
    ...overrides,
  };
}

function jsonOrigin(body = { ok: true }, init = {}) {
  const { headers = {}, ...responseInit } = init;
  return new Response(JSON.stringify(body), {
    status: 200,
    ...responseInit,
    headers: { "content-type": "application/json", ...headers },
  });
}

function successfulDependencies(calls = []) {
  return {
    randomUUID: () => UUID,
    fetch: async (input, init) => {
      calls.push({ input, init });
      return jsonOrigin();
    },
  };
}

function capabilitiesRequest(init = {}) {
  return new Request("https://edge.example/v1/capabilities", {
    headers: authorizedHeaders(),
    ...init,
  });
}

function capabilitiesRequestWithRawRequestId(requestId) {
  return {
    url: "https://edge.example/v1/capabilities",
    method: "GET",
    headers: {
      get(name) {
        if (name.toLowerCase() === "authorization") {
          return `Bearer ${CLIENT_KEY}`;
        }
        if (name.toLowerCase() === "x-request-id") {
          return requestId;
        }
        return null;
      },
    },
  };
}

function taskRequest(body = "{}", init = {}) {
  return new Request("https://edge.example/v1/tasks", {
    method: "POST",
    headers: authorizedHeaders({ "content-type": "application/json" }),
    body,
    ...init,
  });
}

async function errorCode(response) {
  return (await response.json()).error.code;
}

test("default Worker export handles public GET /health", async () => {
  const response = await worker.fetch(new Request("https://edge.example/health"), {});
  assert.equal(response.status, 200);
});

test("GET /health returns the exact placeholder body", async () => {
  const response = await handleRequest(new Request("https://edge.example/health"));
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "ai-agent-platform-edge",
    status: "placeholder",
  });
});

test("GET /health is public when the client key is absent", async () => {
  const response = await handleRequest(new Request("https://edge.example/health"));
  assert.equal(response.status, 200);
});

test("GET /health does not call Origin or inspect Origin configuration", async () => {
  let calls = 0;
  const response = await handleRequest(
    new Request("https://edge.example/health"),
    {},
    { fetch: async () => { calls += 1; throw new Error("must not run"); } },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 0);
});

test("root path returns 404", async () => {
  const response = await handleRequest(new Request("https://edge.example/"));
  assert.equal(response.status, 404);
  assert.equal(await errorCode(response), "EDGE_NOT_FOUND");
});

test("unknown path returns 404", async () => {
  const response = await handleRequest(new Request("https://edge.example/unknown"));
  assert.equal(response.status, 404);
});

test("POST /health returns 405 with an accurate Allow header", async () => {
  const response = await handleRequest(
    new Request("https://edge.example/health", { method: "POST" }),
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("POST /v1/capabilities returns 405 after authentication", async () => {
  const response = await handleRequest(
    capabilitiesRequest({ method: "POST" }),
    bindings(),
    { randomUUID: () => UUID },
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("GET /v1/tasks returns 405 after authentication", async () => {
  const response = await handleRequest(
    new Request("https://edge.example/v1/tasks", { headers: authorizedHeaders() }),
    bindings(),
    { randomUUID: () => UUID },
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("an authenticated 405 preserves a valid client Request ID", async () => {
  const response = await handleRequest(
    capabilitiesRequest({
      method: "POST",
      headers: authorizedHeaders({ "x-request-id": "valid-405-request-id" }),
    }),
    bindings(),
    { randomUUID: () => UUID },
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("x-request-id"), "valid-405-request-id");
});

test("an authenticated 405 replaces an invalid client Request ID", async () => {
  const response = await handleRequest(
    capabilitiesRequest({
      method: "POST",
      headers: authorizedHeaders({ "x-request-id": "invalid 405 request" }),
    }),
    bindings(),
    { randomUUID: () => UUID },
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("missing Authorization returns uniform 401", async () => {
  const response = await handleRequest(
    new Request("https://edge.example/v1/capabilities"),
    bindings(),
  );
  assert.equal(response.status, 401);
  assert.equal(await errorCode(response), "EDGE_UNAUTHENTICATED");
});

test("non-Bearer Authorization returns 401", async () => {
  const response = await handleRequest(
    capabilitiesRequest({ headers: { authorization: `Basic ${CLIENT_KEY}` } }),
    bindings(),
  );
  assert.equal(response.status, 401);
});

test("empty Bearer value returns 401", async () => {
  const response = await handleRequest(
    capabilitiesRequest({ headers: { authorization: "Bearer " } }),
    bindings(),
  );
  assert.equal(response.status, 401);
});

test("Bearer value with extra formatting returns 401", async () => {
  const response = await handleRequest(
    capabilitiesRequest({ headers: { authorization: `Bearer ${CLIENT_KEY} extra` } }),
    bindings(),
  );
  assert.equal(response.status, 401);
});

test("wrong client key returns 401", async () => {
  const response = await handleRequest(
    capabilitiesRequest({ headers: { authorization: "Bearer wrong-test-value" } }),
    bindings(),
  );
  assert.equal(response.status, 401);
});

test("401 includes WWW-Authenticate Bearer", async () => {
  const response = await handleRequest(
    new Request("https://edge.example/v1/capabilities"),
    bindings(),
  );
  assert.equal(response.headers.get("www-authenticate"), "Bearer");
});

test("missing configured client key fails safely with 401", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings({
    EDGE_CLIENT_API_KEY: undefined,
  }));
  assert.equal(response.status, 401);
});

test("configured client key shorter than 32 characters returns 401", async () => {
  let calls = 0;
  const shortKey = "c".repeat(MIN_API_KEY_LENGTH - 1);
  const response = await handleRequest(
    capabilitiesRequest({ headers: { authorization: `Bearer ${shortKey}` } }),
    bindings({ EDGE_CLIENT_API_KEY: shortKey }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 401);
  assert.equal(await errorCode(response), "EDGE_UNAUTHENTICATED");
  assert.equal(calls, 0);
});

test("configured client key longer than 256 characters returns 401", async () => {
  let calls = 0;
  const longKey = "c".repeat(MAX_API_KEY_LENGTH + 1);
  const response = await handleRequest(
    capabilitiesRequest({ headers: { authorization: `Bearer ${longKey}` } }),
    bindings({ EDGE_CLIENT_API_KEY: longKey }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test("configured client key containing whitespace returns 401", async () => {
  let calls = 0;
  const whitespaceKey = `${"c".repeat(MIN_API_KEY_LENGTH)} `;
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings({ EDGE_CLIENT_API_KEY: whitespaceKey }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test("presented Bearer token shorter than 32 characters returns 401", async () => {
  let calls = 0;
  const response = await handleRequest(
    capabilitiesRequest({
      headers: { authorization: `Bearer ${"c".repeat(MIN_API_KEY_LENGTH - 1)}` },
    }),
    bindings(),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test("correct client key reaches the Origin client", async () => {
  const calls = [];
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
});

test("missing Origin URL returns 503", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings({
    EDGE_ORIGIN_BASE_URL: undefined,
  }));
  assert.equal(response.status, 503);
  assert.equal(await errorCode(response), "EDGE_NOT_CONFIGURED");
});

test("missing Origin API key returns 503", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings({
    EDGE_ORIGIN_API_KEY: undefined,
  }));
  assert.equal(response.status, 503);
});

test("Origin key shorter than 32 characters returns 503 without fetch", async () => {
  let calls = 0;
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings({ EDGE_ORIGIN_API_KEY: "o".repeat(MIN_API_KEY_LENGTH - 1) }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 503);
  assert.equal(await errorCode(response), "EDGE_NOT_CONFIGURED");
  assert.equal(calls, 0);
});

test("Origin key containing whitespace returns 503 without fetch", async () => {
  let calls = 0;
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings({ EDGE_ORIGIN_API_KEY: `${ORIGIN_KEY} ` }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});

test("identical client and Origin keys return 503 without fetch", async () => {
  let calls = 0;
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings({ EDGE_ORIGIN_API_KEY: CLIENT_KEY }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 503);
  assert.equal(await errorCode(response), "EDGE_NOT_CONFIGURED");
  assert.equal(calls, 0);
});

for (const [label, origin] of [
  ["HTTP Origin", "http://unit-test-tunnel.trycloudflare.com"],
  ["localhost Origin", "https://localhost"],
  ["loopback Origin", "https://127.0.0.1"],
  ["unrelated public Origin", "https://example.com"],
  ["root trycloudflare domain", "https://trycloudflare.com"],
  ["Origin with query", "https://unit-test-tunnel.trycloudflare.com?value=test"],
  ["Origin with fragment", "https://unit-test-tunnel.trycloudflare.com#fragment"],
  ["Origin with credentials", "https://user:pass@unit-test-tunnel.trycloudflare.com"],
  ["Origin with path", "https://unit-test-tunnel.trycloudflare.com/base"],
  ["Origin with non-default port", "https://unit-test-tunnel.trycloudflare.com:4443"],
  ["Origin with alternate HTTPS port", "https://unit-test-tunnel.trycloudflare.com:8443"],
]) {
  test(`${label} is rejected with 503`, async () => {
    const response = await handleRequest(capabilitiesRequest(), bindings({
      EDGE_ORIGIN_BASE_URL: origin,
    }));
    assert.equal(response.status, 503);
    assert.equal(await errorCode(response), "EDGE_NOT_CONFIGURED");
  });
}

test("a standard Quick Tunnel URL without a port remains accepted", async () => {
  const calls = [];
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
});

test("a non-default Origin port is rejected before fetch", async () => {
  let calls = 0;
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings({
      EDGE_ORIGIN_BASE_URL: "https://unit-test-tunnel.trycloudflare.com:4443",
    }),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});

test("an explicit standard HTTPS port is accepted after URL normalization", async () => {
  const calls = [];
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings({ EDGE_ORIGIN_BASE_URL: `${ORIGIN_BASE_URL}:443` }),
    successfulDependencies(calls),
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
});

test("capabilities forwards only to the fixed capabilities path", async () => {
  const calls = [];
  await handleRequest(capabilitiesRequest(), bindings(), successfulDependencies(calls));
  assert.equal(calls[0].input.href, `${ORIGIN_BASE_URL}/v1/capabilities`);
});

test("tasks forwards only to the fixed tasks path", async () => {
  const calls = [];
  await handleRequest(taskRequest(), bindings(), successfulDependencies(calls));
  assert.equal(calls[0].input.href, `${ORIGIN_BASE_URL}/v1/tasks`);
});

test("a client URL parameter cannot choose the Origin target", async () => {
  const calls = [];
  const request = new Request(
    "https://edge.example/v1/capabilities?url=https://attacker.example",
    { headers: authorizedHeaders() },
  );
  await handleRequest(request, bindings(), successfulDependencies(calls));
  assert.equal(calls[0].input.href, `${ORIGIN_BASE_URL}/v1/capabilities`);
});

test("client Authorization is replaced with the independent Origin key", async () => {
  const calls = [];
  await handleRequest(capabilitiesRequest(), bindings(), successfulDependencies(calls));
  assert.equal(calls[0].init.headers.get("authorization"), `Bearer ${ORIGIN_KEY}`);
  assert.notEqual(CLIENT_KEY, ORIGIN_KEY);
});

test("only approved client headers enter the Origin request", async () => {
  const calls = [];
  const request = capabilitiesRequest({
    headers: authorizedHeaders({
      cookie: "private=test",
      "cf-ray": "test-ray",
      "x-forwarded-for": "203.0.113.1",
      "x-private-header": "private",
      "x-request-id": "request-from-client",
    }),
  });
  await handleRequest(request, bindings(), successfulDependencies(calls));
  assert.deepEqual(
    [...calls[0].init.headers.keys()].sort(),
    ["authorization", "x-request-id"],
  );
});

test("Task Content-Type is included in the Origin header whitelist", async () => {
  const calls = [];
  await handleRequest(
    taskRequest("{}", {
      headers: authorizedHeaders({
        "content-type": "application/json; charset=utf-8",
        cookie: "private=test",
      }),
    }),
    bindings(),
    successfulDependencies(calls),
  );
  assert.deepEqual(
    [...calls[0].init.headers.keys()].sort(),
    ["authorization", "content-type", "x-request-id"],
  );
});

test("client Request ID is preserved", async () => {
  const calls = [];
  await handleRequest(
    capabilitiesRequest({
      headers: authorizedHeaders({ "x-request-id": "client-request-id" }),
    }),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(calls[0].init.headers.get("x-request-id"), "client-request-id");
});

test("a valid 128-character client Request ID is preserved", async () => {
  const calls = [];
  const requestId = "a".repeat(MAX_REQUEST_ID_LENGTH);
  await handleRequest(
    capabilitiesRequest({
      headers: authorizedHeaders({ "x-request-id": requestId }),
    }),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(calls[0].init.headers.get("x-request-id"), requestId);
});

test("a 129-character client Request ID is replaced", async () => {
  const calls = [];
  await handleRequest(
    capabilitiesRequest({
      headers: authorizedHeaders({
        "x-request-id": "a".repeat(MAX_REQUEST_ID_LENGTH + 1),
      }),
    }),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(calls[0].init.headers.get("x-request-id"), UUID);
});

test("a client Request ID containing a space is replaced", async () => {
  const calls = [];
  await handleRequest(
    capabilitiesRequest({
      headers: authorizedHeaders({ "x-request-id": "invalid request" }),
    }),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(calls[0].init.headers.get("x-request-id"), UUID);
});

test("a client Request ID containing a disallowed character is replaced", async () => {
  const calls = [];
  await handleRequest(
    capabilitiesRequest({
      headers: authorizedHeaders({ "x-request-id": "invalid/request" }),
    }),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(calls[0].init.headers.get("x-request-id"), UUID);
});

test("a raw client Request ID containing a newline is replaced", async () => {
  const calls = [];
  await handleRequest(
    capabilitiesRequestWithRawRequestId("invalid\nrequest"),
    bindings(),
    successfulDependencies(calls),
  );
  assert.equal(calls[0].init.headers.get("x-request-id"), UUID);
});

test("missing Request ID is generated", async () => {
  const calls = [];
  await handleRequest(capabilitiesRequest(), bindings(), successfulDependencies(calls));
  assert.equal(calls[0].init.headers.get("x-request-id"), UUID);
});

test("Origin redirect handling is set to error", async () => {
  const calls = [];
  await handleRequest(capabilitiesRequest(), bindings(), successfulDependencies(calls));
  assert.equal(calls[0].init.redirect, "error");
});

test("each accepted request invokes Origin exactly once", async () => {
  const calls = [];
  await handleRequest(capabilitiesRequest(), bindings(), successfulDependencies(calls));
  assert.equal(calls.length, 1);
});

test("Origin network failure maps to stable 502", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    fetch: async () => { throw new Error("internal network detail"); },
  });
  assert.equal(response.status, 502);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_UNAVAILABLE");
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("Origin timeout maps to stable 504", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    originTimeoutMs: 5,
    fetch: async (_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    }),
  });
  assert.equal(response.status, 504);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_TIMEOUT");
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("hard timeout returns 504 when Origin Fetch never resolves or observes abort", async () => {
  let calls = 0;
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    originTimeoutMs: 5,
    fetch: async () => {
      calls += 1;
      return new Promise(() => {});
    },
  });
  assert.equal(response.status, 504);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_TIMEOUT");
  assert.equal(response.headers.get("x-request-id"), UUID);
  assert.equal(calls, 1);
});

test("hard timeout wins when Origin Fetch resolves after the deadline", async () => {
  let calls = 0;
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    originTimeoutMs: 5,
    fetch: async () => {
      calls += 1;
      return new Promise((resolve) => {
        setTimeout(() => resolve(jsonOrigin()), 20);
      });
    },
  });
  assert.equal(response.status, 504);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_TIMEOUT");
  assert.equal(response.headers.get("x-request-id"), UUID);
  assert.equal(calls, 1);
});

test("hard timeout returns 504 when Origin Body never ends or observes abort", async () => {
  let calls = 0;
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    originTimeoutMs: 5,
    fetch: async () => {
      calls += 1;
      return new Response(new ReadableStream({ start() {} }), {
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(response.status, 504);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_TIMEOUT");
  assert.equal(response.headers.get("x-request-id"), UUID);
  assert.equal(calls, 1);
});

test("hard timeout wins when Origin Body completes after the deadline", async () => {
  let calls = 0;
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    originTimeoutMs: 5,
    fetch: async () => {
      calls += 1;
      return new Response(new ReadableStream({
        start(controller) {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode('{"ok":true}'));
            controller.close();
          }, 20);
        },
      }), {
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(response.status, 504);
  const serialized = await response.text();
  assert.equal(JSON.parse(serialized).error.code, "EDGE_ORIGIN_TIMEOUT");
  assert.equal(response.headers.get("x-request-id"), UUID);
  assert.equal(calls, 1);
  assert.doesNotMatch(serialized, /abort|deadline|stack|internal/i);
});

test("Origin response Body-stage timeout maps to 504 with Request ID", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    originTimeoutMs: 5,
    fetch: async (_input, init) => {
      const body = new ReadableStream({
        start(controller) {
          init.signal.addEventListener("abort", () => {
            controller.error(new Error("private body-stage detail"));
          });
        },
      });
      return new Response(body, {
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(response.status, 504);
  assert.equal(response.headers.get("x-request-id"), UUID);
  const serialized = await response.text();
  assert.equal(JSON.parse(serialized).error.code, "EDGE_ORIGIN_TIMEOUT");
  assert.doesNotMatch(serialized, /private body-stage detail/i);
});

test("non-JSON Task Content-Type returns 415 without Origin call", async () => {
  let calls = 0;
  const response = await handleRequest(
    taskRequest("{}", {
      headers: authorizedHeaders({ "content-type": "text/plain" }),
    }),
    bindings(),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 415);
  assert.equal(await errorCode(response), "EDGE_UNSUPPORTED_MEDIA_TYPE");
  assert.equal(calls, 0);
});

test("empty Task body returns stable 400", async () => {
  const response = await handleRequest(
    new Request("https://edge.example/v1/tasks", {
      method: "POST",
      headers: authorizedHeaders({ "content-type": "application/json" }),
    }),
    bindings(),
  );
  assert.equal(response.status, 400);
  assert.equal(await errorCode(response), "EDGE_BAD_REQUEST");
});

test("Content-Length over the Task limit returns 413 before Origin", async () => {
  let calls = 0;
  const response = await handleRequest(
    taskRequest("{}", {
      headers: authorizedHeaders({
        "content-type": "application/json",
        "content-length": String(MAX_REQUEST_BODY_BYTES + 1),
      }),
    }),
    bindings(),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test("streamed Task body over 65,536 bytes returns 413 without Origin", async () => {
  let calls = 0;
  const response = await handleRequest(
    taskRequest("x".repeat(MAX_REQUEST_BODY_BYTES + 1)),
    bindings(),
    { fetch: async () => { calls += 1; return jsonOrigin(); } },
  );
  assert.equal(response.status, 413);
  assert.equal(await errorCode(response), "EDGE_REQUEST_TOO_LARGE");
  assert.equal(calls, 0);
});

test("Task bytes are forwarded without JSON reinterpretation", async () => {
  const calls = [];
  const original = '{ "taskId": "unchanged", "extra": [1, 2] }';
  await handleRequest(taskRequest(original), bindings(), successfulDependencies(calls));
  assert.equal(new TextDecoder().decode(calls[0].init.body), original);
});

test("Origin response over 65,536 bytes returns stable 502", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    fetch: async () => new Response(
      `"${"x".repeat(MAX_ORIGIN_RESPONSE_BYTES)}"`,
      { headers: { "content-type": "application/json" } },
    ),
  });
  assert.equal(response.status, 502);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_RESPONSE_TOO_LARGE");
});

test("non-JSON Origin Content-Type returns invalid-response 502", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    fetch: async () => new Response("plain", {
      headers: { "content-type": "text/plain" },
    }),
  });
  assert.equal(response.status, 502);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_INVALID_RESPONSE");
});

test("malformed JSON Origin body returns invalid-response 502", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    fetch: async () => new Response("{", {
      headers: { "content-type": "application/json" },
    }),
  });
  assert.equal(response.status, 502);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_INVALID_RESPONSE");
});

test("Origin redirect response is rejected", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    fetch: async () => new Response("{}", {
      status: 302,
      headers: {
        "content-type": "application/json",
        location: "https://other.example",
      },
    }),
  });
  assert.equal(response.status, 502);
  assert.equal(await errorCode(response), "EDGE_ORIGIN_INVALID_RESPONSE");
});

test("valid Gateway JSON body and status are preserved", async () => {
  const body = { ok: false, error: { code: "GATEWAY_SAFE_ERROR" } };
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    fetch: async () => jsonOrigin(body, { status: 429 }),
  });
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), body);
});

test("a valid Origin Request ID is preserved in the client response", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    fetch: async () => jsonOrigin(
      { ok: true },
      { headers: { "x-request-id": "valid-origin-request-id" } },
    ),
  });
  assert.equal(response.headers.get("x-request-id"), "valid-origin-request-id");
});

test("a missing Origin Request ID falls back to the Edge Request ID", async () => {
  const response = await handleRequest(
    capabilitiesRequest(),
    bindings(),
    successfulDependencies(),
  );
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("an oversized Origin Request ID falls back to the Edge Request ID", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    fetch: async () => jsonOrigin(
      { ok: true },
      { headers: { "x-request-id": "a".repeat(MAX_REQUEST_ID_LENGTH + 1) } },
    ),
  });
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("an invalid Origin Request ID falls back to the Edge Request ID", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    randomUUID: () => UUID,
    fetch: async () => jsonOrigin(
      { ok: true },
      { headers: { "x-request-id": "invalid origin request" } },
    ),
  });
  assert.equal(response.headers.get("x-request-id"), UUID);
});

test("only safe Origin response headers are returned", async () => {
  const response = await handleRequest(capabilitiesRequest(), bindings(), {
    fetch: async () => jsonOrigin({ ok: true }, {
      headers: {
        "x-request-id": "origin-request-id",
        "retry-after": "30",
        server: "hidden-server",
        via: "hidden-via",
        "cf-ray": "hidden-ray",
        "set-cookie": "private=test",
        "x-powered-by": "hidden-runtime",
      },
    }),
  });
  assert.equal(response.headers.get("x-request-id"), "origin-request-id");
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(response.headers.get("server"), null);
  assert.equal(response.headers.get("via"), null);
  assert.equal(response.headers.get("cf-ray"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("all representative Edge responses use no-store", async () => {
  const responses = [
    await handleRequest(new Request("https://edge.example/health")),
    await handleRequest(new Request("https://edge.example/unknown")),
    await handleRequest(new Request("https://edge.example/v1/capabilities"), bindings()),
    await handleRequest(capabilitiesRequest(), bindings(), successfulDependencies()),
  ];
  for (const response of responses) {
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("stable failures do not expose keys, Origin URL, local paths, or stacks", async () => {
  const responses = [
    await handleRequest(
      capabilitiesRequest(),
      bindings(),
      { fetch: async () => { throw new Error("/private/local/path stack detail"); } },
    ),
    await handleRequest(capabilitiesRequest(), bindings({
      EDGE_ORIGIN_BASE_URL: "https://invalid.example",
    })),
    await handleRequest(
      capabilitiesRequest({ headers: { authorization: "Bearer rejected-private-value" } }),
      bindings(),
    ),
  ];
  const serialized = (await Promise.all(responses.map((response) => response.text()))).join("\n");
  assert.doesNotMatch(serialized, new RegExp(CLIENT_KEY, "g"));
  assert.doesNotMatch(serialized, new RegExp(ORIGIN_KEY, "g"));
  assert.doesNotMatch(serialized, /trycloudflare|invalid\.example|local\/path|stack detail/i);
});

test("security limits and timeout constants remain explicit", () => {
  assert.equal(MIN_API_KEY_LENGTH, 32);
  assert.equal(MAX_API_KEY_LENGTH, 256);
  assert.equal(MAX_REQUEST_ID_LENGTH, 128);
  assert.equal(MAX_REQUEST_BODY_BYTES, 65_536);
  assert.equal(MAX_ORIGIN_RESPONSE_BYTES, 65_536);
  assert.equal(ORIGIN_TIMEOUT_MS, 5_000);
});

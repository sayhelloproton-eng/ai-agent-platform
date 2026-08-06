import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { HttpGatewayClient } from "../src/background/gateway-client.js";

async function withServer(handler, run) {
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}/v1/browser-host/invoke`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

test("real HTTP fixture server freezes Gateway data success Envelope", async () => {
  await withServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      const request = JSON.parse(raw);
      assert.equal(request.operation, "browser.dispatch.listPending");
      assert.equal(typeof request.requestId, "string");
      json(res, 200, { ok: true, requestId: request.requestId, data: [{ dispatch_ref: "dispatch-1" }] });
    });
  }, async (endpoint) => {
    const client = new HttpGatewayClient({ endpoint, timeoutMs: 1000 });
    assert.deepEqual(await client.invoke("browser.dispatch.listPending", { host_id: "host" }), [{ dispatch_ref: "dispatch-1" }]);
  });
});

test("HTTP client rejects error Envelope", async () => {
  await withServer((_req, res) => json(res, 200, { ok: false, requestId: "r", error: { code: "DISPATCH_REJECTED", message: "rejected" } }), async (endpoint) => {
    const client = new HttpGatewayClient({ endpoint, timeoutMs: 1000 });
    await assert.rejects(() => client.invoke("browser.dispatch.claim", {}), (error) => error.code === "DISPATCH_REJECTED");
  });
});

test("HTTP client rejects empty data and incompatible Envelope version", async () => {
  let response = { ok: true, requestId: "r", data: null };
  await withServer((_req, res) => json(res, 200, response), async (endpoint) => {
    const client = new HttpGatewayClient({ endpoint, timeoutMs: 1000 });
    await assert.rejects(() => client.invoke("browser.dispatch.get", {}), (error) => error.code === "GATEWAY_DATA_MISSING");
    response = { ok: true, requestId: "r", gatewayEnvelopeVersion: "9.0", data: {} };
    await assert.rejects(() => client.invoke("browser.dispatch.get", {}), (error) => error.code === "GATEWAY_ENVELOPE_VERSION_UNSUPPORTED");
  });
});

test("HTTP mode fails clearly when no server is available and does not fall back to Fixture", async () => {
  const client = new HttpGatewayClient({ endpoint: "http://127.0.0.1:1/v1/browser-host/invoke", timeoutMs: 200 });
  await assert.rejects(() => client.invoke("browser.host.register", {}), (error) => error.code === "GATEWAY_UNAVAILABLE");
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../src/index.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
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
const { handleRequest } = workerModule;
const worker = workerModule.default;

test("default Worker export handles GET /health", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/health"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "ai-agent-platform-edge",
    status: "placeholder",
  });
});

test("GET /health returns 200", async () => {
  const response = handleRequest(new Request("https://example.test/health"));

  assert.equal(response.status, 200);
});

test("GET /health returns the exact placeholder body", async () => {
  const response = handleRequest(new Request("https://example.test/health"));

  assert.deepEqual(await response.json(), {
    ok: true,
    service: "ai-agent-platform-edge",
    status: "placeholder",
  });
});

test("GET /health returns JSON with no-store caching", () => {
  const response = handleRequest(new Request("https://example.test/health"));

  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("unknown paths return 404", () => {
  const response = handleRequest(new Request("https://example.test/unknown"));

  assert.equal(response.status, 404);
});

test("POST /health returns 405", () => {
  const response = handleRequest(
    new Request("https://example.test/health", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 405);
});

test("405 responses advertise GET", () => {
  const response = handleRequest(
    new Request("https://example.test/health", {
      method: "POST",
    }),
  );

  assert.equal(response.headers.get("allow"), "GET");
});

test("responses contain no secret, environment, or local path details", async () => {
  const responses = [
    handleRequest(new Request("https://example.test/health")),
    handleRequest(new Request("https://example.test/unknown")),
    handleRequest(new Request("https://example.test/health", { method: "POST" })),
  ];
  const serialized = (
    await Promise.all(responses.map(async (response) => response.text()))
  ).join("\n");

  assert.doesNotMatch(
    serialized,
    /secret|token|authorization|api[_-]?key|process\.env|127\.0\.0\.1|localhost|\/Users\//i,
  );
});

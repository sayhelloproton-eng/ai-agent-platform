import test from "node:test";
import assert from "node:assert/strict";
import { MlxHubInferenceBackend } from "../src/inference/mlxhub-backend.js";
import { ExecutionFlowError } from "../src/runtime/errors.js";
import type { InferenceRequest } from "../src/types.js";

const baseRequest: InferenceRequest = {
  role: "fast",
  instruction: "classify runtime health",
  input: { status: "healthy" },
  output_schema: {
    type: "object",
    properties: {
      status: { enum: ["healthy", "unhealthy"] },
    },
    required: ["status"],
    additionalProperties: false,
  },
  execution_id: "ef2-test",
  flow_id: "ef2-flow",
  node_id: "judge",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("MLXHub FAST role uses fast model and bounded default output budget", async () => {
  let captured: any;
  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080/",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async (_input, init) => {
      captured = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: '{"status":"healthy"}' } }],
      });
    },
  });

  const result = await backend.infer(baseRequest);
  assert.deepEqual(result.output, { status: "healthy" });
  assert.equal(captured.model, "fast-model");
  assert.equal(captured.max_tokens, 1024);
  assert.equal(captured.temperature, 0.4);
  assert.equal(result.metadata?.provider, "mlxhub");
  assert.equal(result.metadata?.role, "fast");
  assert.equal(result.metadata?.model, "fast-model");
});

test("MLXHub REASON role strips closed thinking and does not freeze a default max_tokens", async () => {
  let captured: any;
  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async (_input, init) => {
      captured = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [
          {
            message: {
              content: '<think>private reasoning</think>\n{"status":"healthy"}',
            },
          },
        ],
      });
    },
  });

  const result = await backend.infer({ ...baseRequest, role: "reason" });
  assert.deepEqual(result.output, { status: "healthy" });
  assert.equal(captured.model, "reason-model");
  assert.equal(captured.temperature, 0.2);
  assert.equal(Object.prototype.hasOwnProperty.call(captured, "max_tokens"), false);
});

test("MLXHub reason max_tokens remains explicitly configurable", async () => {
  let captured: any;
  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    reasonMaxTokens: 4096,
    fetchImpl: async (_input, init) => {
      captured = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: '{"status":"healthy"}' } }],
      });
    },
  });

  await backend.infer({ ...baseRequest, role: "reason" });
  assert.equal(captured.max_tokens, 4096);
});

test("MLXHub provider maps server_paused to unavailable with provider details", async () => {
  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async () =>
      jsonResponse(
        { error: { code: "server_paused", message: "server paused" } },
        503
      ),
  });

  await assert.rejects(
    () => backend.infer(baseRequest),
    (error: unknown) => {
      assert.ok(error instanceof ExecutionFlowError);
      assert.equal(error.code, "INFERENCE_PROVIDER_UNAVAILABLE");
      assert.deepEqual(error.details, {
        provider: "mlxhub",
        provider_code: "server_paused",
        http_status: 503,
        model: "fast-model",
        role: "fast",
        retryable: true,
      });
      return true;
    }
  );
});

test("MLXHub provider maps model_busy/429 to busy", async () => {
  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async () =>
      jsonResponse(
        { error: { code: "model_busy", message: "busy" } },
        429
      ),
  });

  await assert.rejects(
    () => backend.infer(baseRequest),
    (error: unknown) => {
      assert.ok(error instanceof ExecutionFlowError);
      assert.equal(error.code, "INFERENCE_PROVIDER_BUSY");
      assert.equal((error.details as any).provider_code, "model_busy");
      assert.equal((error.details as any).retryable, true);
      return true;
    }
  );
});

test("MLXHub provider maps transport failures to unreachable", async () => {
  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });

  await assert.rejects(
    () => backend.infer(baseRequest),
    (error: unknown) => {
      assert.ok(error instanceof ExecutionFlowError);
      assert.equal(error.code, "INFERENCE_PROVIDER_UNREACHABLE");
      assert.equal((error.details as any).retryable, true);
      return true;
    }
  );
});

test("MLXHub provider rejects invalid JSON and unclosed thinking", async () => {
  const invalidJson = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async () =>
      jsonResponse({ choices: [{ message: { content: "not-json" } }] }),
  });

  await assert.rejects(
    () => invalidJson.infer(baseRequest),
    (error: unknown) =>
      error instanceof ExecutionFlowError &&
      error.code === "INFERENCE_INVALID_JSON"
  );

  const unclosedThink = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async () =>
      jsonResponse({
        choices: [{ message: { content: "<think>still thinking" } }],
      }),
  });

  await assert.rejects(
    () => unclosedThink.infer({ ...baseRequest, role: "reason" }),
    (error: unknown) =>
      error instanceof ExecutionFlowError &&
      error.code === "INFERENCE_THINK_UNCLOSED"
  );
});

test("MLXHub backend serializes concurrent FAST/REASON role requests", async () => {
  let active = 0;
  let maxActive = 0;
  const order: string[] = [];

  const backend = new MlxHubInferenceBackend({
    baseUrl: "http://mlxhub.local:8080",
    fastModel: "fast-model",
    reasonModel: "reason-model",
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      active += 1;
      maxActive = Math.max(maxActive, active);
      order.push(`start:${body.model}`);
      await new Promise((resolve) => setTimeout(resolve, 15));
      order.push(`end:${body.model}`);
      active -= 1;
      return jsonResponse({
        choices: [{ message: { content: '{"status":"healthy"}' } }],
      });
    },
  });

  await Promise.all([
    backend.infer(baseRequest),
    backend.infer({ ...baseRequest, role: "reason" }),
  ]);

  assert.equal(maxActive, 1);
  assert.deepEqual(order, [
    "start:fast-model",
    "end:fast-model",
    "start:reason-model",
    "end:reason-model",
  ]);
});

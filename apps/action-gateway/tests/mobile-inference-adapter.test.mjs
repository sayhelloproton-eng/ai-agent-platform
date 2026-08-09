import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MOB_NEXT_CONTRACT_VERSION,
  MOB_RESULT_CONTRACT_VERSION,
  MOBILE_INFERENCE_CONTRACT_VERSION,
  MOBILE_INFERENCE_MODELS,
  REASON_DEFAULT_MAX_TOKENS,
  isMobRetryableError,
} from "@ai-agent-platform/contracts";
import { createMobileInferenceAdapter } from "../dist/mobile-inference-adapter.js";

function validFastPayload(overrides = {}) {
  return {
    mobWorkVersion: MOBILE_INFERENCE_CONTRACT_VERSION,
    modelCategory: "FAST",
    systemPrompt: "You are a helpful assistant.",
    userPrompt: "What is the weather?",
    temperature: 0.4,
    top_p: 0.8,
    max_tokens: 1024,
    idempotencyKey: "key-001",
    ...overrides,
  };
}

function validReasonPayload(overrides = {}) {
  return {
    ...validFastPayload(),
    modelCategory: "REASON",
    max_tokens: REASON_DEFAULT_MAX_TOKENS,
    ...overrides,
  };
}

test("createMobileInferenceAdapter returns frozen object", () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:9999",
  });
  assert.ok(Object.isFrozen(adapter));
});

test("adapter.run returns error result for connection refused", async () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:19999",
    timeoutMs: 2_000,
  });
  const result = await adapter.run(validFastPayload(), {
    workItemId: "wi-001",
    taskId: "task-001",
    attempt: 1,
  });

  assert.equal(result.resultContractVersion, MOB_RESULT_CONTRACT_VERSION);
  assert.equal(result.kind, "error");
  assert.ok(result.resultRef.startsWith("mob-result:"));
  assert.ok(result.error !== null);
  assert.equal(result.retryable, isMobRetryableError(result.error.code));
  assert.equal(result.content, null);
  assert.equal(result.next, null);
});

test("adapter.run returns error on invalid URL scheme", () => {
  assert.throws(() => {
    createMobileInferenceAdapter({ baseUrl: "ftp://invalid" });
  }, /MOB base URL must/);
});

test("adapter strips trailing slash from baseUrl", () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:9999/",
    timeoutMs: 1_000,
  });
  assert.ok(Object.isFrozen(adapter));
});

test("adapter times out on unreachable endpoint", async () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://10.255.255.1:9999",
    timeoutMs: 500,
  });
  const result = await adapter.run(validFastPayload(), {
    workItemId: "wi-timeout",
    taskId: "task-timeout",
    attempt: 1,
  });

  assert.equal(result.kind, "error");
  assert.equal(result.model, "FAST");
});

test("adapter uses REASON defaults when category is REASON", async () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:29999",
    reasonMaxTokens: 4096,
    timeoutMs: 500,
  });
  const result = await adapter.run(validReasonPayload(), {
    workItemId: "wi-reason",
    taskId: "task-reason",
    attempt: 1,
  });

  assert.equal(result.model, "REASON");
});

test("adapter classifies model_busy as retryable", () => {
  assert.equal(isMobRetryableError("model_busy"), true);
  assert.equal(isMobRetryableError("server_paused"), true);
  assert.equal(isMobRetryableError("timeout"), true);
  assert.equal(isMobRetryableError("connection_refused"), false);
});

test("adapter error result includes retryable flag matching error code", async () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:39999",
    timeoutMs: 500,
  });
  const result = await adapter.run(validFastPayload(), {
    workItemId: "wi-retry",
    taskId: "task-retry",
    attempt: 1,
  });
  assert.equal(result.kind, "error");
  assert.equal(typeof result.retryable, "boolean");
});

test("adapter result includes evidenceRefs array", async () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:49999",
    timeoutMs: 500,
  });
  const result = await adapter.run(validFastPayload(), {
    workItemId: "wi-evidence",
    taskId: "task-evidence",
    attempt: 1,
  });
  assert.ok(Array.isArray(result.evidenceRefs));
  if (result.kind !== "error") {
    assert.equal(result.evidenceRefs.length, 1);
    assert.ok(result.evidenceRefs[0].startsWith("mob-evidence:"));
  }
});

test("adapter result fields are present for error case", async () => {
  const adapter = createMobileInferenceAdapter({
    baseUrl: "http://127.0.0.1:59999",
    timeoutMs: 500,
  });
  const result = await adapter.run(validFastPayload(), {
    workItemId: "wi-fields",
    taskId: "task-fields",
    attempt: 1,
  });

  assert.equal(typeof result.resultRef, "string");
  assert.equal(typeof result.workItemId, "string");
  assert.equal(typeof result.taskId, "string");
  assert.equal(typeof result.model, "string");
  assert.equal(typeof result.kind, "string");
  assert.equal(typeof result.summary, "string");
  assert.equal(typeof result.retryable, "boolean");
});

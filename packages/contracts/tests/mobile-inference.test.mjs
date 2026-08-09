import assert from "node:assert/strict";
import test from "node:test";

import {
  MOBILE_INFERENCE_CONTRACT_VERSION,
  MOB_NEXT_CONTRACT_VERSION,
  MOB_RESULT_CONTRACT_VERSION,
  MOBILE_INFERENCE_MODELS,
  MOBILE_INFERENCE_MODEL_CATEGORIES,
  MOBILE_INFERENCE_RESULT_KINDS,
  FAST_DEFAULT_PARAMS,
  REASON_DEFAULT_MAX_TOKENS,
  MOB_NEXT_FIELDS,
  MOB_RETRYABLE_ERROR_CODES,
  isMobRetryableError,
  validateMobWorkPayload,
  validateMobInferenceResult,
  validateMobNextV1_2,
} from "../dist/index.js";

test("MOBILE_INFERENCE_CONTRACT_VERSION is a constant", () => {
  assert.equal(MOBILE_INFERENCE_CONTRACT_VERSION, "1.0.0");
});

test("MOB_NEXT_CONTRACT_VERSION is v1.2", () => {
  assert.equal(MOB_NEXT_CONTRACT_VERSION, "1.2");
});

test("MOB_RESULT_CONTRACT_VERSION is a constant", () => {
  assert.equal(MOB_RESULT_CONTRACT_VERSION, "1.0");
});

test("FAST model is sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think", () => {
  assert.equal(
    MOBILE_INFERENCE_MODELS.FAST,
    "sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think",
  );
});

test("REASON model is mlx-community/Qwen3.5-4B-MLX-4bit", () => {
  assert.equal(
    MOBILE_INFERENCE_MODELS.REASON,
    "mlx-community/Qwen3.5-4B-MLX-4bit",
  );
});

test("FAST and REASON models are different", () => {
  assert.notEqual(MOBILE_INFERENCE_MODELS.FAST, MOBILE_INFERENCE_MODELS.REASON);
});

test("model categories are FAST and REASON", () => {
  assert.deepEqual(MOBILE_INFERENCE_MODEL_CATEGORIES, ["FAST", "REASON"]);
});

test("result kinds include ok, uncertain, handoff, controller, error", () => {
  assert.deepEqual(MOBILE_INFERENCE_RESULT_KINDS, [
    "ok",
    "uncertain",
    "handoff",
    "controller",
    "error",
  ]);
});

test("FAST defaults: temperature=0.4, top_p=0.8, max_tokens=1024", () => {
  assert.equal(FAST_DEFAULT_PARAMS.temperature, 0.4);
  assert.equal(FAST_DEFAULT_PARAMS.top_p, 0.8);
  assert.equal(FAST_DEFAULT_PARAMS.max_tokens, 1024);
});

test("REASON default max tokens is 2048", () => {
  assert.equal(REASON_DEFAULT_MAX_TOKENS, 2048);
});

test("mob.next fields are: continue, ok, bhr, lcl, controller", () => {
  assert.deepEqual(MOB_NEXT_FIELDS, [
    "continue",
    "ok",
    "bhr",
    "lcl",
    "controller",
  ]);
});

test("retryable errors are model_busy, server_paused, timeout", () => {
  assert.deepEqual(MOB_RETRYABLE_ERROR_CODES, [
    "model_busy",
    "server_paused",
    "timeout",
  ]);
});

test("isMobRetryableError returns true for retryable codes", () => {
  assert.equal(isMobRetryableError("model_busy"), true);
  assert.equal(isMobRetryableError("server_paused"), true);
  assert.equal(isMobRetryableError("timeout"), true);
});

test("isMobRetryableError returns false for non-retryable codes", () => {
  assert.equal(isMobRetryableError("connection_refused"), false);
  assert.equal(isMobRetryableError("unknown_error"), false);
});

// --- validateMobWorkPayload ---

function validMobWorkPayload(overrides = {}) {
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

test("validateMobWorkPayload accepts a valid FAST payload", () => {
  const result = validateMobWorkPayload(validMobWorkPayload());
  assert.equal(result.ok, true);
});

test("validateMobWorkPayload accepts a valid REASON payload", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ modelCategory: "REASON" }),
  );
  assert.equal(result.ok, true);
});

test("validateMobWorkPayload rejects unsupported version", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ mobWorkVersion: "0.9.0" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "mobWorkVersion"));
});

test("validateMobWorkPayload rejects invalid modelCategory", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ modelCategory: "INVALID" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "modelCategory"));
});

test("validateMobWorkPayload rejects empty systemPrompt", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ systemPrompt: "" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "systemPrompt"));
});

test("validateMobWorkPayload rejects empty userPrompt", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ userPrompt: "  " }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "userPrompt"));
});

test("validateMobWorkPayload rejects empty idempotencyKey", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ idempotencyKey: "" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "idempotencyKey"));
});

test("validateMobWorkPayload rejects null input", () => {
  const result = validateMobWorkPayload(null);
  assert.equal(result.ok, false);
});

test("validateMobWorkPayload rejects array input", () => {
  const result = validateMobWorkPayload([]);
  assert.equal(result.ok, false);
});

test("validateMobWorkPayload rejects negative temperature", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ temperature: -1 }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "temperature"));
});

test("validateMobWorkPayload rejects zero max_tokens", () => {
  const result = validateMobWorkPayload(
    validMobWorkPayload({ max_tokens: 0 }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "max_tokens"));
});

// --- validateMobInferenceResult ---

function validMobInferenceResult(overrides = {}) {
  return {
    resultContractVersion: MOB_RESULT_CONTRACT_VERSION,
    resultRef: "mob-result:abc123",
    workItemId: "wi-001",
    taskId: "task-001",
    model: "FAST",
    kind: "ok",
    next: {
      contractVersion: MOB_NEXT_CONTRACT_VERSION,
      continue: "proceed",
      ok: "next step",
      bhr: "",
      lcl: "",
      controller: "",
    },
    content: "The answer is 42.",
    evidenceRefs: ["mob-evidence:abc123"],
    summary: "Completed successfully.",
    error: null,
    retryable: false,
    ...overrides,
  };
}

test("validateMobInferenceResult accepts a valid ok result", () => {
  const result = validateMobInferenceResult(validMobInferenceResult());
  assert.equal(result.ok, true);
});

test("validateMobInferenceResult accepts uncertain result", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({
      kind: "uncertain",
      content: null,
      next: null,
    }),
  );
  assert.equal(result.ok, true);
});

test("validateMobInferenceResult accepts handoff result", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({
      kind: "handoff",
      next: {
        contractVersion: MOB_NEXT_CONTRACT_VERSION,
        continue: "handoff to browser",
        ok: "",
        bhr: "browser-action",
        lcl: "",
        controller: "",
      },
    }),
  );
  assert.equal(result.ok, true);
});

test("validateMobInferenceResult accepts controller result", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({
      kind: "controller",
      next: {
        contractVersion: MOB_NEXT_CONTRACT_VERSION,
        continue: "defer to controller",
        ok: "",
        bhr: "",
        lcl: "",
        controller: "controller-decision",
      },
    }),
  );
  assert.equal(result.ok, true);
});

test("validateMobInferenceResult accepts error result", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({
      kind: "error",
      content: null,
      next: null,
      error: {
        code: "timeout",
        message: "Request timed out",
      },
      retryable: true,
    }),
  );
  assert.equal(result.ok, true);
});

test("validateMobInferenceResult rejects invalid kind", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({ kind: "INVALID" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "kind"));
});

test("validateMobInferenceResult rejects invalid model", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({ model: "INVALID" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "model"));
});

test("validateMobInferenceResult rejects non-string resultRef", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({ resultRef: 123 }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "resultRef"));
});

test("validateMobInferenceResult rejects null input", () => {
  const result = validateMobInferenceResult(null);
  assert.equal(result.ok, false);
});

test("validateMobInferenceResult rejects non-boolean retryable", () => {
  const result = validateMobInferenceResult(
    validMobInferenceResult({ retryable: "yes" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "retryable"));
});

// --- validateMobNextV1_2 ---

function validMobNext(overrides = {}) {
  return {
    contractVersion: MOB_NEXT_CONTRACT_VERSION,
    continue: "proceed",
    ok: "next step",
    bhr: "",
    lcl: "",
    controller: "",
    ...overrides,
  };
}

test("validateMobNextV1_2 accepts valid mob.next", () => {
  const result = validateMobNextV1_2(validMobNext());
  assert.equal(result.ok, true);
});

test("validateMobNextV1_2 rejects wrong contract version", () => {
  const result = validateMobNextV1_2(
    validMobNext({ contractVersion: "1.0" }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "contractVersion"));
});

test("validateMobNextV1_2 requires all five fields to be strings", () => {
  const result = validateMobNextV1_2(
    validMobNext({ ok: 42 }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.path === "ok"));
});

test("validateMobNextV1_2 rejects null input", () => {
  const result = validateMobNextV1_2(null);
  assert.equal(result.ok, false);
});

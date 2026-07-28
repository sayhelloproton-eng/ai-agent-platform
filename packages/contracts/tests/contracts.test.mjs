import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACT_VERSION,
  isJsonValue,
  validateContractError,
  validateTaskRequest,
  validateTaskResult,
} from "../dist/index.js";

function validTask() {
  return {
    contractVersion: CONTRACT_VERSION,
    taskId: "task_001",
    capability: "gateway.ping",
    input: {},
    requestedBy: {
      type: "test",
      subject: "contracts-test",
    },
    metadata: {
      requestedAt: "2026-07-28T10:00:00.000Z",
      requestId: "request_001",
    },
  };
}

function validSucceededResult() {
  return {
    contractVersion: CONTRACT_VERSION,
    taskId: "task_001",
    status: "succeeded",
    output: { pong: true },
    error: null,
    evidence: [
      {
        type: "reference",
        name: "health",
        value: "local",
      },
    ],
    metadata: {
      startedAt: "2026-07-28T10:00:00.000Z",
      completedAt: "2026-07-28T10:00:00.025Z",
      durationMs: 25,
      executor: "contracts-test",
    },
  };
}

function validError() {
  return {
    code: "EXECUTION_FAILED",
    message: "Capability execution failed.",
    retryable: false,
    details: { source: "test" },
  };
}

test("accepts a valid Task Request", () => {
  assert.equal(validateTaskRequest(validTask()).ok, true);
});

test("rejects an empty taskId", () => {
  const task = validTask();
  task.taskId = " ";
  const result = validateTaskRequest(task);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.path === "taskId"));
});

test("rejects an unknown Capability", () => {
  const task = validTask();
  task.capability = "shell.exec";
  const result = validateTaskRequest(task);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "UNKNOWN_CAPABILITY"));
});

test("rejects a non-JSON Task input", () => {
  const task = validTask();
  task.input = { createdAt: new Date() };
  const result = validateTaskRequest(task);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.path === "input"));
});

test("rejects an invalid requestedAt", () => {
  const task = validTask();
  task.metadata.requestedAt = "not-a-date";
  const result = validateTaskRequest(task);
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((item) => item.path === "metadata.requestedAt"),
  );
});

test("rejects an impossible calendar date", () => {
  const task = validTask();
  task.metadata.requestedAt = "2026-02-30T10:00:00.000Z";
  const result = validateTaskRequest(task);
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((item) => item.path === "metadata.requestedAt"),
  );
});

test("reports multiple important Task issues", () => {
  const task = validTask();
  task.taskId = "";
  task.capability = "unknown";
  task.input = { invalid: undefined };
  task.metadata.requestedAt = "invalid";
  const result = validateTaskRequest(task);
  assert.equal(result.ok, false);
  assert.deepEqual(
    new Set(result.issues.map((item) => item.path)),
    new Set(["taskId", "capability", "input", "metadata.requestedAt"]),
  );
});

test("preserves allowed unknown fields", () => {
  const task = { ...validTask(), extension: { enabled: true } };
  const result = validateTaskRequest(task);
  assert.equal(result.ok, true);
  assert.equal(result.value, task);
  assert.deepEqual(result.value.extension, { enabled: true });
});

test("accepts a valid succeeded Task Result", () => {
  assert.equal(validateTaskResult(validSucceededResult()).ok, true);
});

test("rejects a succeeded Result carrying an error", () => {
  const result = validSucceededResult();
  result.error = validError();
  const validation = validateTaskResult(result);
  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some((item) => item.code === "RESULT_INVARIANT"),
  );
});

test("rejects a failed Result without an error", () => {
  const result = validSucceededResult();
  result.status = "failed";
  const validation = validateTaskResult(result);
  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some((item) => item.code === "RESULT_INVARIANT"),
  );
});

test("rejects a negative duration", () => {
  const result = validSucceededResult();
  result.metadata.durationMs = -1;
  const validation = validateTaskResult(result);
  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some((item) => item.code === "INVALID_DURATION"),
  );
});

test("rejects completedAt earlier than startedAt", () => {
  const result = validSucceededResult();
  result.metadata.completedAt = "2026-07-28T09:59:59.000Z";
  const validation = validateTaskResult(result);
  assert.equal(validation.ok, false);
  assert.ok(
    validation.issues.some((item) => item.code === "INVALID_TIME_ORDER"),
  );
});

test("rejects an invalid Error Code", () => {
  const error = validError();
  error.code = "UNKNOWN";
  const result = validateContractError(error);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "INVALID_ERROR_CODE"));
});

test("rejects a stack trace in Contract Error", () => {
  const error = { ...validError(), stack: "sensitive stack" };
  const result = validateContractError(error);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "FORBIDDEN_FIELD"));
});

test("isJsonValue rejects non-JSON values", () => {
  class CustomValue {}
  const cyclic = {};
  cyclic.self = cyclic;

  assert.equal(isJsonValue(new Date()), false);
  assert.equal(isJsonValue(1n), false);
  assert.equal(isJsonValue(Symbol("value")), false);
  assert.equal(isJsonValue(() => undefined), false);
  assert.equal(isJsonValue(Number.POSITIVE_INFINITY), false);
  assert.equal(isJsonValue(new Map()), false);
  assert.equal(isJsonValue(new Set()), false);
  assert.equal(isJsonValue(new CustomValue()), false);
  assert.equal(isJsonValue(cyclic), false);
});

test("validators do not mutate input objects", () => {
  const task = validTask();
  const snapshot = structuredClone(task);
  validateTaskRequest(task);
  assert.deepEqual(task, snapshot);
});

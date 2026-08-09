import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACT_VERSION,
  isJsonValue,
  validateClaimControllerTaskRequest,
  validateContractError,
  validateGetTaskDecisionContextRequest,
  validateReleaseControllerTaskRequest,
  validateSubmitControllerCommandRequest,
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

test("accepts valid Controller Action requests", () => {
  assert.equal(
    validateGetTaskDecisionContextRequest({ taskId: "task-ctl-001" }).ok,
    true,
  );
  assert.equal(
    validateClaimControllerTaskRequest({
      taskId: "task-ctl-001",
      expectedTaskVersion: 1,
      idempotencyKey: "claim-001",
    }).ok,
    true,
  );
  assert.equal(
    validateSubmitControllerCommandRequest({
      taskId: "task-ctl-001",
      claimToken: "token-001",
      expectedTaskVersion: 2,
      expectedPlanVersion: null,
      idempotencyKey: "command-001",
      command: {
        type: "CREATE_PLAN",
        reasonSummary: "Create the minimum executable plan.",
        payload: {
          nodes: [
            {
              nodeId: "node-01",
              title: "Inspect current context",
              kind: "DECISION",
              requiredRole: "controller",
            },
          ],
        },
      },
    }).ok,
    true,
  );
  assert.equal(
    validateReleaseControllerTaskRequest({
      taskId: "task-ctl-001",
      claimToken: "token-001",
      idempotencyKey: "release-001",
    }).ok,
    true,
  );
});

test("rejects caller-supplied Controller identity fields", () => {
  const result = validateClaimControllerTaskRequest({
    taskId: "task-ctl-001",
    expectedTaskVersion: 1,
    idempotencyKey: "claim-001",
    profileId: "forged-profile",
    roleId: "controller",
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.issues.filter((item) => item.code === "SERVER_OWNED_FIELD").length,
    2,
  );
});

test("rejects Controller commands that patch plan runtime state", () => {
  const result = validateSubmitControllerCommandRequest({
    taskId: "task-ctl-001",
    claimToken: "token-001",
    expectedTaskVersion: 2,
    expectedPlanVersion: null,
    idempotencyKey: "command-001",
    command: {
      type: "CREATE_PLAN",
      reasonSummary: "Invalid direct state patch.",
      payload: {
        nodes: [
          {
            nodeId: "node-01",
            title: "Invalid node",
            kind: "DECISION",
            requiredRole: "controller",
            status: "COMPLETED",
          },
        ],
      },
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "SERVER_OWNED_FIELD"));
});



test("rejects unknown Controller fields instead of silently ignoring them", () => {
  const result = validateSubmitControllerCommandRequest({
    taskId: "task-001",
    claimToken: "claim-token",
    expectedTaskVersion: 2,
    expectedPlanVersion: null,
    idempotencyKey: "idem-unknown",
    command: {
      type: "CREATE_PLAN",
      reasonSummary: "Create a plan.",
      unexpectedCommandField: true,
      payload: {
        nodes: [
          {
            nodeId: "node-001",
            title: "Inspect context",
            kind: "DECISION",
            requiredRole: "controller",
            unexpectedNodeField: "forbidden",
          },
        ],
        unexpectedPayloadField: true,
      },
    },
    unexpectedRequestField: true,
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((entry) => entry.path === "unexpectedRequestField"));
  assert.ok(result.issues.some((entry) => entry.path === "command.unexpectedCommandField"));
  assert.ok(result.issues.some((entry) => entry.path === "command.payload.unexpectedPayloadField"));
  assert.ok(result.issues.some((entry) => entry.path === "command.payload.nodes[0].unexpectedNodeField"));
});


test("Browser Host role work separates executor role from page target role", () => {
  const valid = validateSubmitControllerCommandRequest({
    taskId: "task-browser-target-001",
    claimToken: "token-browser-target-001",
    expectedTaskVersion: 3,
    expectedPlanVersion: 2,
    idempotencyKey: "browser-target-valid",
    command: {
      type: "REQUEST_ROLE_WORK",
      reasonSummary: "Observe the bound Controller page.",
      payload: {
        nodeId: "browser-observe",
        targetDomain: "browser-host",
        requiredRole: "browser-host",
        objective: "Observe the bound page without mutating it.",
        inputRef: "payload:browser-observe",
        expectedResultType: "browser-host-result-v0.1.0",
        targetRoleRef: "controller",
        targetProfileRef: "g-controller-real",
        conversationRef: "conversation-real",
        hostActionType: "OBSERVE_PAGE",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    },
  });
  assert.equal(valid.ok, true, JSON.stringify(valid));

  const missingTargetRole = validateSubmitControllerCommandRequest({
    taskId: "task-browser-target-001",
    claimToken: "token-browser-target-001",
    expectedTaskVersion: 3,
    expectedPlanVersion: 2,
    idempotencyKey: "browser-target-missing-role",
    command: {
      type: "REQUEST_ROLE_WORK",
      reasonSummary: "Observe the bound Controller page.",
      payload: {
        nodeId: "browser-observe",
        targetDomain: "browser-host",
        requiredRole: "browser-host",
        objective: "Observe the bound page without mutating it.",
        inputRef: "payload:browser-observe",
        expectedResultType: "browser-host-result-v0.1.0",
        targetProfileRef: "g-controller-real",
        hostActionType: "OBSERVE_PAGE",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    },
  });
  assert.equal(missingTargetRole.ok, false);
  assert.ok(missingTargetRole.issues.some((item) => item.path === "command.payload.targetRoleRef" && item.code === "REQUIRED_FIELD"));

  const submitWithoutApprovalRef = validateSubmitControllerCommandRequest({
    taskId: "task-browser-target-001",
    claimToken: "token-browser-target-001",
    expectedTaskVersion: 3,
    expectedPlanVersion: 2,
    idempotencyKey: "browser-target-submit-no-approval",
    command: {
      type: "REQUEST_ROLE_WORK",
      reasonSummary: "Submit one approved message.",
      payload: {
        nodeId: "browser-submit",
        targetDomain: "browser-host",
        requiredRole: "browser-host",
        objective: "Submit the approved message exactly once.",
        inputRef: "payload:browser-submit",
        expectedResultType: "browser-host-result-v0.1.0",
        targetRoleRef: "controller",
        targetProfileRef: "g-controller-real",
        conversationRef: "conversation-real",
        hostActionType: "SUBMIT_MESSAGE",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    },
  });
  assert.equal(submitWithoutApprovalRef.ok, false);
  assert.ok(submitWithoutApprovalRef.issues.some((item) => item.path === "command.payload.approvalRef" && item.code === "REQUIRED_FIELD"));

  const submitWithoutInputRef = validateSubmitControllerCommandRequest({
    taskId: "task-browser-target-001",
    claimToken: "token-browser-target-001",
    expectedTaskVersion: 3,
    expectedPlanVersion: 2,
    idempotencyKey: "browser-target-submit-no-input",
    command: {
      type: "REQUEST_ROLE_WORK",
      reasonSummary: "Submit one approved message.",
      payload: {
        nodeId: "browser-submit",
        targetDomain: "browser-host",
        requiredRole: "browser-host",
        objective: "Submit the approved message exactly once.",
        expectedResultType: "browser-host-result-v0.1.0",
        targetRoleRef: "controller",
        targetProfileRef: "g-controller-real",
        conversationRef: "conversation-real",
        hostActionType: "SUBMIT_MESSAGE",
        approvalRef: "approval:browser-submit",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    },
  });
  assert.equal(submitWithoutInputRef.ok, false);
  assert.ok(submitWithoutInputRef.issues.some((item) => item.path === "command.payload.inputRef" && item.code === "REQUIRED_FIELD"));

  const invalidBrowserExpiry = validateSubmitControllerCommandRequest({
    taskId: "task-browser-target-001",
    claimToken: "token-browser-target-001",
    expectedTaskVersion: 3,
    expectedPlanVersion: 2,
    idempotencyKey: "browser-target-invalid-expiry",
    command: {
      type: "REQUEST_ROLE_WORK",
      reasonSummary: "Observe the bound Controller page.",
      payload: {
        nodeId: "browser-observe",
        targetDomain: "browser-host",
        requiredRole: "browser-host",
        objective: "Observe the bound page without mutating it.",
        expectedResultType: "browser-host-result-v0.1.0",
        targetRoleRef: "controller",
        targetProfileRef: "g-controller-real",
        hostActionType: "OBSERVE_PAGE",
        expiresAt: "not-a-date",
      },
    },
  });
  assert.equal(invalidBrowserExpiry.ok, false);
  assert.ok(invalidBrowserExpiry.issues.some((item) => item.path === "command.payload.expiresAt" && item.code === "INVALID_DATE_TIME"));
});

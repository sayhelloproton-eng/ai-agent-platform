import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_GRANT_CONTRACT_VERSION,
  PHASE2_INTEGRATION_CONTRACT_VERSION,
  validateApprovalGrantV1,
  validateTaskIntakeV1Request,
} from "../dist/index.js";

function grant(overrides = {}) {
  return {
    approvalContractVersion: APPROVAL_GRANT_CONTRACT_VERSION,
    approvalRef: "approval:test",
    grantId: "grant:test",
    actionFingerprint: "fingerprint:test",
    bindingId: "binding:test",
    taskId: "task:test",
    commandId: "command:test",
    allowedActionType: "SUBMIT_MESSAGE",
    pagePreconditionHash: "page:test",
    singleUse: true,
    expiresAt: "2026-08-07T00:00:00.000Z",
    consumedAt: null,
    consumedBy: null,
    ...overrides,
  };
}

function intake(overrides = {}) {
  return {
    contractVersion: PHASE2_INTEGRATION_CONTRACT_VERSION,
    taskId: "task:test",
    title: "Validate phase 2 intake",
    objective: "Freeze a safe public integration contract.",
    requiredRole: "controller",
    plan: {
      source: { type: "user", ref: "user:test" },
      currentNodeId: "node:one",
      nodes: [{
        nodeId: "node:one",
        title: "Inspect",
        kind: "DECISION",
        requiredRole: "controller",
      }],
    },
    payloadResources: [{ payloadRef: "payload:test", value: { ok: true } }],
    approvalGrants: [grant()],
    idempotencyKey: "intake:test",
    ...overrides,
  };
}

test("accepts a complete Phase 2 Task Intake v1 request", () => {
  assert.equal(validateTaskIntakeV1Request(intake()).ok, true);
});

test("rejects duplicate, dangling, self-referential, and unknown plan references", () => {
  const value = intake({
    plan: {
      source: { type: "invalid", ref: "user:test" },
      currentNodeId: "node:missing",
      nodes: [
        { nodeId: "node:one", title: "One", kind: "UNKNOWN", requiredRole: "controller", dependsOn: ["node:one", "node:missing"] },
        { nodeId: "node:one", title: "Duplicate", kind: "WORK", requiredRole: "worker" },
      ],
    },
  });
  const result = validateTaskIntakeV1Request(value);
  assert.equal(result.ok, false);
  const codes = new Set(result.issues.map((item) => item.code));
  assert.ok(codes.has("UNSUPPORTED_SOURCE"));
  assert.ok(codes.has("UNSUPPORTED_NODE_KIND"));
  assert.ok(codes.has("DUPLICATE_REFERENCE"));
  assert.ok(codes.has("SELF_DEPENDENCY"));
  assert.ok(codes.has("UNKNOWN_REFERENCE"));
});

test("rejects duplicate external references and malformed Approval Grant expiry", () => {
  const invalidGrant = grant({ expiresAt: "not-a-date" });
  const result = validateTaskIntakeV1Request(intake({
    payloadResources: [
      { payloadRef: "payload:test", value: 1 },
      { payloadRef: "payload:test", value: 2 },
    ],
    approvalGrants: [invalidGrant, { ...invalidGrant }],
  }));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "INVALID_DATE_TIME"));
  assert.ok(result.issues.filter((item) => item.code === "DUPLICATE_REFERENCE").length >= 3);
  assert.equal(validateApprovalGrantV1(invalidGrant).ok, false);
});

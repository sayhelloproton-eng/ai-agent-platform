import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import {
  APPROVAL_GRANT_CONTRACT_VERSION,
  LOCAL_WORK_HANDOFF_VERSION,
} from "@ai-agent-platform/contracts";
import {
  classifyLocalResult,
} from "@ai-agent-platform/local-control";
import {
  InMemoryTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlService,
} from "@ai-agent-platform/task-control";

import { createGatewayServer } from "../dist/app.js";
import { createLocalWorkWorker } from "../dist/local-work-worker.js";
import { Phase2IntegrationStore } from "../dist/phase2-integration-store.js";

const API_KEY = "phase2-integration-api-key-0123456789abcdef";

function approvalGrant(overrides = {}) {
  return {
    approvalContractVersion: APPROVAL_GRANT_CONTRACT_VERSION,
    approvalRef: "approval:phase2-001",
    grantId: "grant:phase2-001",
    actionFingerprint: "fingerprint:phase2-001",
    bindingId: "binding:phase2-001",
    taskId: "task:phase2-001",
    commandId: "host-command:phase2-001",
    allowedActionType: "SUBMIT_MESSAGE",
    pagePreconditionHash: "page:phase2-001",
    singleUse: true,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    consumedAt: null,
    consumedBy: null,
    ...overrides,
  };
}

async function startApprovalGateway(store) {
  const server = createGatewayServer({
    apiKey: API_KEY,
    approvalGrantRegistrar: store,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      server.close();
      await once(server, "close");
    },
  };
}

test("Approval Grant issuance is authenticated, idempotent, binding-aware, and single-use", async () => {
  const store = Phase2IntegrationStore.inMemory();
  const gateway = await startApprovalGateway(store);
  const grant = approvalGrant();
  try {
    const unauthenticated = await fetch(`${gateway.baseUrl}/v1/approvals/grants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(grant),
    });
    assert.equal(unauthenticated.status, 401);

    for (const expectedStatus of [201, 201]) {
      const response = await fetch(`${gateway.baseUrl}/v1/approvals/grants`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(grant),
      });
      assert.equal(response.status, expectedStatus);
      assert.equal((await response.json()).data.status, "ISSUED");
    }

    await assert.rejects(
      store.putApprovalGrant(approvalGrant({ commandId: "host-command:different" })),
      (error) => error?.code === "APPROVAL_REF_CONFLICT" && error?.httpStatus === 409,
    );
    const consumed = await store.consumeApprovalGrant(
      grant.approvalRef,
      grant.grantId,
      grant.commandId,
    );
    assert.equal(consumed.consumedBy, grant.commandId);
    await assert.rejects(
      store.consumeApprovalGrant(grant.approvalRef, grant.grantId, grant.commandId),
      (error) => error?.code === "APPROVAL_ALREADY_CONSUMED" && error?.httpStatus === 409,
    );
  } finally {
    await gateway.close();
  }
});

function partialLocalResult(request) {
  return {
    local_result_version: "0.1.0",
    request_id: request.request_id,
    capability: request.capability,
    status: "PARTIAL",
    data: { cursor_ref: "cursor:next" },
    error: null,
    warnings: ["bounded page"],
    evidence: {
      source_type: "local_observation",
      content_hash: "f".repeat(64),
      observed_at: new Date().toISOString(),
    },
    meta: {
      cli_package: "@ai-agent-platform/local-control",
      cli_version: "0.1.0",
      duration_ms: 1,
      truncated: true,
    },
  };
}

test("Local PARTIAL is terminal for one Local Request but non-terminal progress for its Work Item", async () => {
  const taskControl = new TaskControlService(
    new InMemoryTaskControlStore(),
    new SystemClock(),
    new RandomIdGenerator(),
  );
  const store = Phase2IntegrationStore.inMemory();
  await taskControl.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: "task:partial-semantics",
    title: "Verify PARTIAL semantics",
    objective: "Keep the Work Item open after a bounded Local Request result.",
    requiredRole: "controller",
    plan: {
      source: { type: "controller", ref: "controller" },
      currentNodeId: "local-page",
      nodes: [{
        nodeId: "local-page",
        title: "Read a bounded page",
        kind: "ACTION",
        requiredRole: "local-executor",
      }],
    },
    idempotencyKey: "create:partial-semantics",
    producerRef: "phase2-test",
  });
  const beforeClaim = await taskControl.getTask("task:partial-semantics");
  const claim = await taskControl.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: beforeClaim.taskId,
    roleId: "controller",
    profileId: "controller",
    leaseMs: 60_000,
    expectedTaskVersion: beforeClaim.taskVersion,
    idempotencyKey: "claim:partial-semantics",
  });
  const receipt = await taskControl.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: beforeClaim.taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "request:partial-semantics",
    producerRef: "controller",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "local-page",
        targetDomain: "local-control",
        requiredRole: "local-executor",
        capabilityRef: "local.repository.tree.read",
        inputRef: "payload:partial-semantics",
        expectedResultType: "local-result-v1",
      },
    },
  });
  const workItemId = receipt.workItemIds[0];
  assert.ok(workItemId);
  await store.putPayload("payload:partial-semantics", {
    localWorkVersion: LOCAL_WORK_HANDOFF_VERSION,
    actor: { actor_type: "controller", actor_id: "controller" },
    scope: { project_id: "ai-agent-platform" },
    parameters: { path: ".", max_entries: 1 },
    budget: {
      timeout_ms: 5_000,
      max_stdout_bytes: 32_768,
      max_result_chars: 32_768,
    },
    continuation: {
      cursorRef: "cursor:start",
      completionPolicy: "CONTROLLER_DECIDES",
    },
  });
  const worker = createLocalWorkWorker({
    taskControl,
    integrationStore: store,
    client: { execute: async (request) => partialLocalResult(request) },
  });
  const cycle = await worker.runOnce();
  assert.equal(cycle.progressed, 1);
  assert.deepEqual(classifyLocalResult(partialLocalResult({
    request_id: "request",
    capability: "local.repository.tree.read",
  })), {
    terminal: true,
    continue_polling: false,
    retryable: false,
  });
  const work = await taskControl.getCurrentWorkItem(workItemId);
  assert.equal(work.status, "RUNNING");
  assert.equal(work.progressStatus, "PARTIAL");
  assert.ok(work.progressRef?.startsWith("local-result:"));
  assert.equal((await taskControl.getTask(beforeClaim.taskId)).status, "WAITING_FOR_ROLE_WORK");
});

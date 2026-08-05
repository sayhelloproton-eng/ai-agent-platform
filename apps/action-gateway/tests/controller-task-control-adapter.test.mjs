import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryTaskControlStore,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlService,
} from "@ai-agent-platform/task-control";

import { ControllerTaskControlError } from "../dist/controller-task-control-error.js";
import { createTaskControlControllerAdapter } from "../dist/task-control-controller-adapter.js";

class ManualClock {
  constructor(value = "2026-08-06T00:00:00.000Z") {
    this.value = new Date(value);
  }
  now() {
    return new Date(this.value);
  }
  advance(ms) {
    this.value = new Date(this.value.getTime() + ms);
  }
}

class SequenceIds {
  constructor() {
    this.value = 0;
  }
  next(prefix) {
    this.value += 1;
    return `${prefix}-${String(this.value).padStart(4, "0")}`;
  }
  token(prefix) {
    this.value += 1;
    return `${prefix}-${String(this.value).padStart(4, "0")}`;
  }
}

const identityA = {
  profileId: "controller-a",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};
const identityB = {
  profileId: "controller-b",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};

async function harness(options = {}) {
  const clock = options.clock ?? new ManualClock();
  const ids = new SequenceIds();
  const service = new TaskControlService(
    new InMemoryTaskControlStore(),
    clock,
    ids,
  );
  await service.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: options.taskId ?? "task-controller-adapter-001",
    title: "Verify formal Controller integration",
    objective: "Use the CTL application contract over formal Task Control.",
    requiredRole: "controller",
    requirementRef: "requirement-controller-adapter-001",
    idempotencyKey: `create:${options.taskId ?? "task-controller-adapter-001"}`,
    producerRef: "controller-adapter-test",
  });
  const adapter = createTaskControlControllerAdapter(service, {
    projectId: "ai-agent-platform",
    claimTtlMs: options.claimTtlMs ?? 60_000,
  });
  return { adapter, clock, service };
}

function createPlanRequest(claim) {
  return {
    taskId: claim.taskId,
    claimToken: claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: null,
    idempotencyKey: "create-plan",
    command: {
      type: "CREATE_PLAN",
      reasonSummary: "Create the formal two-node Controller plan.",
      payload: {
        nodes: [
          {
            nodeId: "inspect-context",
            title: "Inspect the current context",
            kind: "DECISION",
            requiredRole: "controller",
          },
          {
            nodeId: "finish-task",
            title: "Finish the Controller task",
            kind: "FINALIZE",
            requiredRole: "controller",
            dependsOn: ["inspect-context"],
          },
        ],
      },
    },
  };
}

test("formal adapter requires Decision Context before Controller Claim", async () => {
  const { adapter } = await harness();
  await assert.rejects(
    adapter.claimTask(
      {
        taskId: "task-controller-adapter-001",
        expectedTaskVersion: 2,
        idempotencyKey: "claim-without-context",
      },
      identityA,
    ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_CONTEXT_REQUIRED",
  );
});

test("formal adapter maps Context, Claim, Plan, version conflicts, replay, and completion", async () => {
  const { adapter } = await harness();
  const context = await adapter.getDecisionContext(
    { taskId: "task-controller-adapter-001" },
    identityA,
  );
  assert.equal(context.contractVersion, "1.0.0");
  assert.equal(context.task.projectId, "ai-agent-platform");
  assert.equal(context.task.plan, null);
  assert.ok(context.allowedControllerCommands.includes("CREATE_PLAN"));
  assert.equal(context.allowedControllerCommands.includes("REQUEST_ROLE_WORK"), false);
  assert.equal(context.allowedControllerCommands.includes("REQUEST_APPROVAL"), false);

  const claim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "claim-a",
    },
    identityA,
  );
  const request = createPlanRequest(claim);
  const created = await adapter.submitCommand(request, identityA);
  assert.equal(created.task.plan.planId, `${context.task.taskId}:plan`);
  assert.equal(created.task.plan.currentNodeId, "inspect-context");
  assert.equal(created.task.plan.nodes[0].status, "READY");
  assert.equal(created.task.plan.nodes[1].status, "PENDING");

  const replay = await adapter.submitCommand(request, identityA);
  assert.equal(replay.commandId, created.commandId);
  assert.equal(replay.idempotentReplay, true);

  await assert.rejects(
    adapter.submitCommand(
      {
        ...request,
        command: {
          ...request.command,
          reasonSummary: "Different request with the same key.",
        },
      },
      identityA,
    ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_IDEMPOTENCY_CONFLICT",
  );

  await assert.rejects(
    adapter.submitCommand(
      {
        taskId: created.task.taskId,
        claimToken: claim.claimToken,
        expectedTaskVersion: claim.taskVersion,
        expectedPlanVersion: created.task.plan.planVersion,
        idempotencyKey: "stale-command",
        command: {
          type: "BLOCK_TASK",
          reasonSummary: "Exercise stale Task Version mapping.",
          payload: { reason: "stale" },
        },
      },
      identityA,
    ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_TASK_VERSION_CONFLICT",
  );

  const firstAdvanced = await adapter.submitCommand(
    {
      taskId: created.task.taskId,
      claimToken: claim.claimToken,
      expectedTaskVersion: created.task.taskVersion,
      expectedPlanVersion: created.task.plan.planVersion,
      idempotencyKey: "advance-first",
      command: {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "First node accepted.",
        payload: { nodeId: "inspect-context", summary: "Context accepted." },
      },
    },
    identityA,
  );
  assert.equal(firstAdvanced.task.plan.currentNodeId, "finish-task");
  assert.equal(firstAdvanced.task.plan.status, "ACTIVE");
  assert.equal(firstAdvanced.task.plan.nodes[0].status, "COMPLETED");
  assert.equal(firstAdvanced.task.plan.nodes[1].status, "READY");

  const secondAdvanced = await adapter.submitCommand(
    {
      taskId: firstAdvanced.task.taskId,
      claimToken: claim.claimToken,
      expectedTaskVersion: firstAdvanced.task.taskVersion,
      expectedPlanVersion: firstAdvanced.task.plan.planVersion,
      idempotencyKey: "advance-second",
      command: {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "Final node accepted.",
        payload: { nodeId: "finish-task", summary: "Final node accepted." },
      },
    },
    identityA,
  );
  assert.equal(secondAdvanced.task.plan.currentNodeId, null);
  assert.equal(secondAdvanced.task.plan.status, "COMPLETED");

  const completed = await adapter.submitCommand(
    {
      taskId: secondAdvanced.task.taskId,
      claimToken: claim.claimToken,
      expectedTaskVersion: secondAdvanced.task.taskVersion,
      expectedPlanVersion: secondAdvanced.task.plan.planVersion,
      idempotencyKey: "complete-task",
      command: {
        type: "COMPLETE_TASK",
        reasonSummary: "All Plan Nodes are terminal.",
        payload: { summary: "Controller integration task completed." },
      },
    },
    identityA,
  );
  assert.equal(completed.task.lifecycleStatus, "COMPLETED");
  assert.equal(completed.task.claim, null);
});

test("formal adapter releases a claim through Task Control and returns the audit Event", async () => {
  const { adapter } = await harness({ taskId: "task-release-001" });
  const context = await adapter.getDecisionContext(
    { taskId: "task-release-001" },
    identityA,
  );
  const claim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "claim-release",
    },
    identityA,
  );
  const released = await adapter.releaseTask(
    {
      taskId: claim.taskId,
      claimToken: claim.claimToken,
      idempotencyKey: "release-a",
    },
    identityA,
  );
  assert.equal(released.released, true);
  assert.equal(released.event.eventType, "controller.claim.released");
});

test("expired formal claim is replaced and the stale token is fenced", async () => {
  const clock = new ManualClock();
  const { adapter, service } = await harness({
    taskId: "task-takeover-001",
    clock,
    claimTtlMs: 1_000,
  });
  let context = await adapter.getDecisionContext(
    { taskId: "task-takeover-001" },
    identityA,
  );
  const oldClaim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "old-claim",
    },
    identityA,
  );
  clock.advance(1_001);
  await service.reconciler.reconcile(context.task.taskId);
  context = await adapter.getDecisionContext(
    { taskId: "task-takeover-001" },
    identityB,
  );
  const nextClaim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "next-claim",
    },
    identityB,
  );
  assert.ok(nextClaim.claim.claimEpoch > oldClaim.claim.claimEpoch);

  await assert.rejects(
    adapter.submitCommand(
      {
        taskId: context.task.taskId,
        claimToken: oldClaim.claimToken,
        expectedTaskVersion: nextClaim.taskVersion,
        expectedPlanVersion: null,
        idempotencyKey: "stale-token",
        command: {
          type: "CREATE_PLAN",
          reasonSummary: "Stale token must be rejected.",
          payload: {
            nodes: [
              {
                nodeId: "stale",
                title: "Stale",
                kind: "DECISION",
                requiredRole: "controller",
              },
            ],
          },
        },
      },
      identityA,
    ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_CLAIM_INVALID",
  );
});

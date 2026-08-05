import assert from "node:assert/strict";
import test from "node:test";

import {
  ControllerTaskControlError,
  createInMemoryControllerTaskControl,
} from "../dist/controller-task-control.js";

const controllerA = {
  profileId: "controller-a",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};
const controllerB = {
  profileId: "controller-b",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};

function createPlanRequest(claim, context) {
  return {
    taskId: context.task.taskId,
    claimToken: claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: null,
    idempotencyKey: "create-plan-001",
    command: {
      type: "CREATE_PLAN",
      reasonSummary: "Create a two-node Controller MVP plan.",
      payload: {
        nodes: [
          {
            nodeId: "inspect-context",
            title: "Inspect the latest decision context",
            kind: "DECISION",
            requiredRole: "controller",
          },
          {
            nodeId: "finish-controller-mvp",
            title: "Finish the Controller MVP task",
            kind: "FINALIZE",
            requiredRole: "controller",
          },
        ],
      },
    },
  };
}

test("Controller must query the current context before claiming", () => {
  const taskControl = createInMemoryControllerTaskControl();
  assert.throws(
    () =>
      taskControl.claimTask(
        {
          taskId: "task-ctl-001",
          expectedTaskVersion: 1,
          idempotencyKey: "claim-without-context",
        },
        controllerA,
      ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_CONTEXT_REQUIRED",
  );
});

test("Controller command atomically advances task, plan, and event versions", () => {
  const taskControl = createInMemoryControllerTaskControl();
  const context = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    controllerA,
  );
  const claim = taskControl.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "claim-001",
    },
    controllerA,
  );
  const created = taskControl.submitCommand(
    createPlanRequest(claim, context),
    controllerA,
  );

  assert.equal(created.task.taskVersion, claim.taskVersion + 1);
  assert.equal(created.task.plan.planVersion, 1);
  assert.equal(created.task.plan.currentNodeId, "inspect-context");
  assert.equal(created.event.eventType, "task.plan.created");
  assert.equal(created.event.taskVersion, created.task.taskVersion);
  assert.equal(created.event.planVersion, created.task.plan.planVersion);

  const replay = taskControl.submitCommand(
    createPlanRequest(claim, context),
    controllerA,
  );
  assert.equal(replay.commandId, created.commandId);
  assert.equal(replay.idempotentReplay, true);
});

test("expired Controller claim can be taken over by another profile with the same role", () => {
  let currentTime = new Date("2026-08-05T08:00:00.000Z");
  const taskControl = createInMemoryControllerTaskControl({
    now: () => currentTime,
    claimTtlMs: 1_000,
  });

  const firstContext = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    controllerA,
  );
  taskControl.claimTask(
    {
      taskId: "task-ctl-001",
      expectedTaskVersion: firstContext.task.taskVersion,
      idempotencyKey: "claim-a",
    },
    controllerA,
  );

  currentTime = new Date("2026-08-05T08:00:02.000Z");
  const takeoverContext = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    controllerB,
  );
  const takeover = taskControl.claimTask(
    {
      taskId: "task-ctl-001",
      expectedTaskVersion: takeoverContext.task.taskVersion,
      idempotencyKey: "claim-b",
    },
    controllerB,
  );

  assert.equal(takeover.claim.claimedByProfile, "controller-b");
  assert.equal(takeover.claim.roleId, "controller");
  assert.equal(takeover.claim.claimEpoch, 2);
});

test("non-controller role cannot claim the Controller task", () => {
  const taskControl = createInMemoryControllerTaskControl();
  const observer = {
    profileId: "observer-a",
    roleId: "observer",
    projectIds: ["ai-agent-platform"],
  };
  const context = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    observer,
  );
  assert.deepEqual(context.allowedControllerCommands, []);
  assert.throws(
    () =>
      taskControl.claimTask(
        {
          taskId: "task-ctl-001",
          expectedTaskVersion: context.task.taskVersion,
          idempotencyKey: "observer-claim",
        },
        observer,
      ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_ROLE_NOT_ALLOWED",
  );
});

test("rejected multi-operation plan revision leaves Task and Plan unchanged", () => {
  const taskControl = createInMemoryControllerTaskControl();
  const context = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    controllerA,
  );
  const claim = taskControl.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "rollback-claim",
    },
    controllerA,
  );
  const created = taskControl.submitCommand(
    {
      ...createPlanRequest(claim, context),
      idempotencyKey: "rollback-create-plan",
    },
    controllerA,
  );

  assert.throws(
    () =>
      taskControl.submitCommand(
        {
          taskId: created.task.taskId,
          claimToken: claim.claimToken,
          expectedTaskVersion: created.task.taskVersion,
          expectedPlanVersion: created.task.plan.planVersion,
          idempotencyKey: "rollback-revise-plan",
          command: {
            type: "REVISE_PLAN",
            reasonSummary: "Exercise transactional rollback.",
            payload: {
              operations: [
                {
                  operation: "CANCEL_NODE",
                  nodeId: "inspect-context",
                  reasonSummary: "This mutation must be rolled back.",
                },
                {
                  operation: "INSERT_NODE_AFTER",
                  afterNodeId: "missing-anchor",
                  node: {
                    nodeId: "never-inserted",
                    title: "Never inserted",
                    kind: "WORK",
                    requiredRole: "controller",
                  },
                },
              ],
            },
          },
        },
        controllerA,
      ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_NODE_NOT_FOUND",
  );

  const after = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    controllerA,
  );
  assert.equal(after.task.taskVersion, created.task.taskVersion);
  assert.equal(after.task.plan.planVersion, created.task.plan.planVersion);
  assert.equal(after.task.plan.currentNodeId, "inspect-context");
  assert.equal(after.task.plan.nodes[0].status, "READY");
  assert.equal(
    after.task.plan.nodes.some((node) => node.nodeId === "never-inserted"),
    false,
  );
  assert.equal(after.task.latestEventSequence, created.event.sequence);
});

test("BLOCK_TASK records a waiting condition without converting it to an explicit pause", () => {
  const taskControl = createInMemoryControllerTaskControl();
  const context = taskControl.getDecisionContext(
    { taskId: "task-ctl-001" },
    controllerA,
  );
  const claim = taskControl.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "block-claim",
    },
    controllerA,
  );
  const created = taskControl.submitCommand(
    {
      ...createPlanRequest(claim, context),
      idempotencyKey: "block-create-plan",
    },
    controllerA,
  );
  const blocked = taskControl.submitCommand(
    {
      taskId: created.task.taskId,
      claimToken: claim.claimToken,
      expectedTaskVersion: created.task.taskVersion,
      expectedPlanVersion: created.task.plan.planVersion,
      idempotencyKey: "block-task",
      command: {
        type: "BLOCK_TASK",
        reasonSummary: "Wait for an external domain result.",
        payload: { reason: "WAITING_EXTERNAL_RESULT" },
      },
    },
    controllerA,
  );

  assert.equal(blocked.task.lifecycleStatus, "ACTIVE");
  assert.equal(blocked.task.blockingReason, "WAITING_EXTERNAL_RESULT");
  assert.equal(blocked.task.plan.nodes[0].status, "WAITING");
});

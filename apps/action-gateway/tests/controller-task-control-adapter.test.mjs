import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  InMemoryTaskControlStore,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlService,
} from "@ai-agent-platform/task-control";

import { ControllerTaskControlError } from "../dist/controller-task-control-error.js";
import {
  InMemoryControllerIdempotencySnapshotStore,
  JsonFileControllerIdempotencySnapshotStore,
} from "../dist/controller-idempotency-store.js";
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
  if (options.createTask !== false) {
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
  }
  const idempotencyStore =
    options.idempotencyStore ??
    new InMemoryControllerIdempotencySnapshotStore();
  const adapter = createTaskControlControllerAdapter(service, {
    projectId: "ai-agent-platform",
    claimTtlMs: options.claimTtlMs ?? 60_000,
    idempotencyStore,
  });
  return { adapter, clock, service, idempotencyStore };
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
  assert.ok(
    context.constraints.some((value) => value.includes("REQUEST_ROLE_WORK")),
  );
  assert.ok(
    context.constraints.some((value) => value.includes("INSERT_NODE_AFTER")),
  );

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


test("formal adapter replays the exact first response after adapter restart", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "aap-controller-idempotency-"));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  const statePath = join(directory, "controller-idempotency.json");
  const firstStore = await JsonFileControllerIdempotencySnapshotStore.open(
    statePath,
  );
  const { adapter, service } = await harness({
    taskId: "task-restart-replay-001",
    idempotencyStore: firstStore,
  });
  const context = await adapter.getDecisionContext(
    { taskId: "task-restart-replay-001" },
    identityA,
  );
  const claimRequest = {
    taskId: context.task.taskId,
    expectedTaskVersion: context.task.taskVersion,
    idempotencyKey: "restart-claim",
  };
  const claim = await adapter.claimTask(claimRequest, identityA);
  const originalRequest = createPlanRequest(claim);
  const original = await adapter.submitCommand(originalRequest, identityA);
  const advanced = await adapter.submitCommand(
    {
      taskId: original.task.taskId,
      claimToken: claim.claimToken,
      expectedTaskVersion: original.task.taskVersion,
      expectedPlanVersion: original.task.plan.planVersion,
      idempotencyKey: "restart-advance",
      command: {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "Move formal state beyond the original response.",
        payload: { nodeId: "inspect-context", summary: "Advanced." },
      },
    },
    identityA,
  );
  assert.notEqual(advanced.task.taskVersion, original.task.taskVersion);

  const secondStore = await JsonFileControllerIdempotencySnapshotStore.open(
    statePath,
  );
  const restartedAdapter = createTaskControlControllerAdapter(service, {
    projectId: "ai-agent-platform",
    claimTtlMs: 60_000,
    idempotencyStore: secondStore,
  });
  const claimReplay = await restartedAdapter.claimTask(claimRequest, identityA);
  assert.deepEqual(claimReplay, { ...claim, idempotentReplay: true });
  const replay = await restartedAdapter.submitCommand(originalRequest, identityA);
  assert.deepEqual(replay, { ...original, idempotentReplay: true });
  assert.equal(replay.task.taskVersion, original.task.taskVersion);
  assert.equal(replay.task.plan.currentNodeId, "inspect-context");

  const versionBeforeConflict = (await service.getTask(original.task.taskId))
    .taskVersion;
  await assert.rejects(
    restartedAdapter.submitCommand(
      {
        ...originalRequest,
        command: {
          ...originalRequest.command,
          reasonSummary: "Different payload with reused idempotency key.",
        },
      },
      identityA,
    ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_IDEMPOTENCY_CONFLICT",
  );
  assert.equal(
    (await service.getTask(original.task.taskId)).taskVersion,
    versionBeforeConflict,
  );
});

test("unsupported Controller capabilities fail explicitly without Task side effects", async () => {
  const { adapter, service } = await harness({
    taskId: "task-explicit-rejection-001",
  });
  const context = await adapter.getDecisionContext(
    { taskId: "task-explicit-rejection-001" },
    identityA,
  );
  const claim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "explicit-rejection-claim",
    },
    identityA,
  );
  const initialVersion = (await service.getTask(context.task.taskId)).taskVersion;
  const requests = [
    {
      type: "REQUEST_ROLE_WORK",
      reasonSummary: "Work mapping is not frozen.",
      payload: {
        nodeId: "missing-work-node",
        requiredRole: "executor",
        objective: "Do work.",
      },
    },
    {
      type: "REQUEST_APPROVAL",
      reasonSummary: "Approval ref producer is not frozen.",
      payload: { nodeId: "missing-approval-node", summary: "Approve." },
    },
    { type: "PAUSE_TASK", reasonSummary: "Not public v1.", payload: {} },
    { type: "RESUME_TASK", reasonSummary: "Not public v1.", payload: {} },
    { type: "FAIL_TASK", reasonSummary: "Not public v1.", payload: {} },
  ];
  for (const [index, command] of requests.entries()) {
    await assert.rejects(
      adapter.submitCommand(
        {
          taskId: context.task.taskId,
          claimToken: claim.claimToken,
          expectedTaskVersion: initialVersion,
          expectedPlanVersion: null,
          idempotencyKey: `unsupported-${index}`,
          command,
        },
        identityA,
      ),
      (error) =>
        error instanceof ControllerTaskControlError &&
        error.code === "CONTROLLER_COMMAND_NOT_ALLOWED",
    );
    assert.equal(
      (await service.getTask(context.task.taskId)).taskVersion,
      initialVersion,
    );
  }

  await assert.rejects(
    adapter.submitCommand(
      {
        taskId: context.task.taskId,
        claimToken: claim.claimToken,
        expectedTaskVersion: initialVersion,
        expectedPlanVersion: null,
        idempotencyKey: "unsupported-wait",
        command: {
          type: "CREATE_PLAN",
          reasonSummary: "WAIT is not silently coerced.",
          payload: {
            nodes: [
              {
                nodeId: "wait-node",
                title: "Wait",
                kind: "WAIT",
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
      error.code === "CONTROLLER_COMMAND_NOT_ALLOWED",
  );
  assert.equal(
    (await service.getTask(context.task.taskId)).taskVersion,
    initialVersion,
  );
});

test("INSERT_NODE_AFTER is rejected instead of producing an incorrect sequence", async () => {
  const { adapter, service } = await harness({
    taskId: "task-insert-node-001",
  });
  const context = await adapter.getDecisionContext(
    { taskId: "task-insert-node-001" },
    identityA,
  );
  const claim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "insert-claim",
    },
    identityA,
  );
  const created = await adapter.submitCommand(createPlanRequest(claim), identityA);
  const taskBefore = await service.getTask(context.task.taskId);
  await assert.rejects(
    adapter.submitCommand(
      {
        taskId: context.task.taskId,
        claimToken: claim.claimToken,
        expectedTaskVersion: created.task.taskVersion,
        expectedPlanVersion: created.task.plan.planVersion,
        idempotencyKey: "insert-node-after",
        command: {
          type: "REVISE_PLAN",
          reasonSummary: "Do not fake graph insertion.",
          payload: {
            operations: [
              {
                operation: "INSERT_NODE_AFTER",
                afterNodeId: "inspect-context",
                node: {
                  nodeId: "inserted-node",
                  title: "Inserted",
                  kind: "DECISION",
                  requiredRole: "controller",
                },
              },
            ],
          },
        },
      },
      identityA,
    ),
    (error) =>
      error instanceof ControllerTaskControlError &&
      error.code === "CONTROLLER_COMMAND_NOT_ALLOWED",
  );
  const taskAfter = await service.getTask(context.task.taskId);
  assert.equal(taskAfter.taskVersion, taskBefore.taskVersion);
  assert.deepEqual(
    taskAfter.plan.nodes.map((node) => node.nodeId),
    ["inspect-context", "finish-task"],
  );
});

test("externally created Task can immediately enter Controller Claim and Decision", async () => {
  const { adapter, service } = await harness({
    taskId: "task-intake-boundary-001",
    createTask: false,
  });
  assert.equal("createTask" in adapter, false);
  await service.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: "task-intake-boundary-001",
    title: "Task created by external intake",
    objective: "Prove CTL starts after formal Task Intake.",
    requiredRole: "controller",
    requirementRef: "requirement-intake-boundary-001",
    idempotencyKey: "external-intake-001",
    producerRef: "external-task-intake-test",
  });
  const context = await adapter.getDecisionContext(
    { taskId: "task-intake-boundary-001" },
    identityA,
  );
  const claim = await adapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "intake-boundary-claim",
    },
    identityA,
  );
  const result = await adapter.submitCommand(createPlanRequest(claim), identityA);
  assert.equal(result.task.taskId, "task-intake-boundary-001");
  assert.equal(result.task.plan.currentNodeId, "inspect-context");
});

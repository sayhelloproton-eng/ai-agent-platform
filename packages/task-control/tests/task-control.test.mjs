import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  InMemoryTaskControlStore,
  JsonFileTaskControlStore,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  TaskControlService,
  replayTaskAuditState,
  toDecisionContextContractV1,
} from "../dist/index.js";

class ManualClock {
  constructor(value = "2026-08-05T00:00:00.000Z") {
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

function harness(store = new InMemoryTaskControlStore()) {
  const clock = new ManualClock();
  const ids = new SequenceIds();
  return { clock, ids, service: new TaskControlService(store, clock, ids), store };
}

function plan(nodeId = "node-01") {
  return {
    source: { type: "controller", ref: "controller-profile" },
    currentNodeId: nodeId,
    nodes: [
      {
        nodeId,
        title: "读取 Runtime 状态",
        kind: "ACTION",
        status: "READY",
        requiredRole: "controller",
        acceptanceCriteria: ["获得 Canonical Result"],
      },
    ],
  };
}

async function createTask(service, options = {}) {
  return service.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: options.taskId ?? "task-001",
    title: "验证 Runtime 状态",
    objective: "读取 Runtime 状态并决定下一步",
    requiredRole: "controller",
    requirementRef: "requirement-001",
    conversationRef: "conversation-001",
    plan: options.withPlan === false ? undefined : plan(),
    idempotencyKey: `create:${options.taskId ?? "task-001"}`,
    producerRef: "test",
  });
}

async function claimController(service, task, key = "claim-1", leaseMs = 60_000) {
  return service.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    expectedTaskVersion: task.taskVersion,
    roleId: "controller",
    profileId: "controller-profile",
    leaseMs,
    idempotencyKey: key,
  });
}

async function deliverPendingControllerDispatch(service, host = "browser-host-1") {
  const pending = await service.listPendingDispatches();
  assert.ok(pending.length > 0);
  const signal = pending[0];
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId: host,
    leaseMs: 60_000,
    idempotencyKey: `claim:${signal.signalId}:${host}`,
  });
  await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: claimed.dispatch.claim.claimToken,
    idempotencyKey: `ack:${signal.signalId}`,
    producerRef: host,
  });
  return signal;
}

test("creates a Task with versioned Plan and derives a controller Dispatch", async () => {
  const { service } = harness();
  const task = await createTask(service);
  assert.equal(task.status, "READY_FOR_CONTROLLER");
  assert.equal(task.plan.planVersion, 1);
  assert.equal(task.plan.nodes[0].status, "READY");
  assert.equal((await service.listPendingDispatches()).length, 1);
  const events = await service.listEvents(task.taskId);
  assert.deepEqual(events.map((item) => item.eventType), [
    "TASK_CREATED",
    "TASK_PLAN_CREATED",
    "HOST_DISPATCH_CREATED",
  ]);
});

test("requires Decision Context before a versioned Controller Claim and Command", async () => {
  const { service } = harness();
  let task = await createTask(service, { withPlan: false });
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const context = await service.getDecisionContext(task.taskId);
  assert.equal(context.task.status, "PLAN_REQUIRED");
  assert.ok(context.allowedControllerCommands.includes("CREATE_PLAN"));
  assert.equal(context.activeClaim, null);

  const claimed = await claimController(service, task);
  const result = await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: claimed.claim.claimToken,
    expectedTaskVersion: claimed.taskVersion,
    idempotencyKey: "create-plan",
    producerRef: "controller-profile",
    command: { type: "CREATE_PLAN", payload: plan() },
  });
  assert.equal(result.planVersion, 1);
  task = await service.getTask(task.taskId);
  assert.equal(task.status, "READY_FOR_CONTROLLER");
  assert.equal(task.controllerClaim.claimId, claimed.claim.claimId);
});

test("rejects stale Task and Plan versions without partial side effects", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const claimed = await claimController(service, task);
  const before = await service.snapshot();
  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: claimed.claim.claimToken,
      expectedTaskVersion: claimed.taskVersion - 1,
      expectedPlanVersion: 1,
      idempotencyKey: "stale",
      producerRef: "controller-profile",
      command: {
        type: "REVISE_PLAN",
        reasonSummary: "stale write",
        payload: { operations: [{ type: "SET_PLAN_STATUS", status: "BLOCKED" }] },
      },
    }),
    (error) => error instanceof TaskControlError && error.code === "TASK_VERSION_CONFLICT",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("deduplicates Controller Commands and creates one WorkItem", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const claimed = await claimController(service, task);
  const input = {
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: claimed.claim.claimToken,
    expectedTaskVersion: claimed.taskVersion,
    expectedPlanVersion: 1,
    idempotencyKey: "request-runtime-work",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        capabilityRef: "local.runtime.status.read",
        expectedResultType: "local-result@1",
      },
    },
  };
  const first = await service.submitControllerCommand(input);
  const second = await service.submitControllerCommand(input);
  assert.deepEqual(second.workItemIds, first.workItemIds);
  assert.equal((await service.getWorkItems(task.taskId)).length, 1);
  assert.equal((await service.listEvents(task.taskId)).filter((e) => e.eventType === "ROLE_WORK_REQUESTED").length, 1);
});

test("Work result returns Task to controller without treating execution as Task completion", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task);
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: 1,
    idempotencyKey: "request-work",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        expectedResultType: "local-result@1",
      },
    },
  });
  const [work] = await service.listAvailableWork("runtime-observer");
  const workClaim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-control-adapter",
    leaseMs: 60_000,
    idempotencyKey: "claim-work",
  });
  task = await service.reportWorkResult({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    claimToken: workClaim.workItem.claim.claimToken,
    resultRef: "local-result-001",
    idempotencyKey: "report-work",
    producerRef: "local-control-adapter",
  });
  assert.equal(task.status, "READY_FOR_CONTROLLER");
  assert.notEqual(task.status, "COMPLETED");
  assert.deepEqual(task.latestResultRefs, ["local-result-001"]);
  assert.equal((await service.listPendingDispatches()).length, 1);
});

test("Browser Host delivery changes Dispatch facts but not Task business status", async () => {
  const { service } = harness();
  const task = await createTask(service);
  const beforeStatus = task.status;
  const signal = await deliverPendingControllerDispatch(service);
  const after = await service.getTask(task.taskId);
  const [dispatch] = await service.getDispatches(task.taskId);
  assert.equal(dispatch.signalId, signal.signalId);
  assert.equal(dispatch.status, "DELIVERED");
  assert.equal(after.status, beforeStatus);
  assert.ok(after.taskVersion > task.taskVersion);
});

test("failed Host delivery is retried without marking Task failed", async () => {
  const { service } = harness();
  const task = await createTask(service);
  const [signal] = await service.listPendingDispatches();
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId: "browser-host-1",
    leaseMs: 60_000,
    idempotencyKey: "claim-dispatch",
  });
  await service.failDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: claimed.dispatch.claim.claimToken,
    idempotencyKey: "fail-dispatch",
    producerRef: "browser-host-1",
    errorSummary: "ChatGPT page unavailable",
  });
  const current = await service.getTask(task.taskId);
  assert.equal(current.status, "READY_FOR_CONTROLLER");
  const dispatches = await service.getDispatches(task.taskId);
  assert.equal(dispatches.filter((item) => item.status === "FAILED").length, 1);
  assert.equal(dispatches.filter((item) => item.status === "PENDING").length, 1);
});

test("expired Controller Claim can be safely taken over and stale token is rejected", async () => {
  const { service, clock } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const oldClaim = await claimController(service, task, "old-claim", 1000);
  clock.advance(1001);
  await service.reconcile(task.taskId);
  task = await service.getTask(task.taskId);
  assert.equal(task.controllerClaim, null);
  const nextClaim = await claimController(service, task, "new-claim", 60_000);
  assert.notEqual(nextClaim.claim.claimToken, oldClaim.claim.claimToken);
  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: oldClaim.claim.claimToken,
      expectedTaskVersion: nextClaim.taskVersion,
      expectedPlanVersion: 1,
      idempotencyKey: "stale-token",
      producerRef: "controller-profile",
      command: { type: "PAUSE_TASK", payload: { reason: "stale" } },
    }),
    (error) => error instanceof TaskControlError && error.code === "CLAIM_TOKEN_INVALID",
  );
});

test("Reconciler is idempotent and does not duplicate Dispatch or Event", async () => {
  const { service } = harness();
  const task = await createTask(service);
  const before = await service.snapshot();
  const first = await service.reconcile(task.taskId);
  const second = await service.reconcile(task.taskId);
  const after = await service.snapshot();
  assert.equal(first.changed, false);
  assert.equal(second.changed, false);
  assert.deepEqual(after, before);
});

test("PAUSE_TASK preserves Plan and results while stopping new Dispatch", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const claimed = await claimController(service, task);
  const planBefore = task.plan;
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: claimed.claim.claimToken,
    expectedTaskVersion: claimed.taskVersion,
    expectedPlanVersion: planBefore.planVersion,
    idempotencyKey: "pause",
    producerRef: "controller-profile",
    command: { type: "PAUSE_TASK", payload: { reason: "owner requested pause" } },
  });
  task = await service.getTask(task.taskId);
  assert.equal(task.status, "PAUSED");
  assert.deepEqual(task.plan.nodes, planBefore.nodes);
  assert.equal((await service.listPendingDispatches()).length, 0);
  assert.ok((await service.getRoleAttentionInbox("controller")).some((item) => item.attentionType === "TASK_PAUSED"));
});

test("Role Attention and Timeline are rebuildable from formal facts", async () => {
  const { service } = harness();
  const task = await createTask(service);
  const firstInbox = await service.getRoleAttentionInbox("controller");
  const secondInbox = await service.getRoleAttentionInbox("controller");
  assert.deepEqual(secondInbox, firstInbox);
  assert.equal(firstInbox[0].attentionType, "CONTROLLER_ACTION_REQUIRED");
  const timeline = await service.getTaskTimeline(task.taskId);
  assert.ok(timeline.length >= 3);
  assert.equal(timeline.at(-1).eventType, "HOST_DISPATCH_CREATED");
});

test("JsonFileTaskControlStore persists and recovers Task facts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "task-control-"));
  const file = join(directory, "state.json");
  try {
    const clock = new ManualClock();
    const ids = new SequenceIds();
    const firstStore = await JsonFileTaskControlStore.open(file);
    const first = new TaskControlService(firstStore, clock, ids);
    const created = await createTask(first);
    const raw = JSON.parse(await readFile(file, "utf8"));
    assert.ok(raw.tasks[created.taskId]);
    await firstStore.close();

    const secondStore = await JsonFileTaskControlStore.open(file);
    const second = new TaskControlService(secondStore, clock, ids);
    await second.recoverAll();
    const restored = await second.getTask(created.taskId);
    assert.equal(restored.title, created.title);
    assert.deepEqual(await second.listEvents(created.taskId), raw.events[created.taskId]);
    await secondStore.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("completes one Task through Controller, Work and Controller review", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  let controller = await claimController(service, task, "claim-round-1");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: 1,
    idempotencyKey: "request-work",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        expectedResultType: "local-result@1",
      },
    },
  });
  const [work] = await service.listAvailableWork("runtime-observer");
  const worker = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-control-adapter",
    leaseMs: 60_000,
    idempotencyKey: "claim-work",
  });
  await service.reportWorkResult({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    claimToken: worker.workItem.claim.claimToken,
    resultRef: "local-result-001",
    idempotencyKey: "report-work",
    producerRef: "local-control-adapter",
  });

  await deliverPendingControllerDispatch(service, "browser-host-2");
  task = await service.getTask(task.taskId);
  controller = await claimController(service, task, "claim-round-2");
  const advanced = await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: task.plan.planVersion,
    idempotencyKey: "advance",
    producerRef: "controller-profile",
    command: {
      type: "ADVANCE_PLAN_NODE",
      payload: {
        nodeId: "node-01",
        resultRefs: ["local-result-001"],
        summary: "Runtime 状态已读取并验收",
      },
    },
  });
  const completed = await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: advanced.taskVersion,
    expectedPlanVersion: advanced.planVersion,
    idempotencyKey: "complete",
    producerRef: "controller-profile",
    command: { type: "COMPLETE_TASK", payload: { summary: "单任务闭环通过" } },
  });
  task = await service.getTask(task.taskId);
  assert.equal(task.status, "COMPLETED");
  assert.equal(task.plan.status, "COMPLETED");
  assert.equal(task.plan.nodes[0].status, "COMPLETED");
  assert.equal(completed.dispatchIds.length, 0);
  assert.ok((await service.listEvents(task.taskId)).some((item) => item.eventType === "TASK_COMPLETED"));
});


test("Decision Context compatibility adapter matches the current snake_case candidate and hides Claim tokens", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  await claimController(service, task, "contract-claim");
  const publicContext = toDecisionContextContractV1(
    await service.getDecisionContext(task.taskId),
  );

  assert.equal(publicContext.contract_version, "1.0.0");
  assert.equal(publicContext.task.task_id, task.taskId);
  assert.equal(publicContext.task.plan.plan_version, 1);
  assert.equal(publicContext.task.plan.current_node_id, "node-01");
  assert.equal(publicContext.task.plan.nodes[0].required_role, "controller");
  assert.equal(publicContext.requirement.ref, "requirement-001");
  assert.ok(publicContext.allowed_controller_commands.length > 0);
  assert.ok(publicContext.active_claim);
  assert.equal("claim_token" in publicContext.active_claim, false);
  assert.equal(JSON.stringify(publicContext).includes("claimToken"), false);
});

test("expired Work Item Claim is reclaimed independently and its stale token is fenced", async () => {
  const { service, clock } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task, "work-expiry-controller");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: 1,
    idempotencyKey: "work-expiry-request",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        expectedResultType: "local-result@1",
      },
    },
  });
  const [work] = await service.listAvailableWork("runtime-observer");
  const oldClaim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-control-a",
    leaseMs: 1000,
    idempotencyKey: "work-old-claim",
  });
  clock.advance(1001);
  await service.reconcile(task.taskId);
  const [availableAgain] = await service.listAvailableWork("runtime-observer");
  assert.equal(availableAgain.workItemId, work.workItemId);
  const nextClaim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-control-b",
    leaseMs: 60_000,
    idempotencyKey: "work-new-claim",
  });
  assert.ok(nextClaim.workItem.claim.claimEpoch > oldClaim.workItem.claim.claimEpoch);
  await assert.rejects(
    service.reportWorkResult({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: work.workItemId,
      claimToken: oldClaim.workItem.claim.claimToken,
      resultRef: "stale-result",
      idempotencyKey: "stale-work-result",
      producerRef: "local-control-a",
    }),
    (error) => error instanceof TaskControlError && error.code === "CLAIM_TOKEN_INVALID",
  );
});

test("expired Dispatch Claim is reclaimed independently and its stale token is fenced", async () => {
  const { service, clock } = harness();
  const task = await createTask(service);
  const [signal] = await service.listPendingDispatches();
  const oldClaim = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId: "browser-host-a",
    leaseMs: 1000,
    idempotencyKey: "dispatch-old-claim",
  });
  clock.advance(1001);
  await service.reconcile(task.taskId);
  const pending = await service.listPendingDispatches();
  assert.ok(pending.some((item) => item.signalId === signal.signalId));
  const nextClaim = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId: "browser-host-b",
    leaseMs: 60_000,
    idempotencyKey: "dispatch-new-claim",
  });
  assert.ok(nextClaim.dispatch.claim.claimEpoch > oldClaim.dispatch.claim.claimEpoch);
  await assert.rejects(
    service.acknowledgeDispatch({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      signalId: signal.signalId,
      claimToken: oldClaim.dispatch.claim.claimToken,
      idempotencyKey: "stale-dispatch-ack",
      producerRef: "browser-host-a",
    }),
    (error) => error instanceof TaskControlError && error.code === "CLAIM_TOKEN_INVALID",
  );
});


test("rejects a role that does not own the available Work Item", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task, "role-owner-controller");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: 1,
    idempotencyKey: "role-owner-request",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        expectedResultType: "local-result@1",
      },
    },
  });
  const [work] = await service.listAvailableWork();
  await assert.rejects(
    service.claimWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: work.workItemId,
      roleId: "reporter",
      claimantId: "wrong-role-adapter",
      leaseMs: 60_000,
      idempotencyKey: "wrong-role-claim",
    }),
    (error) => error instanceof TaskControlError && error.code === "ROLE_NOT_ALLOWED",
  );
});

test("rejects an invalid Plan revision atomically without duplicate Node side effects", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task, "invalid-plan-controller");
  const before = await service.snapshot();
  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: controller.claim.claimToken,
      expectedTaskVersion: controller.taskVersion,
      expectedPlanVersion: 1,
      idempotencyKey: "duplicate-node",
      producerRef: "controller-profile",
      command: {
        type: "REVISE_PLAN",
        reasonSummary: "invalid duplicate node test",
        payload: {
          operations: [
            {
              type: "ADD_NODE",
              node: {
                nodeId: "node-01",
                title: "重复节点",
                kind: "ACTION",
                requiredRole: "controller",
              },
            },
          ],
        },
      },
    }),
    (error) => error instanceof TaskControlError && error.code === "INVALID_PLAN",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("replays key Task and Plan audit state from ordered Task Events", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverPendingControllerDispatch(service);
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task, "replay-controller");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: 1,
    idempotencyKey: "replay-pause",
    producerRef: "controller-profile",
    command: { type: "PAUSE_TASK", payload: { reason: "audit replay" } },
  });
  task = await service.getTask(task.taskId);
  const replayed = replayTaskAuditState(await service.listEvents(task.taskId));
  assert.ok(replayed);
  assert.equal(replayed.taskId, task.taskId);
  assert.equal(replayed.taskVersion, task.taskVersion);
  assert.equal(replayed.taskStatus, task.status);
  assert.equal(replayed.planVersion, task.plan.planVersion);
  assert.equal(replayed.planStatus, task.plan.status);
  assert.equal(replayed.currentNodeId, task.plan.currentNodeId);
  assert.equal(replayed.latestEventId, task.latestEventId);
});

test("rejects an incomplete persistence record instead of treating it as a legal Task", async () => {
  const directory = await mkdtemp(join(tmpdir(), "task-control-invalid-"));
  const file = join(directory, "state.json");
  try {
    await writeFile(
      file,
      JSON.stringify({
        tasks: { "task-invalid": { taskId: "task-invalid", status: "COMPLETED" } },
        events: {},
        workItems: {},
        dispatchSignals: {},
        idempotencyRecords: {},
      }),
      "utf8",
    );
    await assert.rejects(JsonFileTaskControlStore.open(file), TypeError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

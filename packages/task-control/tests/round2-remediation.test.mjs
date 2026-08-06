import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  InMemoryTaskControlStore,
  JsonFileTaskControlStore,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  TaskControlService,
} from "../dist/index.js";

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

function harness(store = new InMemoryTaskControlStore(), clock = new ManualClock(), ids = new SequenceIds()) {
  return { store, clock, ids, service: new TaskControlService(store, clock, ids) };
}

function serialPlan() {
  return {
    source: { type: "controller", ref: "controller-profile" },
    currentNodeId: "node-01",
    nodes: [
      {
        nodeId: "node-01",
        title: "执行工作",
        kind: "ACTION",
        status: "READY",
        requiredRole: "controller",
      },
      {
        nodeId: "node-02",
        title: "审核结果",
        kind: "REVIEW",
        status: "PENDING",
        requiredRole: "controller",
        dependsOn: ["node-01"],
      },
    ],
  };
}

function intakeInput(taskId, overrides = {}) {
  return {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    title: "第二轮整改任务",
    objective: "验证 Task Intake、Work、Dispatch 与插入语义",
    requiredRole: "controller",
    requirementRef: `requirement:${taskId}`,
    conversationRef: `conversation:${taskId}`,
    plan: serialPlan(),
    idempotencyKey: `intake:${taskId}`,
    producerRef: "round2-test",
    ...overrides,
  };
}

async function createTask(service, taskId) {
  await service.intakeTask(intakeInput(taskId));
  return service.getTask(taskId);
}

async function claimAndAckControllerDispatch(service, hostId = "browser-host", leaseMs = 60_000) {
  const [signal] = await service.listPendingDispatches();
  assert.ok(signal);
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId,
    leaseMs,
    idempotencyKey: `claim:${signal.signalId}:${hostId}:${signal.claimEpoch + 1}`,
  });
  const token = claimed.dispatch.claim.claimToken;
  const ack = await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: token,
    idempotencyKey: `delivery:${signal.signalId}`,
    producerRef: hostId,
  });
  return { signal: ack, token };
}

async function claimController(service, task, key = "controller-claim") {
  return service.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    expectedTaskVersion: task.taskVersion,
    roleId: "controller",
    profileId: "controller-profile",
    leaseMs: 60_000,
    idempotencyKey: key,
  });
}

async function createWorkItem(service, taskId) {
  let task = await createTask(service, taskId);
  await claimAndAckControllerDispatch(service, `host:${taskId}`);
  task = await service.getTask(taskId);
  const claim = await claimController(service, task, `controller:${taskId}`);
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: `request-work:${taskId}`,
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        capabilityRef: "local.runtime.status.read",
        inputRef: `local-request:${taskId}`,
        expectedResultType: "local-result-ref@1",
      },
    },
  });
  const [item] = await service.getWorkItems(taskId);
  assert.ok(item);
  return item;
}

test("formal Task Intake is validated, eventful, replay-stable and fingerprinted", async () => {
  const { service } = harness();
  const input = intakeInput("task-intake");
  const first = await service.intakeTask(input);
  assert.equal(first.taskVersionAtCreation, 1);
  assert.equal(first.initialEventIds.length, 2);
  assert.deepEqual(
    (await service.listEvents("task-intake")).slice(0, 2).map((item) => item.eventId),
    first.initialEventIds,
  );

  const task = await service.getTask("task-intake");
  await claimAndAckControllerDispatch(service, "host-intake");
  await claimController(service, await service.getTask(task.taskId), "claim-intake");
  const replay = await service.intakeTask(input);
  assert.deepEqual(replay, first);

  const before = await service.snapshot();
  await assert.rejects(
    service.intakeTask({ ...input, title: "different title" }),
    (error) => error instanceof TaskControlError && error.code === "IDEMPOTENCY_KEY_CONFLICT",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("BHR delivery credential survives Controller Claim and can report Host Result", async () => {
  const { service } = harness();
  await createTask(service, "task-dispatch-race");
  const { signal, token } = await claimAndAckControllerDispatch(service, "host-race");
  assert.equal(signal.status, "DELIVERED");
  assert.ok(signal.claim);

  const claimedTask = await claimController(
    service,
    await service.getTask("task-dispatch-race"),
    "controller-race",
  );
  assert.ok(claimedTask.claim.claimToken);
  const consumed = (await service.getDispatches("task-dispatch-race"))[0];
  assert.equal(consumed.status, "CONSUMED");
  assert.equal(consumed.claim.claimToken, token);

  const reported = await service.reportHostResult({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: token,
    hostResultRef: "host-result:task-dispatch-race",
    summary: "response completed",
    evidenceRefs: ["evidence:response-observed"],
    idempotencyKey: "host-result-race",
    producerRef: "host-race",
  });
  assert.equal(reported.status, "CONSUMED");
  assert.equal(reported.hostResultStatus, "SUCCEEDED");
  assert.equal(reported.claim, null);

  const duplicate = await service.reportHostResult({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: token,
    hostResultRef: "host-result:task-dispatch-race",
    summary: "response completed",
    evidenceRefs: ["evidence:response-observed"],
    idempotencyKey: "host-result-race",
    producerRef: "host-race",
  });
  assert.deepEqual(duplicate, reported);
  const events = await service.listEvents("task-dispatch-race");
  assert.equal(events.filter((item) => item.eventType === "HOST_RESULT_REPORTED").length, 1);
});

test("delivered Dispatch can expire, be reclaimed for report recovery, and deduplicate Ack/Report", async () => {
  const { service, clock } = harness();
  await createTask(service, "task-dispatch-recovery");
  const [pending] = await service.listPendingDispatches();
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    hostId: "host-recovery",
    leaseMs: 1_000,
    idempotencyKey: "dispatch-recovery-claim-1",
  });
  const firstToken = claimed.dispatch.claim.claimToken;
  const ackInput = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    claimToken: firstToken,
    idempotencyKey: "dispatch-recovery-ack",
    producerRef: "host-recovery",
  };
  const firstAck = await service.acknowledgeDispatch(ackInput);
  const secondAck = await service.acknowledgeDispatch(ackInput);
  assert.deepEqual(secondAck, firstAck);

  clock.advance(2_000);
  await service.reconcile("task-dispatch-recovery");
  const expired = (await service.getDispatches("task-dispatch-recovery"))[0];
  assert.equal(expired.status, "DELIVERED");
  assert.equal(expired.claim, null);

  const reclaimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    hostId: "host-recovery",
    leaseMs: 60_000,
    idempotencyKey: "dispatch-recovery-claim-2",
  });
  assert.equal(reclaimed.dispatch.status, "DELIVERED");
  assert.ok(reclaimed.dispatch.claim.claimEpoch > claimed.dispatch.claim.claimEpoch);
  await assert.rejects(
    service.reportHostResult({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      signalId: pending.signalId,
      claimToken: firstToken,
      hostResultRef: "host-result:stale",
      idempotencyKey: "stale-host-result",
      producerRef: "host-recovery",
    }),
    (error) => error instanceof TaskControlError && error.code === "CLAIM_TOKEN_INVALID",
  );

  const reportInput = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    claimToken: reclaimed.dispatch.claim.claimToken,
    hostResultRef: "host-result:recovered",
    evidenceRefs: ["evidence:journal-replay"],
    idempotencyKey: "recovered-host-result",
    producerRef: "host-recovery",
  };
  const firstReport = await service.reportHostResult(reportInput);
  const secondReport = await service.reportHostResult(reportInput);
  assert.deepEqual(secondReport, firstReport);
  const events = await service.listEvents("task-dispatch-recovery");
  assert.ok(events.some((item) => item.eventType === "DISPATCH_CLAIM_RELEASED"));
  assert.equal(events.filter((item) => item.eventType === "HOST_RESULT_REPORTED").length, 1);
});

test("WorkItem Application Port supports claim/start/complete with refs only", async () => {
  const { service } = harness();
  const item = await createWorkItem(service, "task-work-complete");
  let task = await service.getTask(item.taskId);
  const claim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-worker",
    expectedTaskVersion: task.taskVersion,
    leaseMs: 60_000,
    idempotencyKey: "work-complete-claim",
  });
  task = await service.getTask(item.taskId);
  const started = await service.startWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    idempotencyKey: "work-complete-start",
    producerRef: "local-worker",
  });
  assert.equal(started.status, "RUNNING");

  task = await service.getTask(item.taskId);
  const beforeInline = await service.snapshot();
  await assert.rejects(
    service.completeWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: item.workItemId,
      claimToken: claim.workItem.claim.claimToken,
      expectedTaskVersion: task.taskVersion,
      resultRef: "result:runtime-status",
      localResult: { huge: "body" },
      idempotencyKey: "work-inline-rejected",
      producerRef: "local-worker",
    }),
    (error) => error instanceof TaskControlError && error.code === "INVALID_ARGUMENT",
  );
  assert.deepEqual(await service.snapshot(), beforeInline);

  const completedTask = await service.completeWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    resultRef: "result:runtime-status",
    summary: "runtime is healthy",
    evidenceRefs: ["evidence:health-check"],
    idempotencyKey: "work-complete-result",
    producerRef: "local-worker",
  });
  assert.equal(completedTask.status, "READY_FOR_CONTROLLER");
  const [completed] = await service.getWorkItems(item.taskId);
  assert.equal(completed.status, "SUCCEEDED");
  assert.equal(completed.resultRef, "result:runtime-status");
  assert.equal(completed.resultSummary, "runtime is healthy");
  assert.deepEqual(completed.evidenceRefs, ["evidence:health-check"]);
});

test("WorkItem failure can retry, then explicitly expire with complete Events", async () => {
  const { service } = harness();
  const item = await createWorkItem(service, "task-work-retry");
  let task = await service.getTask(item.taskId);
  let claim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-worker",
    expectedTaskVersion: task.taskVersion,
    leaseMs: 60_000,
    idempotencyKey: "work-retry-claim-1",
  });
  task = await service.getTask(item.taskId);
  await service.startWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    idempotencyKey: "work-retry-start-1",
    producerRef: "local-worker",
  });
  task = await service.getTask(item.taskId);
  await service.failWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    errorCode: "LOCAL_TEMPORARY_FAILURE",
    errorSummary: "temporary failure",
    retryable: true,
    evidenceRefs: ["evidence:first-failure"],
    idempotencyKey: "work-retry-fail-1",
    producerRef: "local-worker",
  });

  task = await service.getTask(item.taskId);
  const retried = await service.retryWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    expectedTaskVersion: task.taskVersion,
    idempotencyKey: "work-retry-reset",
    producerRef: "task-worker-adapter",
  });
  assert.equal(retried.status, "PENDING");
  assert.equal(retried.attempt, 2);

  task = await service.getTask(item.taskId);
  claim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-worker",
    expectedTaskVersion: task.taskVersion,
    leaseMs: 60_000,
    idempotencyKey: "work-retry-claim-2",
  });
  task = await service.getTask(item.taskId);
  const expired = await service.expireWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    expectedTaskVersion: task.taskVersion,
    reason: "worker stopped reporting",
    idempotencyKey: "work-expire-2",
    producerRef: "task-reconciler",
  });
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.retryable, true);
  const events = await service.listEvents(item.taskId);
  for (const type of ["WORK_ITEM_STARTED", "ROLE_WORK_FAILED", "WORK_ITEM_RETRIED", "WORK_ITEM_EXPIRED"]) {
    assert.ok(events.some((event) => event.eventType === type), `missing ${type}`);
  }
});

test("INSERT_NODE_AFTER rewires direct successors and controls real execution order", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-insert-node");
  await claimAndAckControllerDispatch(service, "host-insert");
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task, "controller-insert");
  let result = await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: controller.taskVersion,
    expectedPlanVersion: controller.planVersion,
    idempotencyKey: "insert-node-after",
    producerRef: "controller-profile",
    command: {
      type: "REVISE_PLAN",
      reasonSummary: "insert validation before review",
      payload: {
        operations: [
          {
            type: "INSERT_NODE_AFTER",
            anchorNodeId: "node-01",
            node: {
              nodeId: "node-01b",
              title: "验证结果",
              kind: "REVIEW",
              requiredRole: "controller",
            },
          },
        ],
      },
    },
  });
  task = await service.getTask(task.taskId);
  assert.deepEqual(task.plan.nodes.map((node) => node.nodeId), ["node-01", "node-01b", "node-02"]);
  assert.deepEqual(task.plan.nodes.find((node) => node.nodeId === "node-01b").dependsOn, ["node-01"]);
  assert.deepEqual(task.plan.nodes.find((node) => node.nodeId === "node-02").dependsOn, ["node-01b"]);

  result = await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controller.claim.claimToken,
    expectedTaskVersion: result.taskVersion,
    expectedPlanVersion: result.planVersion,
    idempotencyKey: "advance-to-inserted-node",
    producerRef: "controller-profile",
    command: {
      type: "ADVANCE_PLAN_NODE",
      payload: { nodeId: "node-01", nextNodeId: "node-01b" },
    },
  });
  task = await service.getTask(task.taskId);
  assert.equal(task.plan.currentNodeId, "node-01b");
  assert.equal(task.plan.nodes.find((node) => node.nodeId === "node-01b").status, "READY");
});

test("shared Store serializes multi-Adapter writes and stale version has no Event side effect", async () => {
  const store = new InMemoryTaskControlStore();
  const clock = new ManualClock();
  const ids = new SequenceIds();
  const serviceA = new TaskControlService(store, clock, ids);
  const serviceB = new TaskControlService(store, clock, ids);
  await createTask(serviceA, "task-multi-adapter");
  await claimAndAckControllerDispatch(serviceA, "host-multi");
  const task = await serviceA.getTask("task-multi-adapter");
  const beforeEvents = await serviceA.listEvents(task.taskId);
  const inputs = ["profile-a", "profile-b"].map((profileId) => ({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    expectedTaskVersion: task.taskVersion,
    roleId: "controller",
    profileId,
    leaseMs: 60_000,
    idempotencyKey: `claim:${profileId}`,
  }));
  const settled = await Promise.allSettled([
    serviceA.claimController(inputs[0]),
    serviceB.claimController(inputs[1]),
  ]);
  assert.equal(settled.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(settled.filter((item) => item.status === "rejected").length, 1);
  const afterEvents = await serviceA.listEvents(task.taskId);
  assert.equal(afterEvents.filter((item) => item.eventType === "CONTROLLER_CLAIMED").length, 1);
  assert.equal(afterEvents.length, beforeEvents.length + 2); // claim + dispatch consumed
});

test("JSON Store explicitly enforces one writer per file and permits reopen after close", async () => {
  const directory = await mkdtemp(join(tmpdir(), "task-control-single-writer-"));
  const file = join(directory, "state.json");
  try {
    const first = await JsonFileTaskControlStore.open(file);
    await assert.rejects(
      JsonFileTaskControlStore.open(file),
      (error) => error instanceof TaskControlError && error.code === "STORE_SINGLE_WRITER_REQUIRED",
    );
    await first.close();
    const reopened = await JsonFileTaskControlStore.open(file);
    await reopened.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Host Command materialization exposes stable coordination refs and rejects browser bodies", async () => {
  const { service } = harness();
  await createTask(service, "task-host-materialization");
  const [pending] = await service.listPendingDispatches();
  const command = await service.materializeHostCommand(pending.signalId);
  assert.deepEqual(command, {
    dispatchId: pending.signalId,
    taskId: "task-host-materialization",
    createdFromTaskVersion: pending.createdFromTaskVersion,
    workItemId: null,
    targetRole: "controller",
    targetProfileRef: null,
    conversationRef: "conversation:task-host-materialization",
    commandType: "CONTINUE_SESSION",
    commandRef: `host-command:${pending.signalId}`,
    idempotencyKey: pending.idempotencyKey,
  });
  assert.equal("dom" in command, false);
  assert.equal("screenshot" in command, false);
  assert.equal("binding" in command, false);

  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    hostId: "host-materialization",
    leaseMs: 60_000,
    idempotencyKey: "host-materialization-claim",
  });
  const token = claimed.dispatch.claim.claimToken;
  await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    claimToken: token,
    idempotencyKey: "host-materialization-ack",
    producerRef: "host-materialization",
  });
  const before = await service.snapshot();
  await assert.rejects(
    service.reportHostResult({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      signalId: pending.signalId,
      claimToken: token,
      hostResultRef: "host-result:materialization",
      dom: "<html>not allowed</html>",
      idempotencyKey: "host-materialization-inline",
      producerRef: "host-materialization",
    }),
    (error) => error instanceof TaskControlError && error.code === "INVALID_ARGUMENT",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("persisted delivery Claim survives Store restart, Controller Claim, and late Host Result", async () => {
  const directory = await mkdtemp(join(tmpdir(), "task-control-host-restart-"));
  const file = join(directory, "state.json");
  const clock = new ManualClock();
  const ids = new SequenceIds();
  try {
    const firstStore = await JsonFileTaskControlStore.open(file);
    const first = new TaskControlService(firstStore, clock, ids);
    await createTask(first, "task-host-restart");
    const [pending] = await first.listPendingDispatches();
    const claimed = await first.claimDispatch({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      signalId: pending.signalId,
      hostId: "host-restart",
      leaseMs: 60_000,
      idempotencyKey: "host-restart-claim",
    });
    const token = claimed.dispatch.claim.claimToken;
    await first.acknowledgeDispatch({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      signalId: pending.signalId,
      claimToken: token,
      idempotencyKey: "host-restart-ack",
      producerRef: "host-restart",
    });
    await firstStore.close();

    const secondStore = await JsonFileTaskControlStore.open(file);
    const second = new TaskControlService(secondStore, clock, ids);
    const task = await second.getTask("task-host-restart");
    await claimController(second, task, "controller-after-host-restart");
    const reported = await second.reportHostResult({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      signalId: pending.signalId,
      claimToken: token,
      hostResultRef: "host-result:after-restart",
      evidenceRefs: ["evidence:journal-persisted"],
      idempotencyKey: "host-result-after-restart",
      producerRef: "host-restart",
    });
    assert.equal(reported.hostResultStatus, "SUCCEEDED");
    assert.equal(reported.status, "CONSUMED");
    await secondStore.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

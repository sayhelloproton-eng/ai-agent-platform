import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
  constructor(value = "2026-08-06T00:00:00.000Z") { this.value = new Date(value); }
  now() { return new Date(this.value); }
  advance(ms) { this.value = new Date(this.value.getTime() + ms); }
}
class SequenceIds {
  constructor() { this.value = 0; }
  next(prefix) { this.value += 1; return `${prefix}-${String(this.value).padStart(4, "0")}`; }
  token(prefix) { this.value += 1; return `${prefix}-${String(this.value).padStart(4, "0")}`; }
}
function harness(store = new InMemoryTaskControlStore(), clock = new ManualClock(), ids = new SequenceIds()) {
  return { store, clock, ids, service: new TaskControlService(store, clock, ids) };
}
function plan() {
  return {
    source: { type: "controller", ref: "controller-profile" },
    currentNodeId: "node-01",
    nodes: [
      { nodeId: "node-01", title: "work", kind: "ACTION", status: "READY", requiredRole: "controller" },
      { nodeId: "node-02", title: "review", kind: "REVIEW", status: "PENDING", requiredRole: "controller", dependsOn: ["node-01"] },
    ],
  };
}
async function intake(service, taskId, withPlan = true) {
  await service.intakeTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    title: taskId,
    objective: "final remediation",
    requiredRole: "controller",
    conversationRef: `conversation:${taskId}`,
    ...(withPlan ? { plan: plan() } : {}),
    idempotencyKey: `intake:${taskId}`,
    producerRef: "test",
  });
  return service.getTask(taskId);
}
async function claimAckDispatch(service, taskId, key = taskId) {
  const [signal] = await service.listPendingDispatches();
  assert.ok(signal);
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId: `host:${key}`,
    leaseMs: 60_000,
    idempotencyKey: `dispatch-claim:${key}`,
  });
  const token = claimed.dispatch.claim.claimToken;
  const ack = await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: token,
    idempotencyKey: `dispatch-ack:${key}`,
    producerRef: `host:${key}`,
  });
  assert.equal(ack.taskId, taskId);
  return { signal, token, reportToken: ack.reportToken, ack };
}
async function claimController(service, taskId, key = taskId) {
  const task = await service.getTask(taskId);
  return service.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    expectedTaskVersion: task.taskVersion,
    roleId: "controller",
    profileId: "controller-profile",
    leaseMs: 60_000,
    idempotencyKey: `controller-claim:${key}`,
  });
}
async function createWork(service, taskId) {
  await intake(service, taskId);
  await claimAckDispatch(service, taskId);
  const claim = await claimController(service, taskId);
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
  return (await service.getWorkItems(taskId))[0];
}
function runChild(args) {
  const child = spawn(process.execPath, ["tests/helpers/json-store-process.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  return { child, stdout: () => stdout, stderr: () => stderr };
}
function waitForLine(proc, value, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (proc.stdout().includes(value)) { clearInterval(timer); resolve(); }
      else if (Date.now() - started > timeoutMs) { clearInterval(timer); reject(new Error(`timeout waiting for ${value}: ${proc.stderr()}`)); }
    }, 20);
  });
}
function waitExit(child) {
  return new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
}

test("JSON Store rejects a second OS-process writer and recovers the dead PID lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tsk-final-cross-process-"));
  const file = join(directory, "state.json");
  const first = runChild(["write-hold", file, "0"]);
  try {
    await waitForLine(first, "LOCKED");
    const second = runChild(["try-open", file, "30000"]);
    const secondExit = await waitExit(second.child);
    assert.equal(secondExit.code, 3);
    assert.match(second.stderr(), /STORE_SINGLE_WRITER_REQUIRED/);
    first.child.kill("SIGKILL");
    await waitExit(first.child);

    const recovered = await JsonFileTaskControlStore.open(file, { staleLockMs: 0 });
    const service = new TaskControlService(recovered, new ManualClock(), new SequenceIds());
    assert.equal((await service.getTask("task-cross-process")).taskId, "task-cross-process");
    await recovered.close();
  } finally {
    first.child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});

test("Controller Command receipt keeps Dispatch IDs stable immediately and after restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tsk-final-receipt-"));
  const file = join(directory, "state.json");
  const clock = new ManualClock();
  const ids = new SequenceIds();
  try {
    const firstStore = await JsonFileTaskControlStore.open(file);
    const first = new TaskControlService(firstStore, clock, ids);
    await intake(first, "task-command-receipt");
    await claimAckDispatch(first, "task-command-receipt", "receipt");
    const claim = await claimController(first, "task-command-receipt", "receipt");
    const input = {
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: "task-command-receipt",
      claimToken: claim.claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      expectedPlanVersion: claim.planVersion,
      idempotencyKey: "block-command-receipt",
      producerRef: "controller-profile",
      command: { type: "BLOCK_TASK", payload: { reason: "manual review" } },
    };
    const receipt = await first.submitControllerCommand(input);
    assert.equal(receipt.dispatchIds.length, 1);
    assert.deepEqual(await first.submitControllerCommand(input), receipt);
    await firstStore.close();

    const secondStore = await JsonFileTaskControlStore.open(file);
    const second = new TaskControlService(secondStore, clock, ids);
    assert.deepEqual(await second.submitControllerCommand(input), receipt);
    assert.equal((await second.getCurrentTask(input.taskId)).taskVersion >= receipt.taskVersion, true);
    await secondStore.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Work start receipt remains RUNNING after Work completion and restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tsk-final-work-receipt-"));
  const file = join(directory, "state.json");
  const clock = new ManualClock();
  const ids = new SequenceIds();
  try {
    const store = await JsonFileTaskControlStore.open(file);
    const service = new TaskControlService(store, clock, ids);
    const item = await createWork(service, "task-work-receipt");
    let task = await service.getTask(item.taskId);
    const claim = await service.claimWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: item.workItemId,
      roleId: "runtime-observer",
      claimantId: "local-worker",
      expectedTaskVersion: task.taskVersion,
      leaseMs: 60_000,
      idempotencyKey: "work-receipt-claim",
    });
    task = await service.getTask(item.taskId);
    const startInput = {
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: item.workItemId,
      claimToken: claim.workItem.claim.claimToken,
      expectedTaskVersion: task.taskVersion,
      idempotencyKey: "work-receipt-start",
      producerRef: "local-worker",
    };
    const started = await service.startWorkItem(startInput);
    task = await service.getTask(item.taskId);
    await service.completeWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: item.workItemId,
      claimToken: claim.workItem.claim.claimToken,
      expectedTaskVersion: task.taskVersion,
      resultRef: "result:work-receipt",
      idempotencyKey: "work-receipt-complete",
      producerRef: "local-worker",
    });
    assert.equal((await service.getCurrentWorkItem(item.workItemId)).status, "SUCCEEDED");
    assert.deepEqual(await service.startWorkItem(startInput), started);
    await store.close();

    const reopened = await JsonFileTaskControlStore.open(file);
    const afterRestart = new TaskControlService(reopened, clock, ids);
    assert.deepEqual(await afterRestart.startWorkItem(startInput), started);
    await reopened.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Approval rejects inline, multiline, oversized and pseudo result references atomically", async () => {
  const { service } = harness();
  await intake(service, "task-approval-boundary");
  await claimAckDispatch(service, "task-approval-boundary");
  let claim = await claimController(service, "task-approval-boundary");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: "task-approval-boundary",
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "approval-request",
    producerRef: "controller-profile",
    command: { type: "REQUEST_APPROVAL", payload: { nodeId: "node-01", approvalRef: "approval:1" } },
  });
  const task = await service.getTask("task-approval-boundary");
  const before = await service.snapshot();
  for (const resultRef of ["inline\nbody", "x".repeat(2049), "this is not a reference"]) {
    await assert.rejects(
      service.resolveApproval({
        contractVersion: TASK_CONTROL_CONTRACT_VERSION,
        taskId: task.taskId,
        approvalRef: "approval:1",
        resolution: "APPROVED",
        expectedTaskVersion: task.taskVersion,
        expectedPlanVersion: task.plan.planVersion,
        idempotencyKey: `approval-bad:${resultRef.length}`,
        producerRef: "approval-service",
        resultRef,
      }),
      (error) => error instanceof TaskControlError && error.code === "INVALID_ARGUMENT",
    );
  }
  await assert.rejects(
    service.resolveApproval({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      approvalRef: "approval:1",
      resolution: "APPROVED",
      expectedTaskVersion: task.taskVersion,
      expectedPlanVersion: task.plan.planVersion,
      idempotencyKey: "approval-long-summary",
      producerRef: "approval-service",
      resultRef: "result:approval",
      summary: "s".repeat(1025),
    }),
    (error) => error instanceof TaskControlError && error.code === "INVALID_ARGUMENT",
  );
  await assert.rejects(
    service.resolveApproval({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      approvalRef: "approval:1",
      resolution: "APPROVED",
      expectedTaskVersion: task.taskVersion,
      expectedPlanVersion: task.plan.planVersion,
      idempotencyKey: "approval-body",
      producerRef: "approval-service",
      resultRef: "result:approval",
      body: "not allowed",
    }),
    (error) => error instanceof TaskControlError && error.code === "INVALID_ARGUMENT",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("terminal reconciliation records immutable WorkItem and Dispatch cancellation Events", async () => {
  const { service } = harness();
  const item = await createWork(service, "task-work-cancel-event");
  let claim = await claimController(service, item.taskId, "cancel-work");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: item.taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "fail-work-task",
    producerRef: "controller-profile",
    command: { type: "FAIL_TASK", payload: { reason: "stop work" } },
  });
  assert.equal((await service.getCurrentWorkItem(item.workItemId)).status, "CANCELLED");
  let events = await service.listTaskEvents(item.taskId);
  const workCancelled = events.find((event) => event.eventType === "WORK_ITEM_CANCELLED");
  assert.equal(workCancelled.payload.workItemId, item.workItemId);
  assert.equal(workCancelled.payload.triggerEventId !== null, true);

  await intake(service, "task-dispatch-cancel-event");
  const { signal } = await claimAckDispatch(service, "task-dispatch-cancel-event", "cancel-dispatch");
  claim = await claimController(service, "task-dispatch-cancel-event", "cancel-dispatch");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: "task-dispatch-cancel-event",
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "fail-dispatch-task",
    producerRef: "controller-profile",
    command: { type: "FAIL_TASK", payload: { reason: "stop dispatch" } },
  });
  assert.equal((await service.getCurrentDispatch(signal.signalId)).status, "CANCELLED");
  events = await service.listTaskEvents("task-dispatch-cancel-event");
  const dispatchCancelled = events.find((event) => event.eventType === "HOST_DISPATCH_CANCELLED");
  assert.equal(dispatchCancelled.payload.signalId, signal.signalId);
  assert.equal(dispatchCancelled.payload.triggerEventId !== null, true);
});

test("UNCERTAIN Host Result blocks automatic retry and remains replay-stable", async () => {
  const { service } = harness();
  await intake(service, "task-uncertain");
  const { signal, reportToken } = await claimAckDispatch(service, "task-uncertain");
  const input = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    reportToken,
    stage: "SIDE_EFFECT_STARTED",
    commandFingerprint: "fingerprint:host-command-1",
    pageIdentityRef: "page-identity:conversation-1",
    evidenceRefs: ["evidence:journal-entry-1"],
    summary: "message may already have been submitted",
    idempotencyKey: "uncertain-report",
    producerRef: "browser-host",
  };
  const receipt = await service.reportUncertainHostResult(input);
  assert.equal(receipt.hostResultStatus, "UNCERTAIN");
  assert.equal((await service.getCurrentTask("task-uncertain")).status, "BLOCKED");
  assert.deepEqual(await service.reportUncertainHostResult(input), receipt);
  await service.reconcile("task-uncertain");
  assert.equal((await service.listPendingDispatches()).filter((item) => item.taskId === "task-uncertain").length, 0);
  const events = await service.listTaskEvents("task-uncertain");
  assert.equal(events.filter((event) => event.eventType === "HOST_RESULT_UNCERTAIN").length, 1);
});

test("ACCEPTED and PARTIAL progress do not complete WorkItem or Task", async () => {
  const { service } = harness();
  const item = await createWork(service, "task-nonbinary-work");
  let task = await service.getTask(item.taskId);
  const claim = await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-worker",
    expectedTaskVersion: task.taskVersion,
    leaseMs: 60_000,
    idempotencyKey: "nonbinary-claim",
  });
  task = await service.getTask(item.taskId);
  const accepted = await service.reportWorkProgress({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    progress: "ACCEPTED",
    progressRef: "process:local-1",
    summary: "accepted for asynchronous execution",
    idempotencyKey: "nonbinary-accepted",
    producerRef: "local-worker",
  });
  assert.equal(accepted.status, "RUNNING");
  assert.equal(accepted.progressStatus, "ACCEPTED");
  task = await service.getTask(item.taskId);
  const partial = await service.reportWorkProgress({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    progress: "PARTIAL",
    progressRef: "result:partial-page-1",
    summary: "first page available",
    evidenceRefs: ["evidence:partial-1"],
    idempotencyKey: "nonbinary-partial",
    producerRef: "local-worker",
  });
  assert.equal(partial.status, "RUNNING");
  assert.equal(partial.progressStatus, "PARTIAL");
  task = await service.getTask(item.taskId);
  assert.equal(task.status, "WAITING_FOR_ROLE_WORK");
  assert.equal(task.latestResultRefs.includes("result:partial-page-1"), false);
  const events = await service.listTaskEvents(item.taskId);
  assert.ok(events.some((event) => event.eventType === "ROLE_WORK_ACCEPTED"));
  assert.ok(events.some((event) => event.eventType === "ROLE_WORK_PARTIAL"));
});

test("Delivery Ack receipt remains DELIVERED after Host Result changes current Dispatch", async () => {
  const { service } = harness();
  await intake(service, "task-ack-receipt");
  const { signal, token, reportToken, ack } = await claimAckDispatch(service, "task-ack-receipt");
  await service.reportHostResult({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    reportToken,
    hostResultRef: "host-result:ack-receipt",
    idempotencyKey: "ack-receipt-host-result",
    producerRef: "browser-host",
  });
  const replay = await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: token,
    idempotencyKey: "dispatch-ack:task-ack-receipt",
    producerRef: "host:task-ack-receipt",
  });
  assert.deepEqual(replay, ack);
  assert.equal(replay.hostResultStatus, "PENDING");
  assert.equal((await service.getCurrentDispatch(signal.signalId)).hostResultStatus, "SUCCEEDED");
});

test("Controller Claim and Release receipts stay immutable after coordination changes", async () => {
  const { service } = harness();
  await intake(service, "task-controller-receipts");
  await claimAckDispatch(service, "task-controller-receipts");
  const task = await service.getTask("task-controller-receipts");
  const claimInput = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    expectedTaskVersion: task.taskVersion,
    roleId: "controller",
    profileId: "controller-profile",
    leaseMs: 60_000,
    idempotencyKey: "controller-receipt-claim",
  };
  const claimed = await service.claimController(claimInput);
  const released = await service.releaseControllerClaim(
    task.taskId,
    claimed.claim.claimToken,
    "controller-profile",
    "controller-receipt-release",
  );
  assert.deepEqual(await service.claimController(claimInput), claimed);
  assert.deepEqual(
    await service.releaseControllerClaim(
      task.taskId,
      claimed.claim.claimToken,
      "controller-profile",
      "controller-receipt-release",
    ),
    released,
  );
  assert.equal(released.controllerClaim, null);
  assert.equal((await service.getCurrentTask(task.taskId)).taskVersion >= released.taskVersion, true);
});

test("Work Claim receipt remains CLAIMED after Start changes current WorkItem", async () => {
  const { service } = harness();
  const item = await createWork(service, "task-work-claim-receipt");
  let task = await service.getTask(item.taskId);
  const claimInput = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    roleId: "runtime-observer",
    claimantId: "local-worker",
    expectedTaskVersion: task.taskVersion,
    leaseMs: 60_000,
    idempotencyKey: "work-claim-receipt",
  };
  const claim = await service.claimWorkItem(claimInput);
  task = await service.getTask(item.taskId);
  await service.startWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: item.workItemId,
    claimToken: claim.workItem.claim.claimToken,
    expectedTaskVersion: task.taskVersion,
    idempotencyKey: "work-claim-receipt-start",
    producerRef: "local-worker",
  });
  assert.deepEqual(await service.claimWorkItem(claimInput), claim);
  assert.equal(claim.workItem.status, "CLAIMED");
  assert.equal((await service.getCurrentWorkItem(item.workItemId)).status, "RUNNING");
});

test("Delivery Fail receipt stays FAILED after Reconciler creates replacement Dispatch", async () => {
  const { service } = harness();
  await intake(service, "task-dispatch-fail-receipt");
  const [signal] = await service.listPendingDispatches();
  const claim = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId: "host-fail-receipt",
    leaseMs: 60_000,
    idempotencyKey: "dispatch-fail-receipt-claim",
  });
  const failInput = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: claim.dispatch.claim.claimToken,
    idempotencyKey: "dispatch-fail-receipt",
    producerRef: "browser-host",
    errorSummary: "pre-delivery network failure",
  };
  const failed = await service.failDispatch(failInput);
  assert.equal(failed.status, "FAILED");
  assert.deepEqual(await service.failDispatch(failInput), failed);
  const dispatches = await service.getDispatches(signal.taskId);
  assert.ok(dispatches.some((item) => item.signalId !== signal.signalId && item.status === "PENDING"));
});

test("Approval Resolution receipt remains immutable after Controller reclaims Task", async () => {
  const { service } = harness();
  await intake(service, "task-approval-receipt");
  await claimAckDispatch(service, "task-approval-receipt");
  let claim = await claimController(service, "task-approval-receipt");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: "task-approval-receipt",
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "approval-receipt-request",
    producerRef: "controller-profile",
    command: { type: "REQUEST_APPROVAL", payload: { nodeId: "node-01", approvalRef: "approval:receipt" } },
  });
  let task = await service.getTask("task-approval-receipt");
  const input = {
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    approvalRef: "approval:receipt",
    resolution: "APPROVED",
    expectedTaskVersion: task.taskVersion,
    expectedPlanVersion: task.plan.planVersion,
    idempotencyKey: "approval-receipt-resolve",
    producerRef: "approval-service",
    resultRef: "result:approval-receipt",
    summary: "approved",
  };
  const resolved = await service.resolveApproval(input);
  await claimController(service, task.taskId, "after-approval-receipt");
  assert.deepEqual(await service.resolveApproval(input), resolved);
  assert.equal(resolved.controllerClaim, null);
  assert.notDeepEqual(await service.getCurrentTask(task.taskId), resolved);
});

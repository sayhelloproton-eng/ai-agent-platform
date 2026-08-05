import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryTaskControlStore,
  TASK_CONTROL_CONTRACT_VERSION,
  TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION,
  TaskControlError,
  TaskControlService,
  toBrowserDispatchProposal,
  toControllerInputProposal,
  toLocalWorkRequestProposal,
} from "../dist/index.js";

class ManualClock {
  constructor(value = "2026-08-05T12:00:00.000Z") {
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

function harness() {
  const clock = new ManualClock();
  const service = new TaskControlService(
    new InMemoryTaskControlStore(),
    clock,
    new SequenceIds(),
  );
  return { service, clock };
}

function serialPlan() {
  return {
    source: { type: "controller", ref: "controller-profile" },
    currentNodeId: "node-01",
    nodes: [
      {
        nodeId: "node-01",
        title: "读取本机事实",
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

async function createTask(service, taskId = "task-remediation", plan = serialPlan()) {
  return service.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    title: "综合审计整改任务",
    objective: "验证 TSK 状态机、恢复和跨域候选合同",
    requiredRole: "controller",
    requirementRef: "requirement-remediation",
    conversationRef: "conversation-remediation",
    plan,
    idempotencyKey: `create:${taskId}`,
    producerRef: "remediation-test",
  });
}

async function deliverControllerWake(service, hostId = "browser-host-test", leaseMs = 60_000) {
  const pending = await service.listPendingDispatches();
  assert.ok(pending.length > 0);
  const signal = pending[0];
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    hostId,
    leaseMs,
    idempotencyKey: `dispatch-claim:${signal.signalId}:${hostId}`,
  });
  await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: signal.signalId,
    claimToken: claimed.dispatch.claim.claimToken,
    idempotencyKey: `dispatch-ack:${signal.signalId}`,
    producerRef: hostId,
  });
  return signal;
}

async function claimController(service, task, key = "controller-claim", leaseMs = 60_000) {
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

async function requestLocalWork(service, taskId, claim, key = "request-local-work") {
  return service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: key,
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "node-01",
        targetDomain: "local-control",
        requiredRole: "runtime-observer",
        capabilityRef: "local.runtime.status.read",
        inputRef: "local-request:runtime-status",
        expectedResultType: "local-result@1",
      },
    },
  });
}

test("Plan cannot complete while another node remains unfinished", async () => {
  const { service } = harness();
  let task = await createTask(service);
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task);
  const before = await service.snapshot();

  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: claim.claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      expectedPlanVersion: claim.planVersion,
      idempotencyKey: "advance-with-unfinished-node",
      producerRef: "controller-profile",
      command: {
        type: "ADVANCE_PLAN_NODE",
        payload: { nodeId: "node-01", summary: "first node done" },
      },
    }),
    (error) => error instanceof TaskControlError && error.code === "COMMAND_NOT_ALLOWED",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("only the current executable Plan Node may create a WorkItem", async () => {
  const { service } = harness();
  const plan = serialPlan();
  plan.nodes[1].status = "READY";
  plan.nodes[1].dependsOn = [];
  let task = await createTask(service, "task-current-node", plan);
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "current-node-claim");
  const before = await service.snapshot();

  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: claim.claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      expectedPlanVersion: claim.planVersion,
      idempotencyKey: "non-current-work",
      producerRef: "controller-profile",
      command: {
        type: "REQUEST_ROLE_WORK",
        payload: {
          nodeId: "node-02",
          targetDomain: "local-control",
          requiredRole: "runtime-observer",
          expectedResultType: "local-result@1",
        },
      },
    }),
    (error) => error instanceof TaskControlError && error.code === "COMMAND_NOT_ALLOWED",
  );
  assert.deepEqual(await service.snapshot(), before);
  assert.equal((await service.getWorkItems(task.taskId)).length, 0);
});



test("current node cannot request Approval before dependencies are satisfied", async () => {
  const { service } = harness();
  let task = await service.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: "task-approval-dependency",
    title: "Approval dependency gate",
    objective: "Do not approve an ineligible node",
    requiredRole: "controller",
    idempotencyKey: "task-approval-dependency-create",
    producerRef: "test",
    plan: {
      source: { type: "controller", ref: "test" },
      currentNodeId: "node-02",
      nodes: [
        {
          nodeId: "node-01",
          title: "Prerequisite",
          kind: "ACTION",
          requiredRole: "runtime-observer",
          status: "PENDING",
        },
        {
          nodeId: "node-02",
          title: "Approval",
          kind: "APPROVAL",
          requiredRole: "controller",
          status: "READY",
          dependsOn: ["node-01"],
        },
      ],
    },
  });
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "approval-dependency-claim");
  const before = await service.snapshot();
  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: claim.claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      expectedPlanVersion: claim.planVersion,
      idempotencyKey: "approval-dependency-request",
      producerRef: "controller-profile",
      command: {
        type: "REQUEST_APPROVAL",
        payload: { nodeId: "node-02", approvalRef: "approval-blocked" },
      },
    }),
    (error) => error instanceof TaskControlError && error.code === "COMMAND_NOT_ALLOWED",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("controller can reclaim a Task waiting for Work and pause it", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-waiting-work");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const firstClaim = await claimController(service, task, "waiting-work-initial");
  await requestLocalWork(service, task.taskId, firstClaim);

  task = await service.getTask(task.taskId);
  assert.equal(task.status, "WAITING_FOR_ROLE_WORK");
  assert.equal(task.controllerClaim, null);
  const controlClaim = await claimController(service, task, "waiting-work-control");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: controlClaim.claim.claimToken,
    expectedTaskVersion: controlClaim.taskVersion,
    expectedPlanVersion: controlClaim.planVersion,
    idempotencyKey: "pause-waiting-work",
    producerRef: "controller-profile",
    command: { type: "PAUSE_TASK", payload: { reason: "operator pause" } },
  });

  task = await service.getTask(task.taskId);
  assert.equal(task.status, "PAUSED");
  assert.equal(task.resumeStatus, "WAITING_FOR_ROLE_WORK");
  assert.equal((await service.getWorkItems(task.taskId))[0].status, "PENDING");
});

test("paused Task resumes to its preserved Work waiting state", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-resume-work");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const firstClaim = await claimController(service, task, "resume-work-initial");
  await requestLocalWork(service, task.taskId, firstClaim, "resume-work-request");
  task = await service.getTask(task.taskId);
  const pauseClaim = await claimController(service, task, "resume-work-pause-claim");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: pauseClaim.claim.claimToken,
    expectedTaskVersion: pauseClaim.taskVersion,
    expectedPlanVersion: pauseClaim.planVersion,
    idempotencyKey: "resume-work-pause",
    producerRef: "controller-profile",
    command: { type: "PAUSE_TASK", payload: { reason: "maintenance" } },
  });
  task = await service.getTask(task.taskId);
  const resumeClaim = await claimController(service, task, "resume-work-resume-claim");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: resumeClaim.claim.claimToken,
    expectedTaskVersion: resumeClaim.taskVersion,
    expectedPlanVersion: resumeClaim.planVersion,
    idempotencyKey: "resume-work-command",
    producerRef: "controller-profile",
    command: { type: "RESUME_TASK", payload: { reason: "maintenance finished" } },
  });

  task = await service.getTask(task.taskId);
  assert.equal(task.status, "WAITING_FOR_ROLE_WORK");
  assert.equal(task.resumeStatus, null);
  assert.ok((await service.listEvents(task.taskId)).some((event) => event.eventType === "TASK_RESUMED"));
});

test("Approval Resolution returns a waiting Task to controller", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-approval");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "approval-request-claim");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "approval-request",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_APPROVAL",
      payload: { nodeId: "node-01", approvalRef: "approval-001" },
    },
  });

  task = await service.getTask(task.taskId);
  assert.equal(task.status, "WAITING_FOR_APPROVAL");
  const resolved = await service.resolveApproval({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    approvalRef: "approval-001",
    resolution: "APPROVED",
    expectedTaskVersion: task.taskVersion,
    expectedPlanVersion: task.plan.planVersion,
    idempotencyKey: "approval-resolve",
    producerRef: "approval-adapter",
    resultRef: "approval-result-001",
    summary: "approved",
  });

  assert.equal(resolved.status, "READY_FOR_CONTROLLER");
  assert.equal(resolved.plan.nodes[0].status, "IN_PROGRESS");
  assert.equal(resolved.plan.nodes[0].approvalRef, null);
  assert.deepEqual(resolved.approvalRefs, []);
  assert.ok((await service.listEvents(task.taskId)).some((event) => event.eventType === "APPROVAL_RESOLVED"));
});

test("Approval Resolution received during pause is preserved until resume", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-paused-approval");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "paused-approval-request");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "paused-approval-create",
    producerRef: "controller-profile",
    command: {
      type: "REQUEST_APPROVAL",
      payload: { nodeId: "node-01", approvalRef: "approval-paused" },
    },
  });
  task = await service.getTask(task.taskId);
  const pauseClaim = await claimController(service, task, "paused-approval-control");
  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: pauseClaim.claim.claimToken,
    expectedTaskVersion: pauseClaim.taskVersion,
    expectedPlanVersion: pauseClaim.planVersion,
    idempotencyKey: "paused-approval-pause",
    producerRef: "controller-profile",
    command: { type: "PAUSE_TASK", payload: { reason: "pause before approval" } },
  });
  task = await service.getTask(task.taskId);
  const resolved = await service.resolveApproval({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    approvalRef: "approval-paused",
    resolution: "REJECTED",
    expectedTaskVersion: task.taskVersion,
    expectedPlanVersion: task.plan.planVersion,
    idempotencyKey: "paused-approval-resolve",
    producerRef: "approval-adapter",
    summary: "needs revision",
  });
  assert.equal(resolved.status, "PAUSED");
  assert.equal(resolved.resumeStatus, "READY_FOR_CONTROLLER");
  assert.equal(resolved.plan.nodes[0].status, "BLOCKED");
});

test("Work and Dispatch Claim expiry produce immutable release events", async () => {
  const { service, clock } = harness();
  let task = await createTask(service, "task-claim-events");
  const pending = (await service.listPendingDispatches())[0];
  await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    hostId: "expiring-host",
    leaseMs: 1_000,
    idempotencyKey: "expiring-dispatch-claim",
  });
  clock.advance(1_001);
  await service.reconcile(task.taskId);
  let events = await service.listEvents(task.taskId);
  assert.ok(events.some((event) => event.eventType === "DISPATCH_CLAIM_RELEASED"));

  await deliverControllerWake(service, "replacement-host");
  task = await service.getTask(task.taskId);
  const controller = await claimController(service, task, "claim-events-controller");
  await requestLocalWork(service, task.taskId, controller, "claim-events-work-request");
  const work = (await service.listAvailableWork("runtime-observer"))[0];
  await service.claimWorkItem({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    workItemId: work.workItemId,
    roleId: "runtime-observer",
    claimantId: "expiring-worker",
    leaseMs: 1_000,
    idempotencyKey: "expiring-work-claim",
  });
  clock.advance(1_001);
  await service.reconcile(task.taskId);
  events = await service.listEvents(task.taskId);
  assert.ok(events.some((event) => event.eventType === "WORK_ITEM_CLAIM_RELEASED"));
  assert.ok(events.some((event) => event.eventType === "WORK_ITEM_CLAIMED"));
});

test("same idempotency key with a different request is rejected without side effects", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-fingerprint");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "fingerprint-claim");
  const base = {
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: task.taskId,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: claim.planVersion,
    idempotencyKey: "shared-command-key",
    producerRef: "controller-profile",
  };
  await service.submitControllerCommand({
    ...base,
    command: { type: "BLOCK_TASK", payload: { reason: "first reason" } },
  });
  const afterFirst = await service.snapshot();
  await assert.rejects(
    service.submitControllerCommand({
      ...base,
      command: { type: "BLOCK_TASK", payload: { reason: "different reason" } },
    }),
    (error) => error instanceof TaskControlError && error.code === "IDEMPOTENCY_KEY_CONFLICT",
  );
  assert.deepEqual(await service.snapshot(), afterFirst);
});

test("illegal RESUME command has no side effects", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-illegal-resume");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "illegal-resume-claim");
  const before = await service.snapshot();
  await assert.rejects(
    service.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: task.taskId,
      claimToken: claim.claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      expectedPlanVersion: claim.planVersion,
      idempotencyKey: "illegal-resume",
      producerRef: "controller-profile",
      command: { type: "RESUME_TASK", payload: {} },
    }),
    (error) => error instanceof TaskControlError && error.code === "COMMAND_NOT_ALLOWED",
  );
  assert.deepEqual(await service.snapshot(), before);
});

test("CTL candidate contract preserves Task and Plan versions", async () => {
  const { service } = harness();
  const task = await createTask(service, "task-ctl-contract");
  const proposal = toControllerInputProposal(
    await service.getDecisionContext(task.taskId),
  );
  assert.equal(proposal.proposalVersion, TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION);
  assert.equal(proposal.taskId, task.taskId);
  assert.equal(proposal.taskVersion, task.taskVersion);
  assert.equal(proposal.planVersion, task.plan.planVersion);
  assert.equal(proposal.currentNodeId, "node-01");
  assert.ok(proposal.allowedCommands.includes("REQUEST_ROLE_WORK"));
});

test("LCL candidate contract contains only WorkItem coordination references", async () => {
  const { service } = harness();
  let task = await createTask(service, "task-lcl-contract");
  await deliverControllerWake(service);
  task = await service.getTask(task.taskId);
  const claim = await claimController(service, task, "lcl-contract-claim");
  await requestLocalWork(service, task.taskId, claim, "lcl-contract-work");
  const work = (await service.getWorkItems(task.taskId))[0];
  const proposal = toLocalWorkRequestProposal(work);
  assert.equal(proposal.proposalVersion, TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION);
  assert.equal(proposal.capabilityRef, "local.runtime.status.read");
  assert.equal(proposal.expectedResultType, "local-result@1");
  assert.equal("resultBody" in proposal, false);
  assert.equal("localResult" in proposal, false);
});

test("BHR candidate contract materializes Dispatch intent without DOM semantics", async () => {
  const { service } = harness();
  await createTask(service, "task-bhr-contract");
  const signal = (await service.listPendingDispatches())[0];
  const proposal = toBrowserDispatchProposal(signal);
  assert.equal(proposal.proposalVersion, TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION);
  assert.equal(proposal.dispatchId, signal.signalId);
  assert.equal(proposal.target.roleRef, "controller");
  assert.equal(proposal.intent.hostCommandRef, signal.hostCommandRef);
  assert.equal("selector" in proposal, false);
  assert.equal("dom" in proposal, false);
});

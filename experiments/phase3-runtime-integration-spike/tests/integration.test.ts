import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import {
  InMemoryTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlService,
} from "@ai-agent-platform/task-control";
import {
  createDefaultRegistry,
} from "@ai-agent-platform/local-control";

import {
  CapabilityRegistry,
  InferenceBackendRegistry,
  type ExecutionFlow,
} from "../../execution-flow-runtime/index.js";
import {
  EXECUTION_TARGET_DOMAIN,
  EXECUTION_WORKER_ROLE,
  InMemoryExecutionReferenceStore,
  TaskRuntimeWorker,
  registerLocalControlCapabilities,
  type ExecutionPayload,
} from "../src/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");

async function acknowledgeInitialControllerWake(service: TaskControlService, taskId: string): Promise<void> {
  const [pending] = await service.listPendingDispatches();
  assert.ok(pending, "expected initial controller wake dispatch");
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    hostId: `host:${taskId}`,
    leaseMs: 60_000,
    idempotencyKey: `dispatch-claim:${taskId}`,
  });
  assert.ok(claimed.dispatch.claim?.claimToken);
  await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    claimToken: claimed.dispatch.claim.claimToken,
    idempotencyKey: `dispatch-ack:${taskId}`,
    producerRef: `host:${taskId}`,
  });
}

async function createExecutionWorkItem(
  service: TaskControlService,
  taskId: string,
  inputRef: string,
): Promise<string> {
  await service.intakeTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    title: "Phase 3 Runtime integration spike",
    objective: "Execute one Task WorkItem through the frozen Execution Flow Runtime.",
    requiredRole: "controller",
    plan: {
      source: { type: "controller", ref: "phase3-controller" },
      currentNodeId: "execute-runtime",
      nodes: [
        {
          nodeId: "execute-runtime",
          title: "Run execution flow",
          kind: "ACTION",
          status: "READY",
          requiredRole: "controller",
        },
      ],
    },
    idempotencyKey: `intake:${taskId}`,
    producerRef: "phase3-runtime-integration-spike",
  });

  await acknowledgeInitialControllerWake(service, taskId);
  let taskState = await service.getTask(taskId);
  const controllerClaim = await service.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    expectedTaskVersion: taskState.taskVersion,
    roleId: "controller",
    profileId: "phase3-controller",
    leaseMs: 60_000,
    idempotencyKey: `controller-claim:${taskId}`,
  });

  await service.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    claimToken: controllerClaim.claim.claimToken,
    expectedTaskVersion: controllerClaim.taskVersion,
    ...(controllerClaim.planVersion === null
      ? {}
      : { expectedPlanVersion: controllerClaim.planVersion }),
    idempotencyKey: `request-execution:${taskId}`,
    producerRef: "phase3-controller",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: "execute-runtime",
        targetDomain: EXECUTION_TARGET_DOMAIN,
        requiredRole: EXECUTION_WORKER_ROLE,
        capabilityRef: "execution.flow.run",
        inputRef,
        expectedResultType: "execution.result.v0",
      },
    },
  });

  taskState = await service.getTask(taskId);
  assert.equal(taskState.plan?.currentNodeId, "execute-runtime");
  const [item] = await service.getWorkItems(taskId);
  assert.ok(item);
  return item.workItemId;
}

function payload(flow: ExecutionFlow, inputs: Record<string, unknown>, allowed: string[]): ExecutionPayload {
  return {
    flow,
    inputs,
    allowed_capabilities: allowed,
    max_node_runs: 8,
  };
}

function fixtureFlow(): ExecutionFlow {
  return {
    contract: "execution.flow.v0",
    flow_id: "phase3.fixture.echo",
    version: 1,
    entry_node: "echo",
    nodes: [
      {
        id: "echo",
        type: "action",
        capability: "fixture.echo",
        arguments: {
          value: { $ref: "inputs.message" },
        },
        next: "done",
      },
      {
        id: "done",
        type: "return",
        output: {
          echo: { $ref: "steps.echo.output.value" },
        },
      },
    ],
  };
}

function localHealthFlow(): ExecutionFlow {
  return {
    contract: "execution.flow.v0",
    flow_id: "phase3.local.health",
    version: 1,
    entry_node: "local-health",
    nodes: [
      {
        id: "local-health",
        type: "action",
        capability: "local.health.read",
        arguments: {},
        next: "done",
      },
      {
        id: "done",
        type: "return",
        output: {
          local_status: { $ref: "steps.local-health.output.status" },
          capability: { $ref: "steps.local-health.output.capability" },
        },
      },
    ],
  };
}

function missingCapabilityFlow(): ExecutionFlow {
  return {
    contract: "execution.flow.v0",
    flow_id: "phase3.failure.mapping",
    version: 1,
    entry_node: "missing",
    nodes: [
      {
        id: "missing",
        type: "action",
        capability: "missing.capability",
        arguments: {},
        next: "done",
      },
      {
        id: "done",
        type: "return",
        output: { ok: true },
      },
    ],
  };
}

function harness(capabilities: CapabilityRegistry) {
  const taskControl = new TaskControlService(
    new InMemoryTaskControlStore(),
    new SystemClock(),
    new RandomIdGenerator(),
  );
  const references = new InMemoryExecutionReferenceStore();
  const worker = new TaskRuntimeWorker({
    taskControl,
    references,
    capabilities,
    inferenceBackends: new InferenceBackendRegistry(),
  });
  return { taskControl, references, worker };
}

test("Task WorkItem -> Runtime fixture capability -> ExecutionResult -> Task success", async () => {
  const capabilities = new CapabilityRegistry().register(
    {
      contract: "execution.capability.v0",
      name: "fixture.echo",
      description: "Echo integration fixture.",
      effects: "read",
      input_schema: {
        type: "object",
        required: ["value"],
        properties: { value: { type: "string" } },
        additionalProperties: false,
      },
    },
    async (args) => ({ value: args.value }),
  );
  const { taskControl, references, worker } = harness(capabilities);
  const taskId = "phase3-runtime-fixture-success";
  const inputRef = `execution-input:${taskId}`;
  references.putExecutionPayload(inputRef, payload(fixtureFlow(), { message: "hello-runtime" }, ["fixture.echo"]));
  const workItemId = await createExecutionWorkItem(taskControl, taskId, inputRef);

  const cycle = await worker.runOnce();
  assert.equal(cycle.status, "completed");
  assert.equal(cycle.workItemId, workItemId);
  assert.ok(cycle.resultRef);

  const result = references.getExecutionResult(cycle.resultRef);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { echo: "hello-runtime" });
  assert.equal(result.correlation.task_id, taskId);
  assert.equal(result.correlation.work_item_id, workItemId);

  const item = await taskControl.getCurrentWorkItem(workItemId);
  assert.equal(item.status, "SUCCEEDED");
  assert.equal(item.resultRef, cycle.resultRef);
  assert.ok((await taskControl.listTaskEvents(taskId)).some((event) => event.eventType === "ROLE_WORK_SUCCEEDED"));
});

test("Task WorkItem -> Runtime -> real Local Control public API -> Task success", async () => {
  const localRegistry = createDefaultRegistry({
    cwd: REPO_ROOT,
    environment: { ...process.env, LOCAL_PROJECT_ROOT: REPO_ROOT },
  });
  const capabilities = registerLocalControlCapabilities(new CapabilityRegistry(), {
    localControl: { registry: localRegistry },
    capabilities: ["local.health.read"],
  });
  const { taskControl, references, worker } = harness(capabilities);
  const taskId = "phase3-runtime-local-health";
  const inputRef = `execution-input:${taskId}`;
  references.putExecutionPayload(inputRef, payload(localHealthFlow(), {}, ["local.health.read"]));
  const workItemId = await createExecutionWorkItem(taskControl, taskId, inputRef);

  const cycle = await worker.runOnce();
  assert.equal(cycle.status, "completed");
  assert.ok(cycle.resultRef);

  const result = references.getExecutionResult(cycle.resultRef);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, {
    local_status: "SUCCEEDED",
    capability: "local.health.read",
  });
  assert.deepEqual(result.evidence.map((entry) => entry.capability), ["local.health.read"]);

  const item = await taskControl.getCurrentWorkItem(workItemId);
  assert.equal(item.status, "SUCCEEDED");
  assert.equal(item.resultRef, cycle.resultRef);
});

test("Runtime failure is projected back as durable Task WorkItem failure", async () => {
  const { taskControl, references, worker } = harness(new CapabilityRegistry());
  const taskId = "phase3-runtime-failure";
  const inputRef = `execution-input:${taskId}`;
  references.putExecutionPayload(inputRef, payload(missingCapabilityFlow(), {}, ["missing.capability"]));
  const workItemId = await createExecutionWorkItem(taskControl, taskId, inputRef);

  const cycle = await worker.runOnce();
  assert.equal(cycle.status, "failed");
  assert.ok(cycle.resultRef);
  const result = references.getExecutionResult(cycle.resultRef);
  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "CAPABILITY_NOT_FOUND");

  const item = await taskControl.getCurrentWorkItem(workItemId);
  assert.equal(item.status, "FAILED");
  assert.equal(item.errorCode, "CAPABILITY_NOT_FOUND");
  assert.ok((await taskControl.listTaskEvents(taskId)).some((event) => event.eventType === "ROLE_WORK_FAILED"));
});

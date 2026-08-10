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
import { createDefaultRegistry } from "@ai-agent-platform/local-control";

import {
  CapabilityRegistry,
  InferenceBackendRegistry,
  MlxHubInferenceBackend,
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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required for the live FAST integration test.`);
  return value;
}

async function acknowledgeInitialControllerWake(
  service: TaskControlService,
  taskId: string,
): Promise<void> {
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
    title: "Phase 3 Runtime FAST integration live",
    objective:
      "Run one Task WorkItem through Local Control and the frozen Runtime FAST inference path.",
    requiredRole: "controller",
    plan: {
      source: { type: "controller", ref: "phase3-controller" },
      currentNodeId: "execute-runtime",
      nodes: [
        {
          nodeId: "execute-runtime",
          title: "Run execution flow with FAST verification",
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

  const [item] = await service.getWorkItems(taskId);
  assert.ok(item);
  return item.workItemId;
}

function fastHealthFlow(): ExecutionFlow {
  return {
    contract: "execution.flow.v0",
    flow_id: "phase3.task-local-fast-health",
    version: 1,
    entry_node: "local-health",
    nodes: [
      {
        id: "local-health",
        type: "action",
        capability: "local.health.read",
        arguments: {},
        next: "fast-verify",
      },
      {
        id: "fast-verify",
        type: "inference",
        backend: "mlxhub",
        role: "fast",
        instruction:
          "Verify the supplied Local Control result. If local_status is exactly SUCCEEDED and capability is exactly local.health.read, return state=verified and decision=healthy. Otherwise return state=unhealthy and decision=unhealthy. Use only these supplied fields.",
        input: {
          local_status: { $ref: "steps.local-health.output.status" },
          capability: { $ref: "steps.local-health.output.capability" },
        },
        output_schema: {
          type: "object",
          properties: {
            state: { enum: ["verified", "unhealthy"] },
            decision: { enum: ["healthy", "unhealthy"] },
          },
          required: ["state", "decision"],
          additionalProperties: false,
        },
        next: "done",
      },
      {
        id: "done",
        type: "return",
        output: {
          local_status: { $ref: "steps.local-health.output.status" },
          state: { $ref: "steps.fast-verify.output.state" },
          decision: { $ref: "steps.fast-verify.output.decision" },
          verified_by: "fast",
        },
      },
    ],
  };
}

function payload(flow: ExecutionFlow): ExecutionPayload {
  return {
    flow,
    inputs: {},
    allowed_capabilities: ["local.health.read"],
    max_node_runs: 8,
  };
}

test("LIVE: Task -> frozen Runtime -> real Local Control -> MLXHub FAST -> ExecutionResult -> Task success", async () => {
  const baseUrl = requireEnv("MLXHUB_BASE_URL");
  const fastModel = requireEnv("MLXHUB_FAST_MODEL");
  const reasonModel = requireEnv("MLXHUB_REASON_MODEL");
  const timeoutMs = Number(process.env.MLXHUB_TIMEOUT_MS ?? "180000");
  assert.ok(
    Number.isInteger(timeoutMs) && timeoutMs > 0,
    "MLXHUB_TIMEOUT_MS must be a positive integer.",
  );

  const taskControl = new TaskControlService(
    new InMemoryTaskControlStore(),
    new SystemClock(),
    new RandomIdGenerator(),
  );
  const references = new InMemoryExecutionReferenceStore();

  const localRegistry = createDefaultRegistry({
    cwd: REPO_ROOT,
    environment: { ...process.env, LOCAL_PROJECT_ROOT: REPO_ROOT },
  });
  const capabilities = registerLocalControlCapabilities(new CapabilityRegistry(), {
    localControl: { registry: localRegistry },
    capabilities: ["local.health.read"],
  });
  const inferenceBackends = new InferenceBackendRegistry().register(
    "mlxhub",
    new MlxHubInferenceBackend({
      baseUrl,
      fastModel,
      reasonModel,
      timeoutMs,
      fastMaxTokens: 1024,
    }),
  );
  const worker = new TaskRuntimeWorker({
    taskControl,
    references,
    capabilities,
    inferenceBackends,
  });

  const taskId = "phase3-runtime-fast-live";
  const inputRef = `execution-input:${taskId}`;
  references.putExecutionPayload(inputRef, payload(fastHealthFlow()));
  const workItemId = await createExecutionWorkItem(taskControl, taskId, inputRef);

  const cycle = await worker.runOnce();
  assert.equal(cycle.status, "completed");
  assert.equal(cycle.workItemId, workItemId);
  assert.ok(cycle.resultRef);

  const result = references.getExecutionResult(cycle.resultRef);
  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, {
    local_status: "SUCCEEDED",
    state: "verified",
    decision: "healthy",
    verified_by: "fast",
  });
  assert.deepEqual(
    result.node_runs.map((entry) => entry.node_id),
    ["local-health", "fast-verify", "done"],
  );
  assert.deepEqual(
    result.evidence.map((entry) => entry.type),
    ["capability-result", "inference-result"],
  );
  assert.equal(result.evidence[0]?.capability, "local.health.read");
  assert.equal(result.evidence[1]?.backend, "mlxhub");
  assert.equal(result.evidence[1]?.role, "fast");
  assert.equal(result.evidence[1]?.metadata?.provider, "mlxhub");
  assert.equal(result.evidence[1]?.metadata?.model, fastModel);
  assert.equal(result.correlation.task_id, taskId);
  assert.equal(result.correlation.work_item_id, workItemId);

  const item = await taskControl.getCurrentWorkItem(workItemId);
  assert.equal(item.status, "SUCCEEDED");
  assert.equal(item.resultRef, cycle.resultRef);
  assert.ok(
    (await taskControl.listTaskEvents(taskId)).some(
      (event) => event.eventType === "ROLE_WORK_SUCCEEDED",
    ),
  );
});

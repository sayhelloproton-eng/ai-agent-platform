import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  JsonFileTaskControlStore,
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
  createExecutionFlowServer,
  type ExecutionFlow,
} from "../../execution-flow-runtime/index.js";
import {
  EXECUTION_TARGET_DOMAIN,
  EXECUTION_WORKER_ROLE,
  HttpExecutionRuntimeClient,
  JsonFileExecutionReferenceStore,
  TaskRuntimeWorker,
  registerLocalControlCapabilities,
  type ExecutionPayload,
} from "../src/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required for the durable HTTP FAST integration test.`);
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
    title: "Phase 3 durable Runtime HTTP FAST acceptance",
    objective:
      "Persist one Task WorkItem, execute it through the Runtime HTTP service, Local Control and FAST, then prove the Task/result references survive reopen.",
    requiredRole: "controller",
    plan: {
      source: { type: "controller", ref: "phase3-controller" },
      currentNodeId: "execute-runtime",
      nodes: [
        {
          nodeId: "execute-runtime",
          title: "Run execution flow through Runtime HTTP service",
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
  const taskState = await service.getTask(taskId);
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
    flow_id: "phase3.durable-http-local-fast-health",
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

test("LIVE: durable Task store -> Runtime HTTP -> Local Control -> MLXHub FAST -> durable resultRef survives reopen", async () => {
  const baseUrl = requireEnv("MLXHUB_BASE_URL");
  const fastModel = requireEnv("MLXHUB_FAST_MODEL");
  const reasonModel = requireEnv("MLXHUB_REASON_MODEL");
  const timeoutMs = Number(process.env.MLXHUB_TIMEOUT_MS ?? "180000");
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0);

  const root = await mkdtemp(join(tmpdir(), "aap-phase3-runtime-spike3-"));
  const taskStorePath = join(root, "task-control", "state.json");
  const referenceRoot = join(root, "execution-references");
  let taskStore: JsonFileTaskControlStore | undefined;
  let runtimeServer: Awaited<ReturnType<typeof createExecutionFlowServer>> | undefined;

  try {
    taskStore = await JsonFileTaskControlStore.open(taskStorePath);
    const taskControl = new TaskControlService(
      taskStore,
      new SystemClock(),
      new RandomIdGenerator(),
    );
    const references = new JsonFileExecutionReferenceStore(referenceRoot);

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

    runtimeServer = await createExecutionFlowServer({
      config: {
        host: "127.0.0.1",
        port: 0,
        workspace_root: REPO_ROOT,
        max_node_runs: 8,
      },
      instanceId: "phase3-spike3-http-runtime",
      runtimeEnvironment: { capabilities, inferenceBackends },
    });
    await runtimeServer.listen();
    const address = runtimeServer.server.address();
    assert.ok(address && typeof address === "object", "Runtime HTTP server did not expose an address.");

    const worker = new TaskRuntimeWorker({
      taskControl,
      references,
      capabilities: new CapabilityRegistry(),
      inferenceBackends: new InferenceBackendRegistry(),
      runtime: new HttpExecutionRuntimeClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
      }),
    });

    const taskId = "phase3-runtime-durable-http-fast-live";
    const inputRef = `execution-input:${taskId}`;
    references.putExecutionPayload(inputRef, payload(fastHealthFlow()));
    const workItemId = await createExecutionWorkItem(taskControl, taskId, inputRef);

    const cycle = await worker.runOnce();
    assert.equal(cycle.status, "completed");
    assert.equal(cycle.workItemId, workItemId);
    assert.ok(cycle.resultRef);

    const immediateResult = references.getExecutionResult(cycle.resultRef);
    assert.equal(immediateResult.status, "completed");
    assert.deepEqual(immediateResult.output, {
      local_status: "SUCCEEDED",
      state: "verified",
      decision: "healthy",
      verified_by: "fast",
    });
    assert.deepEqual(
      immediateResult.node_runs.map((entry) => entry.node_id),
      ["local-health", "fast-verify", "done"],
    );
    assert.equal(immediateResult.evidence[0]?.capability, "local.health.read");
    assert.equal(immediateResult.evidence[1]?.backend, "mlxhub");
    assert.equal(immediateResult.evidence[1]?.role, "fast");
    assert.equal(immediateResult.evidence[1]?.metadata?.model, fastModel);

    await runtimeServer.close();
    runtimeServer = undefined;
    await taskStore.close();
    taskStore = undefined;

    const reopenedStore = await JsonFileTaskControlStore.open(taskStorePath);
    try {
      const reopenedTaskControl = new TaskControlService(
        reopenedStore,
        new SystemClock(),
        new RandomIdGenerator(),
      );
      const reopenedReferences = new JsonFileExecutionReferenceStore(referenceRoot);
      const item = await reopenedTaskControl.getCurrentWorkItem(workItemId);
      assert.equal(item.status, "SUCCEEDED");
      assert.equal(item.resultRef, cycle.resultRef);

      const task = await reopenedTaskControl.getCurrentTask(taskId);
      assert.equal(task.status, "READY_FOR_CONTROLLER");
      assert.ok(task.latestResultRefs.includes(cycle.resultRef));
      const events = await reopenedTaskControl.listTaskEvents(taskId);
      assert.ok(events.some((event) => event.eventType === "ROLE_WORK_SUCCEEDED"));

      const durableResult = reopenedReferences.getExecutionResult(cycle.resultRef);
      assert.equal(durableResult.contract, "execution.result.v0");
      assert.equal(durableResult.status, "completed");
      assert.equal(durableResult.correlation.task_id, taskId);
      assert.equal(durableResult.correlation.work_item_id, workItemId);
      assert.deepEqual(durableResult.output, immediateResult.output);

      const controllerClaim = await reopenedTaskControl.claimController({
        contractVersion: TASK_CONTROL_CONTRACT_VERSION,
        taskId,
        expectedTaskVersion: task.taskVersion,
        roleId: "controller",
        profileId: "phase3-controller",
        leaseMs: 60_000,
        idempotencyKey: `controller-resume:${taskId}`,
      });
      await reopenedTaskControl.submitControllerCommand({
        commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
        taskId,
        claimToken: controllerClaim.claim.claimToken,
        expectedTaskVersion: controllerClaim.taskVersion,
        ...(controllerClaim.planVersion === null
          ? {}
          : { expectedPlanVersion: controllerClaim.planVersion }),
        idempotencyKey: `advance-after-execution:${taskId}`,
        producerRef: "phase3-controller",
        command: {
          type: "ADVANCE_PLAN_NODE",
          payload: {
            nodeId: "execute-runtime",
            resultRefs: [cycle.resultRef],
            summary: "Runtime HTTP execution completed and durable result was verified.",
          },
        },
      });

      const advanced = await reopenedTaskControl.getCurrentTask(taskId);
      assert.equal(advanced.plan?.status, "COMPLETED");
      assert.equal(advanced.plan?.currentNodeId, null);
      assert.ok(advanced.controllerClaim?.claimToken);

      await reopenedTaskControl.submitControllerCommand({
        commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
        taskId,
        claimToken: advanced.controllerClaim.claimToken,
        expectedTaskVersion: advanced.taskVersion,
        ...(advanced.plan === null
          ? {}
          : { expectedPlanVersion: advanced.plan.planVersion }),
        idempotencyKey: `complete-after-execution:${taskId}`,
        producerRef: "phase3-controller",
        command: {
          type: "COMPLETE_TASK",
          payload: { summary: "Phase 3 Runtime durable HTTP FAST acceptance completed." },
        },
      });

      const completed = await reopenedTaskControl.getCurrentTask(taskId);
      assert.equal(completed.status, "COMPLETED");
      assert.ok(
        (await reopenedTaskControl.listTaskEvents(taskId)).some(
          (event) => event.eventType === "TASK_COMPLETED",
        ),
      );
    } finally {
      await reopenedStore.close();
    }
  } finally {
    if (runtimeServer) await runtimeServer.close().catch(() => undefined);
    if (taskStore) await taskStore.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

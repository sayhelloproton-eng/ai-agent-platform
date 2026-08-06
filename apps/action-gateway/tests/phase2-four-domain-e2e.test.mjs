import assert from "node:assert/strict";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  LOCAL_WORK_HANDOFF_VERSION,
  PHASE2_INTEGRATION_CONTRACT_VERSION,
} from "@ai-agent-platform/contracts";
import {
  createDefaultRegistry,
  executeLocalRequest,
} from "@ai-agent-platform/local-control";
import {
  InMemoryTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TaskControlService,
} from "@ai-agent-platform/task-control";

import { HttpGatewayClient } from "../../browser-host-runtime/src/background/gateway-client.js";
import { DispatchClient } from "../../browser-host-runtime/src/background/dispatch-client.js";
import {
  buildDeliveryFact,
  buildHostResult,
} from "../../browser-host-runtime/src/shared/contracts.js";
import { HOST_RESULT_STATUS } from "../../browser-host-runtime/src/shared/constants.js";

import { createGatewayServer } from "../dist/app.js";
import { createBrowserHostServerAdapter } from "../dist/browser-host-server-adapter.js";
import { InMemoryControllerIdempotencySnapshotStore } from "../dist/controller-idempotency-store.js";
import { createLocalWorkWorker } from "../dist/local-work-worker.js";
import { Phase2IntegrationStore } from "../dist/phase2-integration-store.js";
import { createPhase2TaskIntakeAdapter } from "../dist/phase2-task-intake.js";
import { createTaskControlControllerAdapter } from "../dist/task-control-controller-adapter.js";

const API_KEY = "phase2-e2e-api-key-0123456789abcdef";
const CONTROLLER = {
  profileId: "ai-agent-platform-controller",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

async function startHarness() {
  const taskControl = new TaskControlService(
    new InMemoryTaskControlStore(),
    new SystemClock(),
    new RandomIdGenerator(),
  );
  const integrationStore = Phase2IntegrationStore.inMemory();
  const controller = createTaskControlControllerAdapter(taskControl, {
    projectId: "ai-agent-platform",
    claimTtlMs: 60_000,
    idempotencyStore: new InMemoryControllerIdempotencySnapshotStore(),
    approvalGrantRegistrar: integrationStore,
  });
  const taskIntake = createPhase2TaskIntakeAdapter(taskControl, integrationStore);
  const browserHostServer = createBrowserHostServerAdapter(taskControl, integrationStore);
  const registry = createDefaultRegistry({
    cwd: REPO_ROOT,
    environment: { ...process.env, LOCAL_PROJECT_ROOT: REPO_ROOT },
  });
  const localWorker = createLocalWorkWorker({
    taskControl,
    integrationStore,
    client: {
      execute(request) {
        return executeLocalRequest(request, { registry });
      },
    },
  });
  const server = createGatewayServer({
    apiKey: API_KEY,
    controllerTaskControl: controller,
    controllerIdentity: CONTROLLER,
    phase2TaskIntake: taskIntake,
    browserHostServer,
    approvalGrantRegistrar: integrationStore,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    taskControl,
    integrationStore,
    localWorker,
    async close() {
      server.close();
      await once(server, "close");
    },
  };
}

async function post(baseUrl, route, body, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const envelope = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(envelope));
  assert.equal(envelope.ok, true, JSON.stringify(envelope));
  return envelope.data;
}

async function context(baseUrl, taskId) {
  return post(baseUrl, "/v1/controller/task-context", { taskId });
}

async function claim(baseUrl, task) {
  return post(baseUrl, "/v1/controller/task-claim", {
    taskId: task.taskId,
    expectedTaskVersion: task.taskVersion,
    idempotencyKey: `claim:${task.taskVersion}`,
  });
}

async function command(baseUrl, claimValue, task, idempotencyKey, value) {
  return post(baseUrl, "/v1/controller/task-command", {
    taskId: task.taskId,
    claimToken: claimValue.claimToken,
    expectedTaskVersion: Math.max(task.taskVersion, claimValue.taskVersion),
    expectedPlanVersion: task.plan?.planVersion ?? claimValue.planVersion ?? null,
    idempotencyKey,
    command: value,
  });
}

test("Phase 2 real HTTP E2E closes CTL -> TSK -> LCL/BHR -> TSK -> CTL", async () => {
  const harness = await startHarness();
  const taskId = "task-phase2-four-domain-e2e";
  try {
    const intake = await post(harness.baseUrl, "/v1/task-control/intake", {
      contractVersion: PHASE2_INTEGRATION_CONTRACT_VERSION,
      taskId,
      title: "Phase 2 four-domain E2E",
      objective: "Read Local Control health, observe the Browser Host page, and close the Task through Controller decisions.",
      requiredRole: "controller",
      conversationRef: "conversation:e2e-controller",
      plan: {
        source: { type: "controller", ref: CONTROLLER.profileId },
        currentNodeId: "local-health",
        nodes: [
          {
            nodeId: "local-health",
            title: "Read Local Control health",
            kind: "WORK",
            requiredRole: "local-executor",
          },
          {
            nodeId: "browser-observe",
            title: "Observe the browser page",
            kind: "WORK",
            requiredRole: "browser-host",
            dependsOn: ["local-health"],
          },
          {
            nodeId: "finalize",
            title: "Finalize the integrated task",
            kind: "FINALIZE",
            requiredRole: "controller",
            dependsOn: ["browser-observe"],
          },
        ],
      },
      payloadResources: [
        {
          payloadRef: "payload:local-health",
          value: {
            localWorkVersion: LOCAL_WORK_HANDOFF_VERSION,
            actor: { actor_type: "controller", actor_id: CONTROLLER.profileId },
            scope: { project_id: "ai-agent-platform" },
            parameters: {},
            budget: {
              timeout_ms: 5_000,
              max_stdout_bytes: 32_768,
              max_result_chars: 32_768,
            },
            continuation: { completionPolicy: "CONTROLLER_DECIDES" },
          },
        },
        {
          payloadRef: "payload:browser-observe",
          value: { purpose: "Phase 2 Browser Host observation E2E" },
        },
      ],
      idempotencyKey: "intake:phase2-e2e",
      producerRef: "phase2-e2e-test",
    }, 200);
    assert.equal(intake.taskId, taskId);

    let decision = await context(harness.baseUrl, taskId);
    assert.ok(decision.allowedControllerCommands.includes("REQUEST_ROLE_WORK"));
    let controllerClaim = await claim(harness.baseUrl, decision.task);
    let receipt = await command(
      harness.baseUrl,
      controllerClaim,
      decision.task,
      "request:local-health",
      {
        type: "REQUEST_ROLE_WORK",
        reasonSummary: "Delegate the current node to Local Control.",
        payload: {
          nodeId: "local-health",
          targetDomain: "local-control",
          requiredRole: "local-executor",
          objective: "Return the Local Control health result.",
          capabilityRef: "local.health.read",
          inputRef: "payload:local-health",
          expectedResultType: "local-result-v1",
        },
      },
    );
    assert.ok(receipt.createdRefs.some((value) => value.startsWith("work-")));

    const workerCycle = await harness.localWorker.runOnce();
    assert.equal(workerCycle.succeeded, 1);
    decision = await context(harness.baseUrl, taskId);
    assert.equal((await harness.taskControl.getTask(taskId)).status, "READY_FOR_CONTROLLER");
    assert.equal(decision.task.lifecycleStatus, "ACTIVE");
    assert.ok(decision.latestResults.length >= 1);
    controllerClaim = await claim(harness.baseUrl, decision.task);
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      decision.task,
      "advance:local-health",
      {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "Local Control health is valid.",
        payload: {
          nodeId: "local-health",
          resultRefs: decision.latestResults.map((value) => value.resultRef),
        },
      },
    );
    assert.equal(receipt.task.plan.currentNodeId, "browser-observe");

    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      receipt.task,
      "request:browser-observe",
      {
        type: "REQUEST_ROLE_WORK",
        reasonSummary: "Delegate browser observation to the Browser Host Runtime.",
        payload: {
          nodeId: "browser-observe",
          targetDomain: "browser-host",
          requiredRole: "browser-host",
          objective: "Observe the bound page without mutating it.",
          inputRef: "payload:browser-observe",
          expectedResultType: "browser-host-result-v0.1.0",
          targetProfileRef: "gpt:ai-agent-platform-controller",
          conversationRef: "conversation:e2e-controller",
          hostActionType: "OBSERVE_PAGE",
          preconditions: { provider: "chatgpt", pageState: "READY" },
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    );
    const dispatchRef = receipt.createdRefs.find((value) => value.startsWith("dispatch-"));
    assert.ok(dispatchRef);

    const gateway = new HttpGatewayClient({
      endpoint: `${harness.baseUrl}/v1/browser-host/invoke`,
      apiKey: API_KEY,
      timeoutMs: 5_000,
    });
    const dispatch = new DispatchClient(gateway);
    const hostId = "host:phase2-e2e";
    await gateway.invoke("browser.host.register", {
      host_id: hostId,
      host_version: "0.1.0",
      capabilities: ["OBSERVE_PAGE"],
    });
    const pending = await dispatch.listPending(hostId);
    assert.equal(pending[0].dispatch_ref, dispatchRef);
    const deliveryClaim = await dispatch.claim(dispatchRef, hostId);
    const hostCommand = await dispatch.get(dispatchRef, deliveryClaim.claim_token);
    assert.equal(hostCommand.action.type, "OBSERVE_PAGE");
    assert.deepEqual(await dispatch.resolvePayload(hostCommand.action.payload_ref), {
      purpose: "Phase 2 Browser Host observation E2E",
    });
    const delivery = buildDeliveryFact({
      command: hostCommand,
      binding_id: "binding:phase2-e2e",
      execution: { response_pending: false },
    });
    const deliveryAck = await dispatch.deliveryAck(
      dispatchRef,
      deliveryClaim.claim_token,
      delivery,
    );
    assert.ok(deliveryAck.report_token);
    const hostResult = buildHostResult({
      command: hostCommand,
      status: HOST_RESULT_STATUS.ACTION_SUCCEEDED,
      binding_id: "binding:phase2-e2e",
      details: { summary: "Browser page observed through the real HTTP Gateway boundary." },
    });
    await dispatch.hostResult(dispatchRef, deliveryAck.report_token, hostResult);

    decision = await context(harness.baseUrl, taskId);
    assert.equal((await harness.taskControl.getTask(taskId)).status, "READY_FOR_CONTROLLER");
    assert.equal(decision.task.lifecycleStatus, "ACTIVE");
    assert.ok(decision.latestResults.some((value) => value.resultRef.includes(hostResult.result_id)));
    controllerClaim = await claim(harness.baseUrl, decision.task);
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      decision.task,
      "advance:browser-observe",
      {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "Browser Host observation succeeded.",
        payload: {
          nodeId: "browser-observe",
          resultRefs: decision.latestResults.map((value) => value.resultRef),
        },
      },
    );
    assert.equal(receipt.task.plan.currentNodeId, "finalize");
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      receipt.task,
      "advance:finalize",
      {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "All integrated acceptance checks passed.",
        payload: { nodeId: "finalize" },
      },
    );
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      receipt.task,
      "complete:phase2-e2e",
      {
        type: "COMPLETE_TASK",
        reasonSummary: "The four-domain loop reached a terminal state.",
        payload: { summary: "Phase 2 CTL, TSK, LCL, and BHR E2E completed." },
      },
    );
    assert.equal(receipt.task.lifecycleStatus, "COMPLETED");
    const events = await harness.taskControl.listEvents(taskId);
    for (const eventType of [
      "TASK_CREATED",
      "ROLE_WORK_REQUESTED",
      "ROLE_WORK_SUCCEEDED",
      "HOST_DISPATCH_CREATED",
      "HOST_DISPATCH_DELIVERED",
      "HOST_RESULT_REPORTED",
      "TASK_COMPLETED",
    ]) {
      assert.ok(events.some((event) => event.eventType === eventType), eventType);
    }
  } finally {
    await harness.close();
  }
});

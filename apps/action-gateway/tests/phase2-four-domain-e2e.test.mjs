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

import { BindingRegistry } from "../../browser-host-runtime/src/background/binding-registry.js";
import { MemoryStorageArea } from "../../browser-host-runtime/src/background/storage.js";
import { HostRegistry } from "../../browser-host-runtime/src/background/host-registry.js";
import { HttpGatewayClient } from "../../browser-host-runtime/src/background/gateway-client.js";
import { DispatchClient } from "../../browser-host-runtime/src/background/dispatch-client.js";
import {
  buildDeliveryFact,
  buildHostResult,
} from "../../browser-host-runtime/src/shared/contracts.js";
import { HOST_RESULT_STATUS } from "../../browser-host-runtime/src/shared/constants.js";
import {
  requiresApproval,
  validateResolvedPayload,
} from "../../browser-host-runtime/src/shared/action-policy.js";

import { createGatewayServer } from "../dist/app.js";
import { createBrowserHostServerAdapter } from "../dist/browser-host-server-adapter.js";
import { InMemoryControllerIdempotencySnapshotStore } from "../dist/controller-idempotency-store.js";
import { createLocalWorkWorker } from "../dist/local-work-worker.js";
import { Phase2IntegrationStore } from "../dist/phase2-integration-store.js";
import { createPhase2TaskIntakeAdapter } from "../dist/phase2-task-intake.js";
import { createFixedWindowRateLimiter } from "../dist/rate-limit.js";
import { createTaskControlControllerAdapter } from "../dist/task-control-controller-adapter.js";

const API_KEY = "phase2-e2e-api-key-0123456789abcdef";
const CONTROLLER = {
  profileId: "ai-agent-platform-controller",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

async function startHarness({ controllerTargetProfileRef = "g-controller-e2e" } = {}) {
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
  const browserHostServer = createBrowserHostServerAdapter(
    taskControl,
    integrationStore,
    controllerTargetProfileRef === null ? {} : { controllerTargetProfileRef },
  );
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
    taskRateLimiter: createFixedWindowRateLimiter({ limit: 100, windowMs: 60_000 }),
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
          targetRoleRef: "controller",
          targetProfileRef: "g-controller-e2e",
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
    // Production E2E must use the real HostRegistry registration contract. This
    // prevents tests from manually injecting OBSERVE_PAGE and masking a production
    // capability vocabulary mismatch.
    const hostStorage = new MemoryStorageArea();
    const hostRegistry = new HostRegistry(hostStorage, gateway);
    const registeredHost = await hostRegistry.register();
    const hostId = registeredHost.host.host_id;
    const pending = await dispatch.listPending(hostId);
    assert.equal(pending[0].dispatch_ref, dispatchRef);
    const deliveryClaim = await dispatch.claim(dispatchRef, hostId);
    const hostCommand = await dispatch.get(dispatchRef, deliveryClaim.claim_token);
    assert.equal(hostCommand.action.type, "OBSERVE_PAGE");
    assert.deepEqual(hostCommand.target, {
      role_ref: "controller",
      gpt_ref: "g-controller-e2e",
      conversation_ref: "conversation:e2e-controller",
    });

    // Exercise the same strict target identity matching used by the real BHR runtime.
    // This catches regressions where Work executor role (browser-host) is accidentally
    // reused as the page target role (controller).
    const bindingRegistry = new BindingRegistry(new MemoryStorageArea());
    const realBinding = await bindingRegistry.bind({
      host_id: hostId,
      chrome_tab_id: 101,
      window_id: 1,
      role_ref: "controller",
      gpt_ref: "g-controller-e2e",
      conversation_ref: "conversation:e2e-controller",
      url: "https://chatgpt.com/g/g-controller-e2e/c/conversation:e2e-controller",
      page_fingerprint: "sha256:e2e-page",
    });
    assert.equal((await bindingRegistry.findForTarget(hostCommand.target))?.binding_id, realBinding.binding_id);

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


test("Phase 2 polling E2E wakes Controller after Browser Host Result and reaches Task completion without diagnostic nudges", async () => {
  const harness = await startHarness();
  const taskId = "task-phase2-polling-controller-wake";
  try {
    await post(harness.baseUrl, "/v1/task-control/intake", {
      contractVersion: PHASE2_INTEGRATION_CONTRACT_VERSION,
      taskId,
      title: "Phase 2 polling continuation E2E",
      objective: "Submit one Browser message, report its Host Result, poll a Controller Wake, and complete the Task.",
      requiredRole: "controller",
      conversationRef: "conversation:e2e-controller",
      plan: {
        source: { type: "controller", ref: CONTROLLER.profileId },
        currentNodeId: "browser-submit",
        nodes: [
          {
            nodeId: "browser-submit",
            title: "Submit one approved browser message",
            kind: "WORK",
            requiredRole: "browser-host",
          },
          {
            nodeId: "finalize",
            title: "Finalize after Browser Host result",
            kind: "FINALIZE",
            requiredRole: "controller",
            dependsOn: ["browser-submit"],
          },
        ],
      },
      payloadResources: [
        {
          payloadRef: "payload:browser-submit-polling",
          value: { text: "Phase 2 polling E2E message" },
        },
      ],
      idempotencyKey: "intake:phase2-polling-e2e",
      producerRef: "phase2-polling-e2e-test",
    });

    const gateway = new HttpGatewayClient({
      endpoint: `${harness.baseUrl}/v1/browser-host/invoke`,
      apiKey: API_KEY,
      timeoutMs: 5_000,
    });
    const dispatch = new DispatchClient(gateway);
    const limitedHostId = "host:without-controller-continuation";
    await gateway.invoke("browser.host.register", {
      host_id: limitedHostId,
      host_version: "0.1.0",
      provider: "chrome-mv3",
      capabilities: ["chatgpt-web@v1", "host-command@0.1.0", "SUBMIT_MESSAGE"],
    });
    assert.deepEqual(await dispatch.listPending(limitedHostId), []);
    const hostRegistry = new HostRegistry(new MemoryStorageArea(), gateway);
    const registeredHost = await hostRegistry.register();
    const hostId = registeredHost.host.host_id;

    // Production starts from polling: the extension discovers the initial
    // logical Controller Wake without a human status query creating it.
    let pending = await dispatch.listPending(hostId);
    assert.equal(pending.length, 1);
    let wakeRef = pending[0].dispatch_ref;
    let wakeClaim = await dispatch.claim(wakeRef, hostId);
    let wakeCommand = await dispatch.get(wakeRef, wakeClaim.claim_token);
    assert.equal(wakeCommand.action.type, "CONTINUE_ROLE_SESSION");
    assert.deepEqual(wakeCommand.target, {
      role_ref: "controller",
      gpt_ref: "g-controller-e2e",
      conversation_ref: "conversation:e2e-controller",
    });
    let wakePayload = await dispatch.resolvePayload(wakeCommand.action.payload_ref);
    validateResolvedPayload(wakeCommand.action.type, wakePayload);
    assert.equal(
      requiresApproval(wakeCommand, {
        mode: "platform_wake_candidate",
        resolvedPayload: wakePayload,
      }),
      false,
    );
    assert.equal(wakePayload.wake.task_id, taskId);
    assert.equal(wakePayload.wake.dispatch_ref, wakeRef);

    let wakeDelivery = buildDeliveryFact({
      command: wakeCommand,
      binding_id: "binding:phase2-polling",
      execution: { response_pending: true },
    });
    let wakeAck = await dispatch.deliveryAck(
      wakeRef,
      wakeClaim.claim_token,
      wakeDelivery,
    );

    // Simulate the Controller response caused by that Wake. The Controller
    // must query latest context and claim before issuing Browser work.
    let decision = await context(harness.baseUrl, taskId);
    let controllerClaim = await claim(harness.baseUrl, decision.task);
    let receipt = await command(
      harness.baseUrl,
      controllerClaim,
      decision.task,
      "request:browser-submit-polling",
      {
        type: "REQUEST_ROLE_WORK",
        reasonSummary: "Delegate the current write node to Browser Host.",
        payload: {
          nodeId: "browser-submit",
          targetDomain: "browser-host",
          requiredRole: "browser-host",
          objective: "Submit exactly one approved message.",
          inputRef: "payload:browser-submit-polling",
          expectedResultType: "browser-host-result-v0.1.0",
          targetRoleRef: "controller",
          targetProfileRef: "g-controller-e2e",
          conversationRef: "conversation:e2e-controller",
          hostActionType: "SUBMIT_MESSAGE",
          approvalRef: "approval:phase2-polling-e2e",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    );
    const browserDispatchRef = receipt.createdRefs.find((value) => value.startsWith("dispatch-"));
    assert.ok(browserDispatchRef);

    // The initial Wake finishes only after its Controller response. Its Host
    // Result must not create another Wake while Browser Work is outstanding.
    let wakeResult = buildHostResult({
      command: wakeCommand,
      status: HOST_RESULT_STATUS.ACTION_SUCCEEDED,
      binding_id: "binding:phase2-polling",
      details: { summary: "Initial Controller Wake completed." },
    });
    await dispatch.hostResult(wakeRef, wakeAck.report_token, wakeResult);

    pending = await dispatch.listPending(hostId);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].dispatch_ref, browserDispatchRef);
    const browserClaim = await dispatch.claim(browserDispatchRef, hostId);
    const browserCommand = await dispatch.get(browserDispatchRef, browserClaim.claim_token);
    assert.equal(browserCommand.action.type, "SUBMIT_MESSAGE");
    const browserPayload = await dispatch.resolvePayload(browserCommand.action.payload_ref);
    assert.deepEqual(browserPayload, {
      text: "Phase 2 polling E2E message",
    });
    assert.equal(
      requiresApproval(browserCommand, {
        mode: "platform_wake_candidate",
        resolvedPayload: browserPayload,
      }),
      true,
    );

    const browserDelivery = buildDeliveryFact({
      command: browserCommand,
      binding_id: "binding:phase2-polling",
      execution: { response_pending: true },
    });
    const browserAck = await dispatch.deliveryAck(
      browserDispatchRef,
      browserClaim.claim_token,
      browserDelivery,
    );
    const browserResult = buildHostResult({
      command: browserCommand,
      status: HOST_RESULT_STATUS.ACTION_SUCCEEDED,
      binding_id: "binding:phase2-polling",
      details: { summary: "Browser message submitted and response observed." },
    });
    await dispatch.hostResult(browserDispatchRef, browserAck.report_token, browserResult);

    // This is the regression that the old E2E masked with a direct Context
    // query: Host Result itself must reconcile and make a new Controller Wake
    // visible to the extension's next production poll.
    pending = await dispatch.listPending(hostId);
    assert.equal(pending.length, 1);
    wakeRef = pending[0].dispatch_ref;
    assert.notEqual(wakeRef, browserDispatchRef);
    const repeatedPoll = await dispatch.listPending(hostId);
    assert.equal(repeatedPoll.length, 1);
    assert.equal(repeatedPoll[0].dispatch_ref, wakeRef);
    wakeClaim = await dispatch.claim(wakeRef, hostId);
    wakeCommand = await dispatch.get(wakeRef, wakeClaim.claim_token);
    assert.equal(wakeCommand.action.type, "CONTINUE_ROLE_SESSION");
    assert.deepEqual(wakeCommand.target, {
      role_ref: "controller",
      gpt_ref: "g-controller-e2e",
      conversation_ref: "conversation:e2e-controller",
    });
    wakePayload = await dispatch.resolvePayload(wakeCommand.action.payload_ref);
    validateResolvedPayload(wakeCommand.action.type, wakePayload);
    assert.equal(
      requiresApproval(wakeCommand, {
        mode: "platform_wake_candidate",
        resolvedPayload: wakePayload,
      }),
      false,
    );
    assert.equal(wakePayload.wake.task_id, taskId);
    assert.equal(wakePayload.wake.dispatch_ref, wakeRef);
    assert.equal(wakePayload.wake.required_role, wakeCommand.target.role_ref);
    assert.equal(wakePayload.wake.conversation_ref, wakeCommand.target.conversation_ref);
    assert.equal(typeof wakePayload.wake.event_id, "string");
    assert.equal(wakePayload.wake.instruction.length > 0, true);
    assert.equal(wakeCommand.preconditions.authorization_class, "PLATFORM_WAKE");
    assert.equal(
      wakeCommand.preconditions.authorization_ref,
      wakeCommand.preconditions.platform_wake_authorization.authorization_ref,
    );
    assert.equal(
      wakeCommand.preconditions.platform_wake_authorization.idempotency_key,
      wakeCommand.idempotency_key,
    );
    assert.deepEqual(
      wakeCommand.preconditions.platform_wake_authorization.allowed_actions,
      [wakeCommand.action.type],
    );

    wakeDelivery = buildDeliveryFact({
      command: wakeCommand,
      binding_id: "binding:phase2-polling",
      execution: { response_pending: true },
    });
    wakeAck = await dispatch.deliveryAck(
      wakeRef,
      wakeClaim.claim_token,
      wakeDelivery,
    );

    // The second Controller response can now consume the Browser result and
    // drive the plan to a terminal state. No extra diagnostic/user message is
    // used between Host Result and this continuation.
    decision = await context(harness.baseUrl, taskId);
    assert.ok(decision.latestResults.some((value) => value.resultRef.includes(browserResult.result_id)));
    controllerClaim = await claim(harness.baseUrl, decision.task);
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      decision.task,
      "advance:browser-submit-polling",
      {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "Browser Host result proves the write node completed.",
        payload: {
          nodeId: "browser-submit",
          resultRefs: decision.latestResults.map((value) => value.resultRef),
        },
      },
    );
    assert.equal(receipt.task.plan.currentNodeId, "finalize");
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      receipt.task,
      "advance:finalize-polling",
      {
        type: "ADVANCE_PLAN_NODE",
        reasonSummary: "Integrated polling continuation is complete.",
        payload: { nodeId: "finalize" },
      },
    );
    receipt = await command(
      harness.baseUrl,
      controllerClaim,
      receipt.task,
      "complete:phase2-polling-e2e",
      {
        type: "COMPLETE_TASK",
        reasonSummary: "The polling-driven four-domain loop reached its terminal state.",
        payload: { summary: "Phase 2 polling-driven Controller continuation completed." },
      },
    );
    assert.equal(receipt.task.lifecycleStatus, "COMPLETED");

    wakeResult = buildHostResult({
      command: wakeCommand,
      status: HOST_RESULT_STATUS.ACTION_SUCCEEDED,
      binding_id: "binding:phase2-polling",
      details: { summary: "Post-result Controller Wake completed." },
    });
    await dispatch.hostResult(wakeRef, wakeAck.report_token, wakeResult);

    assert.equal((await harness.taskControl.getTask(taskId)).status, "COMPLETED");
    assert.deepEqual(await dispatch.listPending(hostId), []);
    const events = await harness.taskControl.listEvents(taskId);
    assert.ok(events.some((event) => event.eventType === "HOST_RESULT_REPORTED"));
    assert.ok(events.some((event) => event.eventType === "TASK_COMPLETED"));
  } finally {
    await harness.close();
  }
});

test("Controller Wake fails closed when no exact provider GPT target is available", async () => {
  const harness = await startHarness({ controllerTargetProfileRef: null });
  try {
    await post(harness.baseUrl, "/v1/task-control/intake", {
      contractVersion: PHASE2_INTEGRATION_CONTRACT_VERSION,
      taskId: "task-controller-target-missing",
      title: "Missing Controller target",
      objective: "Prove Controller Wake target resolution fails closed.",
      requiredRole: "controller",
      conversationRef: "conversation:target-missing",
      plan: {
        source: { type: "controller", ref: CONTROLLER.profileId },
        currentNodeId: "finalize",
        nodes: [{
          nodeId: "finalize",
          title: "Finalize",
          kind: "FINALIZE",
          requiredRole: "controller",
        }],
      },
      idempotencyKey: "intake:controller-target-missing",
      producerRef: "phase2-polling-e2e-test",
    });

    const gateway = new HttpGatewayClient({
      endpoint: `${harness.baseUrl}/v1/browser-host/invoke`,
      apiKey: API_KEY,
      timeoutMs: 5_000,
    });
    const dispatch = new DispatchClient(gateway);
    const registeredHost = await new HostRegistry(new MemoryStorageArea(), gateway).register();
    const [pending] = await dispatch.listPending(registeredHost.host.host_id);
    assert.ok(pending);
    const wakeClaim = await dispatch.claim(pending.dispatch_ref, registeredHost.host.host_id);
    await assert.rejects(
      dispatch.get(pending.dispatch_ref, wakeClaim.claim_token),
      (error) => error.code === "CONTROLLER_TARGET_NOT_CONFIGURED",
    );
  } finally {
    await harness.close();
  }
});

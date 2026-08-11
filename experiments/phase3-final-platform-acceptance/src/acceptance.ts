import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { resolve } from "node:path";

import {
  APPROVAL_GRANT_CONTRACT_VERSION,
  type ApprovalDraftV1,
  type ApprovalGrantV1,
} from "@ai-agent-platform/contracts";
import { createDefaultRegistry } from "@ai-agent-platform/local-control";
import {
  JsonFileTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlService,
  type WorkItem,
} from "@ai-agent-platform/task-control";

import { createGatewayServer } from "../../../apps/action-gateway/src/app.js";
import { createBrowserHostServerAdapter } from "../../../apps/action-gateway/src/browser-host-server-adapter.js";
import { Phase2IntegrationStore } from "../../../apps/action-gateway/src/phase2-integration-store.js";
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
} from "../../phase3-runtime-integration-spike/src/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DEFAULT_HOME = "/tmp/aap-phase3-final-platform-acceptance";
const GATEWAY_HOST = "127.0.0.1";
const GATEWAY_PORT = 8787;
const TASK_ID = "phase3-final-runtime-browser-approval";
const RUNTIME_NODE_ID = "runtime-check";
const BROWSER_NODE_ID = "browser-submit";

interface AcceptanceMetadata {
  readonly contract: "aap.phase3.final-acceptance.v0";
  readonly taskId: string;
  readonly runtimeWorkItemId: string;
  readonly runtimeResultRef: string;
  readonly browserWorkItemId: string;
  readonly browserDispatchId: string;
  readonly approvalRef: string;
  readonly payloadRef: string;
  readonly targetProfileRef: string;
  readonly conversationRef: string;
  readonly messageText: string;
  readonly preparedAt: string;
}

function home(): string {
  return process.env.PHASE3_FINAL_ACCEPTANCE_HOME?.trim() || DEFAULT_HOME;
}

function taskStatePath(): string {
  return `${home()}/task-control/state.json`;
}

function integrationStatePath(): string {
  return `${home()}/gateway/phase2-integration.json`;
}

function referenceRoot(): string {
  return `${home()}/execution-references`;
}

function metadataPath(): string {
  return `${home()}/acceptance.json`;
}

function draftPath(): string {
  return `${home()}/approval-draft.json`;
}

function evidencePath(): string {
  return `${home()}/final-evidence.json`;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required.`);
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolveListen, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(GATEWAY_PORT, GATEWAY_HOST);
  });
}

async function closeServer(server: Server | undefined): Promise<void> {
  if (!server?.listening) return;
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

async function readMetadata(): Promise<AcceptanceMetadata> {
  return JSON.parse(await readFile(metadataPath(), "utf8")) as AcceptanceMetadata;
}

async function writeMetadata(value: AcceptanceMetadata): Promise<void> {
  await mkdir(home(), { recursive: true });
  await writeFile(metadataPath(), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function acknowledgeInitialControllerWake(
  service: TaskControlService,
): Promise<void> {
  const pending = (await service.listPendingDispatches()).find(
    (item) => item.taskId === TASK_ID && item.workItemId === null,
  );
  assert.ok(pending, "expected initial Controller wake dispatch");
  const claimed = await service.claimDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    hostId: "acceptance-mechanical-host",
    leaseMs: 60_000,
    idempotencyKey: `initial-wake-claim:${TASK_ID}`,
  });
  assert.ok(claimed.dispatch.claim?.claimToken);
  await service.acknowledgeDispatch({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    signalId: pending.signalId,
    claimToken: claimed.dispatch.claim.claimToken,
    idempotencyKey: `initial-wake-ack:${TASK_ID}`,
    producerRef: "phase3-final-acceptance",
  });
}

function fastHealthFlow(): ExecutionFlow {
  return {
    contract: "execution.flow.v0",
    flow_id: "phase3.final.local-fast-health",
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

function runtimePayload(): ExecutionPayload {
  return {
    flow: fastHealthFlow(),
    inputs: {},
    allowed_capabilities: ["local.health.read"],
    max_node_runs: 8,
  };
}

async function createTaskAndRuntimeWork(
  taskControl: TaskControlService,
  references: JsonFileExecutionReferenceStore,
): Promise<{ readonly runtimeWorkItemId: string; readonly inputRef: string }> {
  const inputRef = `execution-input:${TASK_ID}`;
  references.putExecutionPayload(inputRef, runtimePayload());

  await taskControl.intakeTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: TASK_ID,
    title: "Phase 3 final Runtime + Browser Approval acceptance",
    objective:
      "Complete one durable Task across Runtime/LCL/FAST and then one real Browser Host human-approved message before final Task completion.",
    requiredRole: "controller",
    plan: {
      source: { type: "controller", ref: "phase3-controller" },
      currentNodeId: RUNTIME_NODE_ID,
      nodes: [
        {
          nodeId: RUNTIME_NODE_ID,
          title: "Verify local runtime health with FAST",
          kind: "ACTION",
          status: "READY",
          requiredRole: "controller",
        },
        {
          nodeId: BROWSER_NODE_ID,
          title: "Submit one explicitly approved browser message",
          kind: "ACTION",
          status: "READY",
          requiredRole: "controller",
          dependsOn: [RUNTIME_NODE_ID],
        },
      ],
    },
    idempotencyKey: `intake:${TASK_ID}`,
    producerRef: "phase3-final-acceptance",
  });

  await acknowledgeInitialControllerWake(taskControl);
  const task = await taskControl.getCurrentTask(TASK_ID);
  const claim = await taskControl.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: TASK_ID,
    expectedTaskVersion: task.taskVersion,
    roleId: "controller",
    profileId: "phase3-controller",
    leaseMs: 60_000,
    idempotencyKey: `controller-runtime-claim:${TASK_ID}`,
  });
  const receipt = await taskControl.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: TASK_ID,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    ...(claim.planVersion === null ? {} : { expectedPlanVersion: claim.planVersion }),
    idempotencyKey: `request-runtime:${TASK_ID}`,
    producerRef: "phase3-controller",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: RUNTIME_NODE_ID,
        targetDomain: EXECUTION_TARGET_DOMAIN,
        requiredRole: EXECUTION_WORKER_ROLE,
        capabilityRef: "execution.flow.run",
        inputRef,
        expectedResultType: "execution.result.v0",
      },
    },
  });
  assert.equal(receipt.workItemIds.length, 1);
  return { runtimeWorkItemId: receipt.workItemIds[0]!, inputRef };
}

async function executeRuntimeStage(
  taskControl: TaskControlService,
  references: JsonFileExecutionReferenceStore,
): Promise<{ readonly runtimeWorkItemId: string; readonly runtimeResultRef: string }> {
  const baseUrl = requireEnv("MLXHUB_BASE_URL");
  const fastModel = requireEnv("MLXHUB_FAST_MODEL");
  const reasonModel = requireEnv("MLXHUB_REASON_MODEL");
  const timeoutMs = Number(process.env.MLXHUB_TIMEOUT_MS ?? "180000");
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0, "MLXHUB_TIMEOUT_MS must be positive integer.");

  const { runtimeWorkItemId } = await createTaskAndRuntimeWork(taskControl, references);
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
  const runtimeServer = await createExecutionFlowServer({
    config: {
      host: "127.0.0.1",
      port: 0,
      workspace_root: REPO_ROOT,
      max_node_runs: 8,
    },
    instanceId: "phase3-final-acceptance-runtime",
    runtimeEnvironment: { capabilities, inferenceBackends },
  });
  try {
    await runtimeServer.listen();
    const address = runtimeServer.server.address();
    assert.ok(address && typeof address === "object");
    const worker = new TaskRuntimeWorker({
      taskControl,
      references,
      capabilities: new CapabilityRegistry(),
      inferenceBackends: new InferenceBackendRegistry(),
      runtime: new HttpExecutionRuntimeClient({ baseUrl: `http://127.0.0.1:${address.port}` }),
    });
    const cycle = await worker.runOnce();
    assert.equal(cycle.status, "completed");
    assert.equal(cycle.workItemId, runtimeWorkItemId);
    assert.ok(cycle.resultRef);
    const result = references.getExecutionResult(cycle.resultRef);
    assert.equal(result.status, "completed");
    assert.deepEqual(result.output, {
      local_status: "SUCCEEDED",
      state: "verified",
      decision: "healthy",
      verified_by: "fast",
    });
    assert.equal(result.evidence.filter((item) => item.role === "fast").length, 1);
    assert.equal(result.evidence.some((item) => item.role === "reason"), false);
    return { runtimeWorkItemId, runtimeResultRef: cycle.resultRef };
  } finally {
    await runtimeServer.close();
  }
}

async function createBrowserWork(
  taskControl: TaskControlService,
  integrationStore: Phase2IntegrationStore,
  runtimeResultRef: string,
): Promise<{
  readonly browserWorkItemId: string;
  readonly browserDispatchId: string;
  readonly approvalRef: string;
  readonly payloadRef: string;
  readonly targetProfileRef: string;
  readonly conversationRef: string;
  readonly messageText: string;
}> {
  const targetProfileRef = requireEnv("BROWSER_TARGET_GPT_REF");
  const conversationRef = requireEnv("BROWSER_CONVERSATION_REF");
  const messageText = optionalEnv(
    "BROWSER_MESSAGE_TEXT",
    `PHASE3_FINAL_ACCEPTANCE ${new Date().toISOString()} — reply exactly ACK.`,
  );
  const payloadRef = `browser-payload:${TASK_ID}`;
  const approvalRef = `approval:${TASK_ID}`;
  await integrationStore.putPayload(payloadRef, { text: messageText });

  const ready = await taskControl.getCurrentTask(TASK_ID);
  const claim = await taskControl.claimController({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: TASK_ID,
    expectedTaskVersion: ready.taskVersion,
    roleId: "controller",
    profileId: "phase3-controller",
    leaseMs: 60_000,
    idempotencyKey: `controller-browser-resume:${TASK_ID}`,
  });
  await taskControl.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: TASK_ID,
    claimToken: claim.claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    ...(claim.planVersion === null ? {} : { expectedPlanVersion: claim.planVersion }),
    idempotencyKey: `advance-runtime:${TASK_ID}`,
    producerRef: "phase3-controller",
    command: {
      type: "ADVANCE_PLAN_NODE",
      payload: {
        nodeId: RUNTIME_NODE_ID,
        nextNodeId: BROWSER_NODE_ID,
        resultRefs: [runtimeResultRef],
        summary: "Runtime/LCL/FAST stage passed.",
      },
    },
  });

  const advanced = await taskControl.getCurrentTask(TASK_ID);
  assert.equal(advanced.plan?.currentNodeId, BROWSER_NODE_ID);
  assert.ok(advanced.controllerClaim?.claimToken, "controller claim should remain active after ADVANCE_PLAN_NODE");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const receipt = await taskControl.submitControllerCommand({
    commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId: TASK_ID,
    claimToken: advanced.controllerClaim.claimToken,
    expectedTaskVersion: advanced.taskVersion,
    ...(advanced.plan === null ? {} : { expectedPlanVersion: advanced.plan.planVersion }),
    idempotencyKey: `request-browser:${TASK_ID}`,
    producerRef: "phase3-controller",
    command: {
      type: "REQUEST_ROLE_WORK",
      payload: {
        nodeId: BROWSER_NODE_ID,
        targetDomain: "browser-host",
        requiredRole: "controller",
        capabilityRef: "browser.submit-message",
        inputRef: payloadRef,
        expectedResultType: "browser-host-result-v0.1.0",
        targetRoleRef: "controller",
        targetProfileRef,
        conversationRef,
        hostActionType: "SUBMIT_MESSAGE",
        preconditions: {},
        approvalRef,
        expiresAt,
      },
    },
  });
  assert.equal(receipt.workItemIds.length, 1);
  assert.equal(receipt.dispatchIds.length, 1);
  return {
    browserWorkItemId: receipt.workItemIds[0]!,
    browserDispatchId: receipt.dispatchIds[0]!,
    approvalRef,
    payloadRef,
    targetProfileRef,
    conversationRef,
    messageText,
  };
}

function gateway(
  apiKey: string,
  taskControl: TaskControlService,
  integrationStore: Phase2IntegrationStore,
): Server {
  return createGatewayServer({
    apiKey,
    browserHostServer: createBrowserHostServerAdapter(taskControl, integrationStore),
    approvalGrantRegistrar: integrationStore,
    approvalDraftReader: integrationStore,
  });
}

async function waitForDraft(
  integrationStore: Phase2IntegrationStore,
  approvalRef: string,
  timeoutMs = 180_000,
): Promise<ApprovalDraftV1> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const draft = await integrationStore.getApprovalDraft(approvalRef);
    if (draft !== null) return draft;
    await sleep(500);
  }
  const snapshot = await integrationStore.snapshot();
  throw new Error(
    `Timed out waiting for real Browser Host Approval Draft. Registered hosts=${Object.keys(snapshot.hosts).join(",") || "none"}. Ensure the unpacked Browser Host extension is enabled, configured for http://127.0.0.1:8787/v1/browser-host/invoke with the same API key, and the target Binding is READY.`,
  );
}

async function prepare(): Promise<void> {
  const apiKey = requireEnv("GATEWAY_API_KEY");
  await rm(home(), { recursive: true, force: true });
  await mkdir(home(), { recursive: true });
  const store = await JsonFileTaskControlStore.open(taskStatePath());
  let gatewayServer: Server | undefined;
  try {
    const taskControl = new TaskControlService(store, new SystemClock(), new RandomIdGenerator());
    const integrationStore = await Phase2IntegrationStore.open(integrationStatePath());
    const references = new JsonFileExecutionReferenceStore(referenceRoot());
    const runtime = await executeRuntimeStage(taskControl, references);
    const browser = await createBrowserWork(taskControl, integrationStore, runtime.runtimeResultRef);

    gatewayServer = gateway(apiKey, taskControl, integrationStore);
    await listen(gatewayServer);
    const draft = await waitForDraft(integrationStore, browser.approvalRef);
    assert.equal(draft.taskId, TASK_ID);
    assert.equal(draft.dispatchRef, browser.browserDispatchId);
    assert.equal(draft.approvalRef, browser.approvalRef);
    assert.equal(draft.allowedActionType, "SUBMIT_MESSAGE");
    assert.equal(draft.targetProfileRef, browser.targetProfileRef);
    assert.equal(draft.conversationRef, browser.conversationRef);
    await writeFile(draftPath(), `${JSON.stringify(draft, null, 2)}\n`, { mode: 0o600 });
    await writeMetadata({
      contract: "aap.phase3.final-acceptance.v0",
      taskId: TASK_ID,
      runtimeWorkItemId: runtime.runtimeWorkItemId,
      runtimeResultRef: runtime.runtimeResultRef,
      browserWorkItemId: browser.browserWorkItemId,
      browserDispatchId: browser.browserDispatchId,
      approvalRef: browser.approvalRef,
      payloadRef: browser.payloadRef,
      targetProfileRef: browser.targetProfileRef,
      conversationRef: browser.conversationRef,
      messageText: browser.messageText,
      preparedAt: new Date().toISOString(),
    });

    console.log(JSON.stringify({
      phase: "AWAITING_EXPLICIT_USER_APPROVAL",
      runtime_stage: "PASS",
      fast_calls: 1,
      reason_calls: 0,
      task_id: TASK_ID,
      browser_work_item_id: browser.browserWorkItemId,
      browser_dispatch_id: browser.browserDispatchId,
      approval_draft: draft,
      payload_preview: { text: browser.messageText },
      next_required_confirmation: `I_APPROVE:${browser.approvalRef}`,
      state_home: home(),
    }, null, 2));
  } finally {
    await closeServer(gatewayServer);
    await store.close();
  }
}

async function postGrant(apiKey: string, grant: ApprovalGrantV1): Promise<void> {
  const response = await fetch(`http://${GATEWAY_HOST}:${GATEWAY_PORT}/v1/approvals/grants`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(grant),
  });
  const body = await response.json().catch(() => undefined) as unknown;
  if (response.status !== 201) {
    throw new Error(`Approval Grant endpoint failed HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
}

async function waitForBrowserCompletion(
  taskControl: TaskControlService,
  workItemId: string,
  timeoutMs = 180_000,
): Promise<WorkItem> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const item = await taskControl.getCurrentWorkItem(workItemId);
    if (item.status === "SUCCEEDED" || item.status === "FAILED") return item;
    await sleep(250);
  }
  throw new Error("Timed out waiting for Browser Host WorkItem completion.");
}

async function approve(): Promise<void> {
  const apiKey = requireEnv("GATEWAY_API_KEY");
  const metadata = await readMetadata();
  const exact = `I_APPROVE:${metadata.approvalRef}`;
  assert.equal(
    requireEnv("PHASE3_APPROVAL_CONFIRM"),
    exact,
    `Explicit Project Owner confirmation must equal ${exact}`,
  );
  const draft = JSON.parse(await readFile(draftPath(), "utf8")) as ApprovalDraftV1;
  assert.equal(draft.approvalRef, metadata.approvalRef);
  assert.ok(Date.parse(draft.expiresAt) > Date.now(), "Approval Draft expired; abort and prepare a fresh draft.");

  const store = await JsonFileTaskControlStore.open(taskStatePath());
  let gatewayServer: Server | undefined;
  try {
    const taskControl = new TaskControlService(store, new SystemClock(), new RandomIdGenerator());
    const integrationStore = await Phase2IntegrationStore.open(integrationStatePath());
    gatewayServer = gateway(apiKey, taskControl, integrationStore);
    await listen(gatewayServer);

    const grant: ApprovalGrantV1 = {
      approvalContractVersion: APPROVAL_GRANT_CONTRACT_VERSION,
      approvalRef: draft.approvalRef,
      grantId: `grant-${randomUUID()}`,
      actionFingerprint: draft.actionFingerprint,
      bindingId: draft.bindingId,
      taskId: draft.taskId,
      commandId: draft.commandId,
      allowedActionType: draft.allowedActionType,
      pagePreconditionHash: draft.pagePreconditionHash,
      singleUse: true,
      expiresAt: draft.expiresAt,
      consumedAt: null,
      consumedBy: null,
    };
    await postGrant(apiKey, grant);

    const browserItem = await waitForBrowserCompletion(taskControl, metadata.browserWorkItemId);
    if (browserItem.status !== "SUCCEEDED") {
      throw new Error(`Browser Host WorkItem failed: ${browserItem.errorCode ?? "UNKNOWN"} ${browserItem.errorSummary ?? ""}`);
    }
    await closeServer(gatewayServer);
    gatewayServer = undefined;

    const dispatch = await taskControl.getCurrentDispatch(metadata.browserDispatchId);
    assert.equal(dispatch.hostResultStatus, "SUCCEEDED");
    assert.ok(dispatch.deliveredAt);
    assert.ok(dispatch.hostResultRef);
    const consumed = await integrationStore.getApprovalGrant(metadata.approvalRef);
    assert.ok(consumed?.consumedAt, "one-time Approval Grant was not consumed");
    assert.equal(consumed.consumedBy, draft.commandId);

    const ready = await taskControl.getCurrentTask(TASK_ID);
    assert.equal(ready.status, "READY_FOR_CONTROLLER");
    const claim = await taskControl.claimController({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: TASK_ID,
      expectedTaskVersion: ready.taskVersion,
      roleId: "controller",
      profileId: "phase3-controller",
      leaseMs: 60_000,
      idempotencyKey: `controller-finalize:${TASK_ID}`,
    });
    await taskControl.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: TASK_ID,
      claimToken: claim.claim.claimToken,
      expectedTaskVersion: claim.taskVersion,
      ...(claim.planVersion === null ? {} : { expectedPlanVersion: claim.planVersion }),
      idempotencyKey: `advance-browser:${TASK_ID}`,
      producerRef: "phase3-controller",
      command: {
        type: "ADVANCE_PLAN_NODE",
        payload: {
          nodeId: BROWSER_NODE_ID,
          resultRefs: browserItem.resultRef ? [browserItem.resultRef] : [],
          summary: "Real Browser Host action succeeded after explicit human Approval.",
        },
      },
    });
    const advanced = await taskControl.getCurrentTask(TASK_ID);
    assert.equal(advanced.plan?.status, "COMPLETED");
    assert.equal(advanced.plan?.currentNodeId, null);
    assert.ok(advanced.controllerClaim?.claimToken);
    await taskControl.submitControllerCommand({
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: TASK_ID,
      claimToken: advanced.controllerClaim.claimToken,
      expectedTaskVersion: advanced.taskVersion,
      ...(advanced.plan === null ? {} : { expectedPlanVersion: advanced.plan.planVersion }),
      idempotencyKey: `complete-final:${TASK_ID}`,
      producerRef: "phase3-controller",
      command: {
        type: "COMPLETE_TASK",
        payload: { summary: "Phase 3 final Runtime + Browser Approval acceptance completed." },
      },
    });
    const completed = await taskControl.getCurrentTask(TASK_ID);
    assert.equal(completed.status, "COMPLETED");
    const events = await taskControl.listTaskEvents(TASK_ID);
    assert.ok(events.some((event) => event.eventType === "HOST_DISPATCH_CREATED"));
    assert.ok(events.some((event) => event.eventType === "HOST_DISPATCH_DELIVERED"));
    assert.ok(events.some((event) => event.eventType === "HOST_RESULT_REPORTED"));
    assert.ok(events.some((event) => event.eventType === "TASK_COMPLETED"));

    const evidence = {
      contract: "aap.phase3.final-acceptance.evidence.v0",
      status: "PASS",
      task_id: TASK_ID,
      task_status: completed.status,
      plan_status: completed.plan?.status ?? null,
      runtime: {
        result_ref: metadata.runtimeResultRef,
        work_item_id: metadata.runtimeWorkItemId,
        path: ["Runtime HTTP", "local.health.read", "MLXHub FAST"],
      },
      browser: {
        work_item_id: metadata.browserWorkItemId,
        dispatch_id: metadata.browserDispatchId,
        result_ref: browserItem.resultRef,
        host_result_status: dispatch.hostResultStatus,
        delivered_at: dispatch.deliveredAt,
      },
      approval: {
        approval_ref: metadata.approvalRef,
        draft_id: draft.draftId,
        binding_id: draft.bindingId,
        action_fingerprint: draft.actionFingerprint,
        page_precondition_hash: draft.pagePreconditionHash,
        single_use: consumed.singleUse,
        consumed_at: consumed.consumedAt,
        consumed_by: consumed.consumedBy,
      },
      events: events.map((event) => event.eventType),
      completed_at: new Date().toISOString(),
    };
    await writeFile(evidencePath(), `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await closeServer(gatewayServer);
    await store.close();
  }
}

async function inspect(): Promise<void> {
  const output: Record<string, unknown> = { home: home() };
  try { output.metadata = await readMetadata(); } catch { output.metadata = null; }
  try { output.draft = JSON.parse(await readFile(draftPath(), "utf8")); } catch { output.draft = null; }
  try { output.evidence = JSON.parse(await readFile(evidencePath(), "utf8")); } catch { output.evidence = null; }
  console.log(JSON.stringify(output, null, 2));
}

async function clean(): Promise<void> {
  await rm(home(), { recursive: true, force: true });
  console.log(JSON.stringify({ cleaned: true, home: home() }));
}

const mode = process.argv[2];
if (mode === "prepare") await prepare();
else if (mode === "approve") await approve();
else if (mode === "inspect") await inspect();
else if (mode === "clean") await clean();
else throw new Error("Usage: acceptance.ts <prepare|approve|inspect|clean>");

import {
  APPROVAL_DRAFT_CONTRACT_VERSION,
  type ApprovalDraftV1,
  type ApprovalGrantV1,
  type BrowserHostInvocationV1,
  type JsonObject,
  type JsonValue,
} from "@ai-agent-platform/contracts";
import {
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  type DispatchSignal,
  type HostCommandMaterialization,
  type HostDispatchApplicationPort,
  type TaskProjectionApplicationPort,
} from "@ai-agent-platform/task-control";
import { createHash } from "node:crypto";

import { Phase2IntegrationStore, Phase2IntegrationStoreError } from "./phase2-integration-store.js";

const CLAIM_LEASE_MS = 60_000;
const HOST_TTL_MS = 120_000;
const HOST_RESULT_STATUSES = new Set([
  "DELIVERED",
  "ACTION_SUCCEEDED",
  "ACTION_FAILED",
  "UNCERTAIN",
  "BLOCKED",
  "EXPIRED",
  "CANCELLED",
]);

type BrowserHostTaskControl = HostDispatchApplicationPort &
  Pick<TaskProjectionApplicationPort, "getCurrentTask" | "getCurrentDispatch" | "listTaskEvents"> & {
    listPendingDispatches(): Promise<readonly DispatchSignal[]>;
    getDispatches(taskId: string): Promise<readonly DispatchSignal[]>;
    failDispatch(input: {
      readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
      readonly signalId: string;
      readonly claimToken: string;
      readonly idempotencyKey: string;
      readonly producerRef: string;
      readonly correlationId?: string;
      readonly deliveryId?: string;
      readonly errorSummary?: string;
    }): Promise<DispatchSignal>;
  };

export interface BrowserHostServerAdapterOptions {
  /**
   * Provider GPT ref for the platform Controller. This is an adapter/deployment
   * concern, not Task Control state. A prior Browser Work target can supply the
   * same route dynamically; this value is the fail-closed fallback needed for
   * Controller wakes that follow non-browser work.
   */
  readonly controllerTargetProfileRef?: string;
}

interface MaterializedBrowserHostCommand {
  readonly targetProfileRef: string;
  readonly conversationRef: string | null;
  readonly payloadRef: string | null;
  readonly preconditions: JsonObject;
}

const PLATFORM_WAKE_VERSION = "0.1.0";
const PLATFORM_WAKE_ISSUER = "action-gateway";
const PLATFORM_WAKE_ACTIONS = new Set(["OPEN_OR_RESUME_SESSION", "CONTINUE_ROLE_SESSION"]);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function optionalConfiguredTarget(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 256) {
    throw new TypeError("controllerTargetProfileRef must be a non-empty provider GPT ref no longer than 256 characters.");
  }
  return normalized;
}

function latestControllerRoute(
  dispatches: readonly DispatchSignal[],
  signal: DispatchSignal,
): DispatchSignal | undefined {
  const candidates = dispatches.filter((candidate) =>
    candidate.signalId !== signal.signalId &&
    candidate.signalType === "ROLE_WORK_WAKE" &&
    candidate.targetRole === signal.targetRole &&
    candidate.targetProfileRef !== null &&
    (signal.conversationRef === null || candidate.conversationRef === signal.conversationRef),
  );
  return candidates.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)).at(-1);
}

async function materializeControllerWake(
  taskControl: BrowserHostTaskControl,
  integrationStore: Phase2IntegrationStore,
  signal: DispatchSignal,
  command: HostCommandMaterialization,
  configuredTargetProfileRef: string | undefined,
): Promise<MaterializedBrowserHostCommand> {
  if (!PLATFORM_WAKE_ACTIONS.has(command.actionType)) {
    throw new BrowserHostServerError(
      "CONTROLLER_WAKE_ACTION_INVALID",
      `Controller Wake cannot materialize unsupported action ${command.actionType}.`,
      409,
    );
  }

  const dispatches = await taskControl.getDispatches(signal.taskId);
  const previousRoute = latestControllerRoute(dispatches, signal);
  const targetProfileRef = command.targetProfileRef ?? previousRoute?.targetProfileRef ?? configuredTargetProfileRef;
  if (targetProfileRef === undefined || targetProfileRef === null) {
    throw new BrowserHostServerError(
      "CONTROLLER_TARGET_NOT_CONFIGURED",
      "Controller Wake has no provider GPT target. Configure the Controller target or establish a prior Browser Work route.",
      409,
    );
  }
  const conversationRef = command.conversationRef ?? previousRoute?.conversationRef ?? null;

  const events = await taskControl.listTaskEvents(signal.taskId);
  const causalEvent = events
    .filter((event) => event.taskVersion <= signal.createdFromTaskVersion)
    .at(-1);
  if (causalEvent === undefined) {
    throw new BrowserHostServerError(
      "CONTROLLER_WAKE_CAUSATION_MISSING",
      "Controller Wake cannot resolve its causal Task event.",
      409,
    );
  }

  const wake = {
    wake_version: PLATFORM_WAKE_VERSION,
    task_id: signal.taskId,
    required_role: signal.targetRole,
    event_id: causalEvent.eventId,
    dispatch_ref: signal.signalId,
    ...(conversationRef === null ? {} : { conversation_ref: conversationRef }),
    instruction: "请查询最新 Decision Context，确认角色后再 Claim 并继续处理。",
  } satisfies JsonObject;
  const wakeText = JSON.stringify(wake);
  const payloadRef = command.payloadRef ?? `platform-wake-payload:${signal.signalId}`;
  const payloadValue: JsonObject = command.actionType === "OPEN_OR_RESUME_SESSION"
    ? {
        url: `https://chatgpt.com/g/${targetProfileRef}`,
        wake_text: wakeText,
        wake,
      }
    : { text: wakeText, wake };
  await integrationStore.putPayload(payloadRef, payloadValue);

  const authorizationRef = `platform-wake-auth:${signal.signalId}`;
  const attestationBody = JSON.stringify({
    authorizationRef,
    taskId: signal.taskId,
    roleRef: signal.targetRole,
    gptRef: targetProfileRef,
    actionType: command.actionType,
    idempotencyKey: command.idempotencyKey,
    expiresAt: command.expiresAt,
  });
  const preconditions: JsonObject = {
    ...structuredClone(command.preconditions),
    authorization_class: "PLATFORM_WAKE",
    authorization_ref: authorizationRef,
    platform_wake_authorization: {
      authorization_version: PLATFORM_WAKE_VERSION,
      authorization_ref: authorizationRef,
      issuer: PLATFORM_WAKE_ISSUER,
      // The Gateway is the authenticated issuer for this MVP. BHR consumes the
      // verified attestation and never trusts page text/DOM as authorization.
      signature_ref: `gateway-attestation:sha256:${sha256(attestationBody)}`,
      signature_verified: true,
      task_id: signal.taskId,
      role_ref: signal.targetRole,
      gpt_ref: targetProfileRef,
      idempotency_key: command.idempotencyKey,
      allowed_actions: [command.actionType],
      expires_at: command.expiresAt,
    },
  };

  return { targetProfileRef, conversationRef, payloadRef, preconditions };
}

export class BrowserHostServerError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus = 409,
  ) {
    super(message);
    this.name = "BrowserHostServerError";
  }
}

function record(input: JsonObject, field: string): JsonObject {
  const value = input[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BrowserHostServerError("BROWSER_HOST_INVALID_REQUEST", `${field} must be an object.`, 400);
  }
  return value as JsonObject;
}

function string(input: JsonObject, field: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BrowserHostServerError("BROWSER_HOST_INVALID_REQUEST", `${field} must be a non-empty string.`, 400);
  }
  return value;
}

function optionalString(input: JsonObject, field: string): string | undefined {
  const value = input[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BrowserHostServerError("BROWSER_HOST_INVALID_REQUEST", `${field} must be a non-empty string.`, 400);
  }
  return value;
}

function stringArray(input: JsonObject, field: string): readonly string[] {
  const value = input[field];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.length > 0)) {
    throw new BrowserHostServerError("BROWSER_HOST_INVALID_REQUEST", `${field} must be an array of strings.`, 400);
  }
  return value as unknown as readonly string[];
}

function taskControlError(error: unknown): never {
  if (error instanceof BrowserHostServerError) throw error;
  if (error instanceof Phase2IntegrationStoreError) {
    throw new BrowserHostServerError(error.code, error.message, error.httpStatus);
  }
  if (error instanceof TaskControlError) {
    throw new BrowserHostServerError(error.code, error.message, error.code.endsWith("NOT_FOUND") ? 404 : 409);
  }
  if (error instanceof TypeError) {
    throw new BrowserHostServerError("BROWSER_HOST_INVALID_REQUEST", error.message, 400);
  }
  throw new BrowserHostServerError("BROWSER_HOST_INTERNAL_ERROR", "Browser Host operation failed.", 500);
}


function readApprovalDraft(input: JsonObject): ApprovalDraftV1 {
  const conversationValue = input.conversation_ref;
  const conversationRef = conversationValue === null || conversationValue === undefined
    ? null
    : string(input, "conversation_ref");
  const preview = record(input, "payload_preview");
  const allowedActionType = string(input, "allowed_action_type") as ApprovalDraftV1["allowedActionType"];
  return {
    approvalDraftContractVersion: string(input, "approval_draft_version") as typeof APPROVAL_DRAFT_CONTRACT_VERSION,
    approvalRef: string(input, "approval_ref"),
    draftId: string(input, "draft_id"),
    taskId: string(input, "task_id"),
    dispatchRef: string(input, "dispatch_ref"),
    commandId: string(input, "command_id"),
    bindingId: string(input, "binding_id"),
    allowedActionType,
    actionFingerprint: string(input, "action_fingerprint"),
    pagePreconditionHash: string(input, "page_precondition_hash"),
    targetRoleRef: string(input, "target_role_ref"),
    targetProfileRef: string(input, "target_profile_ref"),
    conversationRef,
    payloadPreview: structuredClone(preview),
    preparedAt: string(input, "prepared_at"),
    expiresAt: string(input, "expires_at"),
  };
}

function mapGrant(grant: ApprovalGrantV1): JsonObject {
  return {
    approval_ref: grant.approvalRef,
    grant_id: grant.grantId,
    action_fingerprint: grant.actionFingerprint,
    binding_id: grant.bindingId,
    task_id: grant.taskId,
    command_id: grant.commandId,
    allowed_action_type: grant.allowedActionType,
    page_precondition_hash: grant.pagePreconditionHash,
    single_use: grant.singleUse,
    expires_at: grant.expiresAt,
    consumed_at: grant.consumedAt,
    consumed_by: grant.consumedBy,
  };
}

async function requireLiveHost(
  integrationStore: Phase2IntegrationStore,
  hostId: string,
): Promise<Awaited<ReturnType<Phase2IntegrationStore["getHost"]>> extends infer T ? Exclude<T, null> : never> {
  const host = await integrationStore.getHost(hostId);
  if (host === null || Date.parse(host.expiresAt) <= Date.now()) {
    throw new BrowserHostServerError("HOST_NOT_REGISTERED", "Browser Host is not registered or its heartbeat expired.", 409);
  }
  return host;
}

function assertDispatchLive(signal: DispatchSignal): void {
  if (Date.parse(signal.expiresAt) <= Date.now()) {
    throw new BrowserHostServerError("DISPATCH_EXPIRED", "Browser Host dispatch has expired.", 409);
  }
}

function assertHostCapability(host: { readonly capabilities: readonly string[] }, signal: DispatchSignal): void {
  const action = signal.browserActionType;
  if (action !== null && action !== undefined && !host.capabilities.includes(action) && !host.capabilities.includes("*")) {
    throw new BrowserHostServerError("HOST_CAPABILITY_NOT_ALLOWED", `Browser Host does not declare capability ${action}.`, 409);
  }
}

function assertCommandIdentity(
  input: JsonObject,
  signal: DispatchSignal,
  commandId: string,
  prefix: string,
): void {
  const receivedCommandId = optionalString(input, "command_id");
  const receivedDispatchRef = optionalString(input, "dispatch_ref");
  const receivedTaskId = optionalString(input, "task_id");
  if (receivedCommandId !== undefined && receivedCommandId !== commandId) {
    throw new BrowserHostServerError("COMMAND_BINDING_MISMATCH", `${prefix} command_id does not match the claimed Host Command.`, 409);
  }
  if (receivedDispatchRef !== undefined && receivedDispatchRef !== signal.signalId) {
    throw new BrowserHostServerError("COMMAND_BINDING_MISMATCH", `${prefix} dispatch_ref does not match the claimed dispatch.`, 409);
  }
  if (receivedTaskId !== undefined && receivedTaskId !== signal.taskId) {
    throw new BrowserHostServerError("COMMAND_BINDING_MISMATCH", `${prefix} task_id does not match the claimed Task.`, 409);
  }
}

export interface BrowserHostServerPort {
  invoke(request: BrowserHostInvocationV1): Promise<JsonValue>;
}

export function createBrowserHostServerAdapter(
  taskControl: BrowserHostTaskControl,
  integrationStore: Phase2IntegrationStore,
  options: BrowserHostServerAdapterOptions = {},
): BrowserHostServerPort {
  const configuredTargetProfileRef = optionalConfiguredTarget(options.controllerTargetProfileRef);
  return Object.freeze({
    async invoke(request: BrowserHostInvocationV1): Promise<JsonValue> {
      try {
        const payload = request.payload;
        switch (request.operation) {
          case "browser.host.register": {
            const hostId = string(payload, "host_id");
            const recordValue = await integrationStore.registerHost({
              hostId,
              instanceId: optionalString(payload, "instance_id") ?? string(payload, "host_version"),
              capabilities: stringArray(payload, "capabilities"),
              ttlMs: HOST_TTL_MS,
            });
            return { host_id: recordValue.hostId, status: "REGISTERED", expires_at: recordValue.expiresAt };
          }
          case "browser.host.heartbeat": {
            const host = await integrationStore.heartbeatHost(string(payload, "host_id"), HOST_TTL_MS);
            return { status: "ALIVE", expires_at: host.expiresAt };
          }
          case "browser.dispatch.listPending": {
            const hostId = string(payload, "host_id");
            const host = await requireLiveHost(integrationStore, hostId);
            const limitRaw = payload.limit;
            const limit = typeof limitRaw === "number" && Number.isSafeInteger(limitRaw) && limitRaw > 0
              ? Math.min(limitRaw, 20)
              : 1;
            return (await taskControl.listPendingDispatches())
              .filter((signal) => Date.parse(signal.expiresAt) > Date.now())
              .filter((signal) => signal.browserActionType === null || signal.browserActionType === undefined || host.capabilities.includes(signal.browserActionType) || host.capabilities.includes("*"))
              .slice(0, limit)
              .map((signal) => ({
                dispatch_ref: signal.signalId,
                task_id: signal.taskId,
                target_role: signal.targetRole,
                action_type: signal.browserActionType,
                status: signal.status,
                expires_at: signal.expiresAt,
              }));
          }
          case "browser.dispatch.claim": {
            const dispatchRef = string(payload, "dispatch_ref");
            const hostId = string(payload, "host_id");
            const host = await requireLiveHost(integrationStore, hostId);
            const current = await taskControl.getCurrentDispatch(dispatchRef);
            assertDispatchLive(current);
            assertHostCapability(host, current);
            if (
              current.claim !== null &&
              current.claim.claimedBy === hostId &&
              Date.parse(current.claim.expiresAt) > Date.now()
            ) {
              return {
                dispatch_ref: dispatchRef,
                claim_token: current.claim.claimToken,
                expires_at: current.claim.expiresAt,
              };
            }
            const claimed = await taskControl.claimDispatch({
              contractVersion: TASK_CONTROL_CONTRACT_VERSION,
              signalId: dispatchRef,
              hostId,
              leaseMs: CLAIM_LEASE_MS,
              idempotencyKey: `bhr-claim:${dispatchRef}:${hostId}:${current.claimEpoch + 1}`,
            });
            return {
              dispatch_ref: dispatchRef,
              claim_token: claimed.dispatch.claim!.claimToken,
              expires_at: claimed.dispatch.claim!.expiresAt,
            };
          }
          case "browser.dispatch.get": {
            const dispatchRef = string(payload, "dispatch_ref");
            const claimToken = string(payload, "claim_token");
            const signal = await taskControl.getCurrentDispatch(dispatchRef);
            assertDispatchLive(signal);
            if (signal.claim?.claimToken !== claimToken || Date.parse(signal.claim.expiresAt) <= Date.now()) {
              throw new BrowserHostServerError("CLAIM_TOKEN_INVALID", "Dispatch Claim Token is invalid or expired.", 409);
            }
            const command = await taskControl.materializeHostCommand(dispatchRef);
            const materialized = signal.signalType === "CONTROLLER_WAKE"
              ? await materializeControllerWake(
                  taskControl,
                  integrationStore,
                  signal,
                  command,
                  configuredTargetProfileRef,
                )
              : {
                  targetProfileRef: command.targetProfileRef,
                  conversationRef: command.conversationRef,
                  payloadRef: command.payloadRef,
                  preconditions: structuredClone(command.preconditions),
                };
            if (materialized.targetProfileRef === null) {
              throw new BrowserHostServerError(
                "HOST_TARGET_PROFILE_REQUIRED",
                "Browser Host Command requires an explicit provider GPT target.",
                409,
              );
            }
            return {
              host_command_version: "0.1.0",
              command_id: command.commandId,
              dispatch_ref: command.dispatchId,
              task_id: command.taskId,
              target: {
                role_ref: command.targetRole,
                gpt_ref: materialized.targetProfileRef,
                conversation_ref: materialized.conversationRef,
              },
              action: {
                type: command.actionType,
                payload_ref: materialized.payloadRef,
              },
              preconditions: materialized.preconditions,
              approval_ref: command.approvalRef,
              idempotency_key: command.idempotencyKey,
              expires_at: command.expiresAt,
            } as unknown as JsonValue;
          }
          case "browser.dispatch.deliveryAck": {
            const dispatchRef = string(payload, "dispatch_ref");
            const delivery = record(payload, "delivery");
            const deliveryId = string(delivery, "delivery_id");
            const signal = await taskControl.getCurrentDispatch(dispatchRef);
            const command = await taskControl.materializeHostCommand(dispatchRef);
            assertCommandIdentity(delivery, signal, command.commandId, "Delivery fact");
            const updated = await taskControl.acknowledgeDispatch({
              contractVersion: TASK_CONTROL_CONTRACT_VERSION,
              signalId: dispatchRef,
              claimToken: string(payload, "claim_token"),
              deliveryId,
              idempotencyKey: `bhr-delivery:${dispatchRef}:${deliveryId}`,
              producerRef: "browser-host-runtime",
              correlationId: request.requestId,
            });
            return {
              status: updated.deliveryId === deliveryId ? "RECORDED" : "ALREADY_RECORDED",
              delivery_receipt: updated.deliveryReceipt!,
              report_token: updated.reportToken!,
            };
          }
          case "browser.dispatch.hostResult": {
            const dispatchRef = string(payload, "dispatch_ref");
            const result = record(payload, "result");
            const resultId = string(result, "result_id");
            const signal = await taskControl.getCurrentDispatch(dispatchRef);
            const command = await taskControl.materializeHostCommand(dispatchRef);
            assertCommandIdentity(result, signal, command.commandId, "Host Result");
            const status = string(result, "status");
            if (!HOST_RESULT_STATUSES.has(status)) {
              throw new BrowserHostServerError("HOST_RESULT_STATUS_INVALID", "Host Result status is unsupported.", 400);
            }
            const details = result.details !== null && typeof result.details === "object" && !Array.isArray(result.details)
              ? result.details as JsonObject
              : {};
            const evidenceSource = Array.isArray(result.evidence_refs)
              ? result.evidence_refs
              : Array.isArray(details.evidence_refs)
                ? details.evidence_refs
                : [];
            const evidenceRefs = evidenceSource.filter((item): item is string => typeof item === "string");
            if (["DELIVERED", "ACTION_SUCCEEDED"].includes(status)) {
              await taskControl.reportHostResult({
                contractVersion: TASK_CONTROL_CONTRACT_VERSION,
                signalId: dispatchRef,
                reportToken: string(payload, "report_token"),
                hostResultRef: `browser-host-result:${resultId}`,
                summary: optionalString(result, "summary") ?? optionalString(details, "summary") ?? status,
                evidenceRefs,
                idempotencyKey: `bhr-result:${dispatchRef}:${resultId}`,
                producerRef: "browser-host-runtime",
                correlationId: request.requestId,
              });
            } else {
              const error = result.error !== null && typeof result.error === "object" && !Array.isArray(result.error)
                ? result.error as JsonObject
                : {};
              await taskControl.failHostResult({
                contractVersion: TASK_CONTROL_CONTRACT_VERSION,
                signalId: dispatchRef,
                reportToken: string(payload, "report_token"),
                errorCode: optionalString(error, "code") ?? `BHR_${status}`,
                errorSummary: optionalString(error, "message") ?? `Browser Host completed with ${status}.`,
                evidenceRefs,
                idempotencyKey: `bhr-result:${dispatchRef}:${resultId}`,
                producerRef: "browser-host-runtime",
                correlationId: request.requestId,
              });
            }
            return { status: "RECORDED", result_id: resultId };
          }
          case "browser.dispatch.uncertain": {
            const dispatchRef = string(payload, "dispatch_ref");
            const credential = record(payload, "credential");
            const uncertain = record(payload, "uncertain");
            const uncertainId = string(uncertain, "uncertain_id");
            const signal = await taskControl.getCurrentDispatch(dispatchRef);
            const command = await taskControl.materializeHostCommand(dispatchRef);
            assertCommandIdentity(uncertain, signal, command.commandId, "Uncertain report");
            const pageIdentity = uncertain.page_identity;
            await taskControl.reportUncertainHostResult({
              contractVersion: TASK_CONTROL_CONTRACT_VERSION,
              signalId: dispatchRef,
              ...(optionalString(credential, "report_token") === undefined
                ? { claimToken: string(credential, "claim_token") }
                : { reportToken: optionalString(credential, "report_token")! }),
              stage: string(uncertain, "last_stage"),
              commandFingerprint: string(uncertain, "command_fingerprint"),
              ...(pageIdentity === null || pageIdentity === undefined
                ? {}
                : { pageIdentityRef: `page-identity:${string(uncertain, "command_id")}` }),
              evidenceRefs: Array.isArray(uncertain.evidence_refs)
                ? uncertain.evidence_refs.filter((item): item is string => typeof item === "string")
                : [],
              summary: string(uncertain, "reason"),
              idempotencyKey: `bhr-uncertain:${dispatchRef}:${uncertainId}`,
              producerRef: "browser-host-runtime",
              correlationId: request.requestId,
            });
            return { status: "RECORDED", uncertain_id: uncertainId };
          }
          case "browser.dispatch.fail": {
            const dispatchRef = string(payload, "dispatch_ref");
            const result = record(payload, "result");
            const resultId = string(result, "result_id");
            const signal = await taskControl.getCurrentDispatch(dispatchRef);
            const command = await taskControl.materializeHostCommand(dispatchRef);
            assertCommandIdentity(result, signal, command.commandId, "Pre-delivery failure");
            const error = result.error !== null && typeof result.error === "object" && !Array.isArray(result.error)
              ? result.error as JsonObject
              : {};
            await taskControl.failDispatch({
              contractVersion: TASK_CONTROL_CONTRACT_VERSION,
              signalId: dispatchRef,
              claimToken: string(payload, "claim_token"),
              idempotencyKey: `bhr-delivery-fail:${dispatchRef}:${resultId}`,
              producerRef: "browser-host-runtime",
              correlationId: request.requestId,
              errorSummary: optionalString(error, "message") ?? "Browser Host failed before delivery.",
            });
            return { status: "RECORDED", result_id: resultId };
          }
          case "browser.payload.resolve": {
            const value = await integrationStore.getPayload(string(payload, "payload_ref"));
            if (value === null) throw new BrowserHostServerError("PAYLOAD_NOT_FOUND", "Payload reference was not found.", 404);
            return value;
          }
          case "approval.draft.put": {
            const draft = readApprovalDraft(record(payload, "draft"));
            const claimToken = string(payload, "claim_token");
            if (draft.approvalDraftContractVersion !== APPROVAL_DRAFT_CONTRACT_VERSION) {
              throw new BrowserHostServerError("APPROVAL_DRAFT_VERSION_UNSUPPORTED", "Approval Draft contract version is unsupported.", 400);
            }
            const signal = await taskControl.getCurrentDispatch(draft.dispatchRef);
            if (signal.status !== "CLAIMED" || signal.claim?.claimToken !== claimToken || Date.parse(signal.claim.expiresAt) <= Date.now()) {
              throw new BrowserHostServerError("CLAIM_TOKEN_INVALID", "Approval Draft requires the active dispatch claim token.", 409);
            }
            const command = await taskControl.materializeHostCommand(draft.dispatchRef);
            if (command.commandId !== draft.commandId || command.taskId !== draft.taskId || command.approvalRef !== draft.approvalRef) {
              throw new BrowserHostServerError("APPROVAL_DRAFT_COMMAND_MISMATCH", "Approval Draft does not match the materialized Host Command.", 409);
            }
            if (command.actionType !== draft.allowedActionType || command.targetRole !== draft.targetRoleRef || command.targetProfileRef !== draft.targetProfileRef || (command.conversationRef ?? null) !== draft.conversationRef) {
              throw new BrowserHostServerError("APPROVAL_DRAFT_TARGET_MISMATCH", "Approval Draft target does not match the materialized Host Command.", 409);
            }
            await integrationStore.putApprovalDraft(draft);
            return { status: "PENDING_APPROVAL", approval_ref: draft.approvalRef, draft_id: draft.draftId };
          }
          case "approval.grant.get": {
            const grant = await integrationStore.getApprovalGrant(string(payload, "approval_ref"));
            if (grant === null) {
              throw new BrowserHostServerError("APPROVAL_NOT_FOUND", "Approval Grant was not found.", 404);
            }
            return mapGrant(grant);
          }
          case "approval.grant.consume": {
            const grant = await integrationStore.consumeApprovalGrant(
              string(payload, "approval_ref"),
              string(payload, "grant_id"),
              string(payload, "command_id"),
            );
            return { status: "CONSUMED", consumed_at: grant.consumedAt! };
          }
        }
      } catch (error) {
        taskControlError(error);
      }
    },
  });
}

import type { JsonObject, JsonValue } from "./json.js";
import type { ValidationIssue, ValidationResult } from "./validation.js";

export const PHASE2_INTEGRATION_CONTRACT_VERSION = "1.0.0" as const;
export const LOCAL_WORK_HANDOFF_VERSION = "1.0.0" as const;
export const BROWSER_HOST_SERVER_CONTRACT_VERSION = "1.0.0" as const;
export const DISPATCH_CREDENTIAL_CONTRACT_VERSION = "1.0.0" as const;
export const APPROVAL_GRANT_CONTRACT_VERSION = "1.0.0" as const;
export const RESULT_PROGRESS_OUTCOME_CONTRACT_VERSION = "1.0.0" as const;
export const CANCELLATION_EVENT_CONTRACT_VERSION = "1.0.0" as const;

export const PHASE2_OUTCOMES = [
  "ACCEPTED",
  "PARTIAL",
  "SUCCEEDED",
  "FAILED",
  "UNCERTAIN",
] as const;
export type Phase2Outcome = (typeof PHASE2_OUTCOMES)[number];

export const BROWSER_HOST_ACTION_TYPES = [
  "OBSERVE_PAGE",
  "FOLLOW_LATEST",
  "OPEN_OR_RESUME_SESSION",
  "CONTINUE_ROLE_SESSION",
  "SET_COMPOSER_TEXT",
  "SUBMIT_MESSAGE",
  "STOP_GENERATION",
  "CLICK_REGISTERED_UI",
  "WAIT_FOR_RESPONSE",
] as const;
export type BrowserHostActionType = (typeof BROWSER_HOST_ACTION_TYPES)[number];

export const BROWSER_HOST_OPERATIONS = [
  "browser.host.register",
  "browser.host.heartbeat",
  "browser.dispatch.listPending",
  "browser.dispatch.claim",
  "browser.dispatch.get",
  "browser.dispatch.deliveryAck",
  "browser.dispatch.hostResult",
  "browser.dispatch.uncertain",
  "browser.dispatch.fail",
  "browser.payload.resolve",
  "approval.grant.get",
  "approval.grant.consume",
] as const;
export type BrowserHostOperation = (typeof BROWSER_HOST_OPERATIONS)[number];

export interface TaskIntakePlanNodeV1 {
  readonly nodeId: string;
  readonly title: string;
  readonly kind: "DECISION" | "WORK" | "REVIEW" | "WAIT" | "APPROVAL" | "FINALIZE";
  readonly requiredRole: string;
  readonly dependsOn?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  readonly summary?: string;
}

export interface TaskIntakePlanV1 {
  readonly source: {
    readonly type: "user" | "controller" | "upstream" | "fixture";
    readonly ref: string;
  };
  readonly currentNodeId?: string;
  readonly nodes: readonly TaskIntakePlanNodeV1[];
}

export interface TaskIntakePayloadResourceV1 {
  readonly payloadRef: string;
  readonly value: JsonValue;
}

export interface ApprovalGrantV1 {
  readonly approvalContractVersion: typeof APPROVAL_GRANT_CONTRACT_VERSION;
  readonly approvalRef: string;
  readonly grantId: string;
  readonly actionFingerprint: string;
  readonly bindingId: string;
  readonly taskId: string;
  readonly commandId: string;
  readonly allowedActionType: BrowserHostActionType;
  readonly pagePreconditionHash: string;
  readonly singleUse: true;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
  readonly consumedBy: string | null;
}

export interface TaskIntakeV1Request {
  readonly contractVersion: typeof PHASE2_INTEGRATION_CONTRACT_VERSION;
  readonly taskId: string;
  readonly title: string;
  readonly objective: string;
  readonly requiredRole: string;
  readonly requirementRef?: string;
  readonly goalRef?: string;
  readonly conversationRef?: string;
  readonly plan?: TaskIntakePlanV1;
  readonly payloadResources?: readonly TaskIntakePayloadResourceV1[];
  readonly approvalGrants?: readonly ApprovalGrantV1[];
  readonly idempotencyKey: string;
  readonly producerRef?: string;
  readonly correlationId?: string;
}

export interface TaskIntakeV1Receipt {
  readonly contractVersion: typeof PHASE2_INTEGRATION_CONTRACT_VERSION;
  readonly taskId: string;
  readonly taskVersionAtCreation: number;
  readonly initialEventIds: readonly string[];
  readonly idempotentReplay: boolean;
}

export interface CommandReceiptV1 {
  readonly contractVersion: typeof PHASE2_INTEGRATION_CONTRACT_VERSION;
  readonly commandId: string;
  readonly taskId: string;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly eventIds: readonly string[];
  readonly createdRefs: readonly string[];
  readonly idempotentReplay: boolean;
}

export interface LocalWorkPayloadV1 {
  readonly localWorkVersion: typeof LOCAL_WORK_HANDOFF_VERSION;
  readonly actor: {
    readonly actor_type: "system" | "controller" | "worker" | "user";
    readonly actor_id: string;
  };
  readonly parameters: JsonObject;
  readonly budget: {
    readonly timeout_ms: number;
    readonly max_stdout_bytes: number;
    readonly max_result_chars: number;
  };
  readonly scope?: JsonObject;
  readonly continuation?: {
    readonly cursorRef?: string;
    readonly completionPolicy?: "CONTROLLER_DECIDES" | "COMPLETE_ON_PARTIAL";
  };
}

export interface LocalWorkHandoffV1 {
  readonly localWorkVersion: typeof LOCAL_WORK_HANDOFF_VERSION;
  readonly workItemId: string;
  readonly taskId: string;
  readonly planNodeId: string;
  readonly capabilityRef: string;
  readonly inputRef: string;
  readonly expectedResultType: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface DispatchClaimCredentialV1 {
  readonly credentialVersion: typeof DISPATCH_CREDENTIAL_CONTRACT_VERSION;
  readonly kind: "CLAIM_TOKEN";
  readonly dispatchRef: string;
  readonly claimToken: string;
  readonly hostId: string;
  readonly expiresAt: string;
}

export interface DispatchDeliveryReceiptV1 {
  readonly credentialVersion: typeof DISPATCH_CREDENTIAL_CONTRACT_VERSION;
  readonly kind: "DELIVERY_RECEIPT";
  readonly dispatchRef: string;
  readonly deliveryReceipt: string;
  readonly deliveryId: string;
  readonly recordedAt: string;
}

export interface DispatchReportCredentialV1 {
  readonly credentialVersion: typeof DISPATCH_CREDENTIAL_CONTRACT_VERSION;
  readonly kind: "REPORT_TOKEN";
  readonly dispatchRef: string;
  readonly reportToken: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
}

export interface BrowserHostCommandV1 {
  readonly hostCommandVersion: "0.1.0";
  readonly commandId: string;
  readonly dispatchRef: string;
  readonly taskId: string;
  readonly target: {
    readonly roleRef: string;
    readonly gptRef: string;
    readonly conversationRef: string | null;
  };
  readonly action: {
    readonly type: BrowserHostActionType;
    readonly payloadRef: string | null;
  };
  readonly preconditions: JsonObject;
  readonly approvalRef: string | null;
  readonly idempotencyKey: string;
  readonly expiresAt: string;
}

export interface BrowserHostInvocationV1 {
  readonly requestId: string;
  readonly operation: BrowserHostOperation;
  readonly payload: JsonObject;
}

export interface BrowserHostRecordV1 {
  readonly hostId: string;
  readonly instanceId: string;
  readonly capabilities: readonly string[];
  readonly registeredAt: string;
  readonly lastHeartbeatAt: string;
  readonly expiresAt: string;
}

export interface ResultProgressOutcomeV1 {
  readonly outcomeContractVersion: typeof RESULT_PROGRESS_OUTCOME_CONTRACT_VERSION;
  readonly outcome: Phase2Outcome;
  readonly level: "REQUEST" | "WORK_ITEM" | "DISPATCH";
  readonly terminalAtLevel: boolean;
  readonly resultRef: string | null;
  readonly progressRef: string | null;
  readonly evidenceRefs: readonly string[];
  readonly summary: string;
  readonly retryable: boolean;
  readonly automaticRetryAllowed: boolean;
}

export interface CancellationEventV1 {
  readonly cancellationContractVersion: typeof CANCELLATION_EVENT_CONTRACT_VERSION;
  readonly eventId: string;
  readonly taskId: string;
  readonly taskVersion: number;
  readonly targetType: "TASK" | "WORK_ITEM" | "DISPATCH";
  readonly targetRef: string;
  readonly reason: string;
  readonly triggerEventId: string | null;
  readonly occurredAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

const TASK_INTAKE_PLAN_NODE_KINDS = [
  "DECISION",
  "WORK",
  "REVIEW",
  "WAIT",
  "APPROVAL",
  "FINALIZE",
] as const;

const TASK_INTAKE_PLAN_SOURCE_TYPES = ["user", "controller", "upstream", "fixture"] as const;

function issue(issues: ValidationIssue[], path: string, code: string, message: string): void {
  issues.push({ path, code, message });
}

function validateStringArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) {
    issue(issues, path, "INVALID_ARRAY", "Must be an array.");
    return;
  }
  value.forEach((item, index) => {
    if (!nonEmpty(item)) issue(issues, `${path}[${index}]`, "INVALID_STRING", "Must be a non-empty string.");
  });
}

function validateApprovalGrant(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issue(issues, path, "INVALID_OBJECT", "Must be an object.");
    return;
  }
  const required = [
    "approvalRef",
    "grantId",
    "actionFingerprint",
    "bindingId",
    "taskId",
    "commandId",
    "allowedActionType",
    "pagePreconditionHash",
    "expiresAt",
  ];
  if (value.approvalContractVersion !== APPROVAL_GRANT_CONTRACT_VERSION) {
    issue(issues, `${path}.approvalContractVersion`, "UNSUPPORTED_VERSION", "Unsupported approval contract version.");
  }
  for (const field of required) {
    if (!nonEmpty(value[field])) issue(issues, `${path}.${field}`, "INVALID_STRING", "Must be a non-empty string.");
  }
  if (!BROWSER_HOST_ACTION_TYPES.includes(value.allowedActionType as BrowserHostActionType)) {
    issue(issues, `${path}.allowedActionType`, "UNSUPPORTED_ACTION", "Unsupported Browser Host action type.");
  }
  if (value.singleUse !== true) issue(issues, `${path}.singleUse`, "INVALID_BOOLEAN", "Approval grants must be single-use.");
  if (!validIsoDateTime(value.expiresAt)) issue(issues, `${path}.expiresAt`, "INVALID_DATE_TIME", "Must be a valid ISO-8601 date-time.");
  if (value.consumedAt !== null) issue(issues, `${path}.consumedAt`, "SERVER_OWNED_FIELD", "New approval grants must be unconsumed.");
  if (value.consumedBy !== null) issue(issues, `${path}.consumedBy`, "SERVER_OWNED_FIELD", "New approval grants must be unconsumed.");
}


export function validateApprovalGrantV1(input: unknown): ValidationResult<ApprovalGrantV1> {
  const issues: ValidationIssue[] = [];
  validateApprovalGrant(input, "", issues);
  return issues.length === 0
    ? { ok: true, value: input as ApprovalGrantV1 }
    : { ok: false, issues };
}

export function validateTaskIntakeV1Request(input: unknown): ValidationResult<TaskIntakeV1Request> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: "", code: "INVALID_OBJECT", message: "Must be a plain object." }] };
  }
  if (input.contractVersion !== PHASE2_INTEGRATION_CONTRACT_VERSION) {
    issue(issues, "contractVersion", "UNSUPPORTED_VERSION", "Unsupported Phase 2 integration contract version.");
  }
  for (const field of ["taskId", "title", "objective", "requiredRole", "idempotencyKey"] as const) {
    if (!nonEmpty(input[field])) issue(issues, field, "INVALID_STRING", "Must be a non-empty string.");
  }
  for (const field of ["requirementRef", "goalRef", "conversationRef", "producerRef", "correlationId"] as const) {
    if (input[field] !== undefined && !nonEmpty(input[field])) issue(issues, field, "INVALID_STRING", "Must be a non-empty string when supplied.");
  }
  if (input.plan !== undefined) {
    if (!isRecord(input.plan) || !Array.isArray(input.plan.nodes) || input.plan.nodes.length === 0) {
      issue(issues, "plan", "INVALID_PLAN", "Plan must contain at least one node.");
    } else {
      if (!isRecord(input.plan.source)) {
        issue(issues, "plan.source", "INVALID_OBJECT", "Plan source must be an object.");
      } else {
        if (!TASK_INTAKE_PLAN_SOURCE_TYPES.includes(input.plan.source.type as TaskIntakePlanV1["source"]["type"])) {
          issue(issues, "plan.source.type", "UNSUPPORTED_SOURCE", "Unsupported plan source type.");
        }
        if (!nonEmpty(input.plan.source.ref)) issue(issues, "plan.source.ref", "INVALID_STRING", "Must be a non-empty string.");
      }
      const nodeIds = new Set<string>();
      input.plan.nodes.forEach((node, index) => {
        if (!isRecord(node)) {
          issue(issues, `plan.nodes[${index}]`, "INVALID_OBJECT", "Must be an object.");
          return;
        }
        for (const field of ["nodeId", "title", "requiredRole"] as const) {
          if (!nonEmpty(node[field])) issue(issues, `plan.nodes[${index}].${field}`, "INVALID_STRING", "Must be a non-empty string.");
        }
        if (!TASK_INTAKE_PLAN_NODE_KINDS.includes(node.kind as TaskIntakePlanNodeV1["kind"])) {
          issue(issues, `plan.nodes[${index}].kind`, "UNSUPPORTED_NODE_KIND", "Unsupported plan node kind.");
        }
        if (nonEmpty(node.nodeId)) {
          if (nodeIds.has(node.nodeId)) issue(issues, `plan.nodes[${index}].nodeId`, "DUPLICATE_REFERENCE", "Plan node IDs must be unique.");
          nodeIds.add(node.nodeId);
        }
        if (node.dependsOn !== undefined) validateStringArray(node.dependsOn, `plan.nodes[${index}].dependsOn`, issues);
        if (node.acceptanceCriteria !== undefined) validateStringArray(node.acceptanceCriteria, `plan.nodes[${index}].acceptanceCriteria`, issues);
        if (node.summary !== undefined && !nonEmpty(node.summary)) issue(issues, `plan.nodes[${index}].summary`, "INVALID_STRING", "Must be a non-empty string when supplied.");
      });
      input.plan.nodes.forEach((node, index) => {
        if (!isRecord(node) || !Array.isArray(node.dependsOn)) return;
        node.dependsOn.forEach((dependency, dependencyIndex) => {
          if (!nonEmpty(dependency)) return;
          if (dependency === node.nodeId) {
            issue(issues, `plan.nodes[${index}].dependsOn[${dependencyIndex}]`, "SELF_DEPENDENCY", "A node cannot depend on itself.");
          } else if (!nodeIds.has(dependency)) {
            issue(issues, `plan.nodes[${index}].dependsOn[${dependencyIndex}]`, "UNKNOWN_REFERENCE", "Dependency must reference another plan node.");
          }
        });
      });
      if (input.plan.currentNodeId !== undefined) {
        if (!nonEmpty(input.plan.currentNodeId)) {
          issue(issues, "plan.currentNodeId", "INVALID_STRING", "Must be a non-empty string when supplied.");
        } else if (!nodeIds.has(input.plan.currentNodeId)) {
          issue(issues, "plan.currentNodeId", "UNKNOWN_REFERENCE", "Current node must reference a plan node.");
        }
      }
    }
  }
  if (input.payloadResources !== undefined) {
    if (!Array.isArray(input.payloadResources)) {
      issue(issues, "payloadResources", "INVALID_ARRAY", "Must be an array.");
    } else {
      const payloadRefs = new Set<string>();
      input.payloadResources.forEach((resource, index) => {
        if (!isRecord(resource) || !nonEmpty(resource.payloadRef) || !("value" in resource)) {
          issue(issues, `payloadResources[${index}]`, "INVALID_RESOURCE", "Payload resource requires payloadRef and value.");
          return;
        }
        if (payloadRefs.has(resource.payloadRef)) issue(issues, `payloadResources[${index}].payloadRef`, "DUPLICATE_REFERENCE", "Payload references must be unique.");
        payloadRefs.add(resource.payloadRef);
      });
    }
  }
  if (input.approvalGrants !== undefined) {
    if (!Array.isArray(input.approvalGrants)) {
      issue(issues, "approvalGrants", "INVALID_ARRAY", "Must be an array.");
    } else {
      const approvalRefs = new Set<string>();
      const grantIds = new Set<string>();
      input.approvalGrants.forEach((grant, index) => {
        validateApprovalGrant(grant, `approvalGrants[${index}]`, issues);
        if (!isRecord(grant)) return;
        if (nonEmpty(grant.approvalRef)) {
          if (approvalRefs.has(grant.approvalRef)) issue(issues, `approvalGrants[${index}].approvalRef`, "DUPLICATE_REFERENCE", "Approval references must be unique.");
          approvalRefs.add(grant.approvalRef);
        }
        if (nonEmpty(grant.grantId)) {
          if (grantIds.has(grant.grantId)) issue(issues, `approvalGrants[${index}].grantId`, "DUPLICATE_REFERENCE", "Approval grant IDs must be unique.");
          grantIds.add(grant.grantId);
        }
      });
    }
  }
  return issues.length === 0
    ? { ok: true, value: input as unknown as TaskIntakeV1Request }
    : { ok: false, issues };
}

export function validateBrowserHostInvocationV1(input: unknown): ValidationResult<BrowserHostInvocationV1> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: "", code: "INVALID_OBJECT", message: "Must be a plain object." }] };
  }
  if (!nonEmpty(input.requestId)) issue(issues, "requestId", "INVALID_STRING", "Must be a non-empty string.");
  if (!nonEmpty(input.operation) || !BROWSER_HOST_OPERATIONS.includes(input.operation as BrowserHostOperation)) {
    issue(issues, "operation", "UNSUPPORTED_OPERATION", "Unsupported Browser Host operation.");
  }
  if (!isRecord(input.payload)) issue(issues, "payload", "INVALID_OBJECT", "Must be an object.");
  return issues.length === 0
    ? { ok: true, value: input as unknown as BrowserHostInvocationV1 }
    : { ok: false, issues };
}

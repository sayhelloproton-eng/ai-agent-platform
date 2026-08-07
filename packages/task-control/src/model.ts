export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export const TASK_CONTROL_CONTRACT_VERSION = "1.0.0" as const;

export const TASK_STATUSES = [
  "CREATED",
  "PLAN_REQUIRED",
  "READY_FOR_CONTROLLER",
  "WAITING_FOR_ROLE_WORK",
  "WAITING_FOR_APPROVAL",
  "BLOCKED",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PLAN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_NODE_KINDS = [
  "ACTION",
  "DECISION",
  "REVIEW",
  "APPROVAL",
  "SUMMARY",
] as const;
export type PlanNodeKind = (typeof PLAN_NODE_KINDS)[number];

export const PLAN_NODE_STATUSES = [
  "PENDING",
  "READY",
  "IN_PROGRESS",
  "WAITING_RESULT",
  "WAITING_APPROVAL",
  "BLOCKED",
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
  "FAILED",
] as const;
export type PlanNodeStatus = (typeof PLAN_NODE_STATUSES)[number];

export interface PlanSource {
  readonly type: "upstream" | "controller" | "template";
  readonly ref: string;
}

export interface PlanNode {
  readonly nodeId: string;
  readonly title: string;
  readonly kind: PlanNodeKind;
  readonly status: PlanNodeStatus;
  readonly requiredRole: string;
  readonly dependsOn: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly workRefs: readonly string[];
  readonly resultRefs: readonly string[];
  readonly approvalRef: string | null;
  readonly summary: string;
}

export interface TaskPlan {
  readonly planVersion: number;
  readonly source: PlanSource;
  readonly status: PlanStatus;
  readonly currentNodeId: string | null;
  readonly nodes: readonly PlanNode[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ControllerClaim {
  readonly claimId: string;
  readonly claimToken: string;
  readonly roleId: string;
  readonly claimedByProfile: string;
  readonly claimedFromTaskVersion: number;
  readonly claimEpoch: number;
  readonly claimedAt: string;
  readonly expiresAt: string;
}

export interface TaskAggregate {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly title: string;
  readonly objective: string;
  readonly requirementRef: string | null;
  readonly goalRef: string | null;
  readonly requiredRole: string;
  readonly status: TaskStatus;
  readonly plan: TaskPlan | null;
  readonly controllerClaim: ControllerClaim | null;
  readonly latestEventId: string | null;
  readonly latestResultRefs: readonly string[];
  readonly approvalRefs: readonly string[];
  readonly conversationRef: string | null;
  readonly blockedReason: string | null;
  readonly pausedReason: string | null;
  readonly resumeStatus: TaskStatus | null;
  readonly terminalSummary: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const WORK_ITEM_STATUSES = [
  "PENDING",
  "CLAIMED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export interface LeaseClaim {
  readonly claimId: string;
  readonly claimToken: string;
  readonly claimedBy: string;
  readonly claimEpoch: number;
  readonly claimedAt: string;
  readonly expiresAt: string;
}

export const WORK_PROGRESS_STATUSES = ["NONE", "ACCEPTED", "PARTIAL"] as const;
export type WorkProgressStatus = (typeof WORK_PROGRESS_STATUSES)[number];

export interface WorkItem {
  readonly workItemId: string;
  readonly taskId: string;
  readonly planNodeId: string;
  readonly createdFromTaskVersion: number;
  readonly targetDomain: string;
  readonly requiredRole: string;
  readonly capabilityRef: string | null;
  readonly inputRef: string | null;
  readonly expectedResultType: string;
  readonly status: WorkItemStatus;
  readonly attempt: number;
  readonly claimEpoch: number;
  readonly claim: LeaseClaim | null;
  readonly resultRef: string | null;
  readonly resultSummary: string | null;
  readonly evidenceRefs: readonly string[];
  readonly errorCode: string | null;
  readonly errorSummary: string | null;
  readonly retryable: boolean | null;
  readonly progressStatus: WorkProgressStatus;
  readonly progressRef: string | null;
  readonly progressSummary: string | null;
  readonly progressEvidenceRefs: readonly string[];
  readonly createdAt: string;
  readonly claimedAt: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export const DISPATCH_STATUSES = [
  "PENDING",
  "CLAIMED",
  "DELIVERED",
  "CONSUMED",
  "FAILED",
  "CANCELLED",
] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const HOST_RESULT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "UNCERTAIN"] as const;
export type HostResultStatus = (typeof HOST_RESULT_STATUSES)[number];

export const HOST_COMMAND_TYPES = [
  "CONTINUE_SESSION",
  "OPEN_ROLE_SESSION",
  "SUBMIT_WAKE_MESSAGE",
  "OBSERVE_RESPONSE",
  "EXECUTE_APPROVED_UI_ACTION",
] as const;
export type HostCommandType = (typeof HOST_COMMAND_TYPES)[number];

export interface DispatchSignal {
  readonly signalId: string;
  readonly taskId: string;
  readonly createdFromTaskVersion: number;
  readonly signalType: "CONTROLLER_WAKE" | "ROLE_WORK_WAKE";
  readonly targetRole: string;
  readonly targetProfileRef: string | null;
  readonly conversationRef: string | null;
  readonly hostCommandType: HostCommandType;
  readonly hostCommandRef: string;
  readonly browserActionType: string | null;
  readonly payloadRef: string | null;
  readonly preconditions: JsonObject;
  readonly approvalRef: string | null;
  readonly expiresAt: string;
  readonly workItemId: string | null;
  readonly status: DispatchStatus;
  readonly claimEpoch: number;
  readonly claim: LeaseClaim | null;
  readonly attemptCount: number;
  readonly idempotencyKey: string;
  readonly createdAt: string;
  readonly deliveredAt: string | null;
  readonly deliveryReceipt: string | null;
  readonly deliveryId: string | null;
  readonly reportToken: string | null;
  readonly reportTokenExpiresAt: string | null;
  readonly reportTokenConsumedAt: string | null;
  readonly hostResultStatus: HostResultStatus;
  readonly hostResultRef: string | null;
  readonly hostResultSummary: string | null;
  readonly hostEvidenceRefs: readonly string[];
  readonly reportedAt: string | null;
  readonly lastError: string | null;
}

export const TASK_EVENT_TYPES = [
  "TASK_CREATED",
  "TASK_PLAN_CREATED",
  "TASK_PLAN_REVISED",
  "CONTROLLER_CLAIMED",
  "CONTROLLER_CLAIM_RELEASED",
  "WORK_ITEM_CLAIMED",
  "WORK_ITEM_STARTED",
  "WORK_ITEM_RETRIED",
  "WORK_ITEM_EXPIRED",
  "WORK_ITEM_CLAIM_RELEASED",
  "DISPATCH_CLAIMED",
  "DISPATCH_CLAIM_RELEASED",
  "ROLE_WORK_REQUESTED",
  "ROLE_WORK_ACCEPTED",
  "ROLE_WORK_PARTIAL",
  "ROLE_WORK_SUCCEEDED",
  "ROLE_WORK_FAILED",
  "WORK_ITEM_CANCELLED",
  "APPROVAL_REQUESTED",
  "APPROVAL_RESOLVED",
  "TASK_BLOCKED",
  "TASK_PAUSED",
  "TASK_RESUMED",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "TASK_CANCELLED",
  "HOST_DISPATCH_CREATED",
  "HOST_DISPATCH_DELIVERED",
  "HOST_DISPATCH_CONSUMED",
  "HOST_RESULT_REPORTED",
  "HOST_RESULT_FAILED",
  "HOST_RESULT_UNCERTAIN",
  "HOST_DISPATCH_FAILED",
  "HOST_DISPATCH_CANCELLED",
  "COMMAND_REJECTED",
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

export interface TaskEventStateSnapshot {
  readonly taskStatus: TaskStatus;
  readonly planVersion: number | null;
  readonly planStatus: PlanStatus | null;
  readonly currentNodeId: string | null;
}

export interface TaskAuditState extends TaskEventStateSnapshot {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly latestEventId: string;
}

export interface TaskEvent {
  readonly eventId: string;
  readonly taskId: string;
  readonly taskVersion: number;
  readonly eventType: TaskEventType;
  readonly stateAfter: TaskEventStateSnapshot;
  readonly producerRef: string;
  readonly payload: JsonObject;
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly createdAt: string;
}

export interface IdempotencyRecord {
  readonly scope: string;
  readonly key: string;
  readonly requestFingerprint: string;
  readonly result: JsonValue;
  readonly createdAt: string;
}

export interface TaskControlState {
  readonly tasks: Record<string, TaskAggregate>;
  readonly events: Record<string, readonly TaskEvent[]>;
  readonly workItems: Record<string, WorkItem>;
  readonly dispatchSignals: Record<string, DispatchSignal>;
  readonly idempotencyRecords: Record<string, IdempotencyRecord>;
}

export interface TaskIntakeResult {
  readonly taskId: string;
  readonly taskVersionAtCreation: number;
  readonly initialEventIds: readonly string[];
}

export interface CreateTaskInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly taskId: string;
  readonly title: string;
  readonly objective: string;
  readonly requiredRole: string;
  readonly requirementRef?: string;
  readonly goalRef?: string;
  readonly conversationRef?: string;
  readonly plan?: CreatePlanPayload;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export interface CreatePlanNodeInput {
  readonly nodeId: string;
  readonly title: string;
  readonly kind: PlanNodeKind;
  readonly status?: PlanNodeStatus;
  readonly requiredRole: string;
  readonly dependsOn?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  readonly summary?: string;
}

export interface CreatePlanPayload {
  readonly source: PlanSource;
  readonly status?: PlanStatus;
  readonly currentNodeId?: string;
  readonly nodes: readonly CreatePlanNodeInput[];
}

export type PlanOperation =
  | { readonly type: "ADD_NODE"; readonly node: CreatePlanNodeInput }
  | {
      readonly type: "INSERT_NODE_AFTER";
      readonly anchorNodeId: string;
      readonly node: CreatePlanNodeInput;
    }
  | {
      readonly type: "SET_NODE_STATUS";
      readonly nodeId: string;
      readonly status: PlanNodeStatus;
      readonly summary?: string;
    }
  | { readonly type: "SET_CURRENT_NODE"; readonly nodeId: string | null }
  | { readonly type: "SET_PLAN_STATUS"; readonly status: PlanStatus };

export type ControllerCommand =
  | { readonly type: "CREATE_PLAN"; readonly payload: CreatePlanPayload }
  | {
      readonly type: "REVISE_PLAN";
      readonly reasonSummary: string;
      readonly payload: { readonly operations: readonly PlanOperation[] };
    }
  | {
      readonly type: "ADVANCE_PLAN_NODE";
      readonly payload: {
        readonly nodeId: string;
        readonly nextNodeId?: string;
        readonly resultRefs?: readonly string[];
        readonly summary?: string;
      };
    }
  | {
      readonly type: "REQUEST_ROLE_WORK";
      readonly payload: {
        readonly nodeId: string;
        readonly targetDomain: string;
        readonly requiredRole: string;
        readonly capabilityRef?: string;
        readonly inputRef?: string;
        readonly expectedResultType: string;
        readonly targetRoleRef?: string;
        readonly targetProfileRef?: string;
        readonly conversationRef?: string;
        readonly hostActionType?: string;
        readonly preconditions?: JsonObject;
        readonly approvalRef?: string;
        readonly expiresAt?: string;
      };
    }
  | {
      readonly type: "REQUEST_APPROVAL";
      readonly payload: { readonly nodeId: string; readonly approvalRef: string };
    }
  | { readonly type: "BLOCK_TASK"; readonly payload: { readonly reason: string } }
  | { readonly type: "PAUSE_TASK"; readonly payload: { readonly reason: string } }
  | { readonly type: "RESUME_TASK"; readonly payload: { readonly reason?: string } }
  | {
      readonly type: "COMPLETE_TASK";
      readonly payload: { readonly summary: string };
    }
  | { readonly type: "FAIL_TASK"; readonly payload: { readonly reason: string } }
  | { readonly type: "RELEASE_CLAIM"; readonly payload: JsonObject };

export interface SubmitControllerCommandInput {
  readonly commandContractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly taskId: string;
  readonly claimToken: string;
  readonly expectedTaskVersion: number;
  readonly expectedPlanVersion?: number;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly command: ControllerCommand;
}


export interface ControllerCommandReceipt {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly eventIds: readonly string[];
  readonly workItemIds: readonly string[];
  readonly dispatchIds: readonly string[];
}

export interface ClaimControllerInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly taskId: string;
  readonly expectedTaskVersion: number;
  readonly roleId: string;
  readonly profileId: string;
  readonly leaseMs: number;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
}

export interface ClaimWorkItemInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly roleId: string;
  readonly claimantId: string;
  readonly leaseMs: number;
  readonly expectedTaskVersion?: number;
  readonly idempotencyKey: string;
}

export interface ClaimWorkItemApplicationInput extends ClaimWorkItemInput {
  readonly expectedTaskVersion: number;
}

export interface StartWorkItemInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly claimToken: string;
  readonly expectedTaskVersion: number;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export interface CompleteWorkItemInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly claimToken: string;
  readonly expectedTaskVersion: number;
  readonly resultRef: string;
  readonly summary?: string;
  readonly evidenceRefs?: readonly string[];
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export interface FailWorkItemInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly claimToken: string;
  readonly expectedTaskVersion: number;
  readonly errorCode: string;
  readonly errorSummary: string;
  readonly retryable: boolean;
  readonly evidenceRefs?: readonly string[];
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}


export interface ReportWorkProgressInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly claimToken: string;
  readonly expectedTaskVersion: number;
  readonly progress: "ACCEPTED" | "PARTIAL";
  readonly progressRef?: string;
  readonly summary?: string;
  readonly evidenceRefs?: readonly string[];
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export interface RetryWorkItemInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly expectedTaskVersion: number;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export interface ExpireWorkItemInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly workItemId: string;
  readonly expectedTaskVersion: number;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

/** @deprecated use CompleteWorkItemInput. */
export interface ReportWorkResultInput extends Omit<CompleteWorkItemInput, "expectedTaskVersion"> {
  readonly expectedTaskVersion?: number;
}

/** @deprecated use FailWorkItemInput. */
export interface ReportWorkFailureInput extends Omit<FailWorkItemInput, "expectedTaskVersion" | "retryable"> {
  readonly expectedTaskVersion?: number;
  readonly retryable?: boolean;
}

export interface ClaimDispatchInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly signalId: string;
  readonly hostId: string;
  readonly leaseMs: number;
  readonly idempotencyKey: string;
}

export interface ReportDispatchInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly signalId: string;
  readonly claimToken: string;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
  readonly deliveryId?: string;
  readonly errorSummary?: string;
}

export interface HostCommandMaterialization {
  readonly dispatchId: string;
  readonly commandId: string;
  readonly taskId: string;
  readonly createdFromTaskVersion: number;
  readonly workItemId: string | null;
  readonly targetRole: string;
  readonly targetProfileRef: string | null;
  readonly conversationRef: string | null;
  readonly commandType: HostCommandType;
  readonly actionType: string;
  readonly commandRef: string;
  readonly payloadRef: string | null;
  readonly preconditions: JsonObject;
  readonly approvalRef: string | null;
  readonly expiresAt: string;
  readonly idempotencyKey: string;
}

export interface ReportHostResultInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly signalId: string;
  readonly reportToken?: string;
  readonly claimToken?: string;
  readonly hostResultRef: string;
  readonly summary?: string;
  readonly evidenceRefs?: readonly string[];
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export interface FailHostResultInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly signalId: string;
  readonly reportToken?: string;
  readonly claimToken?: string;
  readonly errorCode: string;
  readonly errorSummary: string;
  readonly evidenceRefs?: readonly string[];
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}


export interface ReportUncertainHostResultInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly signalId: string;
  readonly reportToken?: string;
  readonly claimToken?: string;
  readonly stage: string;
  readonly commandFingerprint: string;
  readonly pageIdentityRef?: string;
  readonly evidenceRefs?: readonly string[];
  readonly summary: string;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
}

export const APPROVAL_RESOLUTIONS = ["APPROVED", "REJECTED", "CANCELLED"] as const;
export type ApprovalResolution = (typeof APPROVAL_RESOLUTIONS)[number];

export interface ResolveApprovalInput {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly taskId: string;
  readonly approvalRef: string;
  readonly resolution: ApprovalResolution;
  readonly expectedTaskVersion: number;
  readonly expectedPlanVersion: number;
  readonly idempotencyKey: string;
  readonly producerRef: string;
  readonly correlationId?: string;
  readonly resultRef?: string;
  readonly summary?: string;
}

export interface DecisionContext {
  readonly contractVersion: typeof TASK_CONTROL_CONTRACT_VERSION;
  readonly task: TaskAggregate;
  readonly requirement: {
    readonly ref: string | null;
    readonly summary: string;
    readonly acceptanceCriteria: readonly string[];
  };
  readonly recentEvents: readonly TaskEvent[];
  readonly latestResults: readonly string[];
  readonly constraints: readonly string[];
  readonly pendingApprovals: readonly string[];
  readonly availableContextRefs: readonly string[];
  readonly allowedControllerCommands: readonly ControllerCommand["type"][];
  readonly activeClaim: Omit<ControllerClaim, "claimToken"> | null;
  readonly nextEventCursor: string | null;
}

export const ATTENTION_TYPES = [
  "CONTROLLER_ACTION_REQUIRED",
  "ROLE_WORK_AVAILABLE",
  "APPROVAL_WAITING",
  "TASK_BLOCKED",
  "TASK_PAUSED",
  "TASK_TERMINAL",
] as const;
export type AttentionType = (typeof ATTENTION_TYPES)[number];

export interface RoleAttentionEntry {
  readonly entryId: string;
  readonly taskId: string;
  readonly sourceEventId: string | null;
  readonly requiredRole: string;
  readonly attentionType: AttentionType;
  readonly workItemId: string | null;
  readonly dispatchRef: string | null;
  readonly approvalRef: string | null;
  readonly status: "OPEN" | "RESOLVED";
  readonly createdAt: string;
}

export interface ReconcileResult {
  readonly taskId: string;
  readonly changed: boolean;
  readonly createdWorkItemIds: readonly string[];
  readonly createdDispatchIds: readonly string[];
  readonly expiredClaimIds: readonly string[];
  readonly cancelledWorkItemIds: readonly string[];
  readonly cancelledDispatchIds: readonly string[];
  readonly taskVersion: number;
}

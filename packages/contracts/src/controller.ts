import type { JsonObject } from "./json.js";
import type { ApprovalGrantV1, BrowserHostActionType } from "./phase2-integration.js";

export const CONTROLLER_CONTRACT_VERSION = "1.0.0" as const;
export const CONTROLLER_ROLE_ID = "controller" as const;

export const CONTROLLER_TASK_STATUSES = [
  "CREATED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type ControllerTaskStatus = (typeof CONTROLLER_TASK_STATUSES)[number];

export const CONTROLLER_PLAN_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ControllerPlanStatus = (typeof CONTROLLER_PLAN_STATUSES)[number];

export const CONTROLLER_PLAN_NODE_KINDS = [
  "DECISION",
  "WORK",
  "REVIEW",
  "WAIT",
  "APPROVAL",
  "FINALIZE",
] as const;
export type ControllerPlanNodeKind =
  (typeof CONTROLLER_PLAN_NODE_KINDS)[number];

export const CONTROLLER_PLAN_NODE_STATUSES = [
  "PENDING",
  "READY",
  "ACTIVE",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "SKIPPED",
] as const;
export type ControllerPlanNodeStatus =
  (typeof CONTROLLER_PLAN_NODE_STATUSES)[number];

export const CONTROLLER_COMMAND_TYPES = [
  "CREATE_PLAN",
  "REVISE_PLAN",
  "ADVANCE_PLAN_NODE",
  "REQUEST_ROLE_WORK",
  "REQUEST_APPROVAL",
  "BLOCK_TASK",
  "COMPLETE_TASK",
] as const;
export type ControllerCommandType =
  (typeof CONTROLLER_COMMAND_TYPES)[number];

export const CONTROLLER_PLAN_REVISION_OPERATIONS = [
  "INSERT_NODE_AFTER",
  "CANCEL_NODE",
  "SKIP_NODE",
] as const;
export type ControllerPlanRevisionOperationType =
  (typeof CONTROLLER_PLAN_REVISION_OPERATIONS)[number];

export const CONTROLLER_ERROR_CODES = [
  "CONTROLLER_INVALID_REQUEST",
  "CONTROLLER_TASK_NOT_FOUND",
  "CONTROLLER_ROLE_NOT_ALLOWED",
  "CONTROLLER_CONTEXT_REQUIRED",
  "CONTROLLER_TASK_ALREADY_CLAIMED",
  "CONTROLLER_CLAIM_INVALID",
  "CONTROLLER_CLAIM_EXPIRED",
  "CONTROLLER_TASK_VERSION_CONFLICT",
  "CONTROLLER_PLAN_VERSION_CONFLICT",
  "CONTROLLER_COMMAND_NOT_ALLOWED",
  "CONTROLLER_PLAN_INVALID",
  "CONTROLLER_NODE_NOT_FOUND",
  "CONTROLLER_IDEMPOTENCY_CONFLICT",
] as const;
export type ControllerErrorCode = (typeof CONTROLLER_ERROR_CODES)[number];

export interface ControllerPlanNodeDraft {
  readonly nodeId: string;
  readonly title: string;
  readonly kind: ControllerPlanNodeKind;
  readonly requiredRole: string;
  readonly dependsOn?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
}

export interface ControllerPlanNode extends ControllerPlanNodeDraft {
  readonly status: ControllerPlanNodeStatus;
  readonly workRefs: readonly string[];
  readonly resultRefs: readonly string[];
  readonly summary?: string;
}

export interface ControllerPlan {
  readonly planId: string;
  readonly planVersion: number;
  readonly source: {
    readonly type: "controller" | "upstream" | "fixture";
    readonly ref: string;
  };
  readonly status: ControllerPlanStatus;
  readonly currentNodeId: string | null;
  readonly nodes: readonly ControllerPlanNode[];
}

export interface ControllerClaimSummary {
  readonly claimId: string;
  readonly claimedByProfile: string;
  readonly roleId: string;
  readonly claimEpoch: number;
  readonly claimedFromTaskVersion: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface ControllerTaskSnapshot {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly projectId: string;
  readonly title: string;
  readonly objective: string;
  readonly requirementRef: string;
  readonly requiredRole: string;
  readonly lifecycleStatus: ControllerTaskStatus;
  readonly plan: ControllerPlan | null;
  readonly claim: ControllerClaimSummary | null;
  readonly resultRefs: readonly string[];
  readonly approvalRefs: readonly string[];
  readonly blockingReason?: string;
  readonly latestEventSequence: number;
}

export interface ControllerTaskEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly taskId: string;
  readonly sequence: number;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly actor: {
    readonly type: "controller" | "system" | "fixture";
    readonly id: string;
  };
  readonly causationId?: string;
  readonly correlationId?: string;
  readonly occurredAt: string;
  readonly data: JsonObject;
}

export interface TaskDecisionContext {
  readonly contractVersion: typeof CONTROLLER_CONTRACT_VERSION;
  readonly task: ControllerTaskSnapshot;
  readonly requirement: {
    readonly ref: string;
    readonly summary: string;
    readonly acceptanceCriteria: readonly string[];
  };
  readonly recentEvents: readonly ControllerTaskEvent[];
  readonly latestResults: readonly {
    readonly resultRef: string;
    readonly summary: string;
  }[];
  readonly constraints: readonly string[];
  readonly pendingApprovals: readonly string[];
  readonly availableContextRefs: readonly string[];
  readonly allowedControllerCommands: readonly ControllerCommandType[];
  readonly nextEventCursor: number;
}

export interface GetTaskDecisionContextRequest {
  readonly taskId: string;
  readonly eventCursor?: number;
}

export interface ClaimControllerTaskRequest {
  readonly taskId: string;
  readonly expectedTaskVersion: number;
  readonly idempotencyKey: string;
}

export interface ClaimControllerTaskResult {
  readonly contractVersion: typeof CONTROLLER_CONTRACT_VERSION;
  readonly taskId: string;
  readonly taskVersion: number;
  readonly claim: ControllerClaimSummary;
  readonly claimToken: string;
  readonly idempotentReplay: boolean;
}

export interface CreatePlanCommand {
  readonly type: "CREATE_PLAN";
  readonly reasonSummary: string;
  readonly payload: {
    readonly nodes: readonly ControllerPlanNodeDraft[];
  };
}

export type ControllerPlanRevisionOperation =
  | {
      readonly operation: "INSERT_NODE_AFTER";
      readonly afterNodeId: string;
      readonly node: ControllerPlanNodeDraft;
    }
  | {
      readonly operation: "CANCEL_NODE" | "SKIP_NODE";
      readonly nodeId: string;
      readonly reasonSummary: string;
    };

export interface RevisePlanCommand {
  readonly type: "REVISE_PLAN";
  readonly reasonSummary: string;
  readonly payload: {
    readonly operations: readonly ControllerPlanRevisionOperation[];
  };
}

export interface AdvancePlanNodeCommand {
  readonly type: "ADVANCE_PLAN_NODE";
  readonly reasonSummary: string;
  readonly payload: {
    readonly nodeId: string;
    readonly resultRefs?: readonly string[];
    readonly summary?: string;
  };
}

export interface RequestRoleWorkCommand {
  readonly type: "REQUEST_ROLE_WORK";
  readonly reasonSummary: string;
  readonly payload: {
    readonly nodeId: string;
    readonly targetDomain: string;
    readonly requiredRole: string;
    readonly objective: string;
    readonly capabilityRef?: string;
    readonly inputRef?: string;
    readonly expectedResultType: string;
    readonly expectedOutputContract?: string;
    readonly targetRoleRef?: string;
    readonly targetProfileRef?: string;
    readonly conversationRef?: string;
    readonly hostActionType?: BrowserHostActionType;
    readonly preconditions?: JsonObject;
    readonly approvalRef?: string;
    readonly expiresAt?: string;
  };
}

export interface RequestApprovalCommand {
  readonly type: "REQUEST_APPROVAL";
  readonly reasonSummary: string;
  readonly payload: {
    readonly nodeId: string;
    readonly summary: string;
    readonly approvalRef: string;
    readonly grant?: ApprovalGrantV1;
  };
}

export interface BlockTaskCommand {
  readonly type: "BLOCK_TASK";
  readonly reasonSummary: string;
  readonly payload: {
    readonly reason: string;
  };
}

export interface CompleteTaskCommand {
  readonly type: "COMPLETE_TASK";
  readonly reasonSummary: string;
  readonly payload: {
    readonly summary: string;
    readonly resultRefs?: readonly string[];
  };
}

export type ControllerCommand =
  | CreatePlanCommand
  | RevisePlanCommand
  | AdvancePlanNodeCommand
  | RequestRoleWorkCommand
  | RequestApprovalCommand
  | BlockTaskCommand
  | CompleteTaskCommand;

export interface SubmitControllerCommandRequest {
  readonly taskId: string;
  readonly claimToken: string;
  readonly expectedTaskVersion: number;
  readonly expectedPlanVersion: number | null;
  readonly idempotencyKey: string;
  readonly command: ControllerCommand;
}

export interface ControllerCommandResult {
  readonly contractVersion: typeof CONTROLLER_CONTRACT_VERSION;
  readonly commandId: string;
  readonly task: ControllerTaskSnapshot;
  readonly event: ControllerTaskEvent;
  readonly createdRefs: readonly string[];
  readonly idempotentReplay: boolean;
}

export interface ReleaseControllerTaskRequest {
  readonly taskId: string;
  readonly claimToken: string;
  readonly idempotencyKey: string;
}

export interface ReleaseControllerTaskResult {
  readonly contractVersion: typeof CONTROLLER_CONTRACT_VERSION;
  readonly taskId: string;
  readonly taskVersion: number;
  readonly released: boolean;
  readonly event: ControllerTaskEvent;
  readonly idempotentReplay: boolean;
}

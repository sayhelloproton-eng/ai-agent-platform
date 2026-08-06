import type {
  ControllerCommand,
  CreateTaskInput,
  DecisionContext,
  DispatchSignal,
  WorkItem,
} from "./model.js";

/**
 * Stable TSK projection version for Phase 2 Integration Contract v1.
 * Platform-owned wire contracts live in packages/contracts; this module only
 * projects TSK-owned state into those frozen boundaries.
 */
export const TASK_CONTROL_INTEGRATION_CONTRACT_VERSION = "1.0.0" as const;
/** @deprecated Use TASK_CONTROL_INTEGRATION_CONTRACT_VERSION. */
export const TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION =
  TASK_CONTROL_INTEGRATION_CONTRACT_VERSION;



export interface StableCommandReceiptProposal {
  readonly proposalVersion: typeof TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION;
  readonly operation: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly firstCommittedTaskVersion: number | null;
  readonly firstCommittedPlanVersion: number | null;
  readonly eventIds: readonly string[];
  readonly entityRefs: readonly string[];
  readonly createdAt: string;
}

export interface CurrentProjectionProposal {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly taskStatus: string;
  readonly currentNodeId: string | null;
  readonly latestEventCursor: string | null;
}

export interface TaskIntakeProposal {
  readonly proposalVersion: typeof TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION;
  readonly task: CreateTaskInput;
}

export interface ControllerInputProposal {
  readonly proposalVersion: typeof TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION;
  readonly taskId: string;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly requiredRole: string;
  readonly taskStatus: string;
  readonly currentNodeId: string | null;
  readonly allowedCommands: readonly ControllerCommand["type"][];
  readonly latestEventCursor: string | null;
  readonly context: DecisionContext;
}

export interface ControllerClaimProposal {
  readonly taskId: string;
  readonly expectedTaskVersion: number;
  readonly requiredRole: string;
  readonly profileId: string;
  readonly leaseMs: number;
  readonly idempotencyKey: string;
}

export interface ControllerDecisionProposal {
  readonly taskId: string;
  readonly expectedTaskVersion: number;
  readonly expectedPlanVersion: number | null;
  readonly claimToken: string;
  readonly idempotencyKey: string;
  readonly command: ControllerCommand;
}

export interface LocalWorkRequestProposal {
  readonly proposalVersion: typeof TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION;
  readonly workItemId: string;
  readonly taskId: string;
  readonly planNodeId: string;
  readonly createdFromTaskVersion: number;
  readonly capabilityRef: string | null;
  readonly inputRef: string | null;
  readonly expectedResultType: string;
  readonly requiredRole: string;
  readonly attempt: number;
}

export interface LocalWorkCompletionProposal {
  readonly workItemId: string;
  readonly expectedTaskVersion: number;
  readonly claimToken: string;
  readonly outcome: "success" | "failure";
  readonly resultRef: string | null;
  readonly resultSummary: string | null;
  readonly evidenceRefs: readonly string[];
  readonly errorCode: string | null;
  readonly errorSummary: string | null;
  readonly retryable: boolean;
  readonly idempotencyKey: string;
}


export interface LocalWorkProgressProposal {
  readonly workItemId: string;
  readonly expectedTaskVersion: number;
  readonly claimToken: string;
  readonly progress: "accepted" | "partial";
  readonly progressRef: string | null;
  readonly progressSummary: string | null;
  readonly evidenceRefs: readonly string[];
  readonly idempotencyKey: string;
}

export interface BrowserDispatchProposal {
  readonly proposalVersion: typeof TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION;
  readonly dispatchId: string;
  readonly taskId: string;
  readonly workItemId: string | null;
  readonly createdFromTaskVersion: number;
  readonly target: {
    readonly roleRef: string;
    readonly profileRef: string | null;
    readonly conversationRef: string | null;
  };
  readonly intent: {
    readonly signalType: DispatchSignal["signalType"];
    readonly hostCommandType: DispatchSignal["hostCommandType"];
    readonly hostCommandRef: string;
  };
  readonly idempotencyKey: string;
}

export interface BrowserDeliveryAckProposal {
  readonly dispatchId: string;
  readonly claimToken: string;
  readonly delivered: boolean;
  readonly deliverySummary: string | null;
  readonly errorSummary: string | null;
  readonly idempotencyKey: string;
}

export interface BrowserHostResultProposal {
  readonly dispatchId: string;
  readonly claimToken: string;
  readonly outcome: "succeeded" | "failed";
  readonly hostResultRef: string | null;
  readonly summary: string | null;
  readonly evidenceRefs: readonly string[];
  readonly errorCode: string | null;
  readonly errorSummary: string | null;
  readonly idempotencyKey: string;
}


export interface BrowserUncertainSideEffectProposal {
  readonly dispatchId: string;
  readonly claimToken: string;
  readonly commandFingerprint: string;
  readonly executionStage: string;
  readonly pageIdentityRef: string;
  readonly evidenceRefs: readonly string[];
  readonly summary: string;
  readonly idempotencyKey: string;
  readonly autoRetryAllowed: false;
}

export interface CancellationEventProposal {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly cancelledEntityType: "work_item" | "dispatch";
  readonly cancelledEntityId: string;
  readonly reason: string;
  readonly triggerCommandRef: string | null;
  readonly triggerEventId: string | null;
  readonly occurredAt: string;
}

export function toControllerInputProposal(
  context: DecisionContext,
): ControllerInputProposal {
  return {
    proposalVersion: TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION,
    taskId: context.task.taskId,
    taskVersion: context.task.taskVersion,
    planVersion: context.task.plan?.planVersion ?? null,
    requiredRole: context.task.requiredRole,
    taskStatus: context.task.status,
    currentNodeId: context.task.plan?.currentNodeId ?? null,
    allowedCommands: context.allowedControllerCommands,
    latestEventCursor: context.nextEventCursor,
    context,
  };
}

export function toLocalWorkRequestProposal(
  item: WorkItem,
): LocalWorkRequestProposal {
  return {
    proposalVersion: TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION,
    workItemId: item.workItemId,
    taskId: item.taskId,
    planNodeId: item.planNodeId,
    createdFromTaskVersion: item.createdFromTaskVersion,
    capabilityRef: item.capabilityRef,
    inputRef: item.inputRef,
    expectedResultType: item.expectedResultType,
    requiredRole: item.requiredRole,
    attempt: item.attempt,
  };
}

export function toBrowserDispatchProposal(
  signal: DispatchSignal,
): BrowserDispatchProposal {
  return {
    proposalVersion: TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION,
    dispatchId: signal.signalId,
    taskId: signal.taskId,
    workItemId: signal.workItemId,
    createdFromTaskVersion: signal.createdFromTaskVersion,
    target: {
      roleRef: signal.targetRole,
      profileRef: signal.targetProfileRef,
      conversationRef: signal.conversationRef,
    },
    intent: {
      signalType: signal.signalType,
      hostCommandType: signal.hostCommandType,
      hostCommandRef: signal.hostCommandRef,
    },
    idempotencyKey: signal.idempotencyKey,
  };
}

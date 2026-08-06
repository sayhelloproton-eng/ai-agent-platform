import type {
  ControllerCommand,
  CreateTaskInput,
  DecisionContext,
  DispatchSignal,
  WorkItem,
} from "./model.js";

/**
 * Candidate-only integration boundary. These shapes are owned by TSK as a
 * proposal and MUST NOT be treated as frozen platform contracts until the
 * cross-domain audit accepts a version in packages/contracts.
 */
export const TASK_CONTROL_INTEGRATION_PROPOSAL_VERSION =
  "2026-08-06-round2-candidate" as const;


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

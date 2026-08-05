import type {
  ControllerClaim,
  DecisionContext,
  JsonObject,
  PlanNode,
  TaskEvent,
} from "./model.js";

export interface DecisionContextPlanNodeContractV1 {
  readonly node_id: string;
  readonly title: string;
  readonly kind: string;
  readonly status: string;
  readonly required_role: string;
  readonly depends_on: readonly string[];
  readonly acceptance_criteria: readonly string[];
  readonly work_refs: readonly string[];
  readonly result_refs: readonly string[];
  readonly approval_ref: string | null;
  readonly summary: string;
}

export interface DecisionContextEventContractV1 {
  readonly event_id: string;
  readonly task_id: string;
  readonly task_version: number;
  readonly event_type: string;
  readonly state_after: {
    readonly task_status: string;
    readonly plan_version: number | null;
    readonly plan_status: string | null;
    readonly current_node_id: string | null;
  };
  readonly producer_ref: string;
  readonly payload: JsonObject;
  readonly correlation_id: string | null;
  readonly causation_id: string | null;
  readonly created_at: string;
}

export interface DecisionContextClaimContractV1 {
  readonly claim_id: string;
  readonly role_id: string;
  readonly claimed_by_profile: string;
  readonly claimed_from_task_version: number;
  readonly claim_epoch: number;
  readonly claimed_at: string;
  readonly expires_at: string;
}

export interface DecisionContextContractV1 {
  readonly contract_version: "1.0.0";
  readonly task: {
    readonly task_id: string;
    readonly task_version: number;
    readonly required_role: string;
    readonly status: string;
    readonly title: string;
    readonly objective: string;
    readonly requirement_ref: string | null;
    readonly goal_ref: string | null;
    readonly conversation_ref: string | null;
    readonly plan: {
      readonly plan_version: number;
      readonly source: { readonly type: string; readonly ref: string };
      readonly status: string;
      readonly current_node_id: string | null;
      readonly nodes: readonly DecisionContextPlanNodeContractV1[];
      readonly created_at: string;
      readonly updated_at: string;
    } | null;
  };
  readonly requirement: {
    readonly ref: string | null;
    readonly summary: string;
    readonly acceptance_criteria: readonly string[];
  };
  readonly recent_events: readonly DecisionContextEventContractV1[];
  readonly latest_results: readonly string[];
  readonly constraints: readonly string[];
  readonly pending_approvals: readonly string[];
  readonly available_context_refs: readonly string[];
  readonly allowed_controller_commands: readonly string[];
  readonly active_claim: DecisionContextClaimContractV1 | null;
  readonly next_event_cursor: string | null;
}

function mapNode(node: PlanNode): DecisionContextPlanNodeContractV1 {
  return {
    node_id: node.nodeId,
    title: node.title,
    kind: node.kind,
    status: node.status,
    required_role: node.requiredRole,
    depends_on: node.dependsOn,
    acceptance_criteria: node.acceptanceCriteria,
    work_refs: node.workRefs,
    result_refs: node.resultRefs,
    approval_ref: node.approvalRef,
    summary: node.summary,
  };
}

function mapEvent(item: TaskEvent): DecisionContextEventContractV1 {
  return {
    event_id: item.eventId,
    task_id: item.taskId,
    task_version: item.taskVersion,
    event_type: item.eventType,
    state_after: {
      task_status: item.stateAfter.taskStatus,
      plan_version: item.stateAfter.planVersion,
      plan_status: item.stateAfter.planStatus,
      current_node_id: item.stateAfter.currentNodeId,
    },
    producer_ref: item.producerRef,
    payload: item.payload,
    correlation_id: item.correlationId,
    causation_id: item.causationId,
    created_at: item.createdAt,
  };
}

function mapClaim(claim: Omit<ControllerClaim, "claimToken"> | null): DecisionContextClaimContractV1 | null {
  if (claim === null) return null;
  return {
    claim_id: claim.claimId,
    role_id: claim.roleId,
    claimed_by_profile: claim.claimedByProfile,
    claimed_from_task_version: claim.claimedFromTaskVersion,
    claim_epoch: claim.claimEpoch,
    claimed_at: claim.claimedAt,
    expires_at: claim.expiresAt,
  };
}

/**
 * Public adapter for the Controller Decision Context contract frozen by
 * SOL-CTL-001 / SOL-TSK-001. Domain internals remain camelCase; this mapper
 * prevents internal refactors from silently changing the cross-domain schema.
 */
export function toDecisionContextContractV1(
  context: DecisionContext,
): DecisionContextContractV1 {
  const { task } = context;
  return {
    contract_version: context.contractVersion,
    task: {
      task_id: task.taskId,
      task_version: task.taskVersion,
      required_role: task.requiredRole,
      status: task.status,
      title: task.title,
      objective: task.objective,
      requirement_ref: task.requirementRef,
      goal_ref: task.goalRef,
      conversation_ref: task.conversationRef,
      plan:
        task.plan === null
          ? null
          : {
              plan_version: task.plan.planVersion,
              source: task.plan.source,
              status: task.plan.status,
              current_node_id: task.plan.currentNodeId,
              nodes: task.plan.nodes.map(mapNode),
              created_at: task.plan.createdAt,
              updated_at: task.plan.updatedAt,
            },
    },
    requirement: {
      ref: context.requirement.ref,
      summary: context.requirement.summary,
      acceptance_criteria: context.requirement.acceptanceCriteria,
    },
    recent_events: context.recentEvents.map(mapEvent),
    latest_results: context.latestResults,
    constraints: context.constraints,
    pending_approvals: context.pendingApprovals,
    available_context_refs: context.availableContextRefs,
    allowed_controller_commands: context.allowedControllerCommands,
    active_claim: mapClaim(context.activeClaim),
    next_event_cursor: context.nextEventCursor,
  };
}

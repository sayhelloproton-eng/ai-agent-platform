import {
  CONTROLLER_CONTRACT_VERSION,
  CONTROLLER_ROLE_ID,
  type ClaimControllerTaskRequest,
  type ClaimControllerTaskResult,
  type ControllerClaimSummary,
  type ControllerCommand as PublicControllerCommand,
  type ControllerCommandResult,
  type ControllerCommandType,
  type ControllerPlan,
  type ControllerPlanNode,
  type ControllerPlanNodeDraft,
  type ControllerTaskEvent,
  type ControllerTaskSnapshot,
  type GetTaskDecisionContextRequest,
  type JsonObject as ContractJsonObject,
  type ReleaseControllerTaskRequest,
  type ReleaseControllerTaskResult,
  type SubmitControllerCommandRequest,
  type TaskDecisionContext,
} from "@ai-agent-platform/contracts";
import {
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  type ClaimControllerInput,
  type ControllerCommand as TaskControlControllerCommand,
  type DecisionContext as TaskControlDecisionContext,
  type PlanNode as TaskControlPlanNode,
  type PlanNodeKind as TaskControlPlanNodeKind,
  type PlanNodeStatus as TaskControlPlanNodeStatus,
  type PlanOperation as TaskControlPlanOperation,
  type SubmitControllerCommandInput,
  type TaskAggregate,
  type TaskEvent,
  type TaskPlan,
} from "@ai-agent-platform/task-control";
import { createHash } from "node:crypto";

import { ControllerTaskControlError } from "./controller-task-control-error.js";
import type { ControllerIdempotencySnapshotStore } from "./controller-idempotency-store.js";
import type {
  ControllerIdentity,
  ControllerTaskControl,
} from "./controller-task-control-port.js";

const TERMINAL_NODE_STATUSES = new Set<TaskControlPlanNodeStatus>([
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
  "FAILED",
]);

const FORMAL_ADAPTER_COMMANDS = new Set<ControllerCommandType>([
  "CREATE_PLAN",
  "REVISE_PLAN",
  "ADVANCE_PLAN_NODE",
  "REQUEST_ROLE_WORK",
  "REQUEST_APPROVAL",
  "BLOCK_TASK",
  "COMPLETE_TASK",
]);

interface TaskControlCommandResult {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly eventIds: readonly string[];
  readonly workItemIds: readonly string[];
  readonly dispatchIds: readonly string[];
}

interface TaskControlClaimResult {
  readonly claim: {
    readonly claimId: string;
    readonly claimToken: string;
    readonly roleId: string;
    readonly claimedByProfile: string;
    readonly claimedFromTaskVersion: number;
    readonly claimEpoch: number;
    readonly claimedAt: string;
    readonly expiresAt: string;
  };
  readonly taskVersion: number;
  readonly planVersion: number | null;
}

export interface ControllerCommandReceiptLookup {
  readonly taskId: string;
  readonly producerRef: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
}

/**
 * Immutable Task Control receipt projection consumed by CTL.
 *
 * The receipt is owned and persisted by the Task Control application adapter.
 * CTL may cache the projected public response, but that cache is never the
 * authority for whether the command committed.
 */
export interface ControllerCommandReceipt {
  readonly requestFingerprint: string;
  readonly commandResult: TaskControlCommandResult;
  readonly taskSnapshot: TaskAggregate;
  readonly event: TaskEvent;
  readonly eventSequence: number;
  readonly eventCount: number;
}

/** Narrow formal Task Control application interface consumed by the CTL adapter. */
export interface ControllerTaskControlService {
  getDecisionContext(
    taskId: string,
    afterEventId?: string,
  ): Promise<TaskControlDecisionContext>;
  getTask(taskId: string): Promise<TaskAggregate>;
  listEvents(taskId: string): Promise<readonly TaskEvent[]>;
  claimController(input: ClaimControllerInput): Promise<TaskControlClaimResult>;
  submitControllerCommand(
    input: SubmitControllerCommandInput,
  ): Promise<TaskControlCommandResult>;
  submitControllerCommandWithReceipt?(
    input: SubmitControllerCommandInput,
    lookup: ControllerCommandReceiptLookup,
  ): Promise<ControllerCommandReceipt>;
  readControllerCommandReceipt?(
    lookup: ControllerCommandReceiptLookup,
  ): Promise<ControllerCommandReceipt | null>;
  releaseControllerClaim(
    taskId: string,
    claimToken: string,
    producerRef: string,
    idempotencyKey: string,
  ): Promise<TaskAggregate>;
}

export interface ApprovalGrantRegistrar {
  putApprovalGrant(grant: import("@ai-agent-platform/contracts").ApprovalGrantV1): Promise<void>;
}

export interface PayloadReferenceReader {
  getPayload(payloadRef: string): Promise<import("@ai-agent-platform/contracts").JsonValue | null>;
}

export interface TaskControlControllerAdapterOptions {
  readonly projectId?: string;
  readonly claimTtlMs?: number;
  readonly idempotencyStore: ControllerIdempotencySnapshotStore;
  readonly approvalGrantRegistrar?: ApprovalGrantRegistrar;
  readonly payloadReferenceReader?: PayloadReferenceReader;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]),
  );
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)), "utf8")
    .digest("hex");
}

function deterministicId(prefix: string, ...parts: readonly string[]): string {
  return `${prefix}-${createHash("sha256")
    .update(parts.join("\u0000"), "utf8")
    .digest("hex")
    .slice(0, 24)}`;
}

function mapTaskStatus(
  status: TaskAggregate["status"],
): ControllerTaskSnapshot["lifecycleStatus"] {
  switch (status) {
    case "CREATED":
      return "CREATED";
    case "PAUSED":
      return "PAUSED";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "ACTIVE";
  }
}

function mapPlanStatus(status: TaskPlan["status"]): ControllerPlan["status"] {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELLED") return "CANCELLED";
  return "ACTIVE";
}

function mapNodeKind(kind: TaskControlPlanNodeKind): ControllerPlanNode["kind"] {
  switch (kind) {
    case "ACTION":
      return "WORK";
    case "SUMMARY":
      return "FINALIZE";
    default:
      return kind;
  }
}

function mapNodeStatus(
  status: TaskControlPlanNodeStatus,
): ControllerPlanNode["status"] {
  switch (status) {
    case "IN_PROGRESS":
      return "ACTIVE";
    case "WAITING_RESULT":
    case "WAITING_APPROVAL":
    case "BLOCKED":
      return "WAITING";
    default:
      return status;
  }
}

function mapPlanNode(node: TaskControlPlanNode): ControllerPlanNode {
  return {
    nodeId: node.nodeId,
    title: node.title,
    kind: mapNodeKind(node.kind),
    requiredRole: node.requiredRole,
    dependsOn: [...node.dependsOn],
    acceptanceCriteria: [...node.acceptanceCriteria],
    status: mapNodeStatus(node.status),
    workRefs: [...node.workRefs],
    resultRefs: [...node.resultRefs],
    ...(node.summary.length > 0 ? { summary: node.summary } : {}),
  };
}

function mapClaim(
  claim: TaskAggregate["controllerClaim"],
): ControllerClaimSummary | null {
  if (claim === null) return null;
  return {
    claimId: claim.claimId,
    claimedByProfile: claim.claimedByProfile,
    roleId: claim.roleId,
    claimEpoch: claim.claimEpoch,
    claimedFromTaskVersion: claim.claimedFromTaskVersion,
    issuedAt: claim.claimedAt,
    expiresAt: claim.expiresAt,
  };
}

function mapPlan(taskId: string, plan: TaskPlan | null): ControllerPlan | null {
  if (plan === null) return null;
  return {
    // TSK v1 has no independent Plan ID. This stable compatibility identifier
    // is an adapter projection, not a second Task/Plan store.
    planId: `${taskId}:plan`,
    planVersion: plan.planVersion,
    source: {
      type: plan.source.type === "template" ? "upstream" : plan.source.type,
      ref: plan.source.ref,
    },
    status: mapPlanStatus(plan.status),
    currentNodeId: plan.currentNodeId,
    nodes: plan.nodes.map(mapPlanNode),
  };
}

function mapTaskSnapshot(
  task: TaskAggregate,
  projectId: string,
  eventCount: number,
): ControllerTaskSnapshot {
  const requirementRef =
    task.requirementRef ?? task.goalRef ?? `task:${task.taskId}:objective`;
  const blockingReason = task.blockedReason ?? task.pausedReason;
  return {
    taskId: task.taskId,
    taskVersion: task.taskVersion,
    projectId,
    title: task.title,
    objective: task.objective,
    requirementRef,
    requiredRole: task.requiredRole,
    lifecycleStatus: mapTaskStatus(task.status),
    plan: mapPlan(task.taskId, task.plan),
    claim: mapClaim(task.controllerClaim),
    resultRefs: [...task.latestResultRefs],
    approvalRefs: [...task.approvalRefs],
    ...(blockingReason === null ? {} : { blockingReason }),
    latestEventSequence: eventCount,
  };
}

function mapEvent(
  event: TaskEvent,
  sequence: number,
): ControllerTaskEvent {
  const actorType = event.producerRef.includes("controller")
    ? "controller"
    : "system";
  return {
    eventId: event.eventId,
    eventType: event.eventType.toLowerCase().replaceAll("_", "."),
    taskId: event.taskId,
    sequence,
    taskVersion: event.taskVersion,
    planVersion: event.stateAfter.planVersion,
    actor: { type: actorType, id: event.producerRef },
    ...(event.causationId === null ? {} : { causationId: event.causationId }),
    ...(event.correlationId === null
      ? {}
      : { correlationId: event.correlationId }),
    occurredAt: event.createdAt,
    data: event.payload as ContractJsonObject,
  };
}

function toTaskControlKind(
  kind: ControllerPlanNodeDraft["kind"],
): TaskControlPlanNodeKind {
  switch (kind) {
    case "WORK":
      return "ACTION";
    case "FINALIZE":
      return "SUMMARY";
    case "WAIT":
      throw new ControllerTaskControlError(
        "CONTROLLER_COMMAND_NOT_ALLOWED",
        "WAIT Plan Nodes are unavailable until a single public waiting-state contract is frozen.",
        409,
      );
    default:
      return kind;
  }
}

function toTaskControlNode(
  node: ControllerPlanNodeDraft,
  status: TaskControlPlanNodeStatus,
  fallbackDependsOn: readonly string[] = [],
) {
  return {
    nodeId: node.nodeId,
    title: node.title,
    kind: toTaskControlKind(node.kind),
    status,
    requiredRole: node.requiredRole,
    dependsOn: [...(node.dependsOn ?? fallbackDependsOn)],
    acceptanceCriteria: [...(node.acceptanceCriteria ?? [])],
  };
}

function mapTaskControlError(error: TaskControlError): ControllerTaskControlError {
  const code: string = error.code;
  switch (code) {
    case "TASK_NOT_FOUND":
      return new ControllerTaskControlError(
        "CONTROLLER_TASK_NOT_FOUND",
        error.message,
        404,
      );
    case "TASK_VERSION_CONFLICT":
      return new ControllerTaskControlError(
        "CONTROLLER_TASK_VERSION_CONFLICT",
        error.message,
        409,
      );
    case "PLAN_VERSION_CONFLICT":
      return new ControllerTaskControlError(
        "CONTROLLER_PLAN_VERSION_CONFLICT",
        error.message,
        409,
      );
    case "ROLE_NOT_ALLOWED":
      return new ControllerTaskControlError(
        "CONTROLLER_ROLE_NOT_ALLOWED",
        error.message,
        403,
      );
    case "CONTROLLER_ALREADY_CLAIMED":
      return new ControllerTaskControlError(
        "CONTROLLER_TASK_ALREADY_CLAIMED",
        error.message,
        409,
      );
    case "CLAIM_EXPIRED":
      return new ControllerTaskControlError(
        "CONTROLLER_CLAIM_EXPIRED",
        error.message,
        409,
      );
    case "CLAIM_TOKEN_INVALID":
      return new ControllerTaskControlError(
        "CONTROLLER_CLAIM_INVALID",
        error.message,
        403,
      );
    case "PLAN_NODE_NOT_FOUND":
      return new ControllerTaskControlError(
        "CONTROLLER_NODE_NOT_FOUND",
        error.message,
        404,
      );
    case "INVALID_PLAN":
      return new ControllerTaskControlError(
        "CONTROLLER_PLAN_INVALID",
        error.message,
        422,
      );
    case "COMMAND_NOT_ALLOWED":
      return new ControllerTaskControlError(
        "CONTROLLER_COMMAND_NOT_ALLOWED",
        error.message,
        409,
      );
    case "IDEMPOTENCY_KEY_CONFLICT":
      return new ControllerTaskControlError(
        "CONTROLLER_IDEMPOTENCY_CONFLICT",
        error.message,
        409,
      );
    default:
      return new ControllerTaskControlError(
        "CONTROLLER_INVALID_REQUEST",
        error.message,
        code === "INTERNAL_CONSISTENCY_ERROR" ? 500 : 400,
      );
  }
}

function idempotencyScope(
  identity: ControllerIdentity,
  taskId: string,
  operation: string,
  key: string,
): string {
  return `${identity.profileId}:${taskId}:${operation}:${key}`;
}

function observationKey(identity: ControllerIdentity, taskId: string): string {
  return `${identity.profileId}:${taskId}`;
}

function currentPlanNodeIsExecutable(task: TaskAggregate): boolean {
  const plan = task.plan;
  if (plan === null || plan.currentNodeId === null) return false;
  const node = plan.nodes.find((item) => item.nodeId === plan.currentNodeId);
  if (node === undefined || !["READY", "IN_PROGRESS"].includes(node.status)) return false;
  return node.dependsOn.every((dependencyId) => {
    const dependency = plan.nodes.find((item) => item.nodeId === dependencyId);
    return dependency?.status === "COMPLETED" || dependency?.status === "SKIPPED";
  });
}

export function createTaskControlControllerAdapter(
  service: ControllerTaskControlService,
  options: TaskControlControllerAdapterOptions,
): ControllerTaskControl {
  const projectId = options.projectId ?? "ai-agent-platform";
  const claimTtlMs = options.claimTtlMs ?? 5 * 60_000;
  const observations = new Map<string, number>();
  const idempotencyStore = options.idempotencyStore;

  function assertProject(identity: ControllerIdentity): void {
    if (!identity.projectIds.includes(projectId)) {
      throw new ControllerTaskControlError(
        "CONTROLLER_ROLE_NOT_ALLOWED",
        "Controller profile is not authorized for this project.",
        403,
      );
    }
  }

  function assertController(identity: ControllerIdentity): void {
    assertProject(identity);
    if (identity.roleId !== CONTROLLER_ROLE_ID) {
      throw new ControllerTaskControlError(
        "CONTROLLER_ROLE_NOT_ALLOWED",
        "Only the controller role may claim or mutate Controller tasks.",
        403,
      );
    }
  }

  async function replay<T extends { readonly idempotentReplay: boolean }>(
    scope: string,
    inputFingerprint: string,
  ): Promise<T | null> {
    const existing = await idempotencyStore.get<T>(scope);
    if (existing === null) return null;
    if (existing.fingerprint !== inputFingerprint) {
      throw new ControllerTaskControlError(
        "CONTROLLER_IDEMPOTENCY_CONFLICT",
        "The idempotency key was already used with a different request.",
        409,
      );
    }
    return { ...clone(existing.result), idempotentReplay: true };
  }

  async function remember<T extends { readonly idempotentReplay: boolean }>(
    scope: string,
    inputFingerprint: string,
    result: T,
  ): Promise<T> {
    const existing = await idempotencyStore.putIfAbsent(scope, {
      fingerprint: inputFingerprint,
      result: clone(result),
      createdAt: new Date().toISOString(),
    });
    if (existing === null) return result;
    if (existing.fingerprint !== inputFingerprint) {
      throw new ControllerTaskControlError(
        "CONTROLLER_IDEMPOTENCY_CONFLICT",
        "The idempotency key was already used with a different request.",
        409,
      );
    }
    return { ...clone(existing.result), idempotentReplay: true };
  }

  async function taskControlCall<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof ControllerTaskControlError) throw error;
      if (error instanceof TaskControlError) throw mapTaskControlError(error);
      throw error;
    }
  }

  async function readFormalState(taskId: string): Promise<{
    readonly context: TaskControlDecisionContext;
    readonly events: readonly TaskEvent[];
  }> {
    const [context, events] = await Promise.all([
      service.getDecisionContext(taskId),
      service.listEvents(taskId),
    ]);
    return { context, events };
  }

  async function getDecisionContext(
    request: GetTaskDecisionContextRequest,
    identity: ControllerIdentity,
  ): Promise<TaskDecisionContext> {
    assertProject(identity);
    return taskControlCall(async () => {
      const { context, events } = await readFormalState(request.taskId);
      observations.set(
        observationKey(identity, request.taskId),
        context.task.taskVersion,
      );
      const cursor = Math.min(request.eventCursor ?? 0, events.length);
      const currentNodeExecutable = currentPlanNodeIsExecutable(context.task);
      const commands =
        identity.roleId === context.task.requiredRole
          ? context.allowedControllerCommands.filter(
              (command): command is ControllerCommandType => {
                if (!FORMAL_ADAPTER_COMMANDS.has(command as ControllerCommandType)) return false;
                if (
                  (command === "REQUEST_ROLE_WORK" || command === "REQUEST_APPROVAL") &&
                  !currentNodeExecutable
                ) return false;
                return true;
              },
            )
          : [];
      const requirementRef =
        context.requirement.ref ??
        context.task.goalRef ??
        `task:${context.task.taskId}:objective`;
      return {
        contractVersion: CONTROLLER_CONTRACT_VERSION,
        task: mapTaskSnapshot(context.task, projectId, events.length),
        requirement: {
          ref: requirementRef,
          summary: context.requirement.summary,
          acceptanceCriteria: [...context.requirement.acceptanceCriteria],
        },
        recentEvents: events
          .slice(cursor)
          .map((event, index) => mapEvent(event, cursor + index + 1)),
        latestResults: context.latestResults.map((resultRef) => ({
          resultRef,
          summary: `Formal Task Control result reference: ${resultRef}`,
        })),
        constraints: [...new Set([
          ...context.constraints,
          "REQUEST_ROLE_WORK uses targetDomain, capabilityRef/inputRef, expectedResultType, and reference-only result semantics from Phase 2 Integration Contract v1.",
          "REQUEST_APPROVAL uses a stable approvalRef; Approval Grant bodies remain outside Task Store and are single-use when consumed by Browser Host.",
          "WAIT Plan Nodes are unavailable until the public waiting-state contract is frozen.",
          "INSERT_NODE_AFTER is supported through REVISE_PLAN and delegates dependency rewiring to formal Task Control.",
          "PAUSE, RESUME, and FAIL exist in Task Control but are not exposed by Controller Command v1; they require a public contract decision.",
        ])],
        pendingApprovals: [...context.pendingApprovals],
        availableContextRefs: [...context.availableContextRefs],
        allowedControllerCommands: commands,
        nextEventCursor: events.length,
      };
    });
  }

  async function claimTask(
    request: ClaimControllerTaskRequest,
    identity: ControllerIdentity,
  ): Promise<ClaimControllerTaskResult> {
    assertController(identity);
    const scope = idempotencyScope(
      identity,
      request.taskId,
      "claim",
      request.idempotencyKey,
    );
    const inputFingerprint = fingerprint({ request, identity });
    const duplicate = await replay<ClaimControllerTaskResult>(scope, inputFingerprint);
    if (duplicate !== null) return duplicate;

    const observedVersion = observations.get(
      observationKey(identity, request.taskId),
    );
    if (observedVersion === undefined || observedVersion !== request.expectedTaskVersion) {
      throw new ControllerTaskControlError(
        "CONTROLLER_CONTEXT_REQUIRED",
        "Read the latest Decision Context before claiming this Task version.",
        409,
      );
    }

    const claimed = await taskControlCall(() =>
      service.claimController({
        contractVersion: TASK_CONTROL_CONTRACT_VERSION,
        taskId: request.taskId,
        expectedTaskVersion: request.expectedTaskVersion,
        roleId: identity.roleId,
        profileId: identity.profileId,
        leaseMs: claimTtlMs,
        idempotencyKey: request.idempotencyKey,
      }),
    );
    const result: ClaimControllerTaskResult = {
      contractVersion: CONTROLLER_CONTRACT_VERSION,
      taskId: request.taskId,
      taskVersion: claimed.taskVersion,
      claim: {
        claimId: claimed.claim.claimId,
        claimedByProfile: claimed.claim.claimedByProfile,
        roleId: claimed.claim.roleId,
        claimEpoch: claimed.claim.claimEpoch,
        claimedFromTaskVersion: claimed.claim.claimedFromTaskVersion,
        issuedAt: claimed.claim.claimedAt,
        expiresAt: claimed.claim.expiresAt,
      },
      claimToken: claimed.claim.claimToken,
      idempotentReplay: false,
    };
    return remember(scope, inputFingerprint, result);
  }

  function inferNextNode(plan: TaskPlan, nodeId: string): string | undefined {
    if (plan.currentNodeId !== nodeId) {
      throw new ControllerTaskControlError(
        "CONTROLLER_COMMAND_NOT_ALLOWED",
        "Only the current Plan Node may be advanced by the Controller adapter.",
        409,
      );
    }
    const terminalAfterAdvance = new Set(
      plan.nodes
        .filter((node) => TERMINAL_NODE_STATUSES.has(node.status))
        .map((node) => node.nodeId),
    );
    terminalAfterAdvance.add(nodeId);
    const remaining = plan.nodes.filter(
      (node) => node.nodeId !== nodeId && !TERMINAL_NODE_STATUSES.has(node.status),
    );
    if (remaining.length === 0) return undefined;
    const next = remaining.find((node) =>
      node.dependsOn.every((dependency) => terminalAfterAdvance.has(dependency)),
    );
    if (next === undefined) {
      throw new ControllerTaskControlError(
        "CONTROLLER_PLAN_INVALID",
        "The Plan has unfinished Nodes but no dependency-satisfied next Node.",
        422,
      );
    }
    return next.nodeId;
  }

  async function mapCommand(
    request: SubmitControllerCommandRequest,
    identity: ControllerIdentity,
  ): Promise<TaskControlControllerCommand> {
    const command: PublicControllerCommand = request.command;
    switch (command.type) {
      case "CREATE_PLAN": {
        const currentNode =
          command.payload.nodes.find(
            (node) => (node.dependsOn ?? []).length === 0,
          ) ?? command.payload.nodes[0];
        if (currentNode === undefined) {
          throw new ControllerTaskControlError(
            "CONTROLLER_PLAN_INVALID",
            "CREATE_PLAN requires at least one Plan Node.",
            422,
          );
        }
        return {
          type: "CREATE_PLAN",
          payload: {
            source: { type: "controller", ref: identity.profileId },
            currentNodeId: currentNode.nodeId,
            nodes: command.payload.nodes.map((node) =>
              toTaskControlNode(
                node,
                node.nodeId === currentNode.nodeId ? "READY" : "PENDING",
              ),
            ),
          },
        };
      }
      case "REVISE_PLAN": {
        const task = await service.getTask(request.taskId);
        const plan = task.plan;
        if (plan === null) {
          throw new ControllerTaskControlError(
            "CONTROLLER_PLAN_INVALID",
            "Task has no Plan to revise.",
            422,
          );
        }
        const operations: TaskControlPlanOperation[] = [];
        for (const operation of command.payload.operations) {
          if (operation.operation === "INSERT_NODE_AFTER") {
            if (!plan.nodes.some((node) => node.nodeId === operation.afterNodeId)) {
              throw new ControllerTaskControlError(
                "CONTROLLER_NODE_NOT_FOUND",
                "The Plan revision anchor Node was not found.",
                404,
              );
            }
            operations.push({
              type: "INSERT_NODE_AFTER",
              anchorNodeId: operation.afterNodeId,
              node: toTaskControlNode(operation.node, "PENDING"),
            });
          } else {
            operations.push({
              type: "SET_NODE_STATUS",
              nodeId: operation.nodeId,
              status:
                operation.operation === "CANCEL_NODE"
                  ? "CANCELLED"
                  : "SKIPPED",
              summary: operation.reasonSummary,
            });
          }
        }
        return {
          type: "REVISE_PLAN",
          reasonSummary: command.reasonSummary,
          payload: { operations },
        };
      }
      case "ADVANCE_PLAN_NODE": {
        const task = await service.getTask(request.taskId);
        if (task.plan === null) {
          throw new ControllerTaskControlError(
            "CONTROLLER_PLAN_INVALID",
            "Task has no Plan to advance.",
            422,
          );
        }
        const nextNodeId = inferNextNode(task.plan, command.payload.nodeId);
        return {
          type: "ADVANCE_PLAN_NODE",
          payload: {
            nodeId: command.payload.nodeId,
            ...(nextNodeId === undefined ? {} : { nextNodeId }),
            ...(command.payload.resultRefs === undefined
              ? {}
              : { resultRefs: [...command.payload.resultRefs] }),
            ...(command.payload.summary === undefined
              ? {}
              : { summary: command.payload.summary }),
          },
        };
      }
      case "BLOCK_TASK":
        return {
          type: "BLOCK_TASK",
          payload: { reason: command.payload.reason },
        };
      case "COMPLETE_TASK": {
        const task = await service.getTask(request.taskId);
        const knownResults = new Set([
          ...task.latestResultRefs,
          ...(task.plan?.nodes.flatMap((node) => node.resultRefs) ?? []),
        ]);
        const unknownResult = command.payload.resultRefs?.find(
          (resultRef) => !knownResults.has(resultRef),
        );
        if (unknownResult !== undefined) {
          throw new ControllerTaskControlError(
            "CONTROLLER_PLAN_INVALID",
            "COMPLETE_TASK cannot attach a new Result Ref that is absent from formal Task Control facts.",
            422,
          );
        }
        return {
          type: "COMPLETE_TASK",
          payload: { summary: command.payload.summary },
        };
      }
      case "REQUEST_ROLE_WORK":
        return {
          type: "REQUEST_ROLE_WORK",
          payload: {
            nodeId: command.payload.nodeId,
            targetDomain: command.payload.targetDomain,
            requiredRole: command.payload.requiredRole,
            ...(command.payload.capabilityRef === undefined
              ? {}
              : { capabilityRef: command.payload.capabilityRef }),
            ...(command.payload.inputRef === undefined
              ? {}
              : { inputRef: command.payload.inputRef }),
            expectedResultType: command.payload.expectedResultType,
            ...(command.payload.targetRoleRef === undefined
              ? {}
              : { targetRoleRef: command.payload.targetRoleRef }),
            ...(command.payload.targetProfileRef === undefined
              ? {}
              : { targetProfileRef: command.payload.targetProfileRef }),
            ...(command.payload.conversationRef === undefined
              ? {}
              : { conversationRef: command.payload.conversationRef }),
            ...(command.payload.hostActionType === undefined
              ? {}
              : { hostActionType: command.payload.hostActionType }),
            ...(command.payload.preconditions === undefined
              ? {}
              : { preconditions: command.payload.preconditions }),
            ...(command.payload.approvalRef === undefined
              ? {}
              : { approvalRef: command.payload.approvalRef }),
            ...(command.payload.expiresAt === undefined
              ? {}
              : { expiresAt: command.payload.expiresAt }),
          },
        };
      case "REQUEST_APPROVAL":
        return {
          type: "REQUEST_APPROVAL",
          payload: {
            nodeId: command.payload.nodeId,
            approvalRef: command.payload.approvalRef,
          },
        };
      default:
        throw new ControllerTaskControlError(
          "CONTROLLER_COMMAND_NOT_ALLOWED",
          `Controller command ${(command as { type?: unknown }).type ?? "UNKNOWN"} is not available through the frozen public Controller Contract.`,
          409,
        );
    }
  }

  function projectCommandReceipt(
    receipt: ControllerCommandReceipt,
    identity: ControllerIdentity,
    request: SubmitControllerCommandRequest,
    idempotentReplay: boolean,
  ): ControllerCommandResult {
    return {
      contractVersion: CONTROLLER_CONTRACT_VERSION,
      commandId: deterministicId(
        "controller-command",
        identity.profileId,
        request.taskId,
        request.idempotencyKey,
      ),
      task: mapTaskSnapshot(
        receipt.taskSnapshot,
        projectId,
        receipt.eventCount,
      ),
      event: mapEvent(receipt.event, receipt.eventSequence),
      createdRefs: [
        ...receipt.commandResult.workItemIds,
        ...receipt.commandResult.dispatchIds,
      ],
      idempotentReplay,
    };
  }

  async function readPersistedCommandReceipt(
    lookup: ControllerCommandReceiptLookup,
    identity: ControllerIdentity,
    request: SubmitControllerCommandRequest,
  ): Promise<ControllerCommandResult | null> {
    if (service.readControllerCommandReceipt === undefined) return null;
    const receipt = await taskControlCall(() =>
      service.readControllerCommandReceipt!(lookup),
    );
    if (receipt === null) return null;
    if (receipt.requestFingerprint !== lookup.requestFingerprint) {
      throw new ControllerTaskControlError(
        "CONTROLLER_IDEMPOTENCY_CONFLICT",
        "The Task Control receipt belongs to a different request fingerprint.",
        409,
      );
    }
    return projectCommandReceipt(receipt, identity, request, true);
  }

  async function fallbackCommandReceipt(
    input: SubmitControllerCommandInput,
    requestFingerprint: string,
  ): Promise<ControllerCommandReceipt> {
    const commandResult = await service.submitControllerCommand(input);
    const [taskSnapshot, events] = await Promise.all([
      service.getTask(input.taskId),
      service.listEvents(input.taskId),
    ]);
    const resultEventIds = new Set(commandResult.eventIds);
    const event = [...events]
      .reverse()
      .find((candidate) => resultEventIds.has(candidate.eventId));
    if (event === undefined) {
      throw new ControllerTaskControlError(
        "CONTROLLER_INVALID_REQUEST",
        "Formal Task Control did not return an auditable command Event.",
        500,
      );
    }
    return {
      requestFingerprint,
      commandResult,
      taskSnapshot,
      event,
      eventSequence:
        events.findIndex((candidate) => candidate.eventId === event.eventId) + 1,
      eventCount: events.length,
    };
  }

  async function submitCommand(
    request: SubmitControllerCommandRequest,
    identity: ControllerIdentity,
  ): Promise<ControllerCommandResult> {
    assertController(identity);
    const scope = idempotencyScope(
      identity,
      request.taskId,
      "command",
      request.idempotencyKey,
    );
    const inputFingerprint = fingerprint({ request, identity });
    const duplicate = await replay<ControllerCommandResult>(scope, inputFingerprint);
    if (duplicate !== null) return duplicate;

    const receiptLookup: ControllerCommandReceiptLookup = {
      taskId: request.taskId,
      producerRef: identity.profileId,
      idempotencyKey: request.idempotencyKey,
      requestFingerprint: inputFingerprint,
    };
    const recovered = await readPersistedCommandReceipt(
      receiptLookup,
      identity,
      request,
    );
    if (recovered !== null) {
      if (request.command.type === "REQUEST_APPROVAL" && request.command.payload.grant !== undefined) {
        await options.approvalGrantRegistrar?.putApprovalGrant(request.command.payload.grant);
      }
      return remember(scope, inputFingerprint, recovered);
    }

    if (request.command.type === "REQUEST_ROLE_WORK") {
      const inputRef = request.command.payload.inputRef;
      if (inputRef !== undefined && options.payloadReferenceReader !== undefined) {
        const payload = await options.payloadReferenceReader.getPayload(inputRef);
        if (payload === null) {
          throw new ControllerTaskControlError(
            "CONTROLLER_INVALID_REQUEST",
            `REQUEST_ROLE_WORK inputRef ${inputRef} was not found in the Payload Registry. Treat payload/input refs as opaque exact-copy values from Task Intake; do not rewrite or reformat them.`,
            422,
          );
        }
      }
    }

    const mappedCommand = await taskControlCall(() => mapCommand(request, identity));
    const input: SubmitControllerCommandInput = {
      commandContractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: request.taskId,
      claimToken: request.claimToken,
      expectedTaskVersion: request.expectedTaskVersion,
      ...(request.expectedPlanVersion === null
        ? {}
        : { expectedPlanVersion: request.expectedPlanVersion }),
      idempotencyKey: request.idempotencyKey,
      producerRef: identity.profileId,
      command: mappedCommand,
    };
    const receipt = await taskControlCall(() =>
      service.submitControllerCommandWithReceipt === undefined
        ? fallbackCommandReceipt(input, inputFingerprint)
        : service.submitControllerCommandWithReceipt(input, receiptLookup),
    );
    if (receipt.requestFingerprint !== inputFingerprint) {
      throw new ControllerTaskControlError(
        "CONTROLLER_IDEMPOTENCY_CONFLICT",
        "Formal Task Control returned a receipt for a different request fingerprint.",
        409,
      );
    }
    const response = projectCommandReceipt(receipt, identity, request, false);
    if (request.command.type === "REQUEST_APPROVAL" && request.command.payload.grant !== undefined) {
      await options.approvalGrantRegistrar?.putApprovalGrant(request.command.payload.grant);
    }
    return remember(scope, inputFingerprint, response);
  }

  async function releaseTask(
    request: ReleaseControllerTaskRequest,
    identity: ControllerIdentity,
  ): Promise<ReleaseControllerTaskResult> {
    assertController(identity);
    const scope = idempotencyScope(
      identity,
      request.taskId,
      "release",
      request.idempotencyKey,
    );
    const inputFingerprint = fingerprint({ request, identity });
    const duplicate = await replay<ReleaseControllerTaskResult>(scope, inputFingerprint);
    if (duplicate !== null) return duplicate;

    const task = await taskControlCall(() =>
      service.releaseControllerClaim(
        request.taskId,
        request.claimToken,
        identity.profileId,
        request.idempotencyKey,
      ),
    );
    const events = await service.listEvents(request.taskId);
    const selectedEvent = [...events]
      .reverse()
      .find((event) => event.eventType === "CONTROLLER_CLAIM_RELEASED");
    if (selectedEvent === undefined) {
      throw new ControllerTaskControlError(
        "CONTROLLER_INVALID_REQUEST",
        "Formal Task Control did not return a Claim release Event.",
        500,
      );
    }
    const sequence = events.findIndex(
      (event) => event.eventId === selectedEvent.eventId,
    ) + 1;
    const response: ReleaseControllerTaskResult = {
      contractVersion: CONTROLLER_CONTRACT_VERSION,
      taskId: task.taskId,
      taskVersion: task.taskVersion,
      released: task.controllerClaim === null,
      event: mapEvent(selectedEvent, sequence),
      idempotentReplay: false,
    };
    return remember(scope, inputFingerprint, response);
  }

  return {
    getDecisionContext,
    claimTask,
    submitCommand,
    releaseTask,
  };
}

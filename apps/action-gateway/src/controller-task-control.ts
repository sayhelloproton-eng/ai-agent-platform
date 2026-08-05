import {
  CONTROLLER_CONTRACT_VERSION,
  CONTROLLER_ROLE_ID,
  type ClaimControllerTaskRequest,
  type ClaimControllerTaskResult,
  type ControllerClaimSummary,
  type ControllerCommandResult,
  type ControllerCommandType,
  type ControllerErrorCode,
  type ControllerPlan,
  type ControllerPlanNode,
  type ControllerPlanNodeDraft,
  type ControllerTaskEvent,
  type ControllerTaskSnapshot,
  type GetTaskDecisionContextRequest,
  type ReleaseControllerTaskRequest,
  type ReleaseControllerTaskResult,
  type SubmitControllerCommandRequest,
  type TaskDecisionContext,
} from "@ai-agent-platform/contracts";
import { createHash, randomBytes, randomUUID } from "node:crypto";

export interface ControllerIdentity {
  readonly profileId: string;
  readonly roleId: string;
  readonly projectIds: readonly string[];
}

export interface ControllerTaskControl {
  getDecisionContext(
    request: GetTaskDecisionContextRequest,
    identity: ControllerIdentity,
  ): TaskDecisionContext;
  claimTask(
    request: ClaimControllerTaskRequest,
    identity: ControllerIdentity,
  ): ClaimControllerTaskResult;
  submitCommand(
    request: SubmitControllerCommandRequest,
    identity: ControllerIdentity,
  ): ControllerCommandResult;
  releaseTask(
    request: ReleaseControllerTaskRequest,
    identity: ControllerIdentity,
  ): ReleaseControllerTaskResult;
}

export class ControllerTaskControlError extends Error {
  readonly code: ControllerErrorCode;
  readonly httpStatus: number;

  constructor(code: ControllerErrorCode, message: string, httpStatus: number) {
    super(message);
    this.name = "ControllerTaskControlError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

interface InternalPlanNode {
  nodeId: string;
  title: string;
  kind: ControllerPlanNode["kind"];
  requiredRole: string;
  dependsOn: string[];
  acceptanceCriteria: string[];
  status: ControllerPlanNode["status"];
  workRefs: string[];
  resultRefs: string[];
  summary?: string;
}

interface InternalPlan {
  planId: string;
  planVersion: number;
  source: ControllerPlan["source"];
  status: ControllerPlan["status"];
  currentNodeId: string | null;
  nodes: InternalPlanNode[];
}

interface InternalClaim extends ControllerClaimSummary {
  tokenHash: string;
}

interface InternalTask {
  taskId: string;
  taskVersion: number;
  projectId: string;
  title: string;
  objective: string;
  requirementRef: string;
  requirementSummary: string;
  acceptanceCriteria: string[];
  requiredRole: string;
  lifecycleStatus: ControllerTaskSnapshot["lifecycleStatus"];
  plan: InternalPlan | null;
  claim: InternalClaim | null;
  resultRefs: string[];
  approvalRefs: string[];
  blockingReason?: string;
  latestEventSequence: number;
  claimEpoch: number;
  events: ControllerTaskEvent[];
}

interface StoredIdempotency<T> {
  readonly fingerprint: string;
  readonly result: T;
}

export interface InMemoryControllerTaskControlOptions {
  readonly now?: () => Date;
  readonly claimTtlMs?: number;
  readonly tasks?: readonly ControllerTaskFixture[];
}

export interface ControllerTaskFixture {
  readonly taskId: string;
  readonly projectId: string;
  readonly title: string;
  readonly objective: string;
  readonly requirementRef: string;
  readonly requirementSummary: string;
  readonly acceptanceCriteria?: readonly string[];
  readonly requiredRole?: string;
  readonly plan?: ControllerPlan | null;
}

const DEFAULT_CLAIM_TTL_MS = 5 * 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function identityKey(identity: ControllerIdentity, taskId: string): string {
  return `${identity.profileId}:${taskId}`;
}

function idempotencyKey(
  identity: ControllerIdentity,
  taskId: string,
  operation: string,
  key: string,
): string {
  return `${identity.profileId}:${taskId}:${operation}:${key}`;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function toSnapshot(task: InternalTask): ControllerTaskSnapshot {
  const claim = task.claim;
  return {
    taskId: task.taskId,
    taskVersion: task.taskVersion,
    projectId: task.projectId,
    title: task.title,
    objective: task.objective,
    requirementRef: task.requirementRef,
    requiredRole: task.requiredRole,
    lifecycleStatus: task.lifecycleStatus,
    plan: task.plan === null ? null : clone(task.plan),
    claim:
      claim === null
        ? null
        : {
            claimId: claim.claimId,
            claimedByProfile: claim.claimedByProfile,
            roleId: claim.roleId,
            claimEpoch: claim.claimEpoch,
            claimedFromTaskVersion: claim.claimedFromTaskVersion,
            issuedAt: claim.issuedAt,
            expiresAt: claim.expiresAt,
          },
    resultRefs: [...task.resultRefs],
    approvalRefs: [...task.approvalRefs],
    ...(task.blockingReason === undefined
      ? {}
      : { blockingReason: task.blockingReason }),
    latestEventSequence: task.latestEventSequence,
  };
}

function fromPlan(plan: ControllerPlan): InternalPlan {
  return {
    planId: plan.planId,
    planVersion: plan.planVersion,
    source: clone(plan.source),
    status: plan.status,
    currentNodeId: plan.currentNodeId,
    nodes: plan.nodes.map((node) => ({
      nodeId: node.nodeId,
      title: node.title,
      kind: node.kind,
      requiredRole: node.requiredRole,
      dependsOn: [...(node.dependsOn ?? [])],
      acceptanceCriteria: [...(node.acceptanceCriteria ?? [])],
      status: node.status,
      workRefs: [...node.workRefs],
      resultRefs: [...node.resultRefs],
      ...(node.summary === undefined ? {} : { summary: node.summary }),
    })),
  };
}

function makeInitialTask(
  fixture: ControllerTaskFixture,
  now: Date,
): InternalTask {
  const task: InternalTask = {
    taskId: fixture.taskId,
    taskVersion: 1,
    projectId: fixture.projectId,
    title: fixture.title,
    objective: fixture.objective,
    requirementRef: fixture.requirementRef,
    requirementSummary: fixture.requirementSummary,
    acceptanceCriteria: [...(fixture.acceptanceCriteria ?? [])],
    requiredRole: fixture.requiredRole ?? CONTROLLER_ROLE_ID,
    lifecycleStatus: fixture.plan === undefined || fixture.plan === null
      ? "CREATED"
      : "ACTIVE",
    plan:
      fixture.plan === undefined || fixture.plan === null
        ? null
        : fromPlan(fixture.plan),
    claim: null,
    resultRefs: [],
    approvalRefs: [],
    latestEventSequence: 0,
    claimEpoch: 0,
    events: [],
  };
  appendEvent(task, {
    eventType: "task.created",
    actor: { type: "fixture", id: "controller-mvp-fixture" },
    occurredAt: now.toISOString(),
    data: { requirementRef: fixture.requirementRef },
  });
  return task;
}

function appendEvent(
  task: InternalTask,
  input: {
    readonly eventType: string;
    readonly actor: ControllerTaskEvent["actor"];
    readonly occurredAt: string;
    readonly data: ControllerTaskEvent["data"];
    readonly causationId?: string;
    readonly correlationId?: string;
  },
): ControllerTaskEvent {
  const sequence = task.latestEventSequence + 1;
  task.latestEventSequence = sequence;
  const event: ControllerTaskEvent = {
    eventId: `event-${task.taskId}-${sequence}`,
    eventType: input.eventType,
    taskId: task.taskId,
    sequence,
    taskVersion: task.taskVersion,
    planVersion: task.plan?.planVersion ?? null,
    actor: input.actor,
    ...(input.causationId === undefined
      ? {}
      : { causationId: input.causationId }),
    ...(input.correlationId === undefined
      ? {}
      : { correlationId: input.correlationId }),
    occurredAt: input.occurredAt,
    data: input.data,
  };
  task.events.push(event);
  return event;
}

function activeClaim(task: InternalTask, now: Date): InternalClaim | null {
  const claim = task.claim;
  if (claim === null) return null;
  return Date.parse(claim.expiresAt) > now.getTime() ? claim : null;
}

function normalizeNodeDraft(
  draft: ControllerPlanNodeDraft,
  previousNodeId: string | null,
  ready: boolean,
): InternalPlanNode {
  const dependsOn =
    draft.dependsOn === undefined
      ? previousNodeId === null
        ? []
        : [previousNodeId]
      : [...draft.dependsOn];
  return {
    nodeId: draft.nodeId,
    title: draft.title,
    kind: draft.kind,
    requiredRole: draft.requiredRole,
    dependsOn,
    acceptanceCriteria: [...(draft.acceptanceCriteria ?? [])],
    status: ready ? "READY" : "PENDING",
    workRefs: [],
    resultRefs: [],
  };
}

function assertPlanDraft(nodes: readonly ControllerPlanNodeDraft[]): void {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.nodeId)) {
      throw new ControllerTaskControlError(
        "CONTROLLER_PLAN_INVALID",
        "Plan node identifiers must be unique.",
        409,
      );
    }
    ids.add(node.nodeId);
  }
  for (const node of nodes) {
    for (const dependency of node.dependsOn ?? []) {
      if (dependency === node.nodeId || !ids.has(dependency)) {
        throw new ControllerTaskControlError(
          "CONTROLLER_PLAN_INVALID",
          "Plan node dependencies must reference another node in the plan.",
          409,
        );
      }
    }
  }
}

function nextActionableNode(plan: InternalPlan): InternalPlanNode | null {
  return (
    plan.nodes.find(
      (node) =>
        !["COMPLETED", "CANCELLED", "SKIPPED"].includes(node.status) &&
        node.dependsOn.every((dependencyId) => {
          const dependency = plan.nodes.find(
            (candidate) => candidate.nodeId === dependencyId,
          );
          return dependency !== undefined &&
            ["COMPLETED", "SKIPPED"].includes(dependency.status);
        }),
    ) ?? null
  );
}

function allowedCommands(
  task: InternalTask,
  identity: ControllerIdentity,
): readonly ControllerCommandType[] {
  if (
    identity.roleId !== task.requiredRole ||
    !identity.projectIds.includes(task.projectId) ||
    ["COMPLETED", "FAILED", "CANCELLED"].includes(task.lifecycleStatus)
  ) {
    return [];
  }
  if (task.plan === null) {
    return ["CREATE_PLAN", "BLOCK_TASK"];
  }
  return [
    "REVISE_PLAN",
    "ADVANCE_PLAN_NODE",
    "REQUEST_ROLE_WORK",
    "REQUEST_APPROVAL",
    "BLOCK_TASK",
    "COMPLETE_TASK",
  ];
}

function ensureTaskAccess(task: InternalTask, identity: ControllerIdentity): void {
  if (!identity.projectIds.includes(task.projectId)) {
    throw new ControllerTaskControlError(
      "CONTROLLER_ROLE_NOT_ALLOWED",
      "Controller profile is not allowed for this project.",
      403,
    );
  }
}

function ensureControllerRole(task: InternalTask, identity: ControllerIdentity): void {
  ensureTaskAccess(task, identity);
  if (
    identity.roleId !== CONTROLLER_ROLE_ID ||
    identity.roleId !== task.requiredRole
  ) {
    throw new ControllerTaskControlError(
      "CONTROLLER_ROLE_NOT_ALLOWED",
      "Controller role is not allowed to claim this task.",
      403,
    );
  }
}

function assertExpectedVersions(
  task: InternalTask,
  taskVersion: number,
  planVersion: number | null,
): void {
  if (task.taskVersion !== taskVersion) {
    throw new ControllerTaskControlError(
      "CONTROLLER_TASK_VERSION_CONFLICT",
      "Task version has changed. Query the latest decision context.",
      409,
    );
  }
  const currentPlanVersion = task.plan?.planVersion ?? null;
  if (currentPlanVersion !== planVersion) {
    throw new ControllerTaskControlError(
      "CONTROLLER_PLAN_VERSION_CONFLICT",
      "Plan version has changed. Query the latest decision context.",
      409,
    );
  }
}

function findNode(plan: InternalPlan, nodeId: string): InternalPlanNode {
  const node = plan.nodes.find((candidate) => candidate.nodeId === nodeId);
  if (node === undefined) {
    throw new ControllerTaskControlError(
      "CONTROLLER_NODE_NOT_FOUND",
      "Plan node was not found.",
      404,
    );
  }
  return node;
}

export function createDefaultControllerTaskFixtures(): readonly ControllerTaskFixture[] {
  return [
    {
      taskId: "task-ctl-001",
      projectId: "ai-agent-platform",
      title: "验证总控动态上下文与计划推进闭环",
      objective:
        "由总控读取正式上下文、领取任务、创建计划并推进至明确状态。",
      requirementRef: "requirement-ctl-mvp-001",
      requirementSummary:
        "只验证 Controller Profile、Decision Context、Claim、Controller Command 与 Task/Plan/Event 一致推进。",
      acceptanceCriteria: [
        "总控必须先读取上下文再领取任务",
        "Task、Plan 和 Event 在同一命令语义中更新",
        "同角色 Profile 可以在 Claim 过期后接管",
      ],
      plan: null,
    },
  ];
}

export function createInMemoryControllerTaskControl(
  options: InMemoryControllerTaskControlOptions = {},
): ControllerTaskControl {
  const now = options.now ?? (() => new Date());
  const claimTtlMs = options.claimTtlMs ?? DEFAULT_CLAIM_TTL_MS;
  const tasks = new Map<string, InternalTask>();
  const contextReads = new Map<string, number>();
  const idempotency = new Map<string, StoredIdempotency<unknown>>();

  for (const fixture of options.tasks ?? createDefaultControllerTaskFixtures()) {
    tasks.set(fixture.taskId, makeInitialTask(fixture, now()));
  }

  function requireTask(taskId: string): InternalTask {
    const task = tasks.get(taskId);
    if (task === undefined) {
      throw new ControllerTaskControlError(
        "CONTROLLER_TASK_NOT_FOUND",
        "Task was not found.",
        404,
      );
    }
    return task;
  }

  function expireClaimIfRequired(task: InternalTask): void {
    if (task.claim !== null && activeClaim(task, now()) === null) {
      task.claim = null;
      task.taskVersion += 1;
      appendEvent(task, {
        eventType: "task.controller_claim.expired",
        actor: { type: "system", id: "controller-task-control-fixture" },
        occurredAt: now().toISOString(),
        data: {},
      });
    }
  }

  function replay<T>(
    key: string,
    requestFingerprint: string,
  ): T | undefined {
    const stored = idempotency.get(key);
    if (stored === undefined) return undefined;
    if (stored.fingerprint !== requestFingerprint) {
      throw new ControllerTaskControlError(
        "CONTROLLER_IDEMPOTENCY_CONFLICT",
        "Idempotency key was already used with different input.",
        409,
      );
    }
    return clone(stored.result as T);
  }

  function remember<T>(
    key: string,
    requestFingerprint: string,
    result: T,
  ): T {
    idempotency.set(key, {
      fingerprint: requestFingerprint,
      result: clone(result),
    });
    return result;
  }

  function verifyClaim(
    task: InternalTask,
    claimToken: string,
    identity: ControllerIdentity,
  ): InternalClaim {
    const claim = task.claim;
    if (claim === null) {
      throw new ControllerTaskControlError(
        "CONTROLLER_CLAIM_INVALID",
        "Task does not have an active Controller claim.",
        409,
      );
    }
    if (activeClaim(task, now()) === null) {
      expireClaimIfRequired(task);
      throw new ControllerTaskControlError(
        "CONTROLLER_CLAIM_EXPIRED",
        "Controller claim has expired.",
        409,
      );
    }
    if (
      claim.claimedByProfile !== identity.profileId ||
      claim.roleId !== identity.roleId ||
      claim.tokenHash !== hashToken(claimToken)
    ) {
      throw new ControllerTaskControlError(
        "CONTROLLER_CLAIM_INVALID",
        "Controller claim is invalid for this profile.",
        403,
      );
    }
    return claim;
  }

  return {
    getDecisionContext(request, identity) {
      const task = requireTask(request.taskId);
      expireClaimIfRequired(task);
      ensureTaskAccess(task, identity);
      contextReads.set(identityKey(identity, task.taskId), task.taskVersion);
      const cursor = request.eventCursor ?? 0;
      const constraints = [
        "Controller must submit business commands instead of field patches.",
        "Local Control, Browser Host and Approval remain external domain ports.",
      ];
      if (task.blockingReason !== undefined) {
        constraints.push(`Current blocking reason: ${task.blockingReason}`);
      }
      return {
        contractVersion: CONTROLLER_CONTRACT_VERSION,
        task: toSnapshot(task),
        requirement: {
          ref: task.requirementRef,
          summary: task.requirementSummary,
          acceptanceCriteria: [...task.acceptanceCriteria],
        },
        recentEvents: task.events
          .filter((event) => event.sequence > cursor)
          .map((event) => clone(event)),
        latestResults: task.resultRefs.map((resultRef) => ({
          resultRef,
          summary: "Result is available through its owning domain reference.",
        })),
        constraints,
        pendingApprovals: [...task.approvalRefs],
        availableContextRefs: [task.requirementRef],
        allowedControllerCommands: allowedCommands(task, identity),
        nextEventCursor: task.latestEventSequence,
      };
    },

    claimTask(request, identity) {
      const task = requireTask(request.taskId);
      const key = idempotencyKey(
        identity,
        request.taskId,
        "claim",
        request.idempotencyKey,
      );
      const requestFingerprint = fingerprint(request);
      const existing = replay<ClaimControllerTaskResult>(
        key,
        requestFingerprint,
      );
      if (existing !== undefined) {
        return { ...existing, idempotentReplay: true };
      }

      expireClaimIfRequired(task);
      ensureControllerRole(task, identity);
      const lastReadVersion = contextReads.get(identityKey(identity, task.taskId));
      if (lastReadVersion !== task.taskVersion) {
        throw new ControllerTaskControlError(
          "CONTROLLER_CONTEXT_REQUIRED",
          "Query the latest decision context before claiming this task.",
          409,
        );
      }
      if (request.expectedTaskVersion !== task.taskVersion) {
        throw new ControllerTaskControlError(
          "CONTROLLER_TASK_VERSION_CONFLICT",
          "Task version has changed. Query the latest decision context.",
          409,
        );
      }
      if (activeClaim(task, now()) !== null) {
        throw new ControllerTaskControlError(
          "CONTROLLER_TASK_ALREADY_CLAIMED",
          "Task already has an active Controller claim.",
          409,
        );
      }

      const issuedAt = now();
      const token = randomBytes(32).toString("base64url");
      task.claimEpoch += 1;
      task.taskVersion += 1;
      const claim: InternalClaim = {
        claimId: `claim-${randomUUID()}`,
        claimedByProfile: identity.profileId,
        roleId: identity.roleId,
        claimEpoch: task.claimEpoch,
        claimedFromTaskVersion: request.expectedTaskVersion,
        issuedAt: issuedAt.toISOString(),
        expiresAt: new Date(issuedAt.getTime() + claimTtlMs).toISOString(),
        tokenHash: hashToken(token),
      };
      task.claim = claim;
      appendEvent(task, {
        eventType: "task.controller_claim.acquired",
        actor: { type: "controller", id: identity.profileId },
        occurredAt: issuedAt.toISOString(),
        data: {
          claimId: claim.claimId,
          claimEpoch: claim.claimEpoch,
        },
      });

      const result: ClaimControllerTaskResult = {
        contractVersion: CONTROLLER_CONTRACT_VERSION,
        taskId: task.taskId,
        taskVersion: task.taskVersion,
        claim: toSnapshot(task).claim as ControllerClaimSummary,
        claimToken: token,
        idempotentReplay: false,
      };
      return remember(key, requestFingerprint, result);
    },

    submitCommand(request, identity) {
      const task = requireTask(request.taskId);
      const key = idempotencyKey(
        identity,
        request.taskId,
        `command:${request.command.type}`,
        request.idempotencyKey,
      );
      const requestFingerprint = fingerprint(request);
      const existing = replay<ControllerCommandResult>(key, requestFingerprint);
      if (existing !== undefined) {
        return { ...existing, idempotentReplay: true };
      }

      ensureControllerRole(task, identity);
      verifyClaim(task, request.claimToken, identity);
      assertExpectedVersions(
        task,
        request.expectedTaskVersion,
        request.expectedPlanVersion,
      );
      const commands = allowedCommands(task, identity);
      if (!commands.includes(request.command.type)) {
        throw new ControllerTaskControlError(
          "CONTROLLER_COMMAND_NOT_ALLOWED",
          "Controller command is not allowed in the current task state.",
          409,
        );
      }

      // Apply the command to an isolated working copy. The fixture commits the
      // replacement only after every invariant succeeds, so a rejected
      // multi-operation plan revision cannot leak partial state.
      const workingTask = clone(task);
      const createdRefs: string[] = [];
      const commandId = `command-${randomUUID()}`;
      const occurredAt = now().toISOString();
      let eventType = "task.controller_command.applied";
      let eventData: ControllerTaskEvent["data"] = {
        commandId,
        commandType: request.command.type,
        reasonSummary: request.command.reasonSummary,
      };

      switch (request.command.type) {
        case "CREATE_PLAN": {
          if (workingTask.plan !== null) {
            throw new ControllerTaskControlError(
              "CONTROLLER_PLAN_INVALID",
              "Task already has a plan.",
              409,
            );
          }
          assertPlanDraft(request.command.payload.nodes);
          const nodes = request.command.payload.nodes.map((node, index, all) =>
            normalizeNodeDraft(
              node,
              index === 0 ? null : all[index - 1]?.nodeId ?? null,
              index === 0,
            ),
          );
          workingTask.plan = {
            planId: `plan-${randomUUID()}`,
            planVersion: 1,
            source: { type: "controller", ref: identity.profileId },
            status: "ACTIVE",
            currentNodeId: nodes[0]?.nodeId ?? null,
            nodes,
          };
          workingTask.lifecycleStatus = "ACTIVE";
          delete workingTask.blockingReason;
          eventType = "task.plan.created";
          eventData = {
            ...eventData,
            planId: workingTask.plan.planId,
            nodeCount: nodes.length,
          };
          break;
        }
        case "REVISE_PLAN": {
          const plan = workingTask.plan;
          if (plan === null) {
            throw new ControllerTaskControlError(
              "CONTROLLER_PLAN_INVALID",
              "Task does not have a plan.",
              409,
            );
          }
          for (const operation of request.command.payload.operations) {
            if (operation.operation === "INSERT_NODE_AFTER") {
              if (plan.nodes.some((node) => node.nodeId === operation.node.nodeId)) {
                throw new ControllerTaskControlError(
                  "CONTROLLER_PLAN_INVALID",
                  "Inserted plan node identifier already exists.",
                  409,
                );
              }
              const index = plan.nodes.findIndex(
                (node) => node.nodeId === operation.afterNodeId,
              );
              if (index < 0) {
                throw new ControllerTaskControlError(
                  "CONTROLLER_NODE_NOT_FOUND",
                  "Plan insertion anchor was not found.",
                  404,
                );
              }
              const inserted = normalizeNodeDraft(
                operation.node,
                operation.afterNodeId,
                false,
              );
              plan.nodes.splice(index + 1, 0, inserted);
              createdRefs.push(inserted.nodeId);
            } else {
              const node = findNode(plan, operation.nodeId);
              if (node.status === "COMPLETED") {
                throw new ControllerTaskControlError(
                  "CONTROLLER_PLAN_INVALID",
                  "Completed plan nodes cannot be cancelled or skipped.",
                  409,
                );
              }
              node.status =
                operation.operation === "CANCEL_NODE" ? "CANCELLED" : "SKIPPED";
              node.summary = operation.reasonSummary;
            }
          }
          plan.planVersion += 1;
          const next = nextActionableNode(plan);
          if (next !== null && next.status === "PENDING") next.status = "READY";
          plan.currentNodeId = next?.nodeId ?? null;
          delete workingTask.blockingReason;
          eventType = "task.plan.revised";
          eventData = {
            ...eventData,
            operationCount: request.command.payload.operations.length,
          };
          break;
        }
        case "ADVANCE_PLAN_NODE": {
          const plan = workingTask.plan;
          if (plan === null) {
            throw new ControllerTaskControlError(
              "CONTROLLER_PLAN_INVALID",
              "Task does not have a plan.",
              409,
            );
          }
          const node = findNode(plan, request.command.payload.nodeId);
          if (node.nodeId !== plan.currentNodeId || !["READY", "ACTIVE", "WAITING"].includes(node.status)) {
            throw new ControllerTaskControlError(
              "CONTROLLER_COMMAND_NOT_ALLOWED",
              "Only the current actionable plan node can advance.",
              409,
            );
          }
          node.status = "COMPLETED";
          node.resultRefs.push(...(request.command.payload.resultRefs ?? []));
          if (request.command.payload.summary !== undefined) {
            node.summary = request.command.payload.summary;
          }
          workingTask.resultRefs.push(...(request.command.payload.resultRefs ?? []));
          const next = nextActionableNode(plan);
          if (next !== null && next.status === "PENDING") next.status = "READY";
          plan.currentNodeId = next?.nodeId ?? null;
          plan.planVersion += 1;
          delete workingTask.blockingReason;
          eventType = "task.plan_node.completed";
          eventData = { ...eventData, nodeId: node.nodeId };
          break;
        }
        case "REQUEST_ROLE_WORK": {
          const plan = workingTask.plan;
          if (plan === null) throw new ControllerTaskControlError("CONTROLLER_PLAN_INVALID", "Task does not have a plan.", 409);
          const node = findNode(plan, request.command.payload.nodeId);
          if (node.nodeId !== plan.currentNodeId || !["READY", "WAITING"].includes(node.status)) {
            throw new ControllerTaskControlError(
              "CONTROLLER_COMMAND_NOT_ALLOWED",
              "Role work can only be requested for the current actionable node.",
              409,
            );
          }
          if (node.requiredRole !== request.command.payload.requiredRole) {
            throw new ControllerTaskControlError(
              "CONTROLLER_PLAN_INVALID",
              "Requested work role must match the current plan node role.",
              409,
            );
          }
          const workRef = `work-fixture-${randomUUID()}`;
          node.workRefs.push(workRef);
          node.status = "ACTIVE";
          plan.currentNodeId = node.nodeId;
          plan.planVersion += 1;
          createdRefs.push(workRef);
          eventType = "task.role_work.requested";
          eventData = {
            ...eventData,
            nodeId: node.nodeId,
            workRef,
            requiredRole: request.command.payload.requiredRole,
          };
          break;
        }
        case "REQUEST_APPROVAL": {
          const plan = workingTask.plan;
          if (plan === null) throw new ControllerTaskControlError("CONTROLLER_PLAN_INVALID", "Task does not have a plan.", 409);
          const node = findNode(plan, request.command.payload.nodeId);
          if (node.nodeId !== plan.currentNodeId || !["READY", "ACTIVE", "WAITING"].includes(node.status)) {
            throw new ControllerTaskControlError(
              "CONTROLLER_COMMAND_NOT_ALLOWED",
              "Approval can only be requested for the current actionable node.",
              409,
            );
          }
          const approvalRef = `approval-fixture-${randomUUID()}`;
          node.status = "WAITING";
          node.summary = request.command.payload.summary;
          workingTask.approvalRefs.push(approvalRef);
          plan.currentNodeId = node.nodeId;
          plan.planVersion += 1;
          createdRefs.push(approvalRef);
          eventType = "task.approval.requested";
          eventData = { ...eventData, nodeId: node.nodeId, approvalRef };
          break;
        }
        case "BLOCK_TASK": {
          workingTask.blockingReason = request.command.payload.reason;
          if (workingTask.plan !== null && workingTask.plan.currentNodeId !== null) {
            const node = findNode(workingTask.plan, workingTask.plan.currentNodeId);
            if (!["COMPLETED", "CANCELLED", "SKIPPED"].includes(node.status)) {
              node.status = "WAITING";
              node.summary = request.command.payload.reason;
              workingTask.plan.planVersion += 1;
            }
          }
          eventType = "task.blocked";
          eventData = { ...eventData, reason: request.command.payload.reason };
          break;
        }
        case "COMPLETE_TASK": {
          const plan = workingTask.plan;
          if (plan === null || plan.nodes.some((node) => !["COMPLETED", "SKIPPED", "CANCELLED"].includes(node.status))) {
            throw new ControllerTaskControlError(
              "CONTROLLER_COMMAND_NOT_ALLOWED",
              "Task cannot complete until all plan nodes reach a terminal state.",
              409,
            );
          }
          plan.status = "COMPLETED";
          plan.currentNodeId = null;
          plan.planVersion += 1;
          workingTask.lifecycleStatus = "COMPLETED";
          workingTask.resultRefs.push(...(request.command.payload.resultRefs ?? []));
          delete workingTask.blockingReason;
          workingTask.claim = null;
          eventType = "task.completed";
          eventData = { ...eventData, summary: request.command.payload.summary };
          break;
        }
      }

      workingTask.taskVersion += 1;
      const event = appendEvent(workingTask, {
        eventType,
        actor: { type: "controller", id: identity.profileId },
        occurredAt,
        data: eventData,
      });
      tasks.set(workingTask.taskId, workingTask);
      const result: ControllerCommandResult = {
        contractVersion: CONTROLLER_CONTRACT_VERSION,
        commandId,
        task: toSnapshot(workingTask),
        event,
        createdRefs,
        idempotentReplay: false,
      };
      return remember(key, requestFingerprint, result);
    },

    releaseTask(request, identity) {
      const task = requireTask(request.taskId);
      const key = idempotencyKey(
        identity,
        request.taskId,
        "release",
        request.idempotencyKey,
      );
      const requestFingerprint = fingerprint(request);
      const existing = replay<ReleaseControllerTaskResult>(key, requestFingerprint);
      if (existing !== undefined) {
        return { ...existing, idempotentReplay: true };
      }
      ensureControllerRole(task, identity);
      const claim = verifyClaim(task, request.claimToken, identity);
      task.claim = null;
      task.taskVersion += 1;
      const event = appendEvent(task, {
        eventType: "task.controller_claim.released",
        actor: { type: "controller", id: identity.profileId },
        occurredAt: now().toISOString(),
        data: { claimId: claim.claimId, claimEpoch: claim.claimEpoch },
      });
      const result: ReleaseControllerTaskResult = {
        contractVersion: CONTROLLER_CONTRACT_VERSION,
        taskId: task.taskId,
        taskVersion: task.taskVersion,
        released: true,
        event,
        idempotentReplay: false,
      };
      return remember(key, requestFingerprint, result);
    },
  };
}

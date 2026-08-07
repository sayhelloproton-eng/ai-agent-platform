import { invariant, TaskControlError } from "./error.js";
import {
  type ClaimControllerInput,
  type ClaimDispatchInput,
  type ClaimWorkItemInput,
  type CompleteWorkItemInput,
  type ControllerClaim,
  type ControllerCommand,
  type ControllerCommandReceipt,
  type CreateTaskInput,
  type DecisionContext,
  type ExpireWorkItemInput,
  type FailHostResultInput,
  type FailWorkItemInput,
  type DispatchSignal,
  type IdempotencyRecord,
  type JsonObject,
  type JsonValue,
  type HostCommandMaterialization,
  type LeaseClaim,
  type PlanNode,
  type PlanOperation,
  type ReportDispatchInput,
  type ReportHostResultInput,
  type ReportUncertainHostResultInput,
  type ReportWorkProgressInput,
  type ReportWorkFailureInput,
  type ReportWorkResultInput,
  type RetryWorkItemInput,
  type StartWorkItemInput,
  type ResolveApprovalInput,
  type RoleAttentionEntry,
  type SubmitControllerCommandInput,
  type TaskAggregate,
  type TaskControlState,
  type TaskEvent,
  type TaskIntakeResult,
  type TaskPlan,
  type TaskStatus,
  type WorkItem,
} from "./model.js";
import type {
  Clock,
  HostDispatchApplicationPort,
  IdGenerator,
  TaskControlStore,
  TaskIntakeApplicationPort,
  WorkItemApplicationPort,
  TaskProjectionApplicationPort,
} from "./ports.js";
import {
  allowedControllerCommands,
  assertCommandAllowed,
  assertContractVersion,
  assertExpectedVersions,
  assertNonEmpty,
  assertPositiveInteger,
  assertTaskConsistency,
  controllerClaimable,
  createPlan,
  dependenciesSatisfied,
  getPlanNode,
  isClaimExpired,
  isPlanComplete,
  isTerminalTaskStatus,
  normalizeNode,
  validatePlanNodes,
} from "./policy.js";
import {
  buildRoleAttentionInbox,
  buildTaskTimeline,
  dispatchesForTask,
  listRuntimeDispatchQueue,
  workItemsForTask,
} from "./projections.js";
import { TaskReconciler } from "./reconciler.js";
import { requestFingerprint } from "./request-fingerprint.js";

interface ControllerClaimResult {
  readonly claim: ControllerClaim;
  readonly taskVersion: number;
  readonly planVersion: number | null;
}

interface WorkClaimResult {
  readonly workItem: WorkItem;
}

interface DispatchClaimResult {
  readonly dispatch: DispatchSignal;
}

function idempotencyComposite(scope: string, key: string): string {
  return `${scope}\u0000${key}`;
}

function idempotencyGet<T>(
  state: Readonly<TaskControlState>,
  scope: string,
  key: string,
  fingerprint: string,
): T | undefined {
  const record = state.idempotencyRecords[idempotencyComposite(scope, key)];
  if (record === undefined) return undefined;
  invariant(
    record.requestFingerprint === fingerprint,
    "IDEMPOTENCY_KEY_CONFLICT",
    "Idempotency key was already used for a different request.",
    { scope, key },
  );
  return structuredClone(record.result) as T;
}

function idempotencyPut(
  state: TaskControlState,
  scope: string,
  key: string,
  fingerprint: string,
  result: JsonValue,
  now: string,
): void {
  const composite = idempotencyComposite(scope, key);
  const record: IdempotencyRecord = {
    scope,
    key,
    requestFingerprint: fingerprint,
    result,
    createdAt: now,
  };
  state.idempotencyRecords[composite] = record;
}

function appendEvent(
  state: TaskControlState,
  task: TaskAggregate,
  eventType: TaskEvent["eventType"],
  producerRef: string,
  payload: JsonObject,
  now: string,
  ids: IdGenerator,
  correlationId: string | null,
  causationId: string | null,
): TaskEvent {
  const item: TaskEvent = {
    eventId: ids.next("event"),
    taskId: task.taskId,
    taskVersion: task.taskVersion,
    eventType,
    stateAfter: {
      taskStatus: task.status,
      planVersion: task.plan?.planVersion ?? null,
      planStatus: task.plan?.status ?? null,
      currentNodeId: task.plan?.currentNodeId ?? null,
    },
    producerRef,
    payload,
    correlationId,
    causationId,
    createdAt: now,
  };
  state.events[task.taskId] = [...(state.events[task.taskId] ?? []), item];
  return item;
}

function lease(
  ids: IdGenerator,
  prefix: string,
  claimant: string,
  epoch: number,
  now: Date,
  leaseMs: number,
): LeaseClaim {
  assertPositiveInteger(leaseMs, "leaseMs");
  return {
    claimId: ids.next(`${prefix}-claim`),
    claimToken: ids.token(`${prefix}-token`),
    claimedBy: claimant,
    claimEpoch: epoch,
    claimedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + leaseMs).toISOString(),
  };
}

function controllerClaimEpoch(state: Readonly<TaskControlState>, taskId: string): number {
  return (state.events[taskId] ?? []).filter((item) => item.eventType === "CONTROLLER_CLAIMED").length + 1;
}

function sanitizeControllerClaim(
  claim: ControllerClaim | null,
): Omit<ControllerClaim, "claimToken"> | null {
  if (claim === null) return null;
  const { claimToken: _claimToken, ...safe } = claim;
  return safe;
}

function updateNode(
  plan: TaskPlan,
  nodeId: string,
  updater: (node: PlanNode) => PlanNode,
  now: string,
): TaskPlan {
  let found = false;
  const nodes = plan.nodes.map((node) => {
    if (node.nodeId !== nodeId) return node;
    found = true;
    return updater(node);
  });
  invariant(found, "PLAN_NODE_NOT_FOUND", "Plan node was not found.", { nodeId });
  validatePlanNodes(nodes, plan.currentNodeId);
  return { ...plan, nodes, updatedAt: now };
}

function withPlanVersion(plan: TaskPlan, now: string): TaskPlan {
  return { ...plan, planVersion: plan.planVersion + 1, updatedAt: now };
}

function addUnique(values: readonly string[], additions: readonly string[]): readonly string[] {
  return [...new Set([...values, ...additions])];
}

function removeValue(values: readonly string[], value: string): readonly string[] {
  return values.filter((item) => item !== value);
}

function assertReference(value: string, path: string): void {
  assertNonEmpty(value, path);
  invariant(
    value.length <= 2048 &&
      !value.includes("\n") &&
      !value.includes("\r") &&
      !/\s/.test(value) &&
      (
        /^[A-Za-z][A-Za-z0-9._-]*:[^\s]+$/.test(value) ||
        /^[A-Za-z][A-Za-z0-9._-]*[-_.][A-Za-z0-9._-]+$/.test(value)
      ),
    "INVALID_ARGUMENT",
    `${path} must be a bounded stable reference, not inline result content.`,
    { path },
  );
}

function assertBoundedSummary(value: string | undefined, path: string): void {
  if (value === undefined) return;
  invariant(
    value.length <= 1024,
    "INVALID_ARGUMENT",
    `${path} must be a bounded summary, not inline result content.`,
    { path, length: value.length },
  );
}

function assertEvidenceRefs(values: readonly string[] | undefined, path: string): readonly string[] {
  const refs = [...(values ?? [])];
  invariant(refs.length <= 32, "INVALID_ARGUMENT", `${path} exceeds the evidence reference limit.`, {
    path,
    count: refs.length,
  });
  for (const [index, value] of refs.entries()) assertReference(value, `${path}[${index}]`);
  return refs;
}

function assertNoInlineResultBody(input: object, path: string): void {
  const forbidden = [
    "localResult",
    "local_result",
    "resultBody",
    "result_body",
    "result",
    "payload",
    "body",
    "content",
    "output",
    "dom",
    "screenshot",
    "binding",
    "observation",
  ];
  for (const key of forbidden) {
    invariant(
      !(key in input),
      "INVALID_ARGUMENT",
      `${path}.${key} is not accepted; submit stable references and summaries only.`,
      { path, key },
    );
  }
}

function activeWorkForNode(
  state: Readonly<TaskControlState>,
  taskId: string,
  nodeId: string,
): WorkItem | undefined {
  return Object.values(state.workItems).find(
    (item) =>
      item.taskId === taskId &&
      item.planNodeId === nodeId &&
      (item.status === "PENDING" || item.status === "CLAIMED"),
  );
}

function setOperationalStatus(task: TaskAggregate, nextStatus: TaskStatus): TaskAggregate {
  if (task.status === "PAUSED") {
    return { ...task, resumeStatus: nextStatus };
  }
  return { ...task, status: nextStatus };
}

function deriveResumeStatus(
  state: Readonly<TaskControlState>,
  task: TaskAggregate,
): TaskStatus {
  if (task.plan === null) return "PLAN_REQUIRED";
  const currentNode =
    task.plan.currentNodeId === null
      ? undefined
      : task.plan.nodes.find((node) => node.nodeId === task.plan!.currentNodeId);
  if (
    task.approvalRefs.length > 0 ||
    currentNode?.status === "WAITING_APPROVAL"
  ) {
    return "WAITING_FOR_APPROVAL";
  }
  if (
    currentNode?.status === "WAITING_RESULT" ||
    Object.values(state.workItems).some(
      (item) =>
        item.taskId === task.taskId &&
        (item.status === "PENDING" || item.status === "CLAIMED"),
    )
  ) {
    return "WAITING_FOR_ROLE_WORK";
  }
  if (task.blockedReason !== null || currentNode?.status === "BLOCKED") return "BLOCKED";
  return task.resumeStatus ?? "READY_FOR_CONTROLLER";
}

function applyPlanOperations(
  plan: TaskPlan,
  operations: readonly PlanOperation[],
  now: string,
): TaskPlan {
  invariant(operations.length > 0, "INVALID_ARGUMENT", "REVISE_PLAN requires at least one operation.");
  let next = plan;
  for (const operation of operations) {
    switch (operation.type) {
      case "ADD_NODE": {
        invariant(
          !next.nodes.some((node) => node.nodeId === operation.node.nodeId),
          "INVALID_PLAN",
          "Cannot add a duplicate Plan Node.",
          { nodeId: operation.node.nodeId },
        );
        next = { ...next, nodes: [...next.nodes, normalizeNode(operation.node)], updatedAt: now };
        break;
      }
      case "INSERT_NODE_AFTER": {
        invariant(
          !next.nodes.some((node) => node.nodeId === operation.node.nodeId),
          "INVALID_PLAN",
          "Cannot insert a duplicate Plan Node.",
          { nodeId: operation.node.nodeId },
        );
        const anchorIndex = next.nodes.findIndex((node) => node.nodeId === operation.anchorNodeId);
        invariant(anchorIndex >= 0, "PLAN_NODE_NOT_FOUND", "Insert anchor Plan Node was not found.", {
          anchorNodeId: operation.anchorNodeId,
        });
        const inserted = {
          ...normalizeNode(operation.node),
          dependsOn: addUnique(
            [operation.anchorNodeId],
            (operation.node.dependsOn ?? []).filter((item) => item !== operation.anchorNodeId),
          ),
        };
        const rewired = next.nodes.map((node) => {
          if (!node.dependsOn.includes(operation.anchorNodeId)) return node;
          return {
            ...node,
            dependsOn: node.dependsOn.map((dependency) =>
              dependency === operation.anchorNodeId ? inserted.nodeId : dependency,
            ),
          };
        });
        next = {
          ...next,
          nodes: [
            ...rewired.slice(0, anchorIndex + 1),
            inserted,
            ...rewired.slice(anchorIndex + 1),
          ],
          updatedAt: now,
        };
        break;
      }
      case "SET_NODE_STATUS": {
        next = updateNode(
          next,
          operation.nodeId,
          (node) => ({
            ...node,
            status: operation.status,
            summary: operation.summary ?? node.summary,
          }),
          now,
        );
        break;
      }
      case "SET_CURRENT_NODE": {
        if (operation.nodeId !== null) {
          invariant(
            next.nodes.some((node) => node.nodeId === operation.nodeId),
            "PLAN_NODE_NOT_FOUND",
            "Current Plan Node was not found.",
            { nodeId: operation.nodeId },
          );
        }
        next = { ...next, currentNodeId: operation.nodeId, updatedAt: now };
        break;
      }
      case "SET_PLAN_STATUS": {
        next = { ...next, status: operation.status, updatedAt: now };
        break;
      }
    }
  }
  validatePlanNodes(next.nodes, next.currentNodeId);
  return withPlanVersion(next, now);
}

function cancelUnfinishedNodes(plan: TaskPlan, failed: boolean, now: string): TaskPlan {
  let failedAssigned = false;
  const nodes = plan.nodes.map((node) => {
    if (["COMPLETED", "SKIPPED", "CANCELLED", "FAILED"].includes(node.status)) return node;
    if (failed && !failedAssigned && node.nodeId === plan.currentNodeId) {
      failedAssigned = true;
      return { ...node, status: "FAILED" as const };
    }
    return { ...node, status: "CANCELLED" as const };
  });
  return withPlanVersion({ ...plan, nodes, status: "CANCELLED", currentNodeId: null }, now);
}

function activeControllerDispatches(state: TaskControlState, taskId: string): DispatchSignal[] {
  return Object.values(state.dispatchSignals).filter(
    (signal) =>
      signal.taskId === taskId &&
      signal.signalType === "CONTROLLER_WAKE" &&
      (["PENDING", "CLAIMED", "DELIVERED"].includes(signal.status) ||
        signal.hostResultStatus === "UNCERTAIN"),
  );
}

function createControllerDispatchRecord(
  state: TaskControlState,
  task: TaskAggregate,
  now: string,
  ids: IdGenerator,
): DispatchSignal {
  const signalId = ids.next("dispatch");
  const signal: DispatchSignal = {
    signalId,
    taskId: task.taskId,
    createdFromTaskVersion: task.taskVersion,
    signalType: "CONTROLLER_WAKE",
    targetRole: task.requiredRole,
    targetProfileRef: null,
    conversationRef: task.conversationRef,
    hostCommandType: task.conversationRef === null ? "OPEN_ROLE_SESSION" : "CONTINUE_SESSION",
    hostCommandRef: `host-command:${signalId}`,
    browserActionType: task.conversationRef === null ? "OPEN_OR_RESUME_SESSION" : "CONTINUE_ROLE_SESSION",
    payloadRef: null,
    preconditions: {},
    approvalRef: null,
    expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
    workItemId: null,
    status: "PENDING",
    claimEpoch: 0,
    claim: null,
    attemptCount: 0,
    idempotencyKey: `controller-wake:${task.taskId}:${task.taskVersion}`,
    createdAt: now,
    deliveredAt: null,
    deliveryReceipt: null,
    deliveryId: null,
    reportToken: null,
    reportTokenExpiresAt: null,
    reportTokenConsumedAt: null,
    hostResultStatus: "PENDING",
    hostResultRef: null,
    hostResultSummary: null,
    hostEvidenceRefs: [],
    reportedAt: null,
    lastError: null,
  };
  state.dispatchSignals[signalId] = signal;
  return signal;
}

function shouldMaterializeControllerDispatch(
  state: TaskControlState,
  task: TaskAggregate,
): boolean {
  return (
    task.controllerClaim === null &&
    task.status !== "PAUSED" &&
    ["PLAN_REQUIRED", "READY_FOR_CONTROLLER", "BLOCKED"].includes(task.status) &&
    activeControllerDispatches(state, task.taskId).length === 0
  );
}

export class TaskControlService implements TaskIntakeApplicationPort, WorkItemApplicationPort, HostDispatchApplicationPort, TaskProjectionApplicationPort {
  readonly reconciler: TaskReconciler;

  constructor(
    private readonly store: TaskControlStore,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {
    this.reconciler = new TaskReconciler(store, clock, ids);
  }

  async intakeTask(input: CreateTaskInput): Promise<TaskIntakeResult> {
    assertContractVersion(input.contractVersion);
    assertNonEmpty(input.taskId, "taskId");
    assertNonEmpty(input.title, "title");
    assertNonEmpty(input.objective, "objective");
    assertNonEmpty(input.requiredRole, "requiredRole");
    assertNonEmpty(input.idempotencyKey, "idempotencyKey");
    assertNonEmpty(input.producerRef, "producerRef");

    const scope = `task.intake:${input.taskId}`;
    const fingerprint = requestFingerprint(input);
    const result = await this.store.transact((state) => {
      const duplicate = idempotencyGet<TaskIntakeResult>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;

      // Continuous-upgrade compatibility: the first implementation used the
      // task.create scope and stored only taskId. Convert that durable record
      // into the formal intake result instead of treating a safe replay as a
      // new Task creation attempt.
      const legacy = idempotencyGet<{ taskId: string }>(
        state,
        `task.create:${input.taskId}`,
        input.idempotencyKey,
        fingerprint,
      );
      if (legacy !== undefined) {
        const existing = state.tasks[legacy.taskId];
        invariant(existing !== undefined, "TASK_NOT_FOUND", "Legacy Task Intake record references a missing Task.", {
          taskId: legacy.taskId,
        });
        const initialEventIds = (state.events[legacy.taskId] ?? [])
          .filter((event) => event.eventType === "TASK_CREATED" || event.eventType === "TASK_PLAN_CREATED")
          .slice(0, existing.plan === null ? 1 : 2)
          .map((event) => event.eventId);
        const converted: TaskIntakeResult = {
          taskId: legacy.taskId,
          taskVersionAtCreation: 1,
          initialEventIds,
        };
        idempotencyPut(
          state,
          scope,
          input.idempotencyKey,
          fingerprint,
          converted as unknown as JsonValue,
          this.clock.now().toISOString(),
        );
        return converted;
      }
      invariant(state.tasks[input.taskId] === undefined, "TASK_ALREADY_EXISTS", "Task already exists.", {
        taskId: input.taskId,
      });
      const now = this.clock.now().toISOString();
      const plan = input.plan === undefined ? null : createPlan(input.plan, now);
      let task: TaskAggregate = {
        taskId: input.taskId,
        taskVersion: 1,
        title: input.title,
        objective: input.objective,
        requirementRef: input.requirementRef ?? null,
        goalRef: input.goalRef ?? null,
        requiredRole: input.requiredRole,
        status: plan === null ? "PLAN_REQUIRED" : "READY_FOR_CONTROLLER",
        plan,
        controllerClaim: null,
        latestEventId: null,
        latestResultRefs: [],
        approvalRefs: [],
        conversationRef: input.conversationRef ?? null,
        blockedReason: null,
        pausedReason: null,
        resumeStatus: null,
        terminalSummary: null,
        createdAt: now,
        updatedAt: now,
      };
      const initialEventIds: string[] = [];
      const createdEvent = appendEvent(
        state,
        task,
        "TASK_CREATED",
        input.producerRef,
        { status: task.status },
        now,
        this.ids,
        input.correlationId ?? null,
        null,
      );
      initialEventIds.push(createdEvent.eventId);
      let latest = createdEvent;
      if (plan !== null) {
        latest = appendEvent(
          state,
          task,
          "TASK_PLAN_CREATED",
          input.producerRef,
          { planVersion: plan.planVersion },
          now,
          this.ids,
          input.correlationId ?? null,
          createdEvent.eventId,
        );
        initialEventIds.push(latest.eventId);
      }
      task = { ...task, latestEventId: latest.eventId };
      state.tasks[task.taskId] = task;
      const intakeResult: TaskIntakeResult = {
        taskId: task.taskId,
        taskVersionAtCreation: task.taskVersion,
        initialEventIds,
      };
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        intakeResult as unknown as JsonValue,
        now,
      );
      return intakeResult;
    });

    await this.reconciler.reconcile(result.taskId);
    return result;
  }

  /** Compatibility helper for existing in-domain callers. New adapters use intakeTask(). */
  async createTask(input: CreateTaskInput): Promise<TaskAggregate> {
    const result = await this.intakeTask(input);
    return this.getTask(result.taskId);
  }

  async getTask(taskId: string): Promise<TaskAggregate> {
    return this.store.read((state) => {
      const task = state.tasks[taskId];
      invariant(task !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId });
      return task;
    });
  }

  async getDecisionContext(taskId: string, afterEventId?: string): Promise<DecisionContext> {
    return this.store.read((state) => {
      const task = state.tasks[taskId];
      invariant(task !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId });
      const allEvents = buildTaskTimeline(state, taskId);
      const start =
        afterEventId === undefined
          ? Math.max(0, allEvents.length - 20)
          : Math.max(0, allEvents.findIndex((item) => item.eventId === afterEventId) + 1);
      const availableContextRefs = [task.requirementRef, task.goalRef, task.conversationRef].filter(
        (value): value is string => value !== null,
      );
      return {
        contractVersion: "1.0.0",
        task,
        requirement: {
          ref: task.requirementRef,
          summary: task.objective,
          acceptanceCriteria:
            task.plan?.nodes.flatMap((node) => node.acceptanceCriteria) ?? [],
        },
        recentEvents: allEvents.slice(start),
        latestResults: task.latestResultRefs,
        constraints: [],
        pendingApprovals: task.approvalRefs,
        availableContextRefs,
        allowedControllerCommands: allowedControllerCommands(task),
        activeClaim: sanitizeControllerClaim(task.controllerClaim),
        nextEventCursor: allEvents.at(-1)?.eventId ?? null,
      };
    });
  }

  async listEvents(taskId: string): Promise<readonly TaskEvent[]> {
    return this.store.read((state) => {
      invariant(state.tasks[taskId] !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId });
      return buildTaskTimeline(state, taskId);
    });
  }

  async claimController(input: ClaimControllerInput): Promise<ControllerClaimResult> {
    assertContractVersion(input.contractVersion);
    assertPositiveInteger(input.leaseMs, "leaseMs");
    const scope = `controller.claim:${input.taskId}:${input.profileId}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<ControllerClaimResult>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const current = state.tasks[input.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: input.taskId });
      assertExpectedVersions(current, input.expectedTaskVersion);
      invariant(controllerClaimable(current.status), "COMMAND_NOT_ALLOWED", "Task is not claimable by controller.", {
        taskId: current.taskId,
        status: current.status,
      });
      invariant(current.requiredRole === input.roleId, "ROLE_NOT_ALLOWED", "Role is not allowed to claim task.", {
        requiredRole: current.requiredRole,
        actualRole: input.roleId,
      });
      const nowDate = this.clock.now();
      if (current.controllerClaim !== null && !isClaimExpired(current.controllerClaim.expiresAt, nowDate)) {
        throw new TaskControlError("CONTROLLER_ALREADY_CLAIMED", "Task already has an active Controller Claim.", {
          taskId: current.taskId,
          claimedByProfile: current.controllerClaim.claimedByProfile,
        });
      }
      const baseLease = lease(
        this.ids,
        "controller",
        input.profileId,
        controllerClaimEpoch(state, current.taskId),
        nowDate,
        input.leaseMs,
      );
      const claim: ControllerClaim = {
        claimId: baseLease.claimId,
        claimToken: baseLease.claimToken,
        roleId: input.roleId,
        claimedByProfile: input.profileId,
        claimedFromTaskVersion: current.taskVersion,
        claimEpoch: baseLease.claimEpoch,
        claimedAt: baseLease.claimedAt,
        expiresAt: baseLease.expiresAt,
      };
      const now = nowDate.toISOString();
      const replacedClaim = current.controllerClaim;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        controllerClaim: claim,
        updatedAt: now,
      };
      const consumedDispatchIds: string[] = [];
      for (const dispatch of activeControllerDispatches(state, task.taskId)) {
        state.dispatchSignals[dispatch.signalId] = {
          ...dispatch,
          status: "CONSUMED",
          // Delivery and Host Result are independent. Keep the BHR report
          // credential until the Host Result reaches a terminal state.
          claim: dispatch.hostResultStatus === "PENDING" ? dispatch.claim : null,
        };
        consumedDispatchIds.push(dispatch.signalId);
      }
      let causationId = current.latestEventId;
      if (replacedClaim !== null) {
        const releasedEvent = appendEvent(
          state,
          task,
          "CONTROLLER_CLAIM_RELEASED",
          input.profileId,
          {
            claimId: replacedClaim.claimId,
            claimEpoch: replacedClaim.claimEpoch,
            reason: "expired-replaced",
          },
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        causationId = releasedEvent.eventId;
      }
      const claimedEvent = appendEvent(
        state,
        task,
        "CONTROLLER_CLAIMED",
        input.profileId,
        {
          claimId: claim.claimId,
          roleId: claim.roleId,
          claimEpoch: claim.claimEpoch,
          reclaimed: replacedClaim !== null,
        },
        now,
        this.ids,
        input.correlationId ?? null,
        causationId,
      );
      causationId = claimedEvent.eventId;
      if (consumedDispatchIds.length > 0) {
        const consumedEvent = appendEvent(
          state,
          task,
          "HOST_DISPATCH_CONSUMED",
          input.profileId,
          { dispatchIds: consumedDispatchIds },
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        causationId = consumedEvent.eventId;
      }
      task = { ...task, latestEventId: causationId };
      state.tasks[task.taskId] = task;
      const result: ControllerClaimResult = {
        claim,
        taskVersion: task.taskVersion,
        planVersion: task.plan?.planVersion ?? null,
      };
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        result as unknown as JsonValue,
        now,
      );
      return result;
    });
  }

  async releaseControllerClaim(
    taskId: string,
    claimToken: string,
    producerRef: string,
    idempotencyKey: string,
  ): Promise<TaskAggregate> {
    const scope = `controller.release:${taskId}`;
    const fingerprint = requestFingerprint({ taskId, claimToken, producerRef });
    const receipt = await this.store.transact((state) => {
      const duplicate = idempotencyGet<TaskAggregate>(
        state,
        scope,
        idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const current = state.tasks[taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId });
      this.assertActiveControllerClaim(current, claimToken);
      const now = this.clock.now().toISOString();
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        controllerClaim: null,
        updatedAt: now,
      };
      const released = appendEvent(
        state,
        task,
        "CONTROLLER_CLAIM_RELEASED",
        producerRef,
        { claimId: current.controllerClaim!.claimId, reason: "released" },
        now,
        this.ids,
        null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: released.eventId };
      state.tasks[taskId] = task;
      idempotencyPut(state, scope, idempotencyKey, fingerprint, task as unknown as JsonValue, now);
      return task;
    });
    await this.reconciler.reconcile(taskId);
    return receipt;
  }

  async submitControllerCommand(input: SubmitControllerCommandInput): Promise<ControllerCommandReceipt> {
    assertContractVersion(input.commandContractVersion);
    assertNonEmpty(input.idempotencyKey, "idempotencyKey");
    const scope = `controller.command:${input.taskId}`;
    const fingerprint = requestFingerprint(input);
    const result = await this.store.transact((state) => {
      const duplicate = idempotencyGet<ControllerCommandReceipt>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const current = state.tasks[input.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: input.taskId });
      this.assertActiveControllerClaim(current, input.claimToken);
      assertExpectedVersions(current, input.expectedTaskVersion, input.expectedPlanVersion);
      assertCommandAllowed(current, input.command);
      const now = this.clock.now().toISOString();
      let task = current;
      let plan = current.plan;
      const workItemIds: string[] = [];
      const dispatchIds: string[] = [];
      const eventSpecs: Array<{ type: TaskEvent["eventType"]; payload: JsonObject }> = [];
      let releaseClaim = input.command.type === "RELEASE_CLAIM";

      switch (input.command.type) {
        case "CREATE_PLAN": {
          invariant(plan === null, "INVALID_PLAN", "Task already has a plan.");
          plan = createPlan(input.command.payload, now);
          task = { ...task, plan, status: "READY_FOR_CONTROLLER" };
          eventSpecs.push({ type: "TASK_PLAN_CREATED", payload: { planVersion: plan.planVersion } });
          break;
        }
        case "REVISE_PLAN": {
          invariant(plan !== null, "INVALID_PLAN", "Task has no plan.");
          plan = applyPlanOperations(plan, input.command.payload.operations, now);
          task = { ...task, plan, status: "READY_FOR_CONTROLLER", blockedReason: null };
          eventSpecs.push({
            type: "TASK_PLAN_REVISED",
            payload: {
              planVersion: plan.planVersion,
              reasonSummary: input.command.reasonSummary,
            },
          });
          break;
        }
        case "ADVANCE_PLAN_NODE": {
          invariant(plan !== null, "INVALID_PLAN", "Task has no plan.");
          const command = input.command;
          invariant(
            plan.currentNodeId === command.payload.nodeId,
            "COMMAND_NOT_ALLOWED",
            "Only the current Plan Node can be advanced.",
            {
              currentNodeId: plan.currentNodeId,
              requestedNodeId: command.payload.nodeId,
            },
          );
          getPlanNode(task, command.payload.nodeId);
          let nextPlan = updateNode(
            plan,
            command.payload.nodeId,
            (node) => ({
              ...node,
              status: "COMPLETED",
              resultRefs: addUnique(node.resultRefs, command.payload.resultRefs ?? []),
              summary: command.payload.summary ?? node.summary,
            }),
            now,
          );
          if (command.payload.nextNodeId !== undefined) {
            const nextNode = nextPlan.nodes.find(
              (node) => node.nodeId === command.payload.nextNodeId,
            );
            invariant(nextNode !== undefined, "PLAN_NODE_NOT_FOUND", "Next Plan Node was not found.", {
              nextNodeId: command.payload.nextNodeId,
            });
            invariant(
              !["COMPLETED", "SKIPPED", "CANCELLED", "FAILED"].includes(nextNode.status),
              "COMMAND_NOT_ALLOWED",
              "Next Plan Node must not already be terminal.",
              { nextNodeId: nextNode.nodeId, nodeStatus: nextNode.status },
            );
            invariant(
              dependenciesSatisfied(nextPlan, nextNode),
              "COMMAND_NOT_ALLOWED",
              "Next Plan Node dependencies are not satisfied.",
              { nextNodeId: nextNode.nodeId },
            );
            nextPlan = updateNode(
              nextPlan,
              command.payload.nextNodeId,
              (node) => ({ ...node, status: "READY" }),
              now,
            );
            nextPlan = { ...nextPlan, currentNodeId: command.payload.nextNodeId };
          } else {
            const candidate = { ...nextPlan, currentNodeId: null } as TaskPlan;
            invariant(
              isPlanComplete(candidate),
              "COMMAND_NOT_ALLOWED",
              "Plan cannot be completed while unfinished nodes remain.",
              {
                unfinishedNodeIds: candidate.nodes
                  .filter((node) => !["COMPLETED", "SKIPPED", "CANCELLED"].includes(node.status))
                  .map((node) => node.nodeId),
              },
            );
            nextPlan = { ...candidate, status: "COMPLETED" };
          }
          plan = withPlanVersion(nextPlan, now);
          task = { ...task, plan, status: "READY_FOR_CONTROLLER", blockedReason: null };
          eventSpecs.push({
            type: "TASK_PLAN_REVISED",
            payload: { planVersion: plan.planVersion, advancedNodeId: command.payload.nodeId },
          });
          break;
        }
        case "REQUEST_ROLE_WORK": {
          invariant(plan !== null, "INVALID_PLAN", "Task has no plan.");
          const command = input.command;
          const node = getPlanNode(task, command.payload.nodeId);
          invariant(
            plan.currentNodeId === node.nodeId,
            "COMMAND_NOT_ALLOWED",
            "Only the current Plan Node can create a Work Item.",
            { currentNodeId: plan.currentNodeId, requestedNodeId: node.nodeId },
          );
          invariant(
            ["READY", "IN_PROGRESS"].includes(node.status) && dependenciesSatisfied(plan, node),
            "COMMAND_NOT_ALLOWED",
            "Current Plan Node is not executable.",
            { nodeId: node.nodeId, nodeStatus: node.status },
          );
          invariant(
            activeWorkForNode(state, task.taskId, node.nodeId) === undefined,
            "COMMAND_NOT_ALLOWED",
            "Current Plan Node already has an active Work Item.",
            { nodeId: node.nodeId },
          );
          const workItemId = this.ids.next("work");
          const workItem: WorkItem = {
            workItemId,
            taskId: task.taskId,
            planNodeId: node.nodeId,
            createdFromTaskVersion: task.taskVersion,
            targetDomain: command.payload.targetDomain,
            requiredRole: command.payload.requiredRole,
            capabilityRef: command.payload.capabilityRef ?? null,
            inputRef: command.payload.inputRef ?? null,
            expectedResultType: command.payload.expectedResultType,
            status: "PENDING",
            attempt: 1,
            claimEpoch: 0,
            claim: null,
            resultRef: null,
            resultSummary: null,
            evidenceRefs: [],
            errorCode: null,
            errorSummary: null,
            retryable: null,
            progressStatus: "NONE",
            progressRef: null,
            progressSummary: null,
            progressEvidenceRefs: [],
            createdAt: now,
            claimedAt: null,
            startedAt: null,
            completedAt: null,
          };
          state.workItems[workItemId] = workItem;
          workItemIds.push(workItemId);
          if (command.payload.targetDomain === "browser-host") {
            invariant(command.payload.targetRoleRef !== undefined, "INVALID_ARGUMENT", "targetRoleRef is required.");
            invariant(command.payload.targetProfileRef !== undefined, "INVALID_ARGUMENT", "targetProfileRef is required.");
            invariant(command.payload.hostActionType !== undefined, "INVALID_ARGUMENT", "hostActionType is required.");
            invariant(command.payload.expiresAt !== undefined, "INVALID_ARGUMENT", "expiresAt is required.");
            const signalId = this.ids.next("dispatch");
            const dispatch: DispatchSignal = {
              signalId,
              taskId: task.taskId,
              createdFromTaskVersion: task.taskVersion,
              signalType: "ROLE_WORK_WAKE",
              targetRole: command.payload.targetRoleRef!,
              targetProfileRef: command.payload.targetProfileRef!,
              // Task conversationRef is Controller/Task context, not Browser page identity.
              // Browser targeting must never silently inherit it. Omitted means match the
              // unique READY Binding by role + GPT and let BHR validate/promote conversation.
              conversationRef: command.payload.conversationRef ?? null,
              hostCommandType: "EXECUTE_APPROVED_UI_ACTION",
              hostCommandRef: `host-command:${signalId}`,
              browserActionType: command.payload.hostActionType!,
              payloadRef: command.payload.inputRef ?? null,
              preconditions: command.payload.preconditions ?? {},
              approvalRef: command.payload.approvalRef ?? null,
              expiresAt: command.payload.expiresAt!,
              workItemId,
              status: "PENDING",
              claimEpoch: 0,
              claim: null,
              attemptCount: 0,
              idempotencyKey: `role-work-wake:${workItemId}:1`,
              createdAt: now,
              deliveredAt: null,
              deliveryReceipt: null,
              deliveryId: null,
              reportToken: null,
              reportTokenExpiresAt: null,
              reportTokenConsumedAt: null,
              hostResultStatus: "PENDING",
              hostResultRef: null,
              hostResultSummary: null,
              hostEvidenceRefs: [],
              reportedAt: null,
              lastError: null,
            };
            state.dispatchSignals[signalId] = dispatch;
            dispatchIds.push(signalId);
            eventSpecs.push({
              type: "HOST_DISPATCH_CREATED",
              payload: { dispatchIds: [signalId], workItemId },
            });
          }
          plan = withPlanVersion(
            updateNode(
              plan,
              node.nodeId,
              (item) => ({
                ...item,
                status: "WAITING_RESULT",
                workRefs: addUnique(item.workRefs, [workItemId]),
              }),
              now,
            ),
            now,
          );
          task = { ...task, plan, status: "WAITING_FOR_ROLE_WORK" };
          releaseClaim = true;
          eventSpecs.push({
            type: "ROLE_WORK_REQUESTED",
            payload: { workItemId, nodeId: node.nodeId, requiredRole: workItem.requiredRole },
          });
          break;
        }
        case "REQUEST_APPROVAL": {
          invariant(plan !== null, "INVALID_PLAN", "Task has no plan.");
          const command = input.command;
          const approvalNode = getPlanNode(task, command.payload.nodeId);
          invariant(
            plan.currentNodeId === approvalNode.nodeId,
            "COMMAND_NOT_ALLOWED",
            "Only the current Plan Node can request approval.",
            { currentNodeId: plan.currentNodeId, requestedNodeId: approvalNode.nodeId },
          );
          invariant(
            ["READY", "IN_PROGRESS"].includes(approvalNode.status) &&
              dependenciesSatisfied(plan, approvalNode),
            "COMMAND_NOT_ALLOWED",
            "Current Plan Node cannot request approval before it is executable.",
            { nodeId: approvalNode.nodeId, nodeStatus: approvalNode.status },
          );
          plan = withPlanVersion(
            updateNode(
              plan,
              command.payload.nodeId,
              (node) => ({
                ...node,
                status: "WAITING_APPROVAL",
                approvalRef: command.payload.approvalRef,
              }),
              now,
            ),
            now,
          );
          task = {
            ...task,
            plan,
            status: "WAITING_FOR_APPROVAL",
            approvalRefs: addUnique(task.approvalRefs, [command.payload.approvalRef]),
          };
          releaseClaim = true;
          eventSpecs.push({
            type: "APPROVAL_REQUESTED",
            payload: { nodeId: command.payload.nodeId, approvalRef: command.payload.approvalRef },
          });
          break;
        }
        case "BLOCK_TASK": {
          task = { ...task, status: "BLOCKED", blockedReason: input.command.payload.reason };
          releaseClaim = true;
          eventSpecs.push({ type: "TASK_BLOCKED", payload: { reason: input.command.payload.reason } });
          break;
        }
        case "PAUSE_TASK": {
          task = {
            ...task,
            status: "PAUSED",
            pausedReason: input.command.payload.reason,
            resumeStatus: task.status,
          };
          releaseClaim = true;
          eventSpecs.push({
            type: "TASK_PAUSED",
            payload: {
              reason: input.command.payload.reason,
              resumeStatus: task.resumeStatus!,
            },
          });
          break;
        }
        case "RESUME_TASK": {
          invariant(task.status === "PAUSED", "COMMAND_NOT_ALLOWED", "Only a paused Task can resume.");
          const resumeStatus = deriveResumeStatus(state, task);
          task = {
            ...task,
            status: resumeStatus,
            pausedReason: null,
            resumeStatus: null,
          };
          releaseClaim = true;
          eventSpecs.push({
            type: "TASK_RESUMED",
            payload: {
              reason: input.command.payload.reason ?? "resume-requested",
              resumedTo: resumeStatus,
            },
          });
          break;
        }
        case "COMPLETE_TASK": {
          invariant(plan !== null, "INVALID_PLAN", "Task has no plan.");
          invariant(
            plan.status === "COMPLETED" && isPlanComplete(plan),
            "COMMAND_NOT_ALLOWED",
            "Task cannot complete before its Plan is complete.",
          );
          task = {
            ...task,
            status: "COMPLETED",
            resumeStatus: null,
            terminalSummary: input.command.payload.summary,
          };
          releaseClaim = true;
          eventSpecs.push({
            type: "TASK_COMPLETED",
            payload: { summary: input.command.payload.summary },
          });
          break;
        }
        case "FAIL_TASK": {
          if (plan !== null) plan = cancelUnfinishedNodes(plan, true, now);
          task = {
            ...task,
            plan,
            status: "FAILED",
            resumeStatus: null,
            terminalSummary: input.command.payload.reason,
          };
          releaseClaim = true;
          eventSpecs.push({ type: "TASK_FAILED", payload: { reason: input.command.payload.reason } });
          break;
        }
        case "RELEASE_CLAIM": {
          releaseClaim = true;
          break;
        }
      }

      task = {
        ...task,
        taskVersion: task.taskVersion + 1,
        controllerClaim: releaseClaim ? null : task.controllerClaim,
        updatedAt: now,
      };
      assertTaskConsistency(task);
      const eventIds: string[] = [];
      let causationId = input.causationId ?? current.latestEventId;
      for (const spec of eventSpecs) {
        const item = appendEvent(
          state,
          task,
          spec.type,
          input.producerRef,
          spec.payload,
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        eventIds.push(item.eventId);
        causationId = item.eventId;
      }
      if (releaseClaim) {
        const item = appendEvent(
          state,
          task,
          "CONTROLLER_CLAIM_RELEASED",
          input.producerRef,
          { claimId: current.controllerClaim!.claimId, reason: "command-complete" },
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        eventIds.push(item.eventId);
        causationId = item.eventId;
      }
      if (shouldMaterializeControllerDispatch(state, task)) {
        const signal = createControllerDispatchRecord(state, task, now, this.ids);
        dispatchIds.push(signal.signalId);
        const item = appendEvent(
          state,
          task,
          "HOST_DISPATCH_CREATED",
          "task-control-command-outbox",
          { dispatchIds: [signal.signalId], sourceCommand: input.command.type },
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        eventIds.push(item.eventId);
        causationId = item.eventId;
      }
      task = { ...task, latestEventId: causationId };
      state.tasks[task.taskId] = task;
      const commandResult: ControllerCommandReceipt = {
        taskId: task.taskId,
        taskVersion: task.taskVersion,
        planVersion: task.plan?.planVersion ?? null,
        eventIds,
        workItemIds,
        dispatchIds,
      };
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        commandResult as unknown as JsonValue,
        now,
      );
      return commandResult;
    });

    await this.reconciler.reconcile(input.taskId);
    return result;
  }

  async listAvailableWork(roleId?: string): Promise<readonly WorkItem[]> {
    return this.store.read((state) =>
      Object.values(state.workItems)
        .filter((item) => {
          const task = state.tasks[item.taskId];
          return (
            item.status === "PENDING" &&
            task !== undefined &&
            !["PAUSED", "COMPLETED", "FAILED", "CANCELLED"].includes(task.status) &&
            (roleId === undefined || item.requiredRole === roleId)
          );
        })
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    );
  }

  async listPendingWorkItems(targetDomain?: string): Promise<readonly WorkItem[]> {
    return this.store.read((state) =>
      Object.values(state.workItems)
        .filter((item) => item.status === "PENDING" && (targetDomain === undefined || item.targetDomain === targetDomain))
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    );
  }

  async claimWorkItem(input: ClaimWorkItemInput): Promise<WorkClaimResult> {
    assertContractVersion(input.contractVersion);
    const scope = `work.claim:${input.workItemId}:${input.claimantId}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<WorkClaimResult>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      const parentTask = state.tasks[item.taskId];
      invariant(parentTask !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      if (input.expectedTaskVersion !== undefined) {
        assertExpectedVersions(parentTask, input.expectedTaskVersion);
      }
      invariant(
        parentTask.plan?.currentNodeId === item.planNodeId,
        "COMMAND_NOT_ALLOWED",
        "Work Item no longer belongs to the current Plan Node.",
        { currentNodeId: parentTask.plan?.currentNodeId ?? null, planNodeId: item.planNodeId },
      );
      invariant(
        !["PAUSED", "COMPLETED", "FAILED", "CANCELLED"].includes(parentTask.status),
        "COMMAND_NOT_ALLOWED",
        "Work Item cannot be claimed while Task is paused or terminal.",
      );
      invariant(item.requiredRole === input.roleId, "ROLE_NOT_ALLOWED", "Role cannot claim Work Item.", {
        requiredRole: item.requiredRole,
        actualRole: input.roleId,
      });
      const nowDate = this.clock.now();
      if (item.claim !== null && !isClaimExpired(item.claim.expiresAt, nowDate)) {
        throw new TaskControlError("WORK_ALREADY_CLAIMED", "Work Item is already claimed.");
      }
      invariant(item.status === "PENDING" || item.status === "CLAIMED", "COMMAND_NOT_ALLOWED", "Work Item is not claimable.");
      const replacedClaim = item.claim;
      const claim = lease(
        this.ids,
        "work",
        input.claimantId,
        item.claimEpoch + 1,
        nowDate,
        input.leaseMs,
      );
      const now = nowDate.toISOString();
      const claimed: WorkItem = {
        ...item,
        status: "CLAIMED",
        claimEpoch: claim.claimEpoch,
        claim,
        claimedAt: now,
      };
      state.workItems[item.workItemId] = claimed;
      let task: TaskAggregate = {
        ...parentTask,
        taskVersion: parentTask.taskVersion + 1,
        updatedAt: now,
      };
      let causationId = parentTask.latestEventId;
      if (replacedClaim !== null) {
        const releasedEvent = appendEvent(
          state,
          task,
          "WORK_ITEM_CLAIM_RELEASED",
          input.claimantId,
          {
            workItemId: item.workItemId,
            claimId: replacedClaim.claimId,
            claimEpoch: replacedClaim.claimEpoch,
            reason: "expired-replaced",
          },
          now,
          this.ids,
          null,
          causationId,
        );
        causationId = releasedEvent.eventId;
      }
      const claimedEvent = appendEvent(
        state,
        task,
        "WORK_ITEM_CLAIMED",
        input.claimantId,
        {
          workItemId: item.workItemId,
          claimId: claim.claimId,
          claimEpoch: claim.claimEpoch,
          reclaimed: item.claimEpoch > 0,
        },
        now,
        this.ids,
        null,
        causationId,
      );
      task = { ...task, latestEventId: claimedEvent.eventId };
      state.tasks[task.taskId] = task;
      const result: WorkClaimResult = { workItem: claimed };
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        result as unknown as JsonValue,
        now,
      );
      return result;
    });
  }

  async startWorkItem(input: StartWorkItemInput): Promise<WorkItem> {
    assertContractVersion(input.contractVersion);
    const scope = `work.start:${input.workItemId}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<WorkItem>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      this.assertActiveLease(item.claim, input.claimToken);
      invariant(item.status === "CLAIMED", "COMMAND_NOT_ALLOWED", "Only a claimed Work Item can start.");
      const current = state.tasks[item.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      assertExpectedVersions(current, input.expectedTaskVersion);
      invariant(
        current.plan?.currentNodeId === item.planNodeId,
        "COMMAND_NOT_ALLOWED",
        "Work Item no longer belongs to the current Plan Node.",
        { currentNodeId: current.plan?.currentNodeId ?? null, planNodeId: item.planNodeId },
      );
      const now = this.clock.now().toISOString();
      const started: WorkItem = { ...item, status: "RUNNING", startedAt: now };
      state.workItems[item.workItemId] = started;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        updatedAt: now,
      };
      const event = appendEvent(
        state,
        task,
        "WORK_ITEM_STARTED",
        input.producerRef,
        { workItemId: item.workItemId, attempt: item.attempt },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        started as unknown as JsonValue,
        now,
      );
      return started;
    });
  }

  async reportWorkProgress(input: ReportWorkProgressInput): Promise<WorkItem> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "work.progress");
    if (input.progressRef !== undefined) assertReference(input.progressRef, "progressRef");
    const scope = `work.progress:${input.workItemId}:${input.progress.toLowerCase()}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<WorkItem>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      this.assertActiveLease(item.claim, input.claimToken);
      invariant(
        item.status === "CLAIMED" || item.status === "RUNNING",
        "COMMAND_NOT_ALLOWED",
        "Only active Work Items can report non-terminal progress.",
      );
      const current = state.tasks[item.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      assertExpectedVersions(current, input.expectedTaskVersion);
      invariant(!isTerminalTaskStatus(current.status), "COMMAND_NOT_ALLOWED", "Terminal Task cannot accept Work progress.");
      invariant(
        current.plan?.currentNodeId === item.planNodeId,
        "COMMAND_NOT_ALLOWED",
        "Work progress does not belong to the current Plan Node.",
      );
      const now = this.clock.now().toISOString();
      const evidenceRefs = assertEvidenceRefs(input.evidenceRefs, "evidenceRefs");
      const progressed: WorkItem = {
        ...item,
        status: "RUNNING",
        startedAt: item.startedAt ?? now,
        progressStatus: input.progress,
        progressRef: input.progressRef ?? null,
        progressSummary: input.summary ?? null,
        progressEvidenceRefs: evidenceRefs,
      };
      state.workItems[item.workItemId] = progressed;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        updatedAt: now,
      };
      const event = appendEvent(
        state,
        task,
        input.progress === "ACCEPTED" ? "ROLE_WORK_ACCEPTED" : "ROLE_WORK_PARTIAL",
        input.producerRef,
        {
          workItemId: item.workItemId,
          progressRef: input.progressRef ?? null,
          summary: input.summary ?? "",
          evidenceRefs,
        },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        progressed as unknown as JsonValue,
        now,
      );
      return progressed;
    });
  }

  async completeWorkItem(input: CompleteWorkItemInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "work.complete");
    assertReference(input.resultRef, "resultRef");
    return this.reportWork(input, true);
  }

  async failWorkItem(input: FailWorkItemInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "work.fail");
    return this.reportWork(input, false);
  }

  /** Compatibility alias retained for the first-round internal API. */
  async reportWorkResult(input: ReportWorkResultInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "work.complete");
    assertReference(input.resultRef, "resultRef");
    return this.reportWork(input, true);
  }

  /** Compatibility alias retained for the first-round internal API. */
  async reportWorkFailure(input: ReportWorkFailureInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "work.fail");
    return this.reportWork(input, false);
  }

  private async reportWork(
    input: CompleteWorkItemInput | FailWorkItemInput | ReportWorkResultInput | ReportWorkFailureInput,
    succeeded: boolean,
  ): Promise<TaskAggregate> {
    const scope = `work.report:${input.workItemId}:${succeeded ? "success" : "failure"}`;
    const fingerprint = requestFingerprint({ ...input, succeeded });
    const receipt = await this.store.transact((state) => {
      const duplicate = idempotencyGet<TaskAggregate>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      this.assertActiveLease(item.claim, input.claimToken);
      invariant(
        item.status === "CLAIMED" || item.status === "RUNNING",
        "COMMAND_NOT_ALLOWED",
        "Work Item is not active.",
      );
      const current = state.tasks[item.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      if (input.expectedTaskVersion !== undefined) {
        assertExpectedVersions(current, input.expectedTaskVersion);
      }
      invariant(!isTerminalTaskStatus(current.status), "COMMAND_NOT_ALLOWED", "Terminal Task cannot accept Work result.");
      invariant(current.plan !== null, "INVALID_PLAN", "Task has no plan.");
      invariant(
        current.plan.currentNodeId === item.planNodeId,
        "COMMAND_NOT_ALLOWED",
        "Work result does not belong to the current Plan Node.",
        { currentNodeId: current.plan.currentNodeId, planNodeId: item.planNodeId },
      );
      const now = this.clock.now().toISOString();
      const resultRef = succeeded ? (input as CompleteWorkItemInput).resultRef : null;
      const resultSummary = succeeded ? (input as CompleteWorkItemInput).summary ?? "" : null;
      const failedInput = succeeded ? null : (input as FailWorkItemInput);
      const evidenceRefs = assertEvidenceRefs(input.evidenceRefs, "evidenceRefs");
      state.workItems[item.workItemId] = {
        ...item,
        status: succeeded ? "SUCCEEDED" : "FAILED",
        claim: null,
        resultRef,
        resultSummary,
        evidenceRefs,
        errorCode: failedInput?.errorCode ?? null,
        errorSummary: failedInput?.errorSummary ?? null,
        retryable: failedInput?.retryable ?? null,
        completedAt: now,
      };
      let plan = updateNode(
        current.plan,
        item.planNodeId,
        (node) => ({
          ...node,
          status: succeeded ? "IN_PROGRESS" : "BLOCKED",
          resultRefs: resultRef === null ? node.resultRefs : addUnique(node.resultRefs, [resultRef]),
          summary: succeeded
            ? resultSummary || node.summary
            : failedInput!.errorSummary,
        }),
        now,
      );
      plan = withPlanVersion(plan, now);
      let task = setOperationalStatus(
        {
          ...current,
          taskVersion: current.taskVersion + 1,
          plan,
          latestResultRefs:
            resultRef === null ? current.latestResultRefs : addUnique(current.latestResultRefs, [resultRef]),
          updatedAt: now,
        },
        "READY_FOR_CONTROLLER",
      );
      const itemEvent = appendEvent(
        state,
        task,
        succeeded ? "ROLE_WORK_SUCCEEDED" : "ROLE_WORK_FAILED",
        input.producerRef,
        succeeded
          ? {
              workItemId: item.workItemId,
              resultRef: resultRef!,
              summary: resultSummary ?? "",
              evidenceRefs,
            }
          : {
              workItemId: item.workItemId,
              errorCode: failedInput!.errorCode,
              errorSummary: failedInput!.errorSummary,
              retryable: failedInput!.retryable ?? false,
              evidenceRefs,
            },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      let latestEventId = itemEvent.eventId;
      if (current.controllerClaim !== null) {
        task = { ...task, controllerClaim: null };
        const released = appendEvent(
          state,
          task,
          "CONTROLLER_CLAIM_RELEASED",
          input.producerRef,
          {
            claimId: current.controllerClaim.claimId,
            reason: "external-work-result",
          },
          now,
          this.ids,
          input.correlationId ?? null,
          latestEventId,
        );
        latestEventId = released.eventId;
      }
      task = { ...task, latestEventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        task as unknown as JsonValue,
        now,
      );
      return task;
    });
    await this.reconciler.reconcile(receipt.taskId);
    return receipt;
  }

  async retryWorkItem(input: RetryWorkItemInput): Promise<WorkItem> {
    assertContractVersion(input.contractVersion);
    const scope = `work.retry:${input.workItemId}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<WorkItem>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      const current = state.tasks[item.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      assertExpectedVersions(current, input.expectedTaskVersion);
      invariant(
        item.status === "EXPIRED" || (item.status === "FAILED" && item.retryable === true),
        "COMMAND_NOT_ALLOWED",
        "Only expired or retryable failed Work Items can retry.",
      );
      invariant(
        current.plan?.currentNodeId === item.planNodeId,
        "COMMAND_NOT_ALLOWED",
        "Work Item no longer belongs to the current Plan Node.",
      );
      const now = this.clock.now().toISOString();
      const retried: WorkItem = {
        ...item,
        status: "PENDING",
        attempt: item.attempt + 1,
        claim: null,
        resultRef: null,
        resultSummary: null,
        evidenceRefs: [],
        errorCode: null,
        errorSummary: null,
        retryable: null,
        progressStatus: "NONE",
        progressRef: null,
        progressSummary: null,
        progressEvidenceRefs: [],
        claimedAt: null,
        startedAt: null,
        completedAt: null,
      };
      state.workItems[item.workItemId] = retried;
      let plan = current.plan;
      if (plan !== null && plan.currentNodeId === item.planNodeId) {
        plan = withPlanVersion(
          updateNode(
            plan,
            item.planNodeId,
            (node) => ({ ...node, status: "WAITING_RESULT", summary: "" }),
            now,
          ),
          now,
        );
      }
      let task = setOperationalStatus(
        {
          ...current,
          taskVersion: current.taskVersion + 1,
          plan,
          blockedReason: null,
          updatedAt: now,
        },
        "WAITING_FOR_ROLE_WORK",
      );
      const event = appendEvent(
        state,
        task,
        "WORK_ITEM_RETRIED",
        input.producerRef,
        { workItemId: item.workItemId, attempt: retried.attempt },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        retried as unknown as JsonValue,
        now,
      );
      return retried;
    });
  }

  async expireWorkItem(input: ExpireWorkItemInput): Promise<WorkItem> {
    assertContractVersion(input.contractVersion);
    assertNonEmpty(input.reason, "reason");
    const scope = `work.expire:${input.workItemId}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<WorkItem>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      invariant(
        ["PENDING", "CLAIMED", "RUNNING"].includes(item.status),
        "COMMAND_NOT_ALLOWED",
        "Work Item is not expirable.",
      );
      const current = state.tasks[item.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      assertExpectedVersions(current, input.expectedTaskVersion);
      const now = this.clock.now().toISOString();
      const expired: WorkItem = {
        ...item,
        status: "EXPIRED",
        claim: null,
        errorCode: "WORK_EXPIRED",
        errorSummary: input.reason,
        retryable: true,
        completedAt: now,
      };
      state.workItems[item.workItemId] = expired;
      let plan = current.plan;
      if (plan !== null && plan.currentNodeId === item.planNodeId) {
        plan = withPlanVersion(
          updateNode(
            plan,
            item.planNodeId,
            (node) => ({ ...node, status: "BLOCKED", summary: input.reason }),
            now,
          ),
          now,
        );
      }
      let task = setOperationalStatus(
        {
          ...current,
          taskVersion: current.taskVersion + 1,
          plan,
          blockedReason: input.reason,
          updatedAt: now,
        },
        "READY_FOR_CONTROLLER",
      );
      let causationId = current.latestEventId;
      if (item.claim !== null) {
        const released = appendEvent(
          state,
          task,
          "WORK_ITEM_CLAIM_RELEASED",
          input.producerRef,
          {
            workItemId: item.workItemId,
            claimId: item.claim.claimId,
            claimEpoch: item.claim.claimEpoch,
            reason: "work-expired",
          },
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        causationId = released.eventId;
      }
      const event = appendEvent(
        state,
        task,
        "WORK_ITEM_EXPIRED",
        input.producerRef,
        { workItemId: item.workItemId, reason: input.reason },
        now,
        this.ids,
        input.correlationId ?? null,
        causationId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        expired as unknown as JsonValue,
        now,
      );
      return expired;
    });
  }

  async resolveApproval(input: ResolveApprovalInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    assertNonEmpty(input.approvalRef, "approvalRef");
    assertNoInlineResultBody(input, "approval.resolve");
    if (input.resultRef !== undefined) assertReference(input.resultRef, "resultRef");
    assertBoundedSummary(input.summary, "summary");
    assertNonEmpty(input.producerRef, "producerRef");
    assertNonEmpty(input.idempotencyKey, "idempotencyKey");
    const scope = `approval.resolve:${input.taskId}:${input.approvalRef}`;
    const fingerprint = requestFingerprint(input);
    const receipt = await this.store.transact((state) => {
      const duplicate = idempotencyGet<TaskAggregate>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const current = state.tasks[input.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", {
        taskId: input.taskId,
      });
      invariant(
        !isTerminalTaskStatus(current.status),
        "COMMAND_NOT_ALLOWED",
        "Terminal Task cannot accept Approval resolution.",
      );
      assertExpectedVersions(current, input.expectedTaskVersion, input.expectedPlanVersion);
      invariant(current.plan !== null, "INVALID_PLAN", "Task has no plan.");
      const node = current.plan.nodes.find((item) => item.approvalRef === input.approvalRef);
      invariant(
        node !== undefined &&
          node.status === "WAITING_APPROVAL" &&
          current.approvalRefs.includes(input.approvalRef),
        "COMMAND_NOT_ALLOWED",
        "Approval is not pending for this Task.",
        { approvalRef: input.approvalRef },
      );

      const now = this.clock.now().toISOString();
      const approved = input.resolution === "APPROVED";
      let plan = updateNode(
        current.plan,
        node.nodeId,
        (item) => ({
          ...item,
          status: approved ? "IN_PROGRESS" : "BLOCKED",
          approvalRef: null,
          resultRefs:
            input.resultRef === undefined
              ? item.resultRefs
              : addUnique(item.resultRefs, [input.resultRef]),
          summary: input.summary ?? item.summary,
        }),
        now,
      );
      plan = withPlanVersion(plan, now);
      let task = setOperationalStatus(
        {
          ...current,
          taskVersion: current.taskVersion + 1,
          plan,
          approvalRefs: removeValue(current.approvalRefs, input.approvalRef),
          latestResultRefs:
            input.resultRef === undefined
              ? current.latestResultRefs
              : addUnique(current.latestResultRefs, [input.resultRef]),
          blockedReason: approved ? null : input.summary ?? `approval-${input.resolution.toLowerCase()}`,
          updatedAt: now,
        },
        "READY_FOR_CONTROLLER",
      );

      const resolved = appendEvent(
        state,
        task,
        "APPROVAL_RESOLVED",
        input.producerRef,
        {
          approvalRef: input.approvalRef,
          nodeId: node.nodeId,
          resolution: input.resolution,
          resultRef: input.resultRef ?? null,
          summary: input.summary ?? "",
        },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      let latestEventId = resolved.eventId;
      if (current.controllerClaim !== null) {
        task = { ...task, controllerClaim: null };
        const released = appendEvent(
          state,
          task,
          "CONTROLLER_CLAIM_RELEASED",
          input.producerRef,
          {
            claimId: current.controllerClaim.claimId,
            reason: "approval-resolved",
          },
          now,
          this.ids,
          input.correlationId ?? null,
          latestEventId,
        );
        latestEventId = released.eventId;
      }
      task = { ...task, latestEventId };
      assertTaskConsistency(task);
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        task as unknown as JsonValue,
        now,
      );
      return task;
    });
    await this.reconciler.reconcile(receipt.taskId);
    return receipt;
  }

  async listPendingDispatches(): Promise<readonly DispatchSignal[]> {
    return this.store.read((state) => listRuntimeDispatchQueue(state));
  }

  async claimDispatch(input: ClaimDispatchInput): Promise<DispatchClaimResult> {
    assertContractVersion(input.contractVersion);
    const scope = `dispatch.claim:${input.signalId}:${input.hostId}`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<DispatchClaimResult>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const signal = state.dispatchSignals[input.signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId: input.signalId,
      });
      const parentTask = state.tasks[signal.taskId];
      invariant(parentTask !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: signal.taskId });
      invariant(
        !["PAUSED", "COMPLETED", "FAILED", "CANCELLED"].includes(parentTask.status),
        "COMMAND_NOT_ALLOWED",
        "New Dispatch delivery cannot be claimed while Task is paused or terminal.",
      );
      const nowDate = this.clock.now();
      if (signal.claim !== null && !isClaimExpired(signal.claim.expiresAt, nowDate)) {
        throw new TaskControlError("DISPATCH_ALREADY_CLAIMED", "Dispatch Signal is already claimed.");
      }
      invariant(
        signal.status === "PENDING" || signal.status === "CLAIMED",
        "COMMAND_NOT_ALLOWED",
        "Dispatch delivery is not claimable after Delivery Ack; the persisted Report Token owns the result phase.",
      );
      const replacedClaim = signal.claim;
      const claim = lease(
        this.ids,
        "dispatch",
        input.hostId,
        signal.claimEpoch + 1,
        nowDate,
        input.leaseMs,
      );
      const now = nowDate.toISOString();
      const claimed: DispatchSignal = {
        ...signal,
        status: "CLAIMED",
        claimEpoch: claim.claimEpoch,
        claim,
        attemptCount: signal.attemptCount + 1,
      };
      state.dispatchSignals[signal.signalId] = claimed;
      let task: TaskAggregate = {
        ...parentTask,
        taskVersion: parentTask.taskVersion + 1,
        updatedAt: now,
      };
      let causationId = parentTask.latestEventId;
      if (replacedClaim !== null) {
        const releasedEvent = appendEvent(
          state,
          task,
          "DISPATCH_CLAIM_RELEASED",
          input.hostId,
          {
            signalId: signal.signalId,
            claimId: replacedClaim.claimId,
            claimEpoch: replacedClaim.claimEpoch,
            reason: "expired-replaced",
          },
          now,
          this.ids,
          null,
          causationId,
        );
        causationId = releasedEvent.eventId;
      }
      const claimedEvent = appendEvent(
        state,
        task,
        "DISPATCH_CLAIMED",
        input.hostId,
        {
          signalId: signal.signalId,
          claimId: claim.claimId,
          claimEpoch: claim.claimEpoch,
          reclaimed: signal.claimEpoch > 0,
          phase: "delivery",
        },
        now,
        this.ids,
        null,
        causationId,
      );
      task = { ...task, latestEventId: claimedEvent.eventId };
      state.tasks[task.taskId] = task;
      const result: DispatchClaimResult = { dispatch: claimed };
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        result as unknown as JsonValue,
        now,
      );
      return result;
    });
  }

  async materializeHostCommand(signalId: string): Promise<HostCommandMaterialization> {
    return this.store.read((state) => {
      const signal = state.dispatchSignals[signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId,
      });
      return {
        dispatchId: signal.signalId,
        commandId: signal.hostCommandRef,
        taskId: signal.taskId,
        createdFromTaskVersion: signal.createdFromTaskVersion,
        workItemId: signal.workItemId,
        targetRole: signal.targetRole,
        targetProfileRef: signal.targetProfileRef,
        conversationRef: signal.conversationRef,
        commandType: signal.hostCommandType,
        actionType: signal.browserActionType ??
          (signal.hostCommandType === "OPEN_ROLE_SESSION" ? "OPEN_OR_RESUME_SESSION" : "CONTINUE_ROLE_SESSION"),
        commandRef: signal.hostCommandRef,
        payloadRef: signal.payloadRef,
        preconditions: signal.preconditions,
        approvalRef: signal.approvalRef,
        expiresAt: signal.expiresAt,
        idempotencyKey: signal.idempotencyKey,
      };
    });
  }

  async acknowledgeDispatch(input: ReportDispatchInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    const scope = `dispatch.delivery:${input.signalId}:ack`;
    const fingerprint = requestFingerprint({ ...input, outcome: "delivered" });
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<DispatchSignal>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const signal = state.dispatchSignals[input.signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId: input.signalId,
      });
      this.assertActiveLease(signal.claim, input.claimToken);
      invariant(
        signal.status === "CLAIMED" || signal.status === "DELIVERED" || signal.status === "CONSUMED",
        "COMMAND_NOT_ALLOWED",
        "Dispatch cannot acknowledge delivery in its current state.",
      );
      if (signal.deliveredAt !== null) {
        idempotencyPut(
          state,
          scope,
          input.idempotencyKey,
          fingerprint,
          signal as unknown as JsonValue,
          this.clock.now().toISOString(),
        );
        return signal;
      }
      const current = state.tasks[signal.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: signal.taskId });
      const now = this.clock.now().toISOString();
      const deliveryReceipt = this.ids.token("delivery-receipt");
      const reportToken = this.ids.token("report-token");
      const updatedSignal: DispatchSignal = {
        ...signal,
        status: signal.status === "CONSUMED" ? "CONSUMED" : "DELIVERED",
        claim: null,
        deliveredAt: now,
        deliveryReceipt,
        deliveryId: input.deliveryId ?? `${signal.hostCommandRef}:delivery`,
        reportToken,
        reportTokenExpiresAt: new Date(Date.parse(now) + 60 * 60_000).toISOString(),
        reportTokenConsumedAt: null,
        lastError: null,
      };
      state.dispatchSignals[signal.signalId] = updatedSignal;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        updatedAt: now,
      };
      const event = appendEvent(
        state,
        task,
        "HOST_DISPATCH_DELIVERED",
        input.producerRef,
        { signalId: signal.signalId },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        updatedSignal as unknown as JsonValue,
        now,
      );
      return updatedSignal;
    });
  }

  async failDispatch(input: ReportDispatchInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    const scope = `dispatch.delivery:${input.signalId}:fail`;
    const fingerprint = requestFingerprint({ ...input, outcome: "failed" });
    const result = await this.store.transact((state) => {
      const duplicate = idempotencyGet<DispatchSignal>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const signal = state.dispatchSignals[input.signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId: input.signalId,
      });
      this.assertActiveLease(signal.claim, input.claimToken);
      invariant(
        signal.status === "CLAIMED",
        "COMMAND_NOT_ALLOWED",
        "Only an undelivered claimed Dispatch can fail delivery.",
      );
      const current = state.tasks[signal.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: signal.taskId });
      const now = this.clock.now().toISOString();
      const updatedSignal: DispatchSignal = {
        ...signal,
        status: "FAILED",
        claim: null,
        hostResultStatus: "FAILED",
        reportedAt: now,
        lastError: input.errorSummary ?? "Host dispatch delivery failed.",
      };
      state.dispatchSignals[signal.signalId] = updatedSignal;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        updatedAt: now,
      };
      const event = appendEvent(
        state,
        task,
        "HOST_DISPATCH_FAILED",
        input.producerRef,
        { signalId: signal.signalId, errorSummary: updatedSignal.lastError! },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        updatedSignal as unknown as JsonValue,
        now,
      );
      return updatedSignal;
    });
    await this.reconciler.reconcile(result.taskId);
    return result;
  }

  async reportHostResult(input: ReportHostResultInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "host.result");
    assertReference(input.hostResultRef, "hostResultRef");
    return this.finishHostResult(input, true);
  }

  async reportUncertainHostResult(input: ReportUncertainHostResultInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "host.uncertain");
    assertNonEmpty(input.summary, "summary");
    assertNonEmpty(input.stage, "stage");
    assertReference(input.commandFingerprint, "commandFingerprint");
    if (input.pageIdentityRef !== undefined) assertReference(input.pageIdentityRef, "pageIdentityRef");
    const scope = `dispatch.host-result:${input.signalId}:uncertain`;
    const fingerprint = requestFingerprint(input);
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<DispatchSignal>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const signal = state.dispatchSignals[input.signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId: input.signalId,
      });
      this.assertHostReportCredential(signal, input.reportToken, input.claimToken);
      invariant(
        signal.deliveredAt !== null || input.claimToken !== undefined,
        "COMMAND_NOT_ALLOWED",
        "Uncertain Host Result requires a delivery or claim credential.",
      );
      invariant(
        (signal.status === "DELIVERED" || signal.status === "CONSUMED") &&
          signal.hostResultStatus === "PENDING",
        "COMMAND_NOT_ALLOWED",
        "Dispatch cannot accept an uncertain Host Result in its current state.",
      );
      const current = state.tasks[signal.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: signal.taskId });
      const now = this.clock.now().toISOString();
      const evidenceRefs = assertEvidenceRefs(input.evidenceRefs, "evidenceRefs");
      const updatedSignal: DispatchSignal = {
        ...signal,
        status: "CONSUMED",
        claim: null,
        reportTokenConsumedAt: input.reportToken === undefined ? signal.reportTokenConsumedAt : now,
        hostResultStatus: "UNCERTAIN",
        hostResultRef: null,
        hostResultSummary: input.summary,
        hostEvidenceRefs: evidenceRefs,
        reportedAt: now,
        lastError: null,
      };
      state.dispatchSignals[signal.signalId] = updatedSignal;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        status: "BLOCKED",
        blockedReason: `UNCERTAIN_SIDE_EFFECT:${signal.signalId}`,
        controllerClaim: null,
        updatedAt: now,
      };
      let causationId = current.latestEventId;
      const event = appendEvent(
        state,
        task,
        "HOST_RESULT_UNCERTAIN",
        input.producerRef,
        {
          signalId: signal.signalId,
          stage: input.stage,
          commandFingerprint: input.commandFingerprint,
          pageIdentityRef: input.pageIdentityRef ?? null,
          summary: input.summary,
          evidenceRefs,
          autoRetryAllowed: false,
        },
        now,
        this.ids,
        input.correlationId ?? null,
        causationId,
      );
      causationId = event.eventId;
      if (current.controllerClaim !== null) {
        const released = appendEvent(
          state,
          task,
          "CONTROLLER_CLAIM_RELEASED",
          input.producerRef,
          { claimId: current.controllerClaim.claimId, reason: "uncertain-side-effect" },
          now,
          this.ids,
          input.correlationId ?? null,
          causationId,
        );
        causationId = released.eventId;
      }
      task = { ...task, latestEventId: causationId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        updatedSignal as unknown as JsonValue,
        now,
      );
      return updatedSignal;
    });
  }

  async failHostResult(input: FailHostResultInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    assertNoInlineResultBody(input, "host.result");
    return this.finishHostResult(input, false);
  }

  private async finishHostResult(
    input: ReportHostResultInput | FailHostResultInput,
    succeeded: boolean,
  ): Promise<DispatchSignal> {
    const scope = `dispatch.host-result:${input.signalId}:${succeeded ? "success" : "failure"}`;
    const fingerprint = requestFingerprint({ ...input, succeeded });
    const result = await this.store.transact((state) => {
      const duplicate = idempotencyGet<DispatchSignal>(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
      );
      if (duplicate !== undefined) return duplicate;
      const signal = state.dispatchSignals[input.signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId: input.signalId,
      });
      this.assertHostReportCredential(signal, input.reportToken, input.claimToken);
      invariant(signal.deliveredAt !== null, "COMMAND_NOT_ALLOWED", "Host Result requires delivery acknowledgement.");
      invariant(
        (signal.status === "DELIVERED" || signal.status === "CONSUMED") &&
          signal.hostResultStatus === "PENDING",
        "COMMAND_NOT_ALLOWED",
        "Dispatch cannot accept a Host Result in its current state.",
      );
      const current = state.tasks[signal.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: signal.taskId });
      const now = this.clock.now().toISOString();
      const evidenceRefs = assertEvidenceRefs(input.evidenceRefs, "evidenceRefs");
      const successInput = succeeded ? (input as ReportHostResultInput) : null;
      const failedInput = succeeded ? null : (input as FailHostResultInput);
      const updatedSignal: DispatchSignal = {
        ...signal,
        status: succeeded ? "CONSUMED" : "FAILED",
        claim: null,
        reportTokenConsumedAt: input.reportToken === undefined ? signal.reportTokenConsumedAt : now,
        hostResultStatus: succeeded ? "SUCCEEDED" : "FAILED",
        hostResultRef: successInput?.hostResultRef ?? null,
        hostResultSummary: successInput?.summary ?? null,
        hostEvidenceRefs: evidenceRefs,
        reportedAt: now,
        lastError: failedInput?.errorSummary ?? null,
      };
      state.dispatchSignals[signal.signalId] = updatedSignal;
      let plan = current.plan;
      let latestResultRefs = current.latestResultRefs;
      if (signal.workItemId !== null) {
        const workItem = state.workItems[signal.workItemId];
        invariant(workItem !== undefined, "WORK_ITEM_NOT_FOUND", "Dispatch references a missing Work Item.", {
          workItemId: signal.workItemId,
        });
        state.workItems[signal.workItemId] = {
          ...workItem,
          status: succeeded ? "SUCCEEDED" : "FAILED",
          claim: null,
          resultRef: successInput?.hostResultRef ?? null,
          resultSummary: successInput?.summary ?? null,
          evidenceRefs,
          errorCode: failedInput?.errorCode ?? null,
          errorSummary: failedInput?.errorSummary ?? null,
          retryable: succeeded ? false : false,
          completedAt: now,
        };
        if (plan !== null) {
          plan = withPlanVersion(
            updateNode(
              plan,
              workItem.planNodeId,
              (node) => ({
                ...node,
                status: succeeded ? "COMPLETED" : "FAILED",
                resultRefs: successInput === null ? node.resultRefs : addUnique(node.resultRefs, [successInput.hostResultRef]),
                summary: successInput?.summary ?? failedInput?.errorSummary ?? node.summary,
              }),
              now,
            ),
            now,
          );
        }
        if (successInput !== null) latestResultRefs = addUnique(latestResultRefs, [successInput.hostResultRef]);
      }
      let task: TaskAggregate = setOperationalStatus({
        ...current,
        taskVersion: current.taskVersion + 1,
        plan,
        latestResultRefs,
        updatedAt: now,
      }, signal.workItemId === null ? current.status : "READY_FOR_CONTROLLER");
      const event = appendEvent(
        state,
        task,
        succeeded ? "HOST_RESULT_REPORTED" : "HOST_RESULT_FAILED",
        input.producerRef,
        succeeded
          ? {
              signalId: signal.signalId,
              hostResultRef: successInput!.hostResultRef,
              summary: successInput!.summary ?? "",
              evidenceRefs,
            }
          : {
              signalId: signal.signalId,
              errorCode: failedInput!.errorCode,
              errorSummary: failedInput!.errorSummary,
              evidenceRefs,
            },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: event.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        fingerprint,
        updatedSignal as unknown as JsonValue,
        now,
      );
      return updatedSignal;
    });
    if (!succeeded) await this.reconciler.reconcile(result.taskId);
    return result;
  }

  async reconcile(taskId: string) {
    return this.reconciler.reconcile(taskId);
  }

  async recoverAll() {
    return this.reconciler.recoverAll();
  }

  async getCurrentTask(taskId: string): Promise<TaskAggregate> {
    return this.getTask(taskId);
  }

  async getCurrentWorkItem(workItemId: string): Promise<WorkItem> {
    return this.store.read((state) => {
      const item = state.workItems[workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", { workItemId });
      return item;
    });
  }

  async getCurrentDispatch(signalId: string): Promise<DispatchSignal> {
    return this.store.read((state) => {
      const signal = state.dispatchSignals[signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", { signalId });
      return signal;
    });
  }

  async listTaskEvents(taskId: string): Promise<readonly TaskEvent[]> {
    return this.listEvents(taskId);
  }

  async getTaskTimeline(taskId: string): Promise<readonly TaskEvent[]> {
    return this.listEvents(taskId);
  }

  async getRoleAttentionInbox(roleId?: string): Promise<readonly RoleAttentionEntry[]> {
    return this.store.read((state) => buildRoleAttentionInbox(state, roleId));
  }

  async getWorkItems(taskId: string): Promise<readonly WorkItem[]> {
    return this.store.read((state) => workItemsForTask(state, taskId));
  }

  async getDispatches(taskId: string): Promise<readonly DispatchSignal[]> {
    return this.store.read((state) => dispatchesForTask(state, taskId));
  }

  async snapshot(): Promise<TaskControlState> {
    return this.store.snapshot();
  }

  private assertActiveControllerClaim(task: TaskAggregate, claimToken: string): void {
    invariant(task.controllerClaim !== null, "CLAIM_TOKEN_INVALID", "Task has no active Controller Claim.");
    invariant(task.controllerClaim.claimToken === claimToken, "CLAIM_TOKEN_INVALID", "Controller Claim token is invalid.");
    invariant(!isClaimExpired(task.controllerClaim.expiresAt, this.clock.now()), "CLAIM_EXPIRED", "Controller Claim has expired.");
  }

  private assertActiveLease(claim: LeaseClaim | null, claimToken: string): void {
    invariant(claim !== null, "CLAIM_TOKEN_INVALID", "Object has no active Claim.");
    invariant(claim.claimToken === claimToken, "CLAIM_TOKEN_INVALID", "Claim token is invalid.");
    invariant(!isClaimExpired(claim.expiresAt, this.clock.now()), "CLAIM_EXPIRED", "Claim has expired.");
  }

  private assertHostReportCredential(
    signal: DispatchSignal,
    reportToken: string | undefined,
    claimToken: string | undefined,
  ): void {
    if (reportToken !== undefined) {
      invariant(signal.reportToken !== null, "CLAIM_TOKEN_INVALID", "Dispatch has no Report Token.");
      invariant(signal.reportToken === reportToken, "CLAIM_TOKEN_INVALID", "Report Token is invalid.");
      invariant(signal.reportTokenConsumedAt === null, "COMMAND_NOT_ALLOWED", "Report Token is already consumed.");
      invariant(
        signal.reportTokenExpiresAt !== null && !isClaimExpired(signal.reportTokenExpiresAt, this.clock.now()),
        "CLAIM_EXPIRED",
        "Report Token has expired.",
      );
      return;
    }
    invariant(signal.reportToken === null, "CLAIM_TOKEN_INVALID", "Report Token is required after delivery acknowledgement.");
    invariant(claimToken !== undefined, "CLAIM_TOKEN_INVALID", "Host report credential is missing.");
    this.assertActiveLease(signal.claim, claimToken);
  }
}

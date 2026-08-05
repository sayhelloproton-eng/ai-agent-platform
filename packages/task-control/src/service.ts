import { invariant, TaskControlError } from "./error.js";
import {
  type ClaimControllerInput,
  type ClaimDispatchInput,
  type ClaimWorkItemInput,
  type ControllerClaim,
  type ControllerCommand,
  type CreateTaskInput,
  type DecisionContext,
  type DispatchSignal,
  type IdempotencyRecord,
  type JsonObject,
  type JsonValue,
  type LeaseClaim,
  type PlanNode,
  type PlanOperation,
  type ReportDispatchInput,
  type ReportWorkFailureInput,
  type ReportWorkResultInput,
  type RoleAttentionEntry,
  type SubmitControllerCommandInput,
  type TaskAggregate,
  type TaskControlState,
  type TaskEvent,
  type TaskPlan,
  type WorkItem,
} from "./model.js";
import type { Clock, IdGenerator, TaskControlStore } from "./ports.js";
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
  getPlanNode,
  isClaimExpired,
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

interface ControllerClaimResult {
  readonly claim: ControllerClaim;
  readonly taskVersion: number;
  readonly planVersion: number | null;
}

interface CommandResult {
  readonly taskId: string;
  readonly taskVersion: number;
  readonly planVersion: number | null;
  readonly eventIds: readonly string[];
  readonly workItemIds: readonly string[];
  readonly dispatchIds: readonly string[];
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
): T | undefined {
  const record = state.idempotencyRecords[idempotencyComposite(scope, key)];
  return record === undefined ? undefined : (structuredClone(record.result) as T);
}

function idempotencyPut(
  state: TaskControlState,
  scope: string,
  key: string,
  result: JsonValue,
  now: string,
): void {
  const composite = idempotencyComposite(scope, key);
  const record: IdempotencyRecord = { scope, key, result, createdAt: now };
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
      ["PENDING", "CLAIMED", "DELIVERED"].includes(signal.status),
  );
}

export class TaskControlService {
  readonly reconciler: TaskReconciler;

  constructor(
    private readonly store: TaskControlStore,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {
    this.reconciler = new TaskReconciler(store, clock, ids);
  }

  async createTask(input: CreateTaskInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    assertNonEmpty(input.taskId, "taskId");
    assertNonEmpty(input.title, "title");
    assertNonEmpty(input.objective, "objective");
    assertNonEmpty(input.requiredRole, "requiredRole");
    assertNonEmpty(input.idempotencyKey, "idempotencyKey");
    assertNonEmpty(input.producerRef, "producerRef");

    const scope = `task.create:${input.taskId}`;
    const created = await this.store.transact((state) => {
      const duplicate = idempotencyGet<{ taskId: string }>(state, scope, input.idempotencyKey);
      if (duplicate !== undefined) return duplicate.taskId;
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
        terminalSummary: null,
        createdAt: now,
        updatedAt: now,
      };
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
      }
      task = { ...task, latestEventId: latest.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(state, scope, input.idempotencyKey, { taskId: task.taskId }, now);
      return task.taskId;
    });

    await this.reconciler.reconcile(created);
    return this.getTask(created);
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
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<ControllerClaimResult>(state, scope, input.idempotencyKey);
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
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        controllerClaim: claim,
        updatedAt: now,
      };
      for (const dispatch of activeControllerDispatches(state, task.taskId)) {
        state.dispatchSignals[dispatch.signalId] = {
          ...dispatch,
          status: "CONSUMED",
          claim: null,
        };
      }
      const claimedEvent = appendEvent(
        state,
        task,
        "CONTROLLER_CLAIMED",
        input.profileId,
        { claimId: claim.claimId, roleId: claim.roleId, claimEpoch: claim.claimEpoch },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: claimedEvent.eventId };
      state.tasks[task.taskId] = task;
      const result: ControllerClaimResult = {
        claim,
        taskVersion: task.taskVersion,
        planVersion: task.plan?.planVersion ?? null,
      };
      idempotencyPut(state, scope, input.idempotencyKey, result as unknown as JsonValue, now);
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
    await this.store.transact((state) => {
      const duplicate = idempotencyGet<{ taskId: string }>(state, scope, idempotencyKey);
      if (duplicate !== undefined) return;
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
      idempotencyPut(state, scope, idempotencyKey, { taskId }, now);
    });
    await this.reconciler.reconcile(taskId);
    return this.getTask(taskId);
  }

  async submitControllerCommand(input: SubmitControllerCommandInput): Promise<CommandResult> {
    assertContractVersion(input.commandContractVersion);
    assertNonEmpty(input.idempotencyKey, "idempotencyKey");
    const scope = `controller.command:${input.taskId}`;
    const result = await this.store.transact((state) => {
      const duplicate = idempotencyGet<CommandResult>(state, scope, input.idempotencyKey);
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
            nextPlan = updateNode(
              nextPlan,
              command.payload.nextNodeId,
              (node) => ({ ...node, status: "READY" }),
              now,
            );
            nextPlan = { ...nextPlan, currentNodeId: command.payload.nextNodeId };
          } else {
            nextPlan = { ...nextPlan, currentNodeId: null, status: "COMPLETED" };
          }
          plan = withPlanVersion(nextPlan, now);
          task = { ...task, plan, status: "READY_FOR_CONTROLLER" };
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
            ["READY", "IN_PROGRESS", "BLOCKED"].includes(node.status),
            "COMMAND_NOT_ALLOWED",
            "Plan Node cannot request role work in its current state.",
            { nodeId: node.nodeId, nodeStatus: node.status },
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
            errorCode: null,
            errorSummary: null,
            createdAt: now,
            claimedAt: null,
            completedAt: null,
          };
          state.workItems[workItemId] = workItem;
          workItemIds.push(workItemId);
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
          getPlanNode(task, command.payload.nodeId);
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
          task = { ...task, status: "PAUSED", pausedReason: input.command.payload.reason };
          releaseClaim = true;
          eventSpecs.push({ type: "TASK_PAUSED", payload: { reason: input.command.payload.reason } });
          break;
        }
        case "COMPLETE_TASK": {
          invariant(plan !== null, "INVALID_PLAN", "Task has no plan.");
          invariant(
            plan.status === "COMPLETED" &&
              plan.nodes.every((node) => ["COMPLETED", "SKIPPED", "CANCELLED"].includes(node.status)),
            "COMMAND_NOT_ALLOWED",
            "Task cannot complete before its Plan is complete.",
          );
          task = {
            ...task,
            status: "COMPLETED",
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
      task = { ...task, latestEventId: causationId };
      state.tasks[task.taskId] = task;
      const commandResult: CommandResult = {
        taskId: task.taskId,
        taskVersion: task.taskVersion,
        planVersion: task.plan?.planVersion ?? null,
        eventIds,
        workItemIds,
        dispatchIds: [],
      };
      idempotencyPut(
        state,
        scope,
        input.idempotencyKey,
        commandResult as unknown as JsonValue,
        now,
      );
      return commandResult;
    });

    const reconciled = await this.reconciler.reconcile(input.taskId);
    return {
      ...result,
      taskVersion: reconciled.taskVersion,
      dispatchIds: reconciled.createdDispatchIds,
    };
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

  async claimWorkItem(input: ClaimWorkItemInput): Promise<WorkClaimResult> {
    assertContractVersion(input.contractVersion);
    const scope = `work.claim:${input.workItemId}:${input.claimantId}`;
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<WorkClaimResult>(state, scope, input.idempotencyKey);
      if (duplicate !== undefined) return duplicate;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      const parentTask = state.tasks[item.taskId];
      invariant(parentTask !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
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
      const claim = lease(
        this.ids,
        "work",
        input.claimantId,
        (item.claimEpoch ?? item.claim?.claimEpoch ?? 0) + 1,
        nowDate,
        input.leaseMs,
      );
      const claimed: WorkItem = {
        ...item,
        status: "CLAIMED",
        claimEpoch: claim.claimEpoch,
        claim,
        claimedAt: nowDate.toISOString(),
      };
      state.workItems[item.workItemId] = claimed;
      const result: WorkClaimResult = { workItem: claimed };
      idempotencyPut(state, scope, input.idempotencyKey, result as unknown as JsonValue, nowDate.toISOString());
      return result;
    });
  }

  async reportWorkResult(input: ReportWorkResultInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    return this.reportWork(input, true);
  }

  async reportWorkFailure(input: ReportWorkFailureInput): Promise<TaskAggregate> {
    assertContractVersion(input.contractVersion);
    return this.reportWork(input, false);
  }

  private async reportWork(
    input: ReportWorkResultInput | ReportWorkFailureInput,
    succeeded: boolean,
  ): Promise<TaskAggregate> {
    const scope = `work.report:${input.workItemId}`;
    const taskId = await this.store.transact((state) => {
      const duplicate = idempotencyGet<{ taskId: string }>(state, scope, input.idempotencyKey);
      if (duplicate !== undefined) return duplicate.taskId;
      const item = state.workItems[input.workItemId];
      invariant(item !== undefined, "WORK_ITEM_NOT_FOUND", "Work Item was not found.", {
        workItemId: input.workItemId,
      });
      this.assertActiveLease(item.claim, input.claimToken);
      invariant(item.status === "CLAIMED", "COMMAND_NOT_ALLOWED", "Work Item is not in CLAIMED state.");
      const current = state.tasks[item.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: item.taskId });
      invariant(!isTerminalTaskStatus(current.status), "COMMAND_NOT_ALLOWED", "Terminal Task cannot accept Work result.");
      invariant(current.plan !== null, "INVALID_PLAN", "Task has no plan.");
      const now = this.clock.now().toISOString();
      const resultRef = succeeded ? (input as ReportWorkResultInput).resultRef : null;
      const failedInput = succeeded ? null : (input as ReportWorkFailureInput);
      state.workItems[item.workItemId] = {
        ...item,
        status: succeeded ? "SUCCEEDED" : "FAILED",
        claim: null,
        resultRef,
        errorCode: failedInput?.errorCode ?? null,
        errorSummary: failedInput?.errorSummary ?? null,
        completedAt: now,
      };
      let plan = updateNode(
        current.plan,
        item.planNodeId,
        (node) => ({
          ...node,
          status: succeeded ? "IN_PROGRESS" : "BLOCKED",
          resultRefs: resultRef === null ? node.resultRefs : addUnique(node.resultRefs, [resultRef]),
          summary: succeeded ? node.summary : failedInput!.errorSummary,
        }),
        now,
      );
      plan = withPlanVersion(plan, now);
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        status: "READY_FOR_CONTROLLER",
        plan,
        latestResultRefs:
          resultRef === null ? current.latestResultRefs : addUnique(current.latestResultRefs, [resultRef]),
        updatedAt: now,
      };
      const itemEvent = appendEvent(
        state,
        task,
        succeeded ? "ROLE_WORK_SUCCEEDED" : "ROLE_WORK_FAILED",
        input.producerRef,
        succeeded
          ? { workItemId: item.workItemId, resultRef: resultRef! }
          : {
              workItemId: item.workItemId,
              errorCode: failedInput!.errorCode,
              errorSummary: failedInput!.errorSummary,
            },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: itemEvent.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(state, scope, input.idempotencyKey, { taskId: task.taskId }, now);
      return task.taskId;
    });
    await this.reconciler.reconcile(taskId);
    return this.getTask(taskId);
  }

  async listPendingDispatches(): Promise<readonly DispatchSignal[]> {
    return this.store.read((state) => listRuntimeDispatchQueue(state));
  }

  async claimDispatch(input: ClaimDispatchInput): Promise<DispatchClaimResult> {
    assertContractVersion(input.contractVersion);
    const scope = `dispatch.claim:${input.signalId}:${input.hostId}`;
    return this.store.transact((state) => {
      const duplicate = idempotencyGet<DispatchClaimResult>(state, scope, input.idempotencyKey);
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
        "Dispatch cannot be claimed while Task is paused or terminal.",
      );
      const nowDate = this.clock.now();
      if (signal.claim !== null && !isClaimExpired(signal.claim.expiresAt, nowDate)) {
        throw new TaskControlError("DISPATCH_ALREADY_CLAIMED", "Dispatch Signal is already claimed.");
      }
      invariant(signal.status === "PENDING" || signal.status === "CLAIMED", "COMMAND_NOT_ALLOWED", "Dispatch is not claimable.");
      const claim = lease(
        this.ids,
        "dispatch",
        input.hostId,
        (signal.claimEpoch ?? signal.claim?.claimEpoch ?? 0) + 1,
        nowDate,
        input.leaseMs,
      );
      const claimed: DispatchSignal = {
        ...signal,
        status: "CLAIMED",
        claimEpoch: claim.claimEpoch,
        claim,
        attemptCount: signal.attemptCount + 1,
      };
      state.dispatchSignals[signal.signalId] = claimed;
      const result: DispatchClaimResult = { dispatch: claimed };
      idempotencyPut(state, scope, input.idempotencyKey, result as unknown as JsonValue, nowDate.toISOString());
      return result;
    });
  }

  async acknowledgeDispatch(input: ReportDispatchInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    return this.reportDispatch(input, true);
  }

  async failDispatch(input: ReportDispatchInput): Promise<DispatchSignal> {
    assertContractVersion(input.contractVersion);
    return this.reportDispatch(input, false);
  }

  private async reportDispatch(input: ReportDispatchInput, delivered: boolean): Promise<DispatchSignal> {
    const scope = `dispatch.report:${input.signalId}:${delivered ? "delivered" : "failed"}`;
    const result = await this.store.transact((state) => {
      const duplicate = idempotencyGet<{ signalId: string }>(state, scope, input.idempotencyKey);
      if (duplicate !== undefined) {
        const existing = state.dispatchSignals[duplicate.signalId];
        invariant(existing !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.");
        return existing;
      }
      const signal = state.dispatchSignals[input.signalId];
      invariant(signal !== undefined, "DISPATCH_NOT_FOUND", "Dispatch Signal was not found.", {
        signalId: input.signalId,
      });
      this.assertActiveLease(signal.claim, input.claimToken);
      invariant(signal.status === "CLAIMED", "COMMAND_NOT_ALLOWED", "Dispatch is not in CLAIMED state.");
      const current = state.tasks[signal.taskId];
      invariant(current !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId: signal.taskId });
      const now = this.clock.now().toISOString();
      const updatedSignal: DispatchSignal = {
        ...signal,
        status: delivered ? "DELIVERED" : "FAILED",
        claim: null,
        deliveredAt: delivered ? now : null,
        lastError: delivered ? null : input.errorSummary ?? "Host dispatch failed.",
      };
      state.dispatchSignals[signal.signalId] = updatedSignal;
      let task: TaskAggregate = {
        ...current,
        taskVersion: current.taskVersion + 1,
        updatedAt: now,
      };
      const hostEvent = appendEvent(
        state,
        task,
        delivered ? "HOST_DISPATCH_DELIVERED" : "HOST_DISPATCH_FAILED",
        input.producerRef,
        delivered
          ? { signalId: signal.signalId }
          : { signalId: signal.signalId, errorSummary: updatedSignal.lastError! },
        now,
        this.ids,
        input.correlationId ?? null,
        current.latestEventId,
      );
      task = { ...task, latestEventId: hostEvent.eventId };
      state.tasks[task.taskId] = task;
      idempotencyPut(state, scope, input.idempotencyKey, { signalId: signal.signalId }, now);
      return updatedSignal;
    });
    if (!delivered) await this.reconciler.reconcile(result.taskId);
    return result;
  }

  async reconcile(taskId: string) {
    return this.reconciler.reconcile(taskId);
  }

  async recoverAll() {
    return this.reconciler.recoverAll();
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
}

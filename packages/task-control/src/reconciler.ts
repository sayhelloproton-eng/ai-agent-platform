import { invariant } from "./error.js";
import type {
  DispatchSignal,
  ReconcileResult,
  TaskAggregate,
  TaskControlState,
  TaskEvent,
  WorkItem,
} from "./model.js";
import type { Clock, IdGenerator, TaskControlStore } from "./ports.js";
import { dependenciesSatisfied, isClaimExpired, isTerminalTaskStatus } from "./policy.js";

function event(
  state: TaskControlState,
  task: TaskAggregate,
  eventType: TaskEvent["eventType"],
  producerRef: string,
  now: string,
  ids: IdGenerator,
  payload: TaskEvent["payload"] = {},
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
    correlationId: null,
    causationId: task.latestEventId,
    createdAt: now,
  };
  state.events[task.taskId] = [...(state.events[task.taskId] ?? []), item];
  return item;
}

function activeControllerDispatch(
  state: TaskControlState,
  taskId: string,
): DispatchSignal | undefined {
  return Object.values(state.dispatchSignals).find(
    (signal) =>
      signal.taskId === taskId &&
      signal.signalType === "CONTROLLER_WAKE" &&
      ["PENDING", "CLAIMED", "DELIVERED"].includes(signal.status),
  );
}

function createControllerDispatch(
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
    workItemId: null,
    status: "PENDING",
    claimEpoch: 0,
    claim: null,
    attemptCount: 0,
    idempotencyKey: `controller-wake:${task.taskId}:${task.taskVersion}`,
    createdAt: now,
    deliveredAt: null,
    lastError: null,
  };
  state.dispatchSignals[signalId] = signal;
  return signal;
}

function cancelCoordination(
  state: TaskControlState,
  taskId: string,
  now: string,
): { workItems: string[]; dispatches: string[] } {
  const workItems: string[] = [];
  const dispatches: string[] = [];
  for (const [id, item] of Object.entries(state.workItems)) {
    if (item.taskId !== taskId || !["PENDING", "CLAIMED"].includes(item.status)) continue;
    state.workItems[id] = {
      ...item,
      status: "CANCELLED",
      claim: null,
      completedAt: now,
    };
    workItems.push(id);
  }
  for (const [id, signal] of Object.entries(state.dispatchSignals)) {
    if (signal.taskId !== taskId || !["PENDING", "CLAIMED"].includes(signal.status)) continue;
    state.dispatchSignals[id] = {
      ...signal,
      status: "CANCELLED",
      claim: null,
    };
    dispatches.push(id);
  }
  return { workItems, dispatches };
}

export class TaskReconciler {
  constructor(
    private readonly store: TaskControlStore,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async reconcile(taskId: string): Promise<ReconcileResult> {
    return this.store.transact((state) => {
      const original = state.tasks[taskId];
      invariant(original !== undefined, "TASK_NOT_FOUND", "Task was not found.", { taskId });
      const nowDate = this.clock.now();
      const now = nowDate.toISOString();
      let task = original;
      let changed = false;
      const createdWorkItemIds: string[] = [];
      const createdDispatchIds: string[] = [];
      const expiredClaimIds: string[] = [];
      const cancelledWorkItemIds: string[] = [];
      const cancelledDispatchIds: string[] = [];
      const newEvents: TaskEvent[] = [];
      let controllerClaimExpired = false;

      if (task.controllerClaim !== null && isClaimExpired(task.controllerClaim.expiresAt, nowDate)) {
        expiredClaimIds.push(task.controllerClaim.claimId);
        controllerClaimExpired = true;
        task = { ...task, controllerClaim: null, updatedAt: now };
        changed = true;
      }

      for (const [id, item] of Object.entries(state.workItems)) {
        if (item.taskId !== taskId || item.claim === null || !isClaimExpired(item.claim.expiresAt, nowDate)) continue;
        expiredClaimIds.push(item.claim.claimId);
        state.workItems[id] = { ...item, status: "PENDING", claim: null, claimedAt: null };
        changed = true;
      }

      for (const [id, signal] of Object.entries(state.dispatchSignals)) {
        if (signal.taskId !== taskId || signal.claim === null || !isClaimExpired(signal.claim.expiresAt, nowDate)) continue;
        expiredClaimIds.push(signal.claim.claimId);
        state.dispatchSignals[id] = { ...signal, status: "PENDING", claim: null };
        changed = true;
      }

      if (isTerminalTaskStatus(task.status)) {
        const cancelled = cancelCoordination(state, taskId, now);
        cancelledWorkItemIds.push(...cancelled.workItems);
        cancelledDispatchIds.push(...cancelled.dispatches);
        changed ||= cancelled.workItems.length > 0 || cancelled.dispatches.length > 0;
      } else if (task.plan !== null) {
        const promotedNodes = task.plan.nodes.map((node) => {
          if (node.status !== "PENDING" || !dependenciesSatisfied(task.plan!, node)) return node;
          changed = true;
          return { ...node, status: "READY" as const };
        });
        if (changed && promotedNodes.some((node, index) => node !== task.plan!.nodes[index])) {
          task = {
            ...task,
            plan: { ...task.plan, nodes: promotedNodes, updatedAt: now },
            updatedAt: now,
          };
        }
      }

      if (
        !isTerminalTaskStatus(task.status) &&
        task.status !== "PAUSED" &&
        task.controllerClaim === null &&
        ["PLAN_REQUIRED", "READY_FOR_CONTROLLER", "BLOCKED"].includes(task.status) &&
        activeControllerDispatch(state, taskId) === undefined
      ) {
        const signal = createControllerDispatch(state, task, now, this.ids);
        createdDispatchIds.push(signal.signalId);
        changed = true;
      }

      if (changed) {
        const nextVersion = task.taskVersion + 1;
        task = { ...task, taskVersion: nextVersion, updatedAt: now };
        if (controllerClaimExpired) {
          newEvents.push(
            event(state, task, "CONTROLLER_CLAIM_RELEASED", "task-reconciler", now, this.ids, {
              reason: "expired",
              claimIds: expiredClaimIds,
            }),
          );
        }
        if (createdDispatchIds.length > 0) {
          newEvents.push(
            event(state, task, "HOST_DISPATCH_CREATED", "task-reconciler", now, this.ids, {
              dispatchIds: createdDispatchIds,
            }),
          );
        }
        task = { ...task, latestEventId: newEvents.at(-1)?.eventId ?? task.latestEventId };
        state.tasks[taskId] = task;
      }

      return {
        taskId,
        changed,
        createdWorkItemIds,
        createdDispatchIds,
        expiredClaimIds,
        cancelledWorkItemIds,
        cancelledDispatchIds,
        taskVersion: task.taskVersion,
      };
    });
  }

  async recoverAll(): Promise<readonly ReconcileResult[]> {
    const taskIds = await this.store.read((state) => Object.keys(state.tasks));
    const results: ReconcileResult[] = [];
    for (const taskId of taskIds) {
      results.push(await this.reconcile(taskId));
    }
    return results;
  }
}

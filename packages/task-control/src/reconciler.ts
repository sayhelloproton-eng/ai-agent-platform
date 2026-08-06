import { invariant } from "./error.js";
import type {
  DispatchSignal,
  JsonObject,
  ReconcileResult,
  TaskAggregate,
  TaskControlState,
  TaskEvent,
  WorkItem,
} from "./model.js";
import type { Clock, IdGenerator, TaskControlStore } from "./ports.js";
import {
  assertTaskConsistency,
  dependenciesSatisfied,
  isClaimExpired,
  isTerminalTaskStatus,
} from "./policy.js";

function appendEvent(
  state: TaskControlState,
  task: TaskAggregate,
  eventType: TaskEvent["eventType"],
  producerRef: string,
  now: string,
  ids: IdGenerator,
  payload: JsonObject,
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
    correlationId: null,
    causationId,
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
      (["PENDING", "CLAIMED", "DELIVERED"].includes(signal.status) ||
        signal.hostResultStatus === "UNCERTAIN"),
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

function cancelCoordination(
  state: TaskControlState,
  taskId: string,
  now: string,
): { workItems: string[]; dispatches: string[] } {
  const workItems: string[] = [];
  const dispatches: string[] = [];
  for (const [id, item] of Object.entries(state.workItems)) {
    if (item.taskId !== taskId || !["PENDING", "CLAIMED", "RUNNING"].includes(item.status)) continue;
    state.workItems[id] = {
      ...item,
      status: "CANCELLED",
      claim: null,
      completedAt: now,
    };
    workItems.push(id);
  }
  for (const [id, signal] of Object.entries(state.dispatchSignals)) {
    if (
      signal.taskId !== taskId ||
      !["PENDING", "CLAIMED", "DELIVERED", "CONSUMED"].includes(signal.status) ||
      signal.hostResultStatus !== "PENDING"
    ) continue;
    state.dispatchSignals[id] = {
      ...signal,
      status: "CANCELLED",
      claim: null,
    };
    dispatches.push(id);
  }
  return { workItems, dispatches };
}

interface PendingEvent {
  readonly eventType: TaskEvent["eventType"];
  readonly payload: JsonObject;
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
      const pendingEvents: PendingEvent[] = [];

      if (task.controllerClaim !== null && isClaimExpired(task.controllerClaim.expiresAt, nowDate)) {
        const claim = task.controllerClaim;
        expiredClaimIds.push(claim.claimId);
        task = { ...task, controllerClaim: null, updatedAt: now };
        pendingEvents.push({
          eventType: "CONTROLLER_CLAIM_RELEASED",
          payload: {
            claimId: claim.claimId,
            claimEpoch: claim.claimEpoch,
            reason: "expired",
          },
        });
        changed = true;
      }

      for (const [id, item] of Object.entries(state.workItems)) {
        if (
          item.taskId !== taskId ||
          item.claim === null ||
          !isClaimExpired(item.claim.expiresAt, nowDate)
        ) {
          continue;
        }
        const claim = item.claim;
        expiredClaimIds.push(claim.claimId);
        state.workItems[id] = { ...item, status: "PENDING", claim: null, claimedAt: null };
        pendingEvents.push({
          eventType: "WORK_ITEM_CLAIM_RELEASED",
          payload: {
            workItemId: item.workItemId,
            claimId: claim.claimId,
            claimEpoch: claim.claimEpoch,
            reason: "expired",
          },
        });
        changed = true;
      }

      for (const [id, signal] of Object.entries(state.dispatchSignals)) {
        if (
          signal.taskId !== taskId ||
          signal.claim === null ||
          !isClaimExpired(signal.claim.expiresAt, nowDate)
        ) {
          continue;
        }
        const claim = signal.claim;
        expiredClaimIds.push(claim.claimId);
        const preserveDelivery =
          signal.deliveredAt !== null &&
          (signal.status === "DELIVERED" || signal.status === "CONSUMED") &&
          signal.hostResultStatus === "PENDING";
        state.dispatchSignals[id] = {
          ...signal,
          status: preserveDelivery ? signal.status : "PENDING",
          claim: null,
        };
        pendingEvents.push({
          eventType: "DISPATCH_CLAIM_RELEASED",
          payload: {
            signalId: signal.signalId,
            claimId: claim.claimId,
            claimEpoch: claim.claimEpoch,
            reason: preserveDelivery ? "host-result-timeout" : "expired",
            phase: preserveDelivery ? "host-result" : "delivery",
          },
        });
        changed = true;
      }

      if (isTerminalTaskStatus(task.status)) {
        const cancelled = cancelCoordination(state, taskId, now);
        cancelledWorkItemIds.push(...cancelled.workItems);
        cancelledDispatchIds.push(...cancelled.dispatches);
        for (const workItemId of cancelled.workItems) {
          pendingEvents.push({
            eventType: "WORK_ITEM_CANCELLED",
            payload: {
              workItemId,
              reason: `task-${task.status.toLowerCase()}`,
              triggerEventId: task.latestEventId,
              triggerTaskVersion: task.taskVersion,
            },
          });
        }
        for (const signalId of cancelled.dispatches) {
          pendingEvents.push({
            eventType: "HOST_DISPATCH_CANCELLED",
            payload: {
              signalId,
              reason: `task-${task.status.toLowerCase()}`,
              triggerEventId: task.latestEventId,
              triggerTaskVersion: task.taskVersion,
            },
          });
        }
        changed ||= cancelled.workItems.length > 0 || cancelled.dispatches.length > 0;
      } else if (task.plan !== null && task.plan.currentNodeId !== null) {
        const currentIndex = task.plan.nodes.findIndex(
          (node) => node.nodeId === task.plan!.currentNodeId,
        );
        const currentNode = task.plan.nodes[currentIndex];
        if (
          currentNode !== undefined &&
          currentNode.status === "PENDING" &&
          dependenciesSatisfied(task.plan, currentNode)
        ) {
          const nodes = [...task.plan.nodes];
          nodes[currentIndex] = { ...currentNode, status: "READY" };
          task = {
            ...task,
            plan: {
              ...task.plan,
              planVersion: task.plan.planVersion + 1,
              nodes,
              updatedAt: now,
            },
            updatedAt: now,
          };
          pendingEvents.push({
            eventType: "TASK_PLAN_REVISED",
            payload: {
              planVersion: task.plan!.planVersion,
              promotedNodeId: currentNode.nodeId,
              reason: "current-node-ready",
            },
          });
          changed = true;
        }
      }

      const shouldCreateControllerDispatch =
        !isTerminalTaskStatus(task.status) &&
        task.status !== "PAUSED" &&
        task.controllerClaim === null &&
        ["PLAN_REQUIRED", "READY_FOR_CONTROLLER", "BLOCKED"].includes(task.status) &&
        activeControllerDispatch(state, taskId) === undefined;

      if (changed || shouldCreateControllerDispatch) {
        task = { ...task, taskVersion: task.taskVersion + 1, updatedAt: now };
        if (shouldCreateControllerDispatch) {
          const signal = createControllerDispatch(state, task, now, this.ids);
          createdDispatchIds.push(signal.signalId);
          pendingEvents.push({
            eventType: "HOST_DISPATCH_CREATED",
            payload: { dispatchIds: [signal.signalId] },
          });
          changed = true;
        }

        let causationId = task.latestEventId;
        for (const spec of pendingEvents) {
          const item = appendEvent(
            state,
            task,
            spec.eventType,
            "task-reconciler",
            now,
            this.ids,
            spec.payload,
            causationId,
          );
          causationId = item.eventId;
        }
        task = { ...task, latestEventId: causationId };
        assertTaskConsistency(task);
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

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

function controllerWakeRecoveryRequired(task: TaskAggregate): boolean {
  return task.status === "BLOCKED" &&
    typeof task.blockedReason === "string" &&
    task.blockedReason.startsWith("CONTROLLER_WAKE_DELIVERY_FAILED:");
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
    const preserveDeliveredControllerWake =
      signal.signalType === "CONTROLLER_WAKE" &&
      signal.deliveredAt !== null &&
      ["DELIVERED", "CONSUMED"].includes(signal.status) &&
      signal.hostResultStatus === "PENDING";
    if (
      signal.taskId !== taskId ||
      preserveDeliveredControllerWake ||
      !["PENDING", "CLAIMED", "DELIVERED", "CONSUMED"].includes(signal.status) ||
      signal.hostResultStatus !== "PENDING"
    ) continue;
    state.dispatchSignals[id] = {
      ...signal,
      status: "CANCELLED",
      claim: null,
      reportToken: null,
      reportTokenExpiresAt: null,
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

      // Dispatch wall-clock expiry is independent from the shorter delivery claim
      // lease. Expired undelivered browser work must not remain invisible in
      // PENDING/CLAIMED forever. Close the old attempt, make the Work Item
      // retryable, and return control to the Controller without replaying it.
      for (const [id, signal] of Object.entries(state.dispatchSignals)) {
        if (
          signal.taskId !== taskId ||
          signal.deliveredAt !== null ||
          !["PENDING", "CLAIMED"].includes(signal.status) ||
          Date.parse(signal.expiresAt) > nowDate.getTime()
        ) continue;
        state.dispatchSignals[id] = {
          ...signal,
          status: "CANCELLED",
          claim: null,
          lastError: "DISPATCH_EXPIRED",
        };
        cancelledDispatchIds.push(signal.signalId);
        pendingEvents.push({
          eventType: "HOST_DISPATCH_CANCELLED",
          payload: { signalId: signal.signalId, reason: "DISPATCH_EXPIRED" },
        });
        if (signal.workItemId !== null) {
          const workItem = state.workItems[signal.workItemId];
          if (workItem !== undefined && ["PENDING", "CLAIMED", "RUNNING"].includes(workItem.status)) {
            state.workItems[signal.workItemId] = {
              ...workItem,
              status: "FAILED",
              claim: null,
              errorCode: "DISPATCH_EXPIRED",
              errorSummary: "Browser Dispatch expired before delivery.",
              retryable: true,
              completedAt: now,
            };
            if (task.plan !== null) {
              const index = task.plan.nodes.findIndex((node) => node.nodeId === workItem.planNodeId);
              if (index >= 0) {
                const nodes = [...task.plan.nodes];
                const currentNode = nodes[index]!;
                nodes[index] = {
                  ...currentNode,
                  status: "IN_PROGRESS",
                  summary: "Browser Dispatch expired before delivery.",
                };
                task = {
                  ...task,
                  plan: {
                    ...task.plan,
                    planVersion: task.plan.planVersion + 1,
                    nodes,
                    updatedAt: now,
                  },
                  status: "READY_FOR_CONTROLLER",
                  blockedReason: null,
                  controllerClaim: null,
                  updatedAt: now,
                };
              }
            }
            pendingEvents.push({
              eventType: "ROLE_WORK_FAILED",
              payload: {
                workItemId: workItem.workItemId,
                errorCode: "DISPATCH_EXPIRED",
                errorSummary: "Browser Dispatch expired before delivery.",
                retryable: true,
                evidenceRefs: [],
              },
            });
          }
        }
        changed = true;
      }

      // Once delivery is acknowledged, browser side effects must never be
      // replayed merely because the short-lived Report Token expires. Escalate
      // the Work to UNCERTAIN/BLOCKED and require Controller/operator recovery.
      for (const [id, signal] of Object.entries(state.dispatchSignals)) {
        if (
          signal.taskId !== taskId ||
          signal.deliveredAt === null ||
          signal.hostResultStatus !== "PENDING" ||
          signal.reportTokenExpiresAt === null ||
          Date.parse(signal.reportTokenExpiresAt) > nowDate.getTime()
        ) continue;
        state.dispatchSignals[id] = {
          ...signal,
          status: "CONSUMED",
          claim: null,
          hostResultStatus: "UNCERTAIN",
          hostResultSummary: "Host Result report token expired after delivery; browser action must not be replayed.",
          reportedAt: now,
          lastError: "REPORT_TOKEN_EXPIRED",
        };
        if (signal.workItemId !== null) {
          const workItem = state.workItems[signal.workItemId];
          if (workItem !== undefined && !["SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED"].includes(workItem.status)) {
            state.workItems[signal.workItemId] = {
              ...workItem,
              status: "FAILED",
              claim: null,
              errorCode: "REPORT_TOKEN_EXPIRED",
              errorSummary: "Host Result could not be reported before the post-delivery credential expired.",
              retryable: false,
              completedAt: now,
            };
            if (task.plan !== null) {
              const index = task.plan.nodes.findIndex((node) => node.nodeId === workItem.planNodeId);
              if (index >= 0) {
                const nodes = [...task.plan.nodes];
                const currentNode = nodes[index]!;
                nodes[index] = {
                  ...currentNode,
                  status: "BLOCKED",
                  summary: "Browser delivery is confirmed but Host Result reporting is uncertain.",
                };
                task = {
                  ...task,
                  plan: {
                    ...task.plan,
                    planVersion: task.plan.planVersion + 1,
                    nodes,
                    updatedAt: now,
                  },
                  status: "BLOCKED",
                  blockedReason: `HOST_RESULT_REPORT_EXPIRED:${signal.signalId}`,
                  controllerClaim: null,
                  updatedAt: now,
                };
              }
            }
          }
        } else {
          task = {
            ...task,
            status: "BLOCKED",
            blockedReason: `HOST_RESULT_REPORT_EXPIRED:${signal.signalId}`,
            controllerClaim: null,
            updatedAt: now,
          };
        }
        pendingEvents.push({
          eventType: "HOST_RESULT_UNCERTAIN",
          payload: {
            signalId: signal.signalId,
            stage: "HOST_RESULT_PENDING",
            summary: "Report token expired after delivery; automatic replay is forbidden.",
            evidenceRefs: signal.hostEvidenceRefs,
            autoRetryAllowed: false,
          },
        });
        changed = true;
      }

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
        !controllerWakeRecoveryRequired(task) &&
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

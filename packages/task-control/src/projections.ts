import type {
  DispatchSignal,
  RoleAttentionEntry,
  TaskAggregate,
  TaskAuditState,
  TaskControlState,
  TaskEvent,
  WorkItem,
} from "./model.js";

function latestEvent(events: readonly TaskEvent[]): TaskEvent | undefined {
  return events.at(-1);
}

function latestDispatchForTask(
  dispatches: readonly DispatchSignal[],
  taskId: string,
): DispatchSignal | undefined {
  return dispatches
    .filter((item) => item.taskId === taskId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function buildTaskTimeline(
  state: Readonly<TaskControlState>,
  taskId: string,
): readonly TaskEvent[] {
  return [...(state.events[taskId] ?? [])].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export function buildRoleAttentionInbox(
  state: Readonly<TaskControlState>,
  roleId?: string,
): readonly RoleAttentionEntry[] {
  const tasks = Object.values(state.tasks);
  const workItems = Object.values(state.workItems);
  const dispatches = Object.values(state.dispatchSignals);
  const entries: RoleAttentionEntry[] = [];

  for (const task of tasks) {
    const event = latestEvent(state.events[task.taskId] ?? []);
    const dispatch = latestDispatchForTask(dispatches, task.taskId);
    const base = {
      taskId: task.taskId,
      sourceEventId: event?.eventId ?? null,
      workItemId: null,
      dispatchRef: dispatch?.signalId ?? null,
      approvalRef: null,
      status: "OPEN" as const,
      createdAt: event?.createdAt ?? task.updatedAt,
    };

    if (task.status === "PLAN_REQUIRED" || task.status === "READY_FOR_CONTROLLER") {
      entries.push({
        ...base,
        entryId: `attention:${task.taskId}:controller`,
        requiredRole: task.requiredRole,
        attentionType: "CONTROLLER_ACTION_REQUIRED",
      });
    } else if (task.status === "BLOCKED") {
      entries.push({
        ...base,
        entryId: `attention:${task.taskId}:blocked`,
        requiredRole: task.requiredRole,
        attentionType: "TASK_BLOCKED",
      });
    } else if (task.status === "PAUSED") {
      entries.push({
        ...base,
        entryId: `attention:${task.taskId}:paused`,
        requiredRole: task.requiredRole,
        attentionType: "TASK_PAUSED",
      });
    } else if (["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) {
      entries.push({
        ...base,
        entryId: `attention:${task.taskId}:terminal`,
        requiredRole: task.requiredRole,
        attentionType: "TASK_TERMINAL",
        status: "RESOLVED",
      });
    }

    if (task.status === "WAITING_FOR_APPROVAL") {
      for (const approvalRef of task.approvalRefs) {
        entries.push({
          ...base,
          entryId: `attention:${task.taskId}:approval:${approvalRef}`,
          requiredRole: task.requiredRole,
          attentionType: "APPROVAL_WAITING",
          approvalRef,
        });
      }
    }
  }

  for (const workItem of workItems) {
    if (workItem.status !== "PENDING") continue;
    const task = state.tasks[workItem.taskId];
    if (task === undefined) continue;
    const event = latestEvent(state.events[task.taskId] ?? []);
    entries.push({
      entryId: `attention:${task.taskId}:work:${workItem.workItemId}`,
      taskId: task.taskId,
      sourceEventId: event?.eventId ?? null,
      requiredRole: workItem.requiredRole,
      attentionType: "ROLE_WORK_AVAILABLE",
      workItemId: workItem.workItemId,
      dispatchRef: null,
      approvalRef: null,
      status: "OPEN",
      createdAt: workItem.createdAt,
    });
  }

  return entries
    .filter((entry) => roleId === undefined || entry.requiredRole === roleId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function listRuntimeDispatchQueue(
  state: Readonly<TaskControlState>,
): readonly DispatchSignal[] {
  return Object.values(state.dispatchSignals)
    .filter((signal) => {
      const task = state.tasks[signal.taskId];
      return (
        signal.status === "PENDING" &&
        task !== undefined &&
        !["PAUSED", "COMPLETED", "FAILED", "CANCELLED"].includes(task.status)
      );
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function workItemsForTask(
  state: Readonly<TaskControlState>,
  taskId: string,
): readonly WorkItem[] {
  return Object.values(state.workItems).filter((item) => item.taskId === taskId);
}

export function dispatchesForTask(
  state: Readonly<TaskControlState>,
  taskId: string,
): readonly DispatchSignal[] {
  return Object.values(state.dispatchSignals).filter((item) => item.taskId === taskId);
}

export function taskSnapshot(
  state: Readonly<TaskControlState>,
  taskId: string,
): TaskAggregate | undefined {
  return state.tasks[taskId];
}

export function replayTaskAuditState(
  events: readonly TaskEvent[],
): TaskAuditState | null {
  let current: TaskAuditState | null = null;
  for (const item of events) {
    if (current !== null) {
      if (item.taskId !== current.taskId) {
        throw new TypeError("Task Event replay cannot mix different task IDs.");
      }
      if (item.taskVersion < current.taskVersion) {
        throw new TypeError("Task Event versions must be monotonic during replay.");
      }
    }
    current = {
      taskId: item.taskId,
      taskVersion: item.taskVersion,
      latestEventId: item.eventId,
      taskStatus: item.stateAfter.taskStatus,
      planVersion: item.stateAfter.planVersion,
      planStatus: item.stateAfter.planStatus,
      currentNodeId: item.stateAfter.currentNodeId,
    };
  }
  return current;
}

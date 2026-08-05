import { invariant, TaskControlError } from "./error.js";
import {
  TASK_CONTROL_CONTRACT_VERSION,
  type ControllerCommand,
  type CreatePlanNodeInput,
  type CreatePlanPayload,
  type PlanNode,
  type PlanNodeStatus,
  type TaskAggregate,
  type TaskPlan,
  type TaskStatus,
} from "./model.js";

export function assertContractVersion(value: string): void {
  invariant(
    value === TASK_CONTROL_CONTRACT_VERSION,
    "INVALID_CONTRACT_VERSION",
    `Unsupported Task Control contract version: ${value}`,
    { expected: TASK_CONTROL_CONTRACT_VERSION, actual: value },
  );
}

export function assertNonEmpty(value: string, path: string): void {
  invariant(value.trim().length > 0, "INVALID_ARGUMENT", `${path} must not be empty.`, {
    path,
  });
}

export function assertPositiveInteger(value: number, path: string): void {
  invariant(
    Number.isSafeInteger(value) && value > 0,
    "INVALID_ARGUMENT",
    `${path} must be a positive integer.`,
    { path, value },
  );
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function isTerminalPlanNodeStatus(status: PlanNodeStatus): boolean {
  return status === "COMPLETED" || status === "SKIPPED" || status === "CANCELLED";
}

export function isPlanComplete(plan: TaskPlan): boolean {
  return plan.currentNodeId === null && plan.nodes.every((node) => isTerminalPlanNodeStatus(node.status));
}

export function isClaimExpired(expiresAt: string, now: Date): boolean {
  return Date.parse(expiresAt) <= now.getTime();
}

export function normalizeNode(input: CreatePlanNodeInput): PlanNode {
  assertNonEmpty(input.nodeId, "node.nodeId");
  assertNonEmpty(input.title, "node.title");
  assertNonEmpty(input.requiredRole, "node.requiredRole");
  return {
    nodeId: input.nodeId,
    title: input.title,
    kind: input.kind,
    status: input.status ?? "PENDING",
    requiredRole: input.requiredRole,
    dependsOn: [...(input.dependsOn ?? [])],
    acceptanceCriteria: [...(input.acceptanceCriteria ?? [])],
    workRefs: [],
    resultRefs: [],
    approvalRef: null,
    summary: input.summary ?? "",
  };
}

export function createPlan(payload: CreatePlanPayload, now: string): TaskPlan {
  assertNonEmpty(payload.source.ref, "plan.source.ref");
  const nodes = payload.nodes.map(normalizeNode);
  validatePlanNodes(nodes, payload.currentNodeId ?? null);
  return {
    planVersion: 1,
    source: payload.source,
    status: payload.status ?? "ACTIVE",
    currentNodeId: payload.currentNodeId ?? null,
    nodes,
    createdAt: now,
    updatedAt: now,
  };
}

export function validatePlanNodes(
  nodes: readonly PlanNode[],
  currentNodeId: string | null,
): void {
  invariant(nodes.length > 0, "INVALID_PLAN", "Plan must contain at least one node.");
  const ids = new Set<string>();
  for (const node of nodes) {
    invariant(!ids.has(node.nodeId), "INVALID_PLAN", "Plan node IDs must be unique.", {
      nodeId: node.nodeId,
    });
    ids.add(node.nodeId);
  }
  if (currentNodeId !== null) {
    invariant(ids.has(currentNodeId), "INVALID_PLAN", "Current node does not exist.", {
      currentNodeId,
    });
  }
  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      invariant(ids.has(dependency), "INVALID_PLAN", "Plan dependency does not exist.", {
        nodeId: node.nodeId,
        dependency,
      });
      invariant(dependency !== node.nodeId, "INVALID_PLAN", "Node cannot depend on itself.", {
        nodeId: node.nodeId,
      });
    }
  }
  assertAcyclic(nodes);
}

function assertAcyclic(nodes: readonly PlanNode[]): void {
  const dependencies = new Map(nodes.map((node) => [node.nodeId, node.dependsOn]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return;
    invariant(!visiting.has(nodeId), "INVALID_PLAN", "Plan dependencies contain a cycle.", {
      nodeId,
    });
    visiting.add(nodeId);
    for (const dependency of dependencies.get(nodeId) ?? []) visit(dependency);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const node of nodes) visit(node.nodeId);
}

export function getPlanNode(task: TaskAggregate, nodeId: string): PlanNode {
  invariant(task.plan !== null, "INVALID_PLAN", "Task has no plan.");
  const node = task.plan.nodes.find((item) => item.nodeId === nodeId);
  invariant(node !== undefined, "PLAN_NODE_NOT_FOUND", "Plan node was not found.", {
    taskId: task.taskId,
    nodeId,
  });
  return node;
}

export function replacePlanNode(
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
  return {
    ...plan,
    nodes,
    updatedAt: now,
  };
}

export function dependenciesSatisfied(plan: TaskPlan, node: PlanNode): boolean {
  return node.dependsOn.every((dependencyId) => {
    const dependency = plan.nodes.find((item) => item.nodeId === dependencyId);
    return dependency?.status === "COMPLETED" || dependency?.status === "SKIPPED";
  });
}

export function controllerClaimable(status: TaskStatus): boolean {
  return [
    "PLAN_REQUIRED",
    "READY_FOR_CONTROLLER",
    "WAITING_FOR_ROLE_WORK",
    "WAITING_FOR_APPROVAL",
    "BLOCKED",
    "PAUSED",
  ].includes(status);
}

export function allowedControllerCommands(task: TaskAggregate): readonly ControllerCommand["type"][] {
  if (isTerminalTaskStatus(task.status)) return [];
  switch (task.status) {
    case "PLAN_REQUIRED":
      return ["CREATE_PLAN", "BLOCK_TASK", "PAUSE_TASK", "FAIL_TASK", "RELEASE_CLAIM"];
    case "READY_FOR_CONTROLLER":
    case "BLOCKED":
      return [
        "REVISE_PLAN",
        "ADVANCE_PLAN_NODE",
        "REQUEST_ROLE_WORK",
        "REQUEST_APPROVAL",
        "BLOCK_TASK",
        "PAUSE_TASK",
        "COMPLETE_TASK",
        "FAIL_TASK",
        "RELEASE_CLAIM",
      ];
    case "WAITING_FOR_ROLE_WORK":
    case "WAITING_FOR_APPROVAL":
      return ["PAUSE_TASK", "FAIL_TASK", "RELEASE_CLAIM"];
    case "PAUSED":
      return ["RESUME_TASK", "FAIL_TASK", "RELEASE_CLAIM"];
    case "CREATED":
      return ["CREATE_PLAN", "FAIL_TASK", "RELEASE_CLAIM"];
    default:
      return [];
  }
}

export function assertCommandAllowed(task: TaskAggregate, command: ControllerCommand): void {
  invariant(
    allowedControllerCommands(task).includes(command.type),
    "COMMAND_NOT_ALLOWED",
    `Command ${command.type} is not allowed while task is ${task.status}.`,
    { taskId: task.taskId, taskStatus: task.status, commandType: command.type },
  );
}

export function assertTaskConsistency(task: TaskAggregate): void {
  if (task.plan !== null) {
    validatePlanNodes(task.plan.nodes, task.plan.currentNodeId);
    if (task.plan.status === "COMPLETED") {
      invariant(
        isPlanComplete(task.plan),
        "INTERNAL_CONSISTENCY_ERROR",
        "Completed Plan must have no current node and all nodes must be terminal.",
      );
    }
  }
  if (task.status === "PLAN_REQUIRED") {
    invariant(task.plan === null, "INTERNAL_CONSISTENCY_ERROR", "PLAN_REQUIRED task must not have a plan.");
  }
  if (task.status === "COMPLETED") {
    invariant(
      task.plan !== null && task.plan.status === "COMPLETED" && isPlanComplete(task.plan),
      "INTERNAL_CONSISTENCY_ERROR",
      "Completed task must have a fully completed plan.",
    );
  }
  if (task.status === "PAUSED") {
    invariant(
      task.resumeStatus !== null && task.resumeStatus !== "PAUSED" && !isTerminalTaskStatus(task.resumeStatus),
      "INTERNAL_CONSISTENCY_ERROR",
      "Paused task must preserve a non-terminal resume status.",
    );
  } else {
    invariant(
      task.resumeStatus === null,
      "INTERNAL_CONSISTENCY_ERROR",
      "Only paused tasks may preserve a resume status.",
    );
  }
}

export function assertExpectedVersions(
  task: TaskAggregate,
  expectedTaskVersion: number,
  expectedPlanVersion?: number,
): void {
  invariant(
    task.taskVersion === expectedTaskVersion,
    "TASK_VERSION_CONFLICT",
    "Task version does not match expected version.",
    { taskId: task.taskId, expectedTaskVersion, actualTaskVersion: task.taskVersion },
  );
  if (expectedPlanVersion !== undefined) {
    invariant(task.plan !== null, "PLAN_VERSION_CONFLICT", "Task has no plan.", {
      taskId: task.taskId,
      expectedPlanVersion,
    });
    invariant(
      task.plan.planVersion === expectedPlanVersion,
      "PLAN_VERSION_CONFLICT",
      "Plan version does not match expected version.",
      {
        taskId: task.taskId,
        expectedPlanVersion,
        actualPlanVersion: task.plan.planVersion,
      },
    );
  }
}

export function nextNodeStatus(
  requestedStatus: PlanNodeStatus,
): PlanNodeStatus {
  const supported: readonly PlanNodeStatus[] = [
    "PENDING",
    "READY",
    "IN_PROGRESS",
    "WAITING_RESULT",
    "WAITING_APPROVAL",
    "BLOCKED",
    "COMPLETED",
    "SKIPPED",
    "CANCELLED",
    "FAILED",
  ];
  if (!supported.includes(requestedStatus)) {
    throw new TaskControlError("INVALID_ARGUMENT", "Unsupported Plan Node status.");
  }
  return requestedStatus;
}

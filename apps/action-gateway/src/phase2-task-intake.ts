import {
  PHASE2_INTEGRATION_CONTRACT_VERSION,
  type TaskIntakePlanNodeV1,
  type TaskIntakeV1Receipt,
  type TaskIntakeV1Request,
} from "@ai-agent-platform/contracts";
import {
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  type CreatePlanNodeInput,
  type CreateTaskInput,
  type TaskIntakeApplicationPort,
  type TaskProjectionApplicationPort,
} from "@ai-agent-platform/task-control";

import { Phase2IntegrationStore, Phase2IntegrationStoreError } from "./phase2-integration-store.js";

export interface Phase2TaskIntakePort {
  intake(request: TaskIntakeV1Request): Promise<TaskIntakeV1Receipt>;
}

type TaskIntakeService = TaskIntakeApplicationPort & Pick<TaskProjectionApplicationPort, "getCurrentTask">;

function mapNodeKind(kind: TaskIntakePlanNodeV1["kind"]): CreatePlanNodeInput["kind"] {
  switch (kind) {
    case "DECISION":
      return "DECISION";
    case "REVIEW":
      return "REVIEW";
    case "APPROVAL":
      return "APPROVAL";
    case "FINALIZE":
      return "SUMMARY";
    case "WORK":
    case "WAIT":
      return "ACTION";
  }
}

async function taskExists(service: TaskIntakeService, taskId: string): Promise<boolean> {
  try {
    await service.getCurrentTask(taskId);
    return true;
  } catch (error) {
    if (error instanceof TaskControlError && error.code === "TASK_NOT_FOUND") return false;
    throw error;
  }
}

export function createPhase2TaskIntakeAdapter(
  service: TaskIntakeService,
  integrationStore: Phase2IntegrationStore,
): Phase2TaskIntakePort {
  return Object.freeze({
    async intake(request: TaskIntakeV1Request): Promise<TaskIntakeV1Receipt> {
      const existed = await taskExists(service, request.taskId);
      for (const resource of request.payloadResources ?? []) {
        await integrationStore.putPayload(resource.payloadRef, resource.value);
      }
      if ((request.approvalGrants?.length ?? 0) > 0) {
        throw new Phase2IntegrationStoreError(
          "PRESEEDED_APPROVAL_GRANT_FORBIDDEN",
          "Approval Grants cannot be pre-seeded during Task Intake; Browser Host must publish an Approval Draft first.",
          409,
        );
      }
      const input: CreateTaskInput = {
        contractVersion: TASK_CONTROL_CONTRACT_VERSION,
        taskId: request.taskId,
        title: request.title,
        objective: request.objective,
        requiredRole: request.requiredRole,
        ...(request.requirementRef === undefined ? {} : { requirementRef: request.requirementRef }),
        ...(request.goalRef === undefined ? {} : { goalRef: request.goalRef }),
        ...(request.conversationRef === undefined ? {} : { conversationRef: request.conversationRef }),
        ...(request.plan === undefined
          ? {}
          : {
              plan: {
                source: {
                  type: request.plan.source.type === "controller" ? "controller" : "upstream",
                  ref: request.plan.source.ref,
                },
                ...(request.plan.currentNodeId === undefined
                  ? {}
                  : { currentNodeId: request.plan.currentNodeId }),
                nodes: request.plan.nodes.map((node) => ({
                  nodeId: node.nodeId,
                  title: node.title,
                  kind: mapNodeKind(node.kind),
                  requiredRole: node.requiredRole,
                  ...(node.dependsOn === undefined ? {} : { dependsOn: [...node.dependsOn] }),
                  ...(node.acceptanceCriteria === undefined
                    ? {}
                    : { acceptanceCriteria: [...node.acceptanceCriteria] }),
                  ...(node.summary === undefined ? {} : { summary: node.summary }),
                })),
              },
            }),
        idempotencyKey: request.idempotencyKey,
        producerRef: request.producerRef ?? "action-gateway",
        ...(request.correlationId === undefined ? {} : { correlationId: request.correlationId }),
      };
      const receipt = await service.intakeTask(input);
      return {
        contractVersion: PHASE2_INTEGRATION_CONTRACT_VERSION,
        taskId: receipt.taskId,
        taskVersionAtCreation: receipt.taskVersionAtCreation,
        initialEventIds: [...receipt.initialEventIds],
        idempotentReplay: existed,
      };
    },
  });
}

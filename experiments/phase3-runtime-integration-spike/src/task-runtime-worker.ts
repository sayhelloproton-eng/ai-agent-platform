import {
  TASK_CONTROL_CONTRACT_VERSION,
  type TaskProjectionApplicationPort,
  type WorkItem,
  type WorkItemApplicationPort,
} from "@ai-agent-platform/task-control";

import {
  runExecutionFlow,
  type CapabilityRegistry,
  type InferenceBackendRegistry,
} from "../../execution-flow-runtime/index.js";

import type { ExecutionReferenceStore } from "./reference-store.js";
import type { ExecutionRuntimePort } from "./execution-runtime-client.js";

export const EXECUTION_TARGET_DOMAIN = "execution-flow-runtime";
export const EXECUTION_WORKER_ROLE = "execution-worker";

export interface TaskRuntimeWorkerDependencies {
  taskControl: WorkItemApplicationPort & TaskProjectionApplicationPort;
  references: ExecutionReferenceStore;
  capabilities: CapabilityRegistry;
  inferenceBackends: InferenceBackendRegistry;
  runtime?: ExecutionRuntimePort;
  claimantId?: string;
  leaseMs?: number;
}

export interface TaskRuntimeWorkerCycle {
  status: "idle" | "completed" | "failed";
  workItemId?: string;
  executionId?: string;
  resultRef?: string;
}

function requireInputRef(item: WorkItem): string {
  if (!item.inputRef) throw new Error(`WorkItem has no inputRef: ${item.workItemId}`);
  return item.inputRef;
}

function requireClaimToken(item: WorkItem): string {
  const token = item.claim?.claimToken;
  if (!token) throw new Error(`WorkItem has no active claim token: ${item.workItemId}`);
  return token;
}

export class TaskRuntimeWorker {
  readonly #taskControl: WorkItemApplicationPort & TaskProjectionApplicationPort;
  readonly #references: ExecutionReferenceStore;
  readonly #capabilities: CapabilityRegistry;
  readonly #inferenceBackends: InferenceBackendRegistry;
  readonly #runtime: ExecutionRuntimePort | undefined;
  readonly #claimantId: string;
  readonly #leaseMs: number;

  constructor(dependencies: TaskRuntimeWorkerDependencies) {
    this.#taskControl = dependencies.taskControl;
    this.#references = dependencies.references;
    this.#capabilities = dependencies.capabilities;
    this.#inferenceBackends = dependencies.inferenceBackends;
    this.#runtime = dependencies.runtime;
    this.#claimantId = dependencies.claimantId ?? "phase3-runtime-worker";
    this.#leaseMs = dependencies.leaseMs ?? 60_000;
  }

  async runOnce(): Promise<TaskRuntimeWorkerCycle> {
    const [pending] = await this.#taskControl.listPendingWorkItems(EXECUTION_TARGET_DOMAIN);
    if (!pending) return { status: "idle" };

    let task = await this.#taskControl.getCurrentTask(pending.taskId);
    const claimed = await this.#taskControl.claimWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: pending.workItemId,
      roleId: EXECUTION_WORKER_ROLE,
      claimantId: this.#claimantId,
      leaseMs: this.#leaseMs,
      expectedTaskVersion: task.taskVersion,
      idempotencyKey: `execution-claim:${pending.workItemId}:${pending.attempt}`,
    });
    const claimToken = requireClaimToken(claimed.workItem);

    task = await this.#taskControl.getCurrentTask(pending.taskId);
    await this.#taskControl.startWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: pending.workItemId,
      claimToken,
      expectedTaskVersion: task.taskVersion,
      idempotencyKey: `execution-start:${pending.workItemId}:${pending.attempt}`,
      producerRef: this.#claimantId,
      correlationId: pending.taskId,
    });

    const payload = this.#references.getExecutionPayload(requireInputRef(pending));
    const executionId = `execution:${pending.workItemId}:${pending.attempt}`;
    const run = {
      contract: "execution.run.v0" as const,
      execution_id: executionId,
      flow: structuredClone(payload.flow),
      inputs: structuredClone(payload.inputs),
      authorization: {
        allowed_capabilities: [...payload.allowed_capabilities],
      },
      ...(payload.max_node_runs === undefined
        ? {}
        : { max_node_runs: payload.max_node_runs }),
      correlation: {
        task_id: pending.taskId,
        work_item_id: pending.workItemId,
        plan_node_id: pending.planNodeId,
      },
    };
    const result = this.#runtime
      ? await this.#runtime.execute(run)
      : await runExecutionFlow(run, {
          capabilities: this.#capabilities,
          inferenceBackends: this.#inferenceBackends,
        });
    const resultRef = this.#references.putExecutionResult(result);

    task = await this.#taskControl.getCurrentTask(pending.taskId);
    if (result.status === "completed") {
      await this.#taskControl.completeWorkItem({
        contractVersion: TASK_CONTROL_CONTRACT_VERSION,
        workItemId: pending.workItemId,
        claimToken,
        expectedTaskVersion: task.taskVersion,
        resultRef,
        summary: `Execution ${executionId} completed.`,
        evidenceRefs: [resultRef],
        idempotencyKey: `execution-complete:${pending.workItemId}:${pending.attempt}`,
        producerRef: this.#claimantId,
        correlationId: executionId,
      });
      return {
        status: "completed",
        workItemId: pending.workItemId,
        executionId,
        resultRef,
      };
    }

    await this.#taskControl.failWorkItem({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: pending.workItemId,
      claimToken,
      expectedTaskVersion: task.taskVersion,
      errorCode: result.error?.code ?? "EXECUTION_FAILED",
      errorSummary: result.error?.message ?? `Execution ${executionId} ${result.status}.`,
      retryable: false,
      evidenceRefs: [resultRef],
      idempotencyKey: `execution-fail:${pending.workItemId}:${pending.attempt}`,
      producerRef: this.#claimantId,
      correlationId: executionId,
    });
    return {
      status: "failed",
      workItemId: pending.workItemId,
      executionId,
      resultRef,
    };
  }
}

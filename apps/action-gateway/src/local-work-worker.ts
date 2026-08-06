import {
  LOCAL_WORK_HANDOFF_VERSION,
  type JsonObject,
  type LocalWorkPayloadV1,
} from "@ai-agent-platform/contracts";
import {
  LOCAL_WORK_V1_VERSION,
  createLocalWorkConsumer,
  type LocalControlClient,
  type LocalWorkConsumerReport,
} from "@ai-agent-platform/local-control";
import {
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  type TaskControlService,
  type WorkItem,
} from "@ai-agent-platform/task-control";

import { Phase2IntegrationStore } from "./phase2-integration-store.js";

const DEFAULT_LEASE_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value;
}

function positiveInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
  return value as number;
}

function parsePayload(value: unknown): LocalWorkPayloadV1 {
  if (!isRecord(value)) throw new TypeError("Local Work payload must be an object.");
  if (value.localWorkVersion !== LOCAL_WORK_HANDOFF_VERSION) {
    throw new TypeError("Local Work payload version is unsupported.");
  }
  if (!isRecord(value.actor)) throw new TypeError("Local Work actor must be an object.");
  const actorType = requiredString(value.actor.actor_type, "actor.actor_type");
  if (!["system", "controller", "worker", "user"].includes(actorType)) {
    throw new TypeError("Local Work actor.actor_type is unsupported.");
  }
  if (!isRecord(value.parameters)) throw new TypeError("Local Work parameters must be an object.");
  if (!isRecord(value.budget)) throw new TypeError("Local Work budget must be an object.");
  if (value.scope !== undefined && !isRecord(value.scope)) {
    throw new TypeError("Local Work scope must be an object when supplied.");
  }
  if (value.continuation !== undefined && !isRecord(value.continuation)) {
    throw new TypeError("Local Work continuation must be an object when supplied.");
  }
  return {
    localWorkVersion: LOCAL_WORK_HANDOFF_VERSION,
    actor: {
      actor_type: actorType as LocalWorkPayloadV1["actor"]["actor_type"],
      actor_id: requiredString(value.actor.actor_id, "actor.actor_id"),
    },
    parameters: value.parameters as JsonObject,
    budget: {
      timeout_ms: positiveInteger(value.budget.timeout_ms, "budget.timeout_ms"),
      max_stdout_bytes: positiveInteger(value.budget.max_stdout_bytes, "budget.max_stdout_bytes"),
      max_result_chars: positiveInteger(value.budget.max_result_chars, "budget.max_result_chars"),
    },
    ...(value.scope === undefined ? {} : { scope: value.scope as JsonObject }),
    ...(value.continuation === undefined
      ? {}
      : {
          continuation: {
            ...(value.continuation.cursorRef === undefined
              ? {}
              : { cursorRef: requiredString(value.continuation.cursorRef, "continuation.cursorRef") }),
            ...(value.continuation.completionPolicy === undefined
              ? {}
              : {
                  completionPolicy: value.continuation.completionPolicy as
                    | "CONTROLLER_DECIDES"
                    | "COMPLETE_ON_PARTIAL",
                }),
          },
        }),
  };
}

export interface LocalWorkWorkerOptions {
  readonly taskControl: TaskControlService;
  readonly integrationStore: Phase2IntegrationStore;
  readonly client: LocalControlClient;
  readonly workerId?: string;
  readonly roleId?: string;
  readonly leaseMs?: number;
  readonly maxItemsPerRun?: number;
}

export interface LocalWorkWorkerRunResult {
  readonly inspected: number;
  readonly processed: number;
  readonly succeeded: number;
  readonly progressed: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface LocalWorkWorker {
  runOnce(): Promise<LocalWorkWorkerRunResult>;
}

function idempotency(item: WorkItem, phase: string): string {
  return `local-worker:${item.workItemId}:${item.attempt}:${phase}`;
}

export function createLocalWorkWorker(options: LocalWorkWorkerOptions): LocalWorkWorker {
  const workerId = options.workerId ?? "action-gateway-local-worker";
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  const maxItemsPerRun = options.maxItemsPerRun ?? 4;
  const consumer = createLocalWorkConsumer({
    client: options.client,
    resultSink: options.integrationStore.createLocalResultSink(),
    evidenceSink: options.integrationStore.createLocalEvidenceSink(),
  });

  async function report(
    item: WorkItem,
    claimToken: string,
    reportValue: LocalWorkConsumerReport,
  ): Promise<"succeeded" | "progressed" | "failed"> {
    const task = await options.taskControl.getTask(item.taskId);
    const common = {
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      workItemId: item.workItemId,
      claimToken,
      expectedTaskVersion: task.taskVersion,
      producerRef: workerId,
      correlationId: `local-work:${item.workItemId}`,
      evidenceRefs: reportValue.evidence_refs,
    } as const;
    switch (reportValue.status) {
      case "SUCCEEDED":
        await options.taskControl.completeWorkItem({
          ...common,
          resultRef: reportValue.result_ref,
          summary: reportValue.summary,
          idempotencyKey: idempotency(item, "complete"),
        });
        return "succeeded";
      case "ACCEPTED":
      case "PARTIAL":
        await options.taskControl.reportWorkProgress({
          ...common,
          progress: reportValue.status,
          progressRef: reportValue.result_ref,
          summary: reportValue.summary,
          idempotencyKey: idempotency(item, `progress-${reportValue.status.toLowerCase()}`),
        });
        return "progressed";
      case "FAILED":
        await options.taskControl.failWorkItem({
          ...common,
          errorCode: reportValue.error?.code ?? "LOCAL_WORK_FAILED",
          errorSummary: reportValue.error?.message ?? reportValue.summary,
          retryable: reportValue.error?.retryable ?? false,
          idempotencyKey: idempotency(item, "fail"),
        });
        return "failed";
    }
  }

  return Object.freeze({
    async runOnce(): Promise<LocalWorkWorkerRunResult> {
      const pending = (await options.taskControl.listPendingWorkItems("local-control")).slice(0, maxItemsPerRun);
      let processed = 0;
      let succeeded = 0;
      let progressed = 0;
      let failed = 0;
      let skipped = 0;

      for (const item of pending) {
        try {
          if (item.capabilityRef === null || item.inputRef === null) {
            throw new TypeError("Local Work Item requires capabilityRef and inputRef.");
          }
          const payloadValue = await options.integrationStore.getPayload(item.inputRef);
          if (payloadValue === null) throw new TypeError(`Local Work payload not found: ${item.inputRef}`);
          const payload = parsePayload(payloadValue);
          const taskBeforeClaim = await options.taskControl.getTask(item.taskId);
          const claimed = await options.taskControl.claimWorkItem({
            contractVersion: TASK_CONTROL_CONTRACT_VERSION,
            workItemId: item.workItemId,
            roleId: item.requiredRole,
            claimantId: workerId,
            leaseMs,
            expectedTaskVersion: taskBeforeClaim.taskVersion,
            idempotencyKey: idempotency(item, "claim"),
          });
          const claimToken = claimed.workItem.claim!.claimToken;
          const taskBeforeStart = await options.taskControl.getTask(item.taskId);
          await options.taskControl.startWorkItem({
            contractVersion: TASK_CONTROL_CONTRACT_VERSION,
            workItemId: item.workItemId,
            claimToken,
            expectedTaskVersion: taskBeforeStart.taskVersion,
            idempotencyKey: idempotency(item, "start"),
            producerRef: workerId,
            correlationId: `local-work:${item.workItemId}`,
          });
          const result = await consumer.run({
            local_work_version: LOCAL_WORK_V1_VERSION,
            request_id: `local-request:${item.workItemId}:${item.attempt}`,
            capability_ref: item.capabilityRef as Parameters<typeof consumer.run>[0]["capability_ref"],
            actor: payload.actor,
            correlation_id: `task:${item.taskId}:work:${item.workItemId}`,
            ...(payload.scope === undefined ? {} : { scope: payload.scope }),
            parameters: payload.parameters,
            budget: payload.budget,
            idempotency_key: `local-execution:${item.workItemId}:${item.attempt}`,
          });
          const disposition = await report(item, claimToken, result);
          processed += 1;
          if (disposition === "succeeded") succeeded += 1;
          else if (disposition === "progressed") progressed += 1;
          else failed += 1;
        } catch (error) {
          if (error instanceof TaskControlError && ["TASK_VERSION_CONFLICT", "WORK_ALREADY_CLAIMED", "COMMAND_NOT_ALLOWED"].includes(error.code)) {
            skipped += 1;
            continue;
          }
          failed += 1;
          processed += 1;
          // A pre-claim validation or payload-resolution failure has no safe
          // claim credential with which to mutate TSK. It remains pending and
          // visible for operator correction instead of being silently lost.
        }
      }
      return { inspected: pending.length, processed, succeeded, progressed, failed, skipped };
    },
  });
}

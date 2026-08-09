import {
  MOBILE_INFERENCE_CONTRACT_VERSION,
  type JsonObject,
  type MobWorkPayloadV1,
} from "@ai-agent-platform/contracts";
import {
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlError,
  type TaskControlService,
  type WorkItem,
} from "@ai-agent-platform/task-control";

import { Phase2IntegrationStore } from "./phase2-integration-store.js";
import {
  type MobileInferenceAdapter,
} from "./mobile-inference-adapter.js";

const DEFAULT_LEASE_MS = 120_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value;
}

function parsePayload(value: unknown): MobWorkPayloadV1 {
  if (!isRecord(value)) {
    throw new TypeError("Mobile Inference payload must be an object.");
  }
  if (value.mobWorkVersion !== MOBILE_INFERENCE_CONTRACT_VERSION) {
    throw new TypeError(
      "Mobile Inference payload version is unsupported.",
    );
  }
  const modelCategory = requiredString(
    value.modelCategory,
    "modelCategory",
  );
  if (modelCategory !== "FAST" && modelCategory !== "REASON") {
    throw new TypeError("Mobile Inference modelCategory must be FAST or REASON.");
  }
  const systemPrompt = requiredString(value.systemPrompt, "systemPrompt");
  const userPrompt = requiredString(value.userPrompt, "userPrompt");
  let temperature: number | undefined;
  if (value.temperature !== undefined) {
    if (typeof value.temperature !== "number" || value.temperature <= 0) {
      throw new TypeError("temperature must be a positive number.");
    }
    temperature = value.temperature;
  }
  let top_p: number | undefined;
  if (value.top_p !== undefined) {
    if (typeof value.top_p !== "number" || value.top_p <= 0) {
      throw new TypeError("top_p must be a positive number.");
    }
    top_p = value.top_p;
  }
  let max_tokens: number | undefined;
  if (value.max_tokens !== undefined) {
    if (
      typeof value.max_tokens !== "number" ||
      !Number.isSafeInteger(value.max_tokens) ||
      value.max_tokens <= 0
    ) {
      throw new TypeError("max_tokens must be a positive integer.");
    }
    max_tokens = value.max_tokens;
  }
  const idempotencyKey = requiredString(value.idempotencyKey, "idempotencyKey");

  return {
    mobWorkVersion: MOBILE_INFERENCE_CONTRACT_VERSION,
    modelCategory: modelCategory as "FAST" | "REASON",
    systemPrompt,
    userPrompt,
    ...(temperature === undefined ? {} : { temperature }),
    ...(top_p === undefined ? {} : { top_p }),
    ...(max_tokens === undefined ? {} : { max_tokens }),
    idempotencyKey,
  };
}

export interface MobileWorkWorkerOptions {
  readonly taskControl: TaskControlService;
  readonly integrationStore: Phase2IntegrationStore;
  readonly adapter: MobileInferenceAdapter;
  readonly workerId?: string;
  readonly roleId?: string;
  readonly leaseMs?: number;
  readonly maxItemsPerRun?: number;
}

export interface MobileWorkWorkerRunResult {
  readonly inspected: number;
  readonly processed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface MobileWorkWorker {
  runOnce(): Promise<MobileWorkWorkerRunResult>;
}

function idempotency(
  item: WorkItem,
  phase: string,
): string {
  return `mob-worker:${item.workItemId}:${item.attempt}:${phase}`;
}

export function createMobileWorkWorker(
  options: MobileWorkWorkerOptions,
): MobileWorkWorker {
  const workerId = options.workerId ?? "action-gateway-mob-worker";
  const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
  const maxItemsPerRun = options.maxItemsPerRun ?? 1;

  return Object.freeze({
    async runOnce(): Promise<MobileWorkWorkerRunResult> {
      const pending = (
        await options.taskControl.listPendingWorkItems("model-inference")
      ).slice(0, maxItemsPerRun);

      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let skipped = 0;

      for (const item of pending) {
        // MOB jobs are serial within the process
        // Process one at a time (maxItemsPerRun = 1 by default)
        try {
          if (item.capabilityRef === null || item.inputRef === null) {
            throw new TypeError(
              "Mobile Inference Work Item requires capabilityRef and inputRef.",
            );
          }
          const payloadValue = await options.integrationStore.getPayload(
            item.inputRef,
          );
          if (payloadValue === null) {
            throw new TypeError(
              `Mobile Inference payload not found: ${item.inputRef}`,
            );
          }
          const payload = parsePayload(payloadValue);

          const taskBeforeClaim = await options.taskControl.getTask(
            item.taskId,
          );
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

          const taskBeforeStart = await options.taskControl.getTask(
            item.taskId,
          );
          await options.taskControl.startWorkItem({
            contractVersion: TASK_CONTROL_CONTRACT_VERSION,
            workItemId: item.workItemId,
            claimToken,
            expectedTaskVersion: taskBeforeStart.taskVersion,
            idempotencyKey: idempotency(item, "start"),
            producerRef: workerId,
            correlationId: `mob-work:${item.workItemId}`,
          });

          const result = await options.adapter.run(payload, {
            workItemId: item.workItemId,
            taskId: item.taskId,
            attempt: item.attempt,
          });

          const mobResultRef = `mob-result:${item.workItemId}`;
          const mobEvidenceRef = `mob-evidence:${item.workItemId}`;

          await options.integrationStore.putMobResult(
            mobResultRef,
            result,
          );
          await options.integrationStore.putMobEvidence(
            mobEvidenceRef,
            {
              resultRef: mobResultRef,
              content: result.content,
              next: result.next,
              kind: result.kind,
              error: result.error,
            },
          );

          const taskAfterResult = await options.taskControl.getTask(
            item.taskId,
          );

          if (result.kind === "error") {
            await options.taskControl.failWorkItem({
              contractVersion: TASK_CONTROL_CONTRACT_VERSION,
              workItemId: item.workItemId,
              claimToken,
              expectedTaskVersion: taskAfterResult.taskVersion,
              errorCode: result.error?.code ?? "MOB_INFERENCE_FAILED",
              errorSummary:
                result.error?.message ?? result.summary,
              retryable: result.retryable,
              idempotencyKey: idempotency(item, "fail"),
              producerRef: workerId,
              correlationId: `mob-work:${item.workItemId}`,
              evidenceRefs: [mobEvidenceRef],
            });
            failed += 1;
          } else {
            // uncertain, handoff, controller are all legitimate completion results
            await options.taskControl.completeWorkItem({
              contractVersion: TASK_CONTROL_CONTRACT_VERSION,
              workItemId: item.workItemId,
              claimToken,
              expectedTaskVersion: taskAfterResult.taskVersion,
              resultRef: mobResultRef,
              summary: result.summary,
              idempotencyKey: idempotency(item, "complete"),
              producerRef: workerId,
              correlationId: `mob-work:${item.workItemId}`,
              evidenceRefs: [mobEvidenceRef],
            });
            succeeded += 1;
          }
          processed += 1;
        } catch (error) {
          if (
            error instanceof TaskControlError &&
            [
              "TASK_VERSION_CONFLICT",
              "WORK_ALREADY_CLAIMED",
              "COMMAND_NOT_ALLOWED",
            ].includes(error.code)
          ) {
            skipped += 1;
            continue;
          }
          failed += 1;
          processed += 1;
        }
      }
      return { inspected: pending.length, processed, succeeded, failed, skipped };
    },
  });
}

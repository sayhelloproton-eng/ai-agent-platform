import type { ContractError } from "./error.js";
import type { JsonObject, JsonValue } from "./json.js";
import type { CONTRACT_VERSION } from "./task.js";

export const TASK_RESULT_STATUSES = [
  "succeeded",
  "failed",
  "rejected",
  "timed_out",
] as const;

export type TaskResultStatus = (typeof TASK_RESULT_STATUSES)[number];

export const EVIDENCE_TYPES = ["log", "metric", "reference"] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export interface EvidenceItem {
  readonly type: EvidenceType;
  readonly name: string;
  readonly value: JsonValue;
}

export interface TaskResultMetadata {
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly executor?: string;
}

export interface TaskResult {
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly taskId: string;
  readonly status: TaskResultStatus;
  readonly output: JsonObject | null;
  readonly error: ContractError | null;
  readonly evidence: readonly EvidenceItem[];
  readonly metadata: TaskResultMetadata;
}

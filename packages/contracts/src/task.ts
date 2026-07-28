import type { CapabilityName } from "./capability.js";
import type { JsonObject } from "./json.js";

export const CONTRACT_VERSION = "1.0" as const;

export const REQUESTED_BY_TYPES = ["custom-gpt", "internal", "test"] as const;

export type RequestedByType = (typeof REQUESTED_BY_TYPES)[number];

export interface TaskRequester {
  readonly type: RequestedByType;
  readonly subject?: string;
}

export interface TaskMetadata {
  readonly requestedAt: string;
  readonly requestId?: string;
  readonly correlationId?: string;
}

export interface TaskRequest {
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly taskId: string;
  readonly capability: CapabilityName;
  readonly input: JsonObject;
  readonly requestedBy: TaskRequester;
  readonly metadata: TaskMetadata;
}

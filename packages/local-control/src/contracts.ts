export const LOCAL_REQUEST_VERSION = "0.1.0" as const;
export const LOCAL_RESULT_VERSION = "0.1.0" as const;
export const LOCAL_CLI_VERSION = "0.1.0" as const;
export const LOCAL_CLI_PACKAGE = "@ai-agent-platform/local-control" as const;

export const LOCAL_CAPABILITIES = [
  "local.health.read",
  "local.capabilities.read",
  "local.project.describe",
  "local.repository.snapshot.read",
  "local.repository.tree.read",
  "local.repository.file.read",
  "local.runtime.status.read",
  "local.executor.status.read",
  "local.query.batch",
  "local.service.ensure_running",
] as const;

export type LocalCapability = (typeof LOCAL_CAPABILITIES)[number];
export type LocalExecutionMode = "SYNC" | "ASYNC";
export type LocalResultStatus =
  | "SUCCEEDED"
  | "PARTIAL"
  | "ACCEPTED"
  | "FAILED";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface LocalActor {
  readonly actor_type: string;
  readonly actor_id: string;
}

export interface LocalCorrelation {
  readonly task_id?: string;
  readonly task_version?: number;
  readonly claim_id?: string;
  readonly plan_node_id?: string;
  readonly correlation_id?: string;
  readonly [key: string]: JsonValue | undefined;
}

export interface LocalScope {
  readonly project_id?: string;
  readonly [key: string]: JsonValue | undefined;
}

export interface LocalBudget {
  readonly timeout_ms: number;
  readonly max_stdout_bytes: number;
  readonly max_result_chars: number;
}

export interface LocalRequest {
  readonly local_request_version: typeof LOCAL_REQUEST_VERSION;
  readonly request_id: string;
  readonly capability: LocalCapability;
  readonly execution_mode: LocalExecutionMode;
  readonly actor: LocalActor;
  readonly correlation?: LocalCorrelation;
  readonly scope?: LocalScope;
  readonly parameters: JsonObject;
  readonly budget: LocalBudget;
  readonly idempotency_key?: string;
}

export const LOCAL_ERROR_CODES = [
  "INVALID_REQUEST",
  "UNSUPPORTED_CONTRACT_VERSION",
  "CAPABILITY_NOT_FOUND",
  "CAPABILITY_DENIED",
  "EXECUTION_MODE_NOT_SUPPORTED",
  "PROJECT_NOT_REGISTERED",
  "RESOURCE_NOT_REGISTERED",
  "PATH_OUT_OF_SCOPE",
  "ABSOLUTE_PATH_DENIED",
  "PATH_TRAVERSAL_DENIED",
  "SYMLINK_ESCAPE",
  "SENSITIVE_RESOURCE_DENIED",
  "BINARY_RESOURCE_DENIED",
  "BUDGET_EXCEEDED",
  "OUTPUT_TOO_LARGE",
  "CURSOR_INVALID",
  "PROCESS_TIMEOUT",
  "PROCESS_FAILED",
  "PROCESS_NOT_FOUND",
  "RUNTIME_UNAVAILABLE",
  "EXECUTOR_UNAVAILABLE",
  "SERVICE_NOT_REGISTERED",
  "SERVICE_START_NOT_ALLOWED",
  "RESULT_SERIALIZATION_FAILED",
  "DEPENDENCY_NOT_AVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type LocalErrorCode = (typeof LOCAL_ERROR_CODES)[number];
export type LocalErrorCategory =
  | "VALIDATION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "EXECUTION_FAILED"
  | "INTERNAL";

export interface LocalErrorData {
  readonly code: LocalErrorCode;
  readonly category: LocalErrorCategory;
  readonly message: string;
  readonly retryable: boolean;
  readonly recommended_action?: string;
  readonly details?: JsonObject;
}

export interface LocalEvidence {
  readonly source_type: "local_observation";
  readonly content_hash: string;
  readonly observed_at: string;
}

export interface LocalResultMeta {
  readonly cli_package: typeof LOCAL_CLI_PACKAGE;
  readonly cli_version: typeof LOCAL_CLI_VERSION;
  readonly duration_ms: number;
  readonly truncated: boolean;
}

export interface LocalResult {
  readonly local_result_version: typeof LOCAL_RESULT_VERSION;
  readonly request_id: string;
  readonly capability: LocalCapability | string;
  readonly status: LocalResultStatus;
  readonly data: JsonObject | null;
  readonly error: LocalErrorData | null;
  readonly warnings: readonly string[];
  readonly evidence: LocalEvidence;
  readonly meta: LocalResultMeta;
}

export interface CapabilityDescriptor {
  readonly capability: LocalCapability;
  readonly execution_mode: LocalExecutionMode;
  readonly side_effect: boolean;
  readonly batch_allowed: boolean;
  readonly summary: string;
}

export function isJsonValue(input: unknown): input is JsonValue {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return true;
  }
  if (typeof input === "number") {
    return Number.isFinite(input);
  }
  if (Array.isArray(input)) {
    return input.every(isJsonValue);
  }
  if (input === null || typeof input !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }
  return Object.values(input).every(isJsonValue);
}

export function isJsonObject(input: unknown): input is JsonObject {
  return (
    input !== null &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    isJsonValue(input)
  );
}

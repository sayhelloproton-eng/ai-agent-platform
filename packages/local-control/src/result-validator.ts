import {
  LOCAL_CLI_PACKAGE,
  LOCAL_ERROR_CODES,
  LOCAL_RESULT_VERSION,
  isJsonObject,
  type LocalCapability,
  type LocalResult,
} from "./contracts.js";
import { LocalControlError } from "./errors.js";

const RESULT_STATUSES = new Set(["SUCCEEDED", "PARTIAL", "ACCEPTED", "FAILED"]);
const ERROR_CATEGORIES = new Set([
  "VALIDATION",
  "NOT_FOUND",
  "FORBIDDEN",
  "CONFLICT",
  "UNAVAILABLE",
  "TIMEOUT",
  "EXECUTION_FAILED",
  "INTERNAL",
]);

export interface ExpectedLocalResultIdentity {
  readonly requestId: string;
  readonly capability: LocalCapability;
}

function invalidResult(message: string): never {
  throw new LocalControlError(
    "INVALID_REQUEST",
    "VALIDATION",
    message,
    { retryable: false },
  );
}

export function validateLocalResult(
  input: unknown,
  expected?: ExpectedLocalResultIdentity,
): LocalResult {
  if (!isJsonObject(input)) {
    return invalidResult("Local Control stdout is not a JSON object.");
  }
  if (input.local_result_version !== LOCAL_RESULT_VERSION) {
    return invalidResult("Local Result version is unsupported.");
  }
  if (typeof input.request_id !== "string" || input.request_id.length === 0) {
    return invalidResult("Local Result request_id is invalid.");
  }
  if (typeof input.capability !== "string" || input.capability.length === 0) {
    return invalidResult("Local Result capability is invalid.");
  }
  if (typeof input.status !== "string" || !RESULT_STATUSES.has(input.status)) {
    return invalidResult("Local Result status is invalid.");
  }
  if (input.data !== null && !isJsonObject(input.data)) {
    return invalidResult("Local Result data is invalid.");
  }
  if (!Array.isArray(input.warnings) || !input.warnings.every((value) => typeof value === "string")) {
    return invalidResult("Local Result warnings are invalid.");
  }

  if (input.error !== null) {
    if (!isJsonObject(input.error)) {
      return invalidResult("Local Result error is invalid.");
    }
    if (
      typeof input.error.code !== "string" ||
      !LOCAL_ERROR_CODES.includes(input.error.code as (typeof LOCAL_ERROR_CODES)[number]) ||
      typeof input.error.category !== "string" ||
      !ERROR_CATEGORIES.has(input.error.category) ||
      typeof input.error.message !== "string" ||
      typeof input.error.retryable !== "boolean"
    ) {
      return invalidResult("Local Result error fields are invalid.");
    }
  }

  if (
    !isJsonObject(input.evidence) ||
    input.evidence.source_type !== "local_observation" ||
    typeof input.evidence.content_hash !== "string" ||
    typeof input.evidence.observed_at !== "string"
  ) {
    return invalidResult("Local Result evidence is invalid.");
  }
  if (
    !isJsonObject(input.meta) ||
    input.meta.cli_package !== LOCAL_CLI_PACKAGE ||
    typeof input.meta.cli_version !== "string" ||
    typeof input.meta.duration_ms !== "number" ||
    !Number.isFinite(input.meta.duration_ms) ||
    typeof input.meta.truncated !== "boolean"
  ) {
    return invalidResult("Local Result metadata is invalid.");
  }
  if (input.status === "FAILED" && input.error === null) {
    return invalidResult("FAILED Local Result must include an error.");
  }
  if (input.status !== "FAILED" && input.error !== null) {
    return invalidResult("Successful Local Result must not include an error.");
  }
  if (expected !== undefined) {
    if (input.request_id !== expected.requestId) {
      return invalidResult("Local Result request_id does not match the request.");
    }
    if (input.capability !== expected.capability) {
      return invalidResult("Local Result capability does not match the request.");
    }
  }
  return input as unknown as LocalResult;
}

import {
  LOCAL_CAPABILITIES,
  LOCAL_REQUEST_VERSION,
  isJsonObject,
  type JsonObject,
  type LocalBudget,
  type LocalCapability,
  type LocalCorrelation,
  type LocalRequest,
  type LocalScope,
} from "./contracts.js";
import { LocalControlError } from "./errors.js";
import { getCapabilityDescriptor } from "./capability-registry.js";

const DEFAULT_BUDGET: LocalBudget = Object.freeze({
  timeout_ms: 5_000,
  max_stdout_bytes: 65_536,
  max_result_chars: 50_000,
});

const MAX_BUDGET: LocalBudget = Object.freeze({
  timeout_ms: 15_000,
  max_stdout_bytes: 262_144,
  max_result_chars: 200_000,
});

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  maximumLength: number,
): string {
  const value = record[key];
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maximumLength
  ) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      `${key} must be a non-empty string no longer than ${maximumLength} characters.`,
    );
  }
  return value;
}

function isLocalCapability(input: unknown): input is LocalCapability {
  return (
    typeof input === "string" &&
    LOCAL_CAPABILITIES.some((capability) => capability === input)
  );
}

function readBudget(input: unknown): LocalBudget {
  if (input === undefined) {
    return DEFAULT_BUDGET;
  }
  if (!isPlainRecord(input)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "budget must be a plain object.",
    );
  }

  const readValue = (
    key: keyof LocalBudget,
    defaultValue: number,
    maximum: number,
  ): number => {
    const value = input[key];
    if (value === undefined) {
      return defaultValue;
    }
    if (!Number.isInteger(value) || (value as number) <= 0) {
      throw new LocalControlError(
        "INVALID_REQUEST",
        "VALIDATION",
        `budget.${key} must be a positive integer.`,
      );
    }
    return Math.min(value as number, maximum);
  };

  return {
    timeout_ms: readValue(
      "timeout_ms",
      DEFAULT_BUDGET.timeout_ms,
      MAX_BUDGET.timeout_ms,
    ),
    max_stdout_bytes: readValue(
      "max_stdout_bytes",
      DEFAULT_BUDGET.max_stdout_bytes,
      MAX_BUDGET.max_stdout_bytes,
    ),
    max_result_chars: readValue(
      "max_result_chars",
      DEFAULT_BUDGET.max_result_chars,
      MAX_BUDGET.max_result_chars,
    ),
  };
}

function readOptionalJsonObject(
  input: unknown,
  field: string,
): JsonObject | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!isJsonObject(input)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      `${field} must be a JSON object.`,
    );
  }
  return input;
}

export function validateLocalRequest(input: unknown): LocalRequest {
  if (!isPlainRecord(input)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "Local Request must be a plain object.",
    );
  }

  if (input.local_request_version !== LOCAL_REQUEST_VERSION) {
    throw new LocalControlError(
      "UNSUPPORTED_CONTRACT_VERSION",
      "VALIDATION",
      `local_request_version must be ${LOCAL_REQUEST_VERSION}.`,
    );
  }

  const requestId = readNonEmptyString(input, "request_id", 128);
  if (!isLocalCapability(input.capability)) {
    throw new LocalControlError(
      "CAPABILITY_NOT_FOUND",
      "NOT_FOUND",
      "Requested Local Capability is not registered.",
    );
  }
  const capability = input.capability;
  const descriptor = getCapabilityDescriptor(capability);

  if (input.execution_mode !== descriptor.execution_mode) {
    throw new LocalControlError(
      "EXECUTION_MODE_NOT_SUPPORTED",
      "VALIDATION",
      `Capability ${capability} requires ${descriptor.execution_mode}.`,
    );
  }

  if (!isPlainRecord(input.actor)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "actor must be a plain object.",
    );
  }
  const actor = {
    actor_type: readNonEmptyString(input.actor, "actor_type", 64),
    actor_id: readNonEmptyString(input.actor, "actor_id", 128),
  };

  if (!isJsonObject(input.parameters)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "parameters must be a JSON object.",
    );
  }

  const correlation = readOptionalJsonObject(
    input.correlation,
    "correlation",
  ) as LocalCorrelation | undefined;
  const scope = readOptionalJsonObject(input.scope, "scope") as
    | LocalScope
    | undefined;

  const idempotencyKey = input.idempotency_key;
  if (descriptor.side_effect && idempotencyKey === undefined) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      `Capability ${capability} requires idempotency_key.`,
    );
  }
  if (
    idempotencyKey !== undefined &&
    (typeof idempotencyKey !== "string" ||
      idempotencyKey.length === 0 ||
      idempotencyKey.length > 128)
  ) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "idempotency_key must be a non-empty string no longer than 128 characters.",
    );
  }

  return {
    local_request_version: LOCAL_REQUEST_VERSION,
    request_id: requestId,
    capability,
    execution_mode: descriptor.execution_mode,
    actor,
    ...(correlation === undefined ? {} : { correlation }),
    ...(scope === undefined ? {} : { scope }),
    parameters: input.parameters,
    budget: readBudget(input.budget),
    ...(idempotencyKey === undefined
      ? {}
      : { idempotency_key: idempotencyKey }),
  };
}

import { createHash } from "node:crypto";

import {
  LOCAL_REQUEST_VERSION,
  type JsonObject,
  type JsonValue,
  type LocalActor,
  type LocalBudget,
  type LocalCapability,
  type LocalRequest,
  type LocalScope,
} from "./contracts.js";
import { getCapabilityDescriptor } from "./capability-registry.js";
import { validateLocalRequest } from "./request-validator.js";

export const LOCAL_WORK_V1_PROPOSAL_VERSION = "0.1.0-candidate" as const;

export interface LocalWorkClaimInput {
  readonly local_work_version: typeof LOCAL_WORK_V1_PROPOSAL_VERSION;
  readonly request_id: string;
  readonly capability_ref: LocalCapability;
  readonly actor: LocalActor;
  readonly correlation_id: string;
  readonly scope?: LocalScope;
  readonly parameters: JsonObject;
  readonly budget: LocalBudget;
  readonly idempotency_key: string;
}

const INPUT_FIELDS = new Set([
  "local_work_version",
  "request_id",
  "capability_ref",
  "actor",
  "correlation_id",
  "scope",
  "parameters",
  "budget",
  "idempotency_key",
]);

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function stableValue(input: JsonValue): JsonValue {
  if (Array.isArray(input)) {
    return input.map(stableValue);
  }
  if (input !== null && typeof input === "object") {
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(input).sort()) {
      const value = input[key];
      if (value !== undefined) {
        result[key] = stableValue(value);
      }
    }
    return result;
  }
  return input;
}

function definedJsonObject(
  input: Readonly<Record<string, JsonValue | undefined>>,
): JsonObject {
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function mapWorkClaimToLocalRequest(
  input: LocalWorkClaimInput,
): LocalRequest {
  if (!isPlainRecord(input)) {
    throw new TypeError("Local Work input must be a plain object.");
  }
  const unknownFields = Object.keys(input).filter(
    (field) => !INPUT_FIELDS.has(field),
  );
  if (unknownFields.length > 0) {
    throw new TypeError(
      `Local Work input contains unsupported fields: ${unknownFields.join(", ")}.`,
    );
  }
  if (input.local_work_version !== LOCAL_WORK_V1_PROPOSAL_VERSION) {
    throw new TypeError("Local Work proposal version is unsupported.");
  }
  if (
    typeof input.correlation_id !== "string" ||
    input.correlation_id.length === 0 ||
    input.correlation_id.length > 128
  ) {
    throw new TypeError(
      "Local Work correlation_id must be a non-empty string no longer than 128 characters.",
    );
  }
  if (
    typeof input.idempotency_key !== "string" ||
    input.idempotency_key.length === 0 ||
    input.idempotency_key.length > 128
  ) {
    throw new TypeError(
      "Local Work idempotency_key must be a non-empty string no longer than 128 characters.",
    );
  }

  const descriptor = getCapabilityDescriptor(input.capability_ref);
  return validateLocalRequest({
    local_request_version: LOCAL_REQUEST_VERSION,
    request_id: input.request_id,
    capability: input.capability_ref,
    execution_mode: descriptor.execution_mode,
    actor: input.actor,
    correlation: { correlation_id: input.correlation_id },
    ...(input.scope === undefined ? {} : { scope: input.scope }),
    parameters: input.parameters,
    budget: input.budget,
    idempotency_key: input.idempotency_key,
  });
}

export function fingerprintLocalRequest(request: LocalRequest): string {
  const fingerprintInput: JsonObject = {
    capability: request.capability,
    execution_mode: request.execution_mode,
    actor: {
      actor_type: request.actor.actor_type,
      actor_id: request.actor.actor_id,
    },
    ...(request.correlation === undefined
      ? {}
      : { correlation: definedJsonObject(request.correlation) }),
    ...(request.scope === undefined
      ? {}
      : { scope: definedJsonObject(request.scope) }),
    parameters: request.parameters,
    budget: {
      timeout_ms: request.budget.timeout_ms,
      max_stdout_bytes: request.budget.max_stdout_bytes,
      max_result_chars: request.budget.max_result_chars,
    },
  };
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stableValue(fingerprintInput)))
    .digest("hex")}`;
}

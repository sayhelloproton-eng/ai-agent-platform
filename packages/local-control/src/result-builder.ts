import { createHash } from "node:crypto";

import {
  LOCAL_CLI_PACKAGE,
  LOCAL_CLI_VERSION,
  LOCAL_RESULT_VERSION,
  type JsonObject,
  type JsonValue,
  type LocalCapability,
  type LocalErrorData,
  type LocalResult,
  type LocalResultStatus,
} from "./contracts.js";

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

function contentHash(value: JsonValue): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex")}`;
}

export function buildLocalResult(options: {
  readonly requestId: string;
  readonly capability: LocalCapability | string;
  readonly status: LocalResultStatus;
  readonly data: JsonObject | null;
  readonly error: LocalErrorData | null;
  readonly warnings?: readonly string[];
  readonly durationMs: number;
  readonly truncated?: boolean;
  readonly observedAt?: string;
}): LocalResult {
  const observedAt = options.observedAt ?? new Date().toISOString();
  return {
    local_result_version: LOCAL_RESULT_VERSION,
    request_id: options.requestId,
    capability: options.capability,
    status: options.status,
    data: options.data,
    error: options.error,
    warnings: options.warnings ?? [],
    evidence: {
      source_type: "local_observation",
      content_hash: contentHash(
        (options.data ?? options.error ?? null) as unknown as JsonValue,
      ),
      observed_at: observedAt,
    },
    meta: {
      cli_package: LOCAL_CLI_PACKAGE,
      cli_version: LOCAL_CLI_VERSION,
      duration_ms: Math.max(0, Math.round(options.durationMs)),
      truncated: options.truncated ?? false,
    },
  };
}

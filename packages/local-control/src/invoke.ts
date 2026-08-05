import type {
  JsonObject,
  LocalRequest,
  LocalResult,
} from "./contracts.js";
import { asLocalControlError } from "./errors.js";
import { executeCapability } from "./capabilities/handlers.js";
import { defaultProcessRunner, type ProcessRunner } from "./process.js";
import {
  createDefaultRegistry,
  type LocalRegistry,
} from "./registry.js";
import { buildLocalResult } from "./result-builder.js";
import { validateLocalRequest } from "./request-validator.js";

export interface ExecuteLocalRequestOptions {
  readonly registry?: LocalRegistry;
  readonly processRunner?: ProcessRunner;
  readonly now?: () => number;
}

function resultCharacterLength(result: LocalResult): number {
  return JSON.stringify(result).length;
}

async function executeValidated(
  request: LocalRequest,
  options: Required<Pick<ExecuteLocalRequestOptions, "registry" | "processRunner" | "now">>,
): Promise<LocalResult> {
  const started = options.now();
  try {
    const execution = await executeCapability(request, {
      registry: options.registry,
      processRunner: options.processRunner,
      executeChild: async (childRequest) => {
        const child = await executeValidated(childRequest, options);
        return {
          status: child.status,
          data: child.data,
          error: child.error as JsonObject | null,
          warnings: child.warnings,
          truncated: child.meta.truncated,
        };
      },
    });
    const result = buildLocalResult({
      requestId: request.request_id,
      capability: request.capability,
      status: execution.status,
      data: execution.data,
      error: null,
      durationMs: options.now() - started,
      ...(execution.warnings === undefined
        ? {}
        : { warnings: execution.warnings }),
      ...(execution.truncated === undefined
        ? {}
        : { truncated: execution.truncated }),
    });
    if (resultCharacterLength(result) > request.budget.max_result_chars) {
      return buildLocalResult({
        requestId: request.request_id,
        capability: request.capability,
        status: "FAILED",
        data: null,
        error: {
          code: "OUTPUT_TOO_LARGE",
          category: "EXECUTION_FAILED",
          message: "Local Result exceeded the configured result budget.",
          retryable: false,
          recommended_action:
            "Reduce page size, line range or batch size and retry.",
        },
        durationMs: options.now() - started,
      });
    }
    return result;
  } catch (error) {
    const localError = asLocalControlError(error);
    return buildLocalResult({
      requestId: request.request_id,
      capability: request.capability,
      status: "FAILED",
      data: null,
      error: localError.toData(),
      durationMs: options.now() - started,
    });
  }
}

export async function executeLocalRequest(
  input: unknown,
  options: ExecuteLocalRequestOptions = {},
): Promise<LocalResult> {
  const started = options.now?.() ?? Date.now();
  let request: LocalRequest;
  try {
    request = validateLocalRequest(input);
  } catch (error) {
    const localError = asLocalControlError(error);
    const inputRecord =
      input !== null && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
    return buildLocalResult({
      requestId:
        typeof inputRecord.request_id === "string"
          ? inputRecord.request_id
          : "invalid-request",
      capability:
        typeof inputRecord.capability === "string"
          ? inputRecord.capability
          : "local.unknown",
      status: "FAILED",
      data: null,
      error: localError.toData(),
      durationMs: (options.now?.() ?? Date.now()) - started,
    });
  }

  let registry: LocalRegistry;
  try {
    registry = options.registry ?? createDefaultRegistry();
  } catch (error) {
    const localError = asLocalControlError(error);
    return buildLocalResult({
      requestId: request.request_id,
      capability: request.capability,
      status: "FAILED",
      data: null,
      error: localError.toData(),
      durationMs: (options.now?.() ?? Date.now()) - started,
    });
  }
  const processRunner = options.processRunner ?? defaultProcessRunner;
  const now = options.now ?? Date.now;
  return executeValidated(request, { registry, processRunner, now });
}

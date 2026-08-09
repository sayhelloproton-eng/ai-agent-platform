import type { JsonObject, JsonValue } from "./json.js";
import type { ValidationIssue, ValidationResult } from "./validation.js";

export const MOBILE_INFERENCE_CONTRACT_VERSION = "1.0.0" as const;
export const MOB_NEXT_CONTRACT_VERSION = "1.2" as const;
export const MOB_RESULT_CONTRACT_VERSION = "1.0" as const;

export const MOBILE_INFERENCE_MODELS = {
  FAST: "sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think",
  REASON: "mlx-community/Qwen3.5-4B-MLX-4bit",
} as const;

export type MobileInferenceModel =
  (typeof MOBILE_INFERENCE_MODELS)[keyof typeof MOBILE_INFERENCE_MODELS];

export const MOBILE_INFERENCE_MODEL_CATEGORIES = ["FAST", "REASON"] as const;
export type MobileInferenceModelCategory =
  (typeof MOBILE_INFERENCE_MODEL_CATEGORIES)[number];

export const MOBILE_INFERENCE_RESULT_KINDS = [
  "ok",
  "uncertain",
  "handoff",
  "controller",
  "error",
] as const;
export type MobileInferenceResultKind =
  (typeof MOBILE_INFERENCE_RESULT_KINDS)[number];

export const FAST_DEFAULT_PARAMS = {
  temperature: 0.4,
  top_p: 0.8,
  max_tokens: 1024,
} as const;

export const REASON_DEFAULT_MAX_TOKENS = 2048;

export const MOB_NEXT_FIELDS = [
  "continue",
  "ok",
  "bhr",
  "lcl",
  "controller",
] as const;
export type MobNextField = (typeof MOB_NEXT_FIELDS)[number];

export const MOB_RUNTIME_ERROR_CODES = [
  "model_busy",
  "server_paused",
  "timeout",
  "connection_refused",
  "unknown_error",
] as const;
export type MobRuntimeErrorCode =
  (typeof MOB_RUNTIME_ERROR_CODES)[number];

export const MOB_RETRYABLE_ERROR_CODES: readonly MobRuntimeErrorCode[] = [
  "model_busy",
  "server_paused",
  "timeout",
];

export function isMobRetryableError(
  code: string,
): code is MobRuntimeErrorCode {
  return MOB_RETRYABLE_ERROR_CODES.includes(code as MobRuntimeErrorCode);
}

export interface MobInferenceRequestV1 {
  readonly contractVersion: typeof MOBILE_INFERENCE_CONTRACT_VERSION;
  readonly model: "FAST" | "REASON";
  readonly messages: readonly MobMessageV1[];
  readonly temperature?: number;
  readonly top_p?: number;
  readonly max_tokens?: number;
  readonly idempotencyKey: string;
}

export interface MobMessageV1 {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface MobInferenceResponseV1 {
  readonly contractVersion: typeof MOBILE_INFERENCE_CONTRACT_VERSION;
  readonly model: "FAST" | "REASON";
  readonly content: string;
  readonly usage: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
  };
}

export interface MobNextV1_2 {
  readonly contractVersion: typeof MOB_NEXT_CONTRACT_VERSION;
  readonly continue: string;
  readonly ok: string | null;
  readonly bhr: string | null;
  readonly lcl: string | null;
  readonly controller: string | null;
}

export interface MobInferenceResultV1 {
  readonly resultContractVersion: typeof MOB_RESULT_CONTRACT_VERSION;
  readonly resultRef: string;
  readonly workItemId: string;
  readonly taskId: string;
  readonly model: "FAST" | "REASON";
  readonly kind: MobileInferenceResultKind;
  readonly next: MobNextV1_2 | null;
  readonly content: string | null;
  readonly evidenceRefs: readonly string[];
  readonly summary: string;
  readonly error: MobRuntimeError | null;
  readonly retryable: boolean;
}

export interface MobRuntimeError {
  readonly code: MobRuntimeErrorCode;
  readonly message: string;
}

export interface MobWorkPayloadV1 {
  readonly mobWorkVersion: typeof MOBILE_INFERENCE_CONTRACT_VERSION;
  readonly modelCategory: "FAST" | "REASON";
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly max_tokens?: number;
  readonly idempotencyKey: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function issue(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

export function validateMobWorkPayload(
  input: unknown,
): ValidationResult<MobWorkPayloadV1> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "INVALID_OBJECT",
          message: "Must be a plain object.",
        },
      ],
    };
  }
  if (input.mobWorkVersion !== MOBILE_INFERENCE_CONTRACT_VERSION) {
    issue(
      issues,
      "mobWorkVersion",
      "UNSUPPORTED_VERSION",
      "Unsupported mobile inference work version.",
    );
  }
  if (
    !MOBILE_INFERENCE_MODEL_CATEGORIES.includes(
      input.modelCategory as MobileInferenceModelCategory,
    )
  ) {
    issue(
      issues,
      "modelCategory",
      "INVALID_MODEL_CATEGORY",
      "Must be FAST or REASON.",
    );
  }
  for (const field of ["systemPrompt", "userPrompt"] as const) {
    if (!nonEmpty(input[field])) {
      issue(
        issues,
        field,
        "INVALID_STRING",
        "Must be a non-empty string.",
      );
    }
  }
  for (const field of [
    "temperature",
    "top_p",
    "max_tokens",
  ] as const) {
    if (
      input[field] !== undefined &&
      (typeof input[field] !== "number" || input[field] <= 0)
    ) {
      issue(
        issues,
        field,
        "INVALID_NUMBER",
        "Must be a positive number when supplied.",
      );
    }
  }
  if (!nonEmpty(input.idempotencyKey)) {
    issue(
      issues,
      "idempotencyKey",
      "INVALID_STRING",
      "Must be a non-empty string.",
    );
  }
  return issues.length === 0
    ? { ok: true, value: input as unknown as MobWorkPayloadV1 }
    : { ok: false, issues };
}

export function validateMobInferenceResult(
  input: unknown,
): ValidationResult<MobInferenceResultV1> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "INVALID_OBJECT",
          message: "Must be a plain object.",
        },
      ],
    };
  }
  if (input.resultContractVersion !== MOB_RESULT_CONTRACT_VERSION) {
    issue(
      issues,
      "resultContractVersion",
      "UNSUPPORTED_VERSION",
      "Unsupported mobile inference result contract version.",
    );
  }
  for (const field of [
    "resultRef",
    "workItemId",
    "taskId",
    "summary",
  ] as const) {
    if (!nonEmpty(input[field])) {
      issue(
        issues,
        field,
        "INVALID_STRING",
        "Must be a non-empty string.",
      );
    }
  }
  if (
    input.model !== "FAST" &&
    input.model !== "REASON"
  ) {
    issue(
      issues,
      "model",
      "INVALID_MODEL",
      "Must be FAST or REASON.",
    );
  }
  if (
    !MOBILE_INFERENCE_RESULT_KINDS.includes(
      input.kind as MobileInferenceResultKind,
    )
  ) {
    issue(
      issues,
      "kind",
      "INVALID_RESULT_KIND",
      "Unsupported mobile inference result kind.",
    );
  }
  if (input.next !== null && input.next !== undefined) {
    if (!isRecord(input.next)) {
      issue(
        issues,
        "next",
        "INVALID_OBJECT",
        "next must be an object.",
      );
    } else if (
      input.next.contractVersion !== MOB_NEXT_CONTRACT_VERSION
    ) {
      issue(
        issues,
        "next.contractVersion",
        "UNSUPPORTED_VERSION",
        "Unsupported mob.next contract version.",
      );
    } else {
      for (const field of MOB_NEXT_FIELDS) {
        if (typeof input.next[field] !== "string") {
          issue(
            issues,
            `next.${field}`,
            "INVALID_STRING",
            `mob.next field '${field}' must be a string.`,
          );
        }
      }
    }
  }
  if (input.error !== null && !isRecord(input.error)) {
    issue(
      issues,
      "error",
      "INVALID_OBJECT",
      "error must be null or an object.",
    );
  }
  if (!Array.isArray(input.evidenceRefs)) {
    issue(
      issues,
      "evidenceRefs",
      "INVALID_ARRAY",
      "evidenceRefs must be an array.",
    );
  }
  if (typeof input.retryable !== "boolean") {
    issue(
      issues,
      "retryable",
      "INVALID_BOOLEAN",
      "retryable must be a boolean.",
    );
  }
  return issues.length === 0
    ? { ok: true, value: input as unknown as MobInferenceResultV1 }
    : { ok: false, issues };
}

export function validateMobNextV1_2(
  input: unknown,
): ValidationResult<MobNextV1_2> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "INVALID_OBJECT",
          message: "Must be a plain object.",
        },
      ],
    };
  }
  if (input.contractVersion !== MOB_NEXT_CONTRACT_VERSION) {
    issue(
      issues,
      "contractVersion",
      "UNSUPPORTED_VERSION",
      "Unsupported mob.next contract version.",
    );
  }
  for (const field of MOB_NEXT_FIELDS) {
    if (typeof input[field] !== "string") {
      issue(
        issues,
        field,
        "INVALID_STRING",
        `mob.next field '${field}' must be a string.`,
      );
    }
  }
  return issues.length === 0
    ? { ok: true, value: input as unknown as MobNextV1_2 }
    : { ok: false, issues };
}

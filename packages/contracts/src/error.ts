import type { JsonObject } from "./json.js";

export const ERROR_CODES = [
  "INVALID_TASK",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "CAPABILITY_NOT_FOUND",
  "RUNTIME_UNAVAILABLE",
  "EXECUTION_FAILED",
  "TIMEOUT",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ContractError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: JsonObject;
}

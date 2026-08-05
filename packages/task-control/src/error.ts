import type { JsonObject } from "./model.js";

export const TASK_CONTROL_ERROR_CODES = [
  "INVALID_CONTRACT_VERSION",
  "INVALID_ARGUMENT",
  "TASK_NOT_FOUND",
  "TASK_ALREADY_EXISTS",
  "TASK_VERSION_CONFLICT",
  "PLAN_VERSION_CONFLICT",
  "ROLE_NOT_ALLOWED",
  "CONTROLLER_ALREADY_CLAIMED",
  "WORK_ALREADY_CLAIMED",
  "DISPATCH_ALREADY_CLAIMED",
  "CLAIM_EXPIRED",
  "CLAIM_TOKEN_INVALID",
  "COMMAND_NOT_ALLOWED",
  "INVALID_PLAN",
  "PLAN_NODE_NOT_FOUND",
  "WORK_ITEM_NOT_FOUND",
  "DISPATCH_NOT_FOUND",
  "INTERNAL_CONSISTENCY_ERROR",
] as const;
export type TaskControlErrorCode = (typeof TASK_CONTROL_ERROR_CODES)[number];

export class TaskControlError extends Error {
  readonly code: TaskControlErrorCode;
  readonly details: JsonObject;

  constructor(code: TaskControlErrorCode, message: string, details: JsonObject = {}) {
    super(message);
    this.name = "TaskControlError";
    this.code = code;
    this.details = details;
  }
}

export function invariant(
  condition: unknown,
  code: TaskControlErrorCode,
  message: string,
  details: JsonObject = {},
): asserts condition {
  if (!condition) {
    throw new TaskControlError(code, message, details);
  }
}

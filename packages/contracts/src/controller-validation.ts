import {
  CONTROLLER_COMMAND_TYPES,
  CONTROLLER_PLAN_NODE_KINDS,
  CONTROLLER_PLAN_REVISION_OPERATIONS,
  type ClaimControllerTaskRequest,
  type ControllerCommand,
  type ControllerPlanNodeDraft,
  type ControllerPlanRevisionOperation,
  type GetTaskDecisionContextRequest,
  type ReleaseControllerTaskRequest,
  type SubmitControllerCommandRequest,
} from "./controller.js";
import { isJsonObject } from "./json.js";
import type { ValidationIssue, ValidationResult } from "./validation.js";

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0;
}

function isNonNegativeInteger(input: unknown): input is number {
  return Number.isSafeInteger(input) && Number(input) >= 0;
}

function isPositiveInteger(input: unknown): input is number {
  return Number.isSafeInteger(input) && Number(input) > 0;
}

function issue(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

const SERVER_OWNED_IDENTITY_FIELDS = [
  "profileId",
  "profile_id",
  "roleId",
  "role_id",
  "actor",
  "requestedBy",
  "claimedByProfile",
] as const;

function rejectUnknownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssue[],
  additionallyKnown: readonly string[] = [],
): void {
  const known = new Set([...allowed, ...additionallyKnown]);
  for (const field of Object.keys(record)) {
    if (!known.has(field)) {
      issue(
        issues,
        path.length === 0 ? field : `${path}.${field}`,
        "UNKNOWN_FIELD",
        "Field is not allowed by the Controller contract.",
      );
    }
  }
}

function rejectServerOwnedIdentity(
  record: Record<string, unknown>,
  issues: ValidationIssue[],
): void {
  for (const field of SERVER_OWNED_IDENTITY_FIELDS) {
    if (field in record) {
      issue(
        issues,
        field,
        "SERVER_OWNED_FIELD",
        "Caller identity is derived by the Gateway and must not be supplied.",
      );
    }
  }
}

function validateStringArray(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): input is readonly string[] {
  if (!Array.isArray(input)) {
    issue(issues, path, "INVALID_ARRAY", "Must be an array.");
    return false;
  }
  let valid = true;
  input.forEach((value, index) => {
    if (!isNonEmptyString(value)) {
      valid = false;
      issue(
        issues,
        `${path}[${index}]`,
        "INVALID_STRING",
        "Must be a non-empty string.",
      );
    }
  });
  return valid;
}

function validatePlanNodeDraft(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): input is ControllerPlanNodeDraft {
  if (!isPlainRecord(input)) {
    issue(issues, path, "INVALID_OBJECT", "Must be a plain object.");
    return false;
  }

  let valid = true;
  rejectUnknownFields(
    input,
    ["nodeId", "title", "kind", "requiredRole", "dependsOn", "acceptanceCriteria"],
    path,
    issues,
    ["status", "workRefs", "resultRefs"],
  );
  for (const [field, value] of [
    ["nodeId", input.nodeId],
    ["title", input.title],
    ["requiredRole", input.requiredRole],
  ] as const) {
    if (!isNonEmptyString(value)) {
      valid = false;
      issue(
        issues,
        `${path}.${field}`,
        "INVALID_STRING",
        "Must be a non-empty string.",
      );
    }
  }

  if (
    typeof input.kind !== "string" ||
    !CONTROLLER_PLAN_NODE_KINDS.includes(
      input.kind as (typeof CONTROLLER_PLAN_NODE_KINDS)[number],
    )
  ) {
    valid = false;
    issue(issues, `${path}.kind`, "INVALID_NODE_KIND", "Unsupported node kind.");
  }

  if (input.dependsOn !== undefined) {
    valid = validateStringArray(input.dependsOn, `${path}.dependsOn`, issues) && valid;
  }
  if (input.acceptanceCriteria !== undefined) {
    valid =
      validateStringArray(
        input.acceptanceCriteria,
        `${path}.acceptanceCriteria`,
        issues,
      ) && valid;
  }

  for (const forbidden of ["status", "workRefs", "resultRefs"]) {
    if (forbidden in input) {
      valid = false;
      issue(
        issues,
        `${path}.${forbidden}`,
        "SERVER_OWNED_FIELD",
        "Plan runtime state is server-owned.",
      );
    }
  }

  return valid;
}

function validatePlanRevisionOperation(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): input is ControllerPlanRevisionOperation {
  if (!isPlainRecord(input)) {
    issue(issues, path, "INVALID_OBJECT", "Must be a plain object.");
    return false;
  }

  if (
    typeof input.operation !== "string" ||
    !CONTROLLER_PLAN_REVISION_OPERATIONS.includes(
      input.operation as (typeof CONTROLLER_PLAN_REVISION_OPERATIONS)[number],
    )
  ) {
    issue(
      issues,
      `${path}.operation`,
      "INVALID_PLAN_OPERATION",
      "Unsupported plan operation.",
    );
    return false;
  }

  if (input.operation === "INSERT_NODE_AFTER") {
    rejectUnknownFields(
      input,
      ["operation", "afterNodeId", "node"],
      path,
      issues,
    );
    let valid = true;
    if (!isNonEmptyString(input.afterNodeId)) {
      valid = false;
      issue(
        issues,
        `${path}.afterNodeId`,
        "INVALID_STRING",
        "Must be a non-empty string.",
      );
    }
    return validatePlanNodeDraft(input.node, `${path}.node`, issues) && valid;
  }

  rejectUnknownFields(
    input,
    ["operation", "nodeId", "reasonSummary"],
    path,
    issues,
  );
  let valid = true;
  if (!isNonEmptyString(input.nodeId)) {
    valid = false;
    issue(
      issues,
      `${path}.nodeId`,
      "INVALID_STRING",
      "Must be a non-empty string.",
    );
  }
  if (!isNonEmptyString(input.reasonSummary)) {
    valid = false;
    issue(
      issues,
      `${path}.reasonSummary`,
      "INVALID_STRING",
      "Must be a non-empty string.",
    );
  }
  return valid;
}

function validateControllerCommand(
  input: unknown,
  issues: ValidationIssue[],
): input is ControllerCommand {
  if (!isPlainRecord(input)) {
    issue(issues, "command", "INVALID_OBJECT", "Must be a plain object.");
    return false;
  }

  if (
    typeof input.type !== "string" ||
    !CONTROLLER_COMMAND_TYPES.includes(
      input.type as (typeof CONTROLLER_COMMAND_TYPES)[number],
    )
  ) {
    issue(
      issues,
      "command.type",
      "INVALID_COMMAND_TYPE",
      "Unsupported Controller command.",
    );
    return false;
  }

  let valid = true;
  rejectUnknownFields(
    input,
    ["type", "reasonSummary", "payload"],
    "command",
    issues,
  );
  if (!isNonEmptyString(input.reasonSummary)) {
    valid = false;
    issue(
      issues,
      "command.reasonSummary",
      "INVALID_STRING",
      "Must be a non-empty string.",
    );
  }
  if (!isPlainRecord(input.payload) || !isJsonObject(input.payload)) {
    valid = false;
    issue(
      issues,
      "command.payload",
      "INVALID_OBJECT",
      "Must be a JSON object.",
    );
    return false;
  }

  const payload = input.payload;
  switch (input.type) {
    case "CREATE_PLAN": {
      rejectUnknownFields(payload, ["nodes"], "command.payload", issues);
      if (!Array.isArray(payload.nodes) || payload.nodes.length === 0) {
        issue(
          issues,
          "command.payload.nodes",
          "INVALID_PLAN",
          "CREATE_PLAN requires at least one node.",
        );
        return false;
      }
      payload.nodes.forEach((node, index) => {
        valid =
          validatePlanNodeDraft(
            node,
            `command.payload.nodes[${index}]`,
            issues,
          ) && valid;
      });
      break;
    }
    case "REVISE_PLAN": {
      rejectUnknownFields(payload, ["operations"], "command.payload", issues);
      if (!Array.isArray(payload.operations) || payload.operations.length === 0) {
        issue(
          issues,
          "command.payload.operations",
          "INVALID_PLAN",
          "REVISE_PLAN requires at least one operation.",
        );
        return false;
      }
      payload.operations.forEach((operation, index) => {
        valid =
          validatePlanRevisionOperation(
            operation,
            `command.payload.operations[${index}]`,
            issues,
          ) && valid;
      });
      break;
    }
    case "ADVANCE_PLAN_NODE": {
      rejectUnknownFields(payload, ["nodeId", "resultRefs", "summary"], "command.payload", issues);
      if (!isNonEmptyString(payload.nodeId)) {
        valid = false;
        issue(issues, "command.payload.nodeId", "INVALID_STRING", "Must be a non-empty string.");
      }
      if (payload.resultRefs !== undefined) {
        valid = validateStringArray(payload.resultRefs, "command.payload.resultRefs", issues) && valid;
      }
      if (payload.summary !== undefined && !isNonEmptyString(payload.summary)) {
        valid = false;
        issue(issues, "command.payload.summary", "INVALID_STRING", "Must be a non-empty string.");
      }
      break;
    }
    case "REQUEST_ROLE_WORK": {
      rejectUnknownFields(payload, ["nodeId", "requiredRole", "objective", "expectedOutputContract"], "command.payload", issues);
      for (const [field, value] of [
        ["nodeId", payload.nodeId],
        ["requiredRole", payload.requiredRole],
        ["objective", payload.objective],
      ] as const) {
        if (!isNonEmptyString(value)) {
          valid = false;
          issue(issues, `command.payload.${field}`, "INVALID_STRING", "Must be a non-empty string.");
        }
      }
      if (
        payload.expectedOutputContract !== undefined &&
        !isNonEmptyString(payload.expectedOutputContract)
      ) {
        valid = false;
        issue(issues, "command.payload.expectedOutputContract", "INVALID_STRING", "Must be a non-empty string.");
      }
      break;
    }
    case "REQUEST_APPROVAL": {
      rejectUnknownFields(payload, ["nodeId", "summary"], "command.payload", issues);
      if (!isNonEmptyString(payload.nodeId)) {
        valid = false;
        issue(issues, "command.payload.nodeId", "INVALID_STRING", "Must be a non-empty string.");
      }
      if (!isNonEmptyString(payload.summary)) {
        valid = false;
        issue(issues, "command.payload.summary", "INVALID_STRING", "Must be a non-empty string.");
      }
      break;
    }
    case "BLOCK_TASK": {
      rejectUnknownFields(payload, ["reason"], "command.payload", issues);
      if (!isNonEmptyString(payload.reason)) {
        valid = false;
        issue(issues, "command.payload.reason", "INVALID_STRING", "Must be a non-empty string.");
      }
      break;
    }
    case "COMPLETE_TASK": {
      rejectUnknownFields(payload, ["summary", "resultRefs"], "command.payload", issues);
      if (!isNonEmptyString(payload.summary)) {
        valid = false;
        issue(issues, "command.payload.summary", "INVALID_STRING", "Must be a non-empty string.");
      }
      if (payload.resultRefs !== undefined) {
        valid = validateStringArray(payload.resultRefs, "command.payload.resultRefs", issues) && valid;
      }
      break;
    }
  }

  return valid;
}

export function validateGetTaskDecisionContextRequest(
  input: unknown,
): ValidationResult<GetTaskDecisionContextRequest> {
  const issues: ValidationIssue[] = [];
  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [{ path: "", code: "INVALID_OBJECT", message: "Must be a plain object." }],
    };
  }
  rejectServerOwnedIdentity(input, issues);
  rejectUnknownFields(input, ["taskId", "eventCursor"], "", issues, SERVER_OWNED_IDENTITY_FIELDS);
  if (!isNonEmptyString(input.taskId)) {
    issue(issues, "taskId", "INVALID_STRING", "Must be a non-empty string.");
  }
  if (input.eventCursor !== undefined && !isNonNegativeInteger(input.eventCursor)) {
    issue(issues, "eventCursor", "INVALID_INTEGER", "Must be a non-negative integer.");
  }
  return issues.length === 0
    ? { ok: true, value: input as unknown as GetTaskDecisionContextRequest }
    : { ok: false, issues };
}

export function validateClaimControllerTaskRequest(
  input: unknown,
): ValidationResult<ClaimControllerTaskRequest> {
  const issues: ValidationIssue[] = [];
  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [{ path: "", code: "INVALID_OBJECT", message: "Must be a plain object." }],
    };
  }
  rejectServerOwnedIdentity(input, issues);
  rejectUnknownFields(input, ["taskId", "expectedTaskVersion", "idempotencyKey"], "", issues, SERVER_OWNED_IDENTITY_FIELDS);
  if (!isNonEmptyString(input.taskId)) issue(issues, "taskId", "INVALID_STRING", "Must be a non-empty string.");
  if (!isPositiveInteger(input.expectedTaskVersion)) issue(issues, "expectedTaskVersion", "INVALID_INTEGER", "Must be a positive integer.");
  if (!isNonEmptyString(input.idempotencyKey)) issue(issues, "idempotencyKey", "INVALID_STRING", "Must be a non-empty string.");
  return issues.length === 0
    ? { ok: true, value: input as unknown as ClaimControllerTaskRequest }
    : { ok: false, issues };
}

export function validateSubmitControllerCommandRequest(
  input: unknown,
): ValidationResult<SubmitControllerCommandRequest> {
  const issues: ValidationIssue[] = [];
  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [{ path: "", code: "INVALID_OBJECT", message: "Must be a plain object." }],
    };
  }
  rejectServerOwnedIdentity(input, issues);
  rejectUnknownFields(input, ["taskId", "claimToken", "expectedTaskVersion", "expectedPlanVersion", "idempotencyKey", "command"], "", issues, SERVER_OWNED_IDENTITY_FIELDS);
  if (!isNonEmptyString(input.taskId)) issue(issues, "taskId", "INVALID_STRING", "Must be a non-empty string.");
  if (!isNonEmptyString(input.claimToken)) issue(issues, "claimToken", "INVALID_STRING", "Must be a non-empty string.");
  if (!isPositiveInteger(input.expectedTaskVersion)) issue(issues, "expectedTaskVersion", "INVALID_INTEGER", "Must be a positive integer.");
  if (input.expectedPlanVersion !== null && !isPositiveInteger(input.expectedPlanVersion)) {
    issue(issues, "expectedPlanVersion", "INVALID_INTEGER", "Must be null or a positive integer.");
  }
  if (!isNonEmptyString(input.idempotencyKey)) issue(issues, "idempotencyKey", "INVALID_STRING", "Must be a non-empty string.");
  validateControllerCommand(input.command, issues);
  return issues.length === 0
    ? { ok: true, value: input as unknown as SubmitControllerCommandRequest }
    : { ok: false, issues };
}

export function validateReleaseControllerTaskRequest(
  input: unknown,
): ValidationResult<ReleaseControllerTaskRequest> {
  const issues: ValidationIssue[] = [];
  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [{ path: "", code: "INVALID_OBJECT", message: "Must be a plain object." }],
    };
  }
  rejectServerOwnedIdentity(input, issues);
  rejectUnknownFields(input, ["taskId", "claimToken", "idempotencyKey"], "", issues, SERVER_OWNED_IDENTITY_FIELDS);
  if (!isNonEmptyString(input.taskId)) issue(issues, "taskId", "INVALID_STRING", "Must be a non-empty string.");
  if (!isNonEmptyString(input.claimToken)) issue(issues, "claimToken", "INVALID_STRING", "Must be a non-empty string.");
  if (!isNonEmptyString(input.idempotencyKey)) issue(issues, "idempotencyKey", "INVALID_STRING", "Must be a non-empty string.");
  return issues.length === 0
    ? { ok: true, value: input as unknown as ReleaseControllerTaskRequest }
    : { ok: false, issues };
}

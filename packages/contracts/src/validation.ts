import { isCapabilityName } from "./capability.js";
import {
  ERROR_CODES,
  type ContractError,
  type ErrorCode,
} from "./error.js";
import { isJsonObject, isJsonValue } from "./json.js";
import {
  EVIDENCE_TYPES,
  TASK_RESULT_STATUSES,
  type EvidenceItem,
  type EvidenceType,
  type TaskResult,
  type TaskResultMetadata,
  type TaskResultStatus,
} from "./result.js";
import {
  CONTRACT_VERSION,
  REQUESTED_BY_TYPES,
  type RequestedByType,
  type TaskMetadata,
  type TaskRequest,
  type TaskRequester,
} from "./task.js";

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly issues: readonly ValidationIssue[];
    };

const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

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

function isIsoDateTime(input: unknown): input is string {
  if (typeof input !== "string") {
    return false;
  }

  const match = ISO_DATE_TIME_PATTERN.exec(input);
  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timezone = match[7];
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const maximumDay = daysInMonth[month - 1];

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    maximumDay === undefined ||
    day < 1 ||
    day > maximumDay ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59 ||
    timezone === undefined
  ) {
    return false;
  }

  if (timezone !== "Z") {
    const offsetHour = Number(timezone.slice(1, 3));
    const offsetMinute = Number(timezone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      return false;
    }
  }

  return (
    Number.isFinite(Date.parse(input))
  );
}

function isRequestedByType(input: unknown): input is RequestedByType {
  return (
    typeof input === "string" &&
    REQUESTED_BY_TYPES.some((type) => type === input)
  );
}

function isErrorCode(input: unknown): input is ErrorCode {
  return (
    typeof input === "string" && ERROR_CODES.some((code) => code === input)
  );
}

function isTaskResultStatus(input: unknown): input is TaskResultStatus {
  return (
    typeof input === "string" &&
    TASK_RESULT_STATUSES.some((status) => status === input)
  );
}

function isEvidenceType(input: unknown): input is EvidenceType {
  return (
    typeof input === "string" &&
    EVIDENCE_TYPES.some((type) => type === input)
  );
}

function issue(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function validateOptionalNonEmptyString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (value !== undefined && !isNonEmptyString(value)) {
    issue(issues, path, "INVALID_STRING", "Must be a non-empty string.");
  }
}

function validateRequester(
  input: unknown,
  issues: ValidationIssue[],
): input is TaskRequester {
  if (!isPlainRecord(input)) {
    issue(
      issues,
      "requestedBy",
      "INVALID_OBJECT",
      "Must be a plain object.",
    );
    return false;
  }

  if (!isRequestedByType(input.type)) {
    issue(
      issues,
      "requestedBy.type",
      "INVALID_REQUESTER_TYPE",
      "Must be custom-gpt, internal, or test.",
    );
  }
  validateOptionalNonEmptyString(
    input.subject,
    "requestedBy.subject",
    issues,
  );

  return (
    isRequestedByType(input.type) &&
    (input.subject === undefined || isNonEmptyString(input.subject))
  );
}

function validateTaskMetadata(
  input: unknown,
  issues: ValidationIssue[],
): input is TaskMetadata {
  if (!isPlainRecord(input)) {
    issue(issues, "metadata", "INVALID_OBJECT", "Must be a plain object.");
    return false;
  }

  if (!isIsoDateTime(input.requestedAt)) {
    issue(
      issues,
      "metadata.requestedAt",
      "INVALID_DATE_TIME",
      "Must be a valid ISO-8601 date-time with a timezone.",
    );
  }
  validateOptionalNonEmptyString(
    input.requestId,
    "metadata.requestId",
    issues,
  );
  validateOptionalNonEmptyString(
    input.correlationId,
    "metadata.correlationId",
    issues,
  );

  return (
    isIsoDateTime(input.requestedAt) &&
    (input.requestId === undefined || isNonEmptyString(input.requestId)) &&
    (input.correlationId === undefined ||
      isNonEmptyString(input.correlationId))
  );
}

function isValidatedTaskRequest(
  input: Record<string, unknown>,
): input is Record<string, unknown> & TaskRequest {
  return (
    input.contractVersion === CONTRACT_VERSION &&
    isNonEmptyString(input.taskId) &&
    isCapabilityName(input.capability) &&
    isJsonObject(input.input) &&
    validateRequester(input.requestedBy, []) &&
    validateTaskMetadata(input.metadata, [])
  );
}

export function validateTaskRequest(
  input: unknown,
): ValidationResult<TaskRequest> {
  const issues: ValidationIssue[] = [];

  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "INVALID_OBJECT",
          message: "Task Request must be a plain object.",
        },
      ],
    };
  }

  if (input.contractVersion !== CONTRACT_VERSION) {
    issue(
      issues,
      "contractVersion",
      "UNSUPPORTED_CONTRACT_VERSION",
      `Must equal ${CONTRACT_VERSION}.`,
    );
  }
  if (!isNonEmptyString(input.taskId)) {
    issue(issues, "taskId", "INVALID_STRING", "Must be a non-empty string.");
  }
  if (!isCapabilityName(input.capability)) {
    issue(
      issues,
      "capability",
      "UNKNOWN_CAPABILITY",
      "Must be a supported Capability name.",
    );
  }
  if (!isJsonObject(input.input)) {
    issue(issues, "input", "INVALID_JSON_OBJECT", "Must be a JSON object.");
  }

  const requesterIsValid = validateRequester(input.requestedBy, issues);
  const metadataIsValid = validateTaskMetadata(input.metadata, issues);

  if (
    issues.length === 0 &&
    requesterIsValid &&
    metadataIsValid &&
    isValidatedTaskRequest(input)
  ) {
    return { ok: true, value: input };
  }

  return { ok: false, issues };
}

function validateContractErrorFields(
  input: Record<string, unknown>,
  issues: ValidationIssue[],
  pathPrefix = "",
): input is Record<string, unknown> & ContractError {
  const path = (field: string): string =>
    pathPrefix.length > 0 ? `${pathPrefix}.${field}` : field;

  if (!isErrorCode(input.code)) {
    issue(issues, path("code"), "INVALID_ERROR_CODE", "Unknown error code.");
  }
  if (!isNonEmptyString(input.message)) {
    issue(
      issues,
      path("message"),
      "INVALID_STRING",
      "Must be a non-empty string.",
    );
  }
  if (typeof input.retryable !== "boolean") {
    issue(
      issues,
      path("retryable"),
      "INVALID_BOOLEAN",
      "Must be a boolean.",
    );
  }
  if (input.details !== undefined && !isJsonObject(input.details)) {
    issue(
      issues,
      path("details"),
      "INVALID_JSON_OBJECT",
      "Must be a JSON object when present.",
    );
  }
  if ("stack" in input) {
    issue(
      issues,
      path("stack"),
      "FORBIDDEN_FIELD",
      "Stack traces are not part of Contract Error.",
    );
  }

  return (
    isErrorCode(input.code) &&
    isNonEmptyString(input.message) &&
    typeof input.retryable === "boolean" &&
    (input.details === undefined || isJsonObject(input.details)) &&
    !("stack" in input)
  );
}

export function validateContractError(
  input: unknown,
): ValidationResult<ContractError> {
  const issues: ValidationIssue[] = [];

  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "INVALID_OBJECT",
          message: "Contract Error must be a plain object.",
        },
      ],
    };
  }

  if (validateContractErrorFields(input, issues) && issues.length === 0) {
    return { ok: true, value: input };
  }

  return { ok: false, issues };
}

function validateEvidenceItem(
  input: unknown,
  index: number,
  issues: ValidationIssue[],
): input is EvidenceItem {
  const basePath = `evidence[${index}]`;
  if (!isPlainRecord(input)) {
    issue(
      issues,
      basePath,
      "INVALID_OBJECT",
      "Evidence item must be a plain object.",
    );
    return false;
  }

  if (!isEvidenceType(input.type)) {
    issue(
      issues,
      `${basePath}.type`,
      "INVALID_EVIDENCE_TYPE",
      "Must be log, metric, or reference.",
    );
  }
  if (!isNonEmptyString(input.name)) {
    issue(
      issues,
      `${basePath}.name`,
      "INVALID_STRING",
      "Must be a non-empty string.",
    );
  }
  if (!isJsonValue(input.value)) {
    issue(
      issues,
      `${basePath}.value`,
      "INVALID_JSON_VALUE",
      "Must be a JSON value.",
    );
  }

  return (
    isEvidenceType(input.type) &&
    isNonEmptyString(input.name) &&
    isJsonValue(input.value)
  );
}

function validateResultMetadata(
  input: unknown,
  issues: ValidationIssue[],
): input is TaskResultMetadata {
  if (!isPlainRecord(input)) {
    issue(issues, "metadata", "INVALID_OBJECT", "Must be a plain object.");
    return false;
  }

  if (!isIsoDateTime(input.startedAt)) {
    issue(
      issues,
      "metadata.startedAt",
      "INVALID_DATE_TIME",
      "Must be a valid ISO-8601 date-time with a timezone.",
    );
  }
  if (!isIsoDateTime(input.completedAt)) {
    issue(
      issues,
      "metadata.completedAt",
      "INVALID_DATE_TIME",
      "Must be a valid ISO-8601 date-time with a timezone.",
    );
  }
  if (
    typeof input.durationMs !== "number" ||
    !Number.isFinite(input.durationMs) ||
    input.durationMs < 0
  ) {
    issue(
      issues,
      "metadata.durationMs",
      "INVALID_DURATION",
      "Must be a non-negative finite number.",
    );
  }
  validateOptionalNonEmptyString(
    input.executor,
    "metadata.executor",
    issues,
  );

  if (
    isIsoDateTime(input.startedAt) &&
    isIsoDateTime(input.completedAt) &&
    Date.parse(input.completedAt) < Date.parse(input.startedAt)
  ) {
    issue(
      issues,
      "metadata.completedAt",
      "INVALID_TIME_ORDER",
      "Must not be earlier than startedAt.",
    );
  }

  return (
    isIsoDateTime(input.startedAt) &&
    isIsoDateTime(input.completedAt) &&
    typeof input.durationMs === "number" &&
    Number.isFinite(input.durationMs) &&
    input.durationMs >= 0 &&
    (input.executor === undefined || isNonEmptyString(input.executor)) &&
    Date.parse(input.completedAt) >= Date.parse(input.startedAt)
  );
}

function isValidatedTaskResult(
  input: Record<string, unknown>,
): input is Record<string, unknown> & TaskResult {
  if (
    input.contractVersion !== CONTRACT_VERSION ||
    !isNonEmptyString(input.taskId) ||
    !isTaskResultStatus(input.status) ||
    (input.output !== null && !isJsonObject(input.output)) ||
    !Array.isArray(input.evidence) ||
    !input.evidence.every((item, index) =>
      validateEvidenceItem(item, index, []),
    ) ||
    !validateResultMetadata(input.metadata, [])
  ) {
    return false;
  }

  if (input.status === "succeeded") {
    return input.error === null;
  }

  return (
    isPlainRecord(input.error) &&
    validateContractErrorFields(input.error, [])
  );
}

export function validateTaskResult(
  input: unknown,
): ValidationResult<TaskResult> {
  const issues: ValidationIssue[] = [];

  if (!isPlainRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "INVALID_OBJECT",
          message: "Task Result must be a plain object.",
        },
      ],
    };
  }

  if (input.contractVersion !== CONTRACT_VERSION) {
    issue(
      issues,
      "contractVersion",
      "UNSUPPORTED_CONTRACT_VERSION",
      `Must equal ${CONTRACT_VERSION}.`,
    );
  }
  if (!isNonEmptyString(input.taskId)) {
    issue(issues, "taskId", "INVALID_STRING", "Must be a non-empty string.");
  }
  if (!isTaskResultStatus(input.status)) {
    issue(
      issues,
      "status",
      "INVALID_RESULT_STATUS",
      "Unknown Task Result status.",
    );
  }
  if (input.output !== null && !isJsonObject(input.output)) {
    issue(
      issues,
      "output",
      "INVALID_JSON_OBJECT",
      "Must be a JSON object or null.",
    );
  }

  let errorIsValid = input.error === null;
  if (input.error !== null) {
    if (!isPlainRecord(input.error)) {
      issue(
        issues,
        "error",
        "INVALID_OBJECT",
        "Must be a Contract Error or null.",
      );
      errorIsValid = false;
    } else {
      errorIsValid = validateContractErrorFields(input.error, issues, "error");
    }
  }

  if (input.status === "succeeded" && input.error !== null) {
    issue(
      issues,
      "error",
      "RESULT_INVARIANT",
      "Succeeded results must have a null error.",
    );
  } else if (
    isTaskResultStatus(input.status) &&
    input.status !== "succeeded" &&
    input.error === null
  ) {
    issue(
      issues,
      "error",
      "RESULT_INVARIANT",
      "Non-succeeded results must include a Contract Error.",
    );
  }

  let evidenceIsValid = false;
  if (!Array.isArray(input.evidence)) {
    issue(issues, "evidence", "INVALID_ARRAY", "Must be an array.");
  } else {
    evidenceIsValid = input.evidence
      .map((item, index) => validateEvidenceItem(item, index, issues))
      .every(Boolean);
  }

  const metadataIsValid = validateResultMetadata(input.metadata, issues);

  if (
    issues.length === 0 &&
    input.contractVersion === CONTRACT_VERSION &&
    isNonEmptyString(input.taskId) &&
    isTaskResultStatus(input.status) &&
    (input.output === null || isJsonObject(input.output)) &&
    errorIsValid &&
    Array.isArray(input.evidence) &&
    evidenceIsValid &&
    metadataIsValid &&
    isValidatedTaskResult(input)
  ) {
    return { ok: true, value: input };
  }

  return { ok: false, issues };
}

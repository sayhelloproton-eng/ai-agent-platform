import type {
  LocalErrorCategory,
  LocalErrorCode,
  LocalRequest,
  LocalResult,
  LocalResultStatus,
} from "./contracts.js";
import {
  LocalControlTransportError,
  type LocalControlClient,
  type LocalControlExecutionOptions,
  type LocalControlTransportErrorCode,
} from "./gateway-process-adapter.js";
import {
  fingerprintLocalRequest,
  mapWorkClaimToLocalRequest,
  type LocalWorkClaimInput,
} from "./local-work-v1.js";
import { validateLocalResult } from "./result-validator.js";

const MAX_SUMMARY_CHARS = 512;
const DEFAULT_IN_FLIGHT_MAX_ENTRIES = 64;
const DEFAULT_IN_FLIGHT_TTL_MS = 30_000;

export type LocalWorkConsumerErrorCode =
  | "LOCAL_WORK_IDEMPOTENCY_CONFLICT"
  | "LOCAL_WORK_INFLIGHT_CAPACITY"
  | "LOCAL_WORK_INFLIGHT_EXPIRED";

export type LocalWorkBoundaryErrorCode =
  | LocalErrorCode
  | LocalControlTransportErrorCode
  | LocalWorkConsumerErrorCode;

export interface LocalWorkBoundaryError {
  readonly code: LocalWorkBoundaryErrorCode;
  readonly category: LocalErrorCategory;
  readonly message: string;
  readonly retryable: boolean;
}

export interface StoredLocalWorkResult {
  readonly idempotency_key: string;
  readonly request_fingerprint: string;
  readonly result_ref: string;
  readonly summary: string;
  readonly local_result: LocalResult | null;
  readonly error: LocalWorkBoundaryError | null;
}

export interface LocalResultSinkPort {
  load(input: {
    readonly idempotency_key: string;
  }): Promise<StoredLocalWorkResult | null>;
  persist(input: {
    readonly idempotency_key: string;
    readonly request_fingerprint: string;
    readonly summary: string;
    readonly local_result: LocalResult | null;
    readonly error: LocalWorkBoundaryError | null;
  }): Promise<StoredLocalWorkResult>;
}

export interface StoredLocalEvidenceReferences {
  readonly idempotency_key: string;
  readonly request_fingerprint: string;
  readonly result_ref: string;
  readonly evidence_refs: readonly string[];
}

export interface LocalEvidenceSinkPort {
  load?(input: {
    readonly idempotency_key: string;
    readonly request_fingerprint: string;
    readonly result_ref: string;
  }): Promise<StoredLocalEvidenceReferences | null>;
  persist(input: {
    readonly idempotency_key: string;
    readonly request_fingerprint: string;
    readonly result_ref: string;
    readonly local_result: LocalResult | null;
  }): Promise<
    | StoredLocalEvidenceReferences
    | { readonly evidence_refs: readonly string[] }
  >;
}

export interface LocalWorkReportPort {
  report(report: LocalWorkConsumerReport): Promise<void>;
}

export interface LocalWorkConsumerReport {
  readonly status: LocalResultStatus;
  readonly summary: string;
  readonly result_ref: string;
  readonly evidence_refs: readonly string[];
  readonly error: LocalWorkBoundaryError | null;
  readonly correlation_id: string;
  readonly idempotency_key: string;
}

export interface LocalWorkInFlightOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
  readonly now?: () => number;
}

export interface LocalWorkConsumerOptions {
  readonly client: LocalControlClient;
  readonly resultSink: LocalResultSinkPort;
  readonly evidenceSink: LocalEvidenceSinkPort;
  readonly reportPort?: LocalWorkReportPort;
  readonly inFlight?: LocalWorkInFlightOptions;
}

export interface LocalWorkRunOptions extends LocalControlExecutionOptions {}

export interface LocalResultDisposition {
  readonly terminal: boolean;
  readonly continue_polling: boolean;
  readonly retryable: boolean;
}

export class LocalWorkConsumerError extends Error {
  readonly code: LocalWorkConsumerErrorCode;
  readonly retryable: boolean;

  constructor(
    code: LocalWorkConsumerErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "LocalWorkConsumerError";
    this.code = code;
    this.retryable = retryable;
  }
}

function transportError(error: LocalControlTransportError): LocalWorkBoundaryError {
  const category: LocalErrorCategory =
    error.code === "LOCAL_CLI_TIMEOUT"
      ? "TIMEOUT"
      : error.code === "LOCAL_CLI_CANCELLED"
        ? "EXECUTION_FAILED"
        : error.code === "LOCAL_CLI_NOT_AVAILABLE"
          ? "UNAVAILABLE"
          : "EXECUTION_FAILED";
  return {
    code: error.code,
    category,
    message: error.message,
    retryable: error.retryable,
  };
}

function boundedSummary(input: string): string {
  if (input.length <= MAX_SUMMARY_CHARS) {
    return input;
  }
  return `${input.slice(0, MAX_SUMMARY_CHARS - 1)}…`;
}

export function classifyLocalResult(
  result: LocalResult,
): LocalResultDisposition {
  switch (result.status) {
    case "ACCEPTED":
      return {
        terminal: false,
        continue_polling: true,
        retryable: false,
      };
    case "PARTIAL":
      return {
        terminal: true,
        continue_polling: false,
        retryable: false,
      };
    case "SUCCEEDED":
      return {
        terminal: true,
        continue_polling: false,
        retryable: false,
      };
    case "FAILED":
      return {
        terminal: true,
        continue_polling: false,
        retryable: result.error?.retryable ?? false,
      };
  }
}

export function summarizeLocalResult(result: LocalResult): string {
  if (result.error !== null) {
    return boundedSummary(`${result.capability} failed: ${result.error.message}`);
  }
  if (result.status === "ACCEPTED") {
    return boundedSummary(
      `${result.capability} accepted; continue by polling the referenced result.`,
    );
  }
  if (result.status === "PARTIAL") {
    return boundedSummary(
      `${result.capability} completed with a bounded partial result; use the referenced result for cursor or continuation details.`,
    );
  }
  return boundedSummary(`${result.capability} succeeded.`);
}

function reportFromStored(
  input: LocalWorkClaimInput,
  stored: StoredLocalWorkResult,
  evidenceRefs: readonly string[],
): LocalWorkConsumerReport {
  return {
    status: stored.local_result?.status ?? "FAILED",
    summary: stored.summary,
    result_ref: stored.result_ref,
    evidence_refs: evidenceRefs,
    error:
      stored.error ??
      (stored.local_result?.error === null || stored.local_result === null
        ? null
        : {
            code: stored.local_result.error.code,
            category: stored.local_result.error.category,
            message: stored.local_result.error.message,
            retryable: stored.local_result.error.retryable,
          }),
    correlation_id: input.correlation_id,
    idempotency_key: input.idempotency_key,
  };
}

function assertStoredResult(
  stored: StoredLocalWorkResult,
  input: LocalWorkClaimInput,
  request: LocalRequest,
  fingerprint: string,
): void {
  if (
    stored.idempotency_key !== input.idempotency_key ||
    stored.request_fingerprint !== fingerprint
  ) {
    throw new LocalWorkConsumerError(
      "LOCAL_WORK_IDEMPOTENCY_CONFLICT",
      "Local Work idempotency key was reused with a different request fingerprint.",
      false,
    );
  }
  if (
    typeof stored.result_ref !== "string" ||
    stored.result_ref.trim().length === 0 ||
    stored.result_ref.length > 512
  ) {
    throw new TypeError("Result Sink returned an invalid result_ref.");
  }
  if (
    typeof stored.summary !== "string" ||
    stored.summary.length === 0 ||
    stored.summary.length > MAX_SUMMARY_CHARS
  ) {
    throw new TypeError("Result Sink returned an invalid summary.");
  }
  if (stored.local_result === null && stored.error === null) {
    throw new TypeError(
      "Result Sink record must contain a Local Result or Transport Error.",
    );
  }
  if (stored.local_result !== null && stored.error !== null) {
    throw new TypeError(
      "Result Sink record cannot contain both a Local Result and Transport Error.",
    );
  }
  if (stored.local_result !== null) {
    // request_id is a transport-attempt ID. A recovered result may carry the
    // original attempt ID while the retry uses a new request_id.
    validateLocalResult(stored.local_result, {
      capability: request.capability,
    });
  }
}

function assertEvidenceRefs(references: readonly string[]): void {
  if (
    !Array.isArray(references) ||
    !references.every(
      (reference) =>
        typeof reference === "string" &&
        reference.length > 0 &&
        reference.length <= 512,
    )
  ) {
    throw new TypeError("Evidence Sink returned invalid evidence_refs.");
  }
}

function assertStoredEvidence(
  stored: StoredLocalEvidenceReferences,
  input: LocalWorkClaimInput,
  fingerprint: string,
  resultRef: string,
): void {
  if (
    stored.idempotency_key !== input.idempotency_key ||
    stored.request_fingerprint !== fingerprint ||
    stored.result_ref !== resultRef
  ) {
    throw new LocalWorkConsumerError(
      "LOCAL_WORK_IDEMPOTENCY_CONFLICT",
      "Local Evidence reference was reused with a different request fingerprint or result reference.",
      false,
    );
  }
  assertEvidenceRefs(stored.evidence_refs);
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return normalized;
}

export function createLocalWorkConsumer(
  options: LocalWorkConsumerOptions,
): {
  run(
    input: LocalWorkClaimInput,
    runOptions?: LocalWorkRunOptions,
  ): Promise<LocalWorkConsumerReport>;
} {
  const maxEntries = positiveInteger(
    options.inFlight?.maxEntries,
    DEFAULT_IN_FLIGHT_MAX_ENTRIES,
    "inFlight.maxEntries",
  );
  const ttlMs = positiveInteger(
    options.inFlight?.ttlMs,
    DEFAULT_IN_FLIGHT_TTL_MS,
    "inFlight.ttlMs",
  );
  const now = options.inFlight?.now ?? Date.now;
  const inFlight = new Map<
    string,
    {
      readonly fingerprint: string;
      readonly expiresAt: number;
      readonly prepared: Promise<LocalWorkConsumerReport>;
    }
  >();

  const prepare = async (
    input: LocalWorkClaimInput,
    request: LocalRequest,
    fingerprint: string,
    runOptions: LocalWorkRunOptions,
  ): Promise<LocalWorkConsumerReport> => {
    let stored = await options.resultSink.load({
      idempotency_key: input.idempotency_key,
    });
    if (stored !== null) {
      assertStoredResult(stored, input, request, fingerprint);
    } else {
      let localResult: LocalResult | null = null;
      let boundaryError: LocalWorkBoundaryError | null = null;
      let summary: string;
      try {
        localResult = await options.client.execute(request, runOptions);
        summary = summarizeLocalResult(localResult);
      } catch (error) {
        if (!(error instanceof LocalControlTransportError)) {
          throw error;
        }
        boundaryError = transportError(error);
        summary = boundedSummary(
          `${request.capability} transport failed: ${error.message}`,
        );
      }
      stored = await options.resultSink.persist({
        idempotency_key: input.idempotency_key,
        request_fingerprint: fingerprint,
        summary,
        local_result: localResult,
        error: boundaryError,
      });
      assertStoredResult(stored, input, request, fingerprint);
    }

    let evidenceRefs: readonly string[] | undefined;
    if (options.evidenceSink.load !== undefined) {
      const savedEvidence = await options.evidenceSink.load({
        idempotency_key: input.idempotency_key,
        request_fingerprint: fingerprint,
        result_ref: stored.result_ref,
      });
      if (savedEvidence !== null) {
        assertStoredEvidence(
          savedEvidence,
          input,
          fingerprint,
          stored.result_ref,
        );
        evidenceRefs = savedEvidence.evidence_refs;
      }
    }
    if (evidenceRefs === undefined) {
      const savedEvidence = await options.evidenceSink.persist({
        idempotency_key: input.idempotency_key,
        request_fingerprint: fingerprint,
        result_ref: stored.result_ref,
        local_result: stored.local_result,
      });
      assertEvidenceRefs(savedEvidence.evidence_refs);
      if (
        "idempotency_key" in savedEvidence &&
        "request_fingerprint" in savedEvidence &&
        "result_ref" in savedEvidence
      ) {
        assertStoredEvidence(
          savedEvidence as StoredLocalEvidenceReferences,
          input,
          fingerprint,
          stored.result_ref,
        );
      }
      evidenceRefs = savedEvidence.evidence_refs;
    }
    return reportFromStored(input, stored, evidenceRefs);
  };

  return Object.freeze({
    async run(
      input: LocalWorkClaimInput,
      runOptions: LocalWorkRunOptions = {},
    ): Promise<LocalWorkConsumerReport> {
      const request = mapWorkClaimToLocalRequest(input);
      const fingerprint = fingerprintLocalRequest(request);
      const existing = inFlight.get(input.idempotency_key);
      if (existing !== undefined) {
        if (existing.fingerprint !== fingerprint) {
          throw new LocalWorkConsumerError(
            "LOCAL_WORK_IDEMPOTENCY_CONFLICT",
            "Local Work idempotency key was reused with a different request fingerprint.",
            false,
          );
        }
        if (now() >= existing.expiresAt) {
          throw new LocalWorkConsumerError(
            "LOCAL_WORK_INFLIGHT_EXPIRED",
            "Local Work in-flight merge entry exceeded its TTL; retry after the original attempt settles or is recovered from the Result Sink.",
            true,
          );
        }
        const report = await existing.prepared;
        await options.reportPort?.report(report);
        return report;
      }
      if (inFlight.size >= maxEntries) {
        throw new LocalWorkConsumerError(
          "LOCAL_WORK_INFLIGHT_CAPACITY",
          "Local Work in-flight merge cache is at capacity.",
          true,
        );
      }

      const prepared = prepare(input, request, fingerprint, runOptions);
      const entry = {
        fingerprint,
        expiresAt: now() + ttlMs,
        prepared,
      };
      inFlight.set(input.idempotency_key, entry);

      let report: LocalWorkConsumerReport;
      try {
        report = await prepared;
      } finally {
        if (inFlight.get(input.idempotency_key) === entry) {
          inFlight.delete(input.idempotency_key);
        }
      }
      await options.reportPort?.report(report);
      return report;
    },
  });
}

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

export type LocalWorkBoundaryErrorCode =
  | LocalErrorCode
  | LocalControlTransportErrorCode
  | "LOCAL_WORK_IDEMPOTENCY_CONFLICT";

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

export interface LocalEvidenceSinkPort {
  persist(input: {
    readonly idempotency_key: string;
    readonly request_fingerprint: string;
    readonly result_ref: string;
    readonly local_result: LocalResult | null;
  }): Promise<{ readonly evidence_refs: readonly string[] }>;
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

export interface LocalWorkConsumerOptions {
  readonly client: LocalControlClient;
  readonly resultSink: LocalResultSinkPort;
  readonly evidenceSink: LocalEvidenceSinkPort;
  readonly reportPort?: LocalWorkReportPort;
}

export interface LocalWorkRunOptions extends LocalControlExecutionOptions {}

export class LocalWorkConsumerError extends Error {
  readonly code: "LOCAL_WORK_IDEMPOTENCY_CONFLICT";
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "LocalWorkConsumerError";
    this.code = "LOCAL_WORK_IDEMPOTENCY_CONFLICT";
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

export function summarizeLocalResult(result: LocalResult): string {
  if (result.error !== null) {
    return `${result.capability} failed: ${result.error.message}`;
  }
  if (result.status === "ACCEPTED") {
    return `${result.capability} accepted; follow the returned polling hint.`;
  }
  if (result.status === "PARTIAL") {
    return `${result.capability} completed with a partial result.`;
  }
  return `${result.capability} succeeded.`;
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
      "Local Work idempotency key was reused with a different request fingerprint.",
    );
  }
  if (
    typeof stored.result_ref !== "string" ||
    stored.result_ref.trim().length === 0 ||
    stored.result_ref.length > 512
  ) {
    throw new TypeError("Result Sink returned an empty result_ref.");
  }
  if (
    typeof stored.summary !== "string" ||
    stored.summary.length === 0 ||
    stored.summary.length > 512
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
    validateLocalResult(stored.local_result, {
      requestId: request.request_id,
      capability: request.capability,
    });
  }
}

export function createLocalWorkConsumer(
  options: LocalWorkConsumerOptions,
): {
  run(
    input: LocalWorkClaimInput,
    runOptions?: LocalWorkRunOptions,
  ): Promise<LocalWorkConsumerReport>;
} {
  const inFlight = new Map<
    string,
    {
      readonly fingerprint: string;
      readonly prepared: Promise<LocalWorkConsumerReport>;
    }
  >();

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
            "Local Work idempotency key was reused with a different request fingerprint.",
          );
        }
        const report = await existing.prepared;
        await options.reportPort?.report(report);
        return report;
      }

      const prepared = (async (): Promise<LocalWorkConsumerReport> => {
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
            summary = `${request.capability} transport failed: ${error.message}`;
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

        const evidence = await options.evidenceSink.persist({
          idempotency_key: input.idempotency_key,
          request_fingerprint: fingerprint,
          result_ref: stored.result_ref,
          local_result: stored.local_result,
        });
        if (
          !Array.isArray(evidence.evidence_refs) ||
          !evidence.evidence_refs.every(
            (reference) =>
              typeof reference === "string" &&
              reference.length > 0 &&
              reference.length <= 512,
          )
        ) {
          throw new TypeError("Evidence Sink returned invalid evidence_refs.");
        }
        return reportFromStored(input, stored, evidence.evidence_refs);
      })();

      inFlight.set(input.idempotency_key, { fingerprint, prepared });
      let report: LocalWorkConsumerReport;
      try {
        report = await prepared;
      } catch (error) {
        inFlight.delete(input.idempotency_key);
        throw error;
      }
      await options.reportPort?.report(report);
      return report;
    },
  });
}

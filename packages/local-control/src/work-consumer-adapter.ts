import type {
  LocalCapability,
  LocalErrorCode,
  LocalRequest,
  LocalResult,
  LocalResultStatus,
} from "./contracts.js";
import type { LocalControlClient } from "./gateway-process-adapter.js";

export interface PersistedLocalResultReferences {
  readonly result_ref: string;
  readonly evidence_refs?: readonly string[];
}

export interface LocalResultPersistencePort {
  persist(input: {
    readonly request: LocalRequest;
    readonly result: LocalResult;
    readonly summary: string;
  }): Promise<PersistedLocalResultReferences>;
}

export interface LocalWorkConsumerReport {
  readonly capability_ref: LocalCapability;
  readonly request_id: string;
  readonly correlation_id?: string;
  readonly idempotency_key?: string;
  readonly result_ref: string;
  readonly evidence_refs: readonly string[];
  readonly status: LocalResultStatus;
  readonly error_code?: LocalErrorCode;
  readonly retryable: boolean;
  readonly summary: string;
  readonly local_result: LocalResult;
}

export interface LocalWorkConsumerOptions {
  readonly client: LocalControlClient;
  readonly resultPersistence: LocalResultPersistencePort;
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

export function createLocalWorkConsumer(
  options: LocalWorkConsumerOptions,
): {
  run(request: LocalRequest): Promise<LocalWorkConsumerReport>;
} {
  return Object.freeze({
    async run(request: LocalRequest): Promise<LocalWorkConsumerReport> {
      const result = await options.client.execute(request);
      const summary = summarizeLocalResult(result);
      const references = await options.resultPersistence.persist({
        request,
        result,
        summary,
      });
      return {
        capability_ref: request.capability,
        request_id: request.request_id,
        ...(request.correlation?.correlation_id === undefined
          ? {}
          : { correlation_id: request.correlation.correlation_id }),
        ...(request.idempotency_key === undefined
          ? {}
          : { idempotency_key: request.idempotency_key }),
        result_ref: references.result_ref,
        evidence_refs: references.evidence_refs ?? [],
        status: result.status,
        ...(result.error === null ? {} : { error_code: result.error.code }),
        retryable: result.error?.retryable ?? false,
        summary,
        local_result: result,
      };
    },
  });
}

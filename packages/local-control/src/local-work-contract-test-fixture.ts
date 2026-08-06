import type { LocalResult } from "./contracts.js";
import type {
  LocalEvidenceSinkPort,
  LocalResultSinkPort,
  LocalWorkBoundaryError,
  LocalWorkConsumerReport,
  LocalWorkReportPort,
  StoredLocalEvidenceReferences,
  StoredLocalWorkResult,
} from "./work-consumer-adapter.js";

export interface LocalWorkContractTestFixtureState {
  readonly results: Map<string, StoredLocalWorkResult>;
  readonly evidence: Map<string, StoredLocalEvidenceReferences>;
}

export interface LocalWorkContractTestFixtureOptions {
  readonly state?: LocalWorkContractTestFixtureState;
}

export interface LocalWorkContractTestFixture {
  readonly state: LocalWorkContractTestFixtureState;
  readonly resultSink: LocalResultSinkPort;
  readonly evidenceSink: LocalEvidenceSinkPort;
  readonly reportPort: LocalWorkReportPort;
  readonly reports: readonly LocalWorkConsumerReport[];
  readonly resultPersistCount: number;
  readonly evidencePersistCount: number;
  failNextReport(message?: string): void;
}

function stableResultRef(fingerprint: string): string {
  return `result://local-control/${fingerprint.replace("sha256:", "")}`;
}

function stableEvidenceRefs(result: LocalResult | null): readonly string[] {
  if (result === null) {
    return [];
  }
  return [`evidence://local-control/${result.evidence.content_hash.replace("sha256:", "")}`];
}

export function createLocalWorkContractTestFixture(
  options: LocalWorkContractTestFixtureOptions = {},
): LocalWorkContractTestFixture {
  const state: LocalWorkContractTestFixtureState = options.state ?? {
    results: new Map<string, StoredLocalWorkResult>(),
    evidence: new Map<string, StoredLocalEvidenceReferences>(),
  };
  const reports: LocalWorkConsumerReport[] = [];
  let resultPersistCount = 0;
  let evidencePersistCount = 0;
  let nextReportFailure: Error | null = null;

  const resultSink: LocalResultSinkPort = Object.freeze({
    async load(input: {
      readonly idempotency_key: string;
    }): Promise<StoredLocalWorkResult | null> {
      return state.results.get(input.idempotency_key) ?? null;
    },
    async persist(input: {
      readonly idempotency_key: string;
      readonly request_fingerprint: string;
      readonly summary: string;
      readonly local_result: LocalResult | null;
      readonly error: LocalWorkBoundaryError | null;
    }): Promise<StoredLocalWorkResult> {
      const existing = state.results.get(input.idempotency_key);
      if (existing !== undefined) {
        if (existing.request_fingerprint !== input.request_fingerprint) {
          throw new Error(
            "Fixture Result Sink rejected an idempotency key bound to another request fingerprint.",
          );
        }
        return existing;
      }
      resultPersistCount += 1;
      const stored: StoredLocalWorkResult = Object.freeze({
        ...input,
        result_ref: stableResultRef(input.request_fingerprint),
      });
      state.results.set(input.idempotency_key, stored);
      return stored;
    },
  });

  const evidenceSink: LocalEvidenceSinkPort = Object.freeze({
    async load(input: {
      readonly idempotency_key: string;
      readonly request_fingerprint: string;
      readonly result_ref: string;
    }): Promise<StoredLocalEvidenceReferences | null> {
      const existing = state.evidence.get(input.idempotency_key);
      if (
        existing === undefined ||
        existing.request_fingerprint !== input.request_fingerprint ||
        existing.result_ref !== input.result_ref
      ) {
        return null;
      }
      return existing;
    },
    async persist(input: {
      readonly idempotency_key: string;
      readonly request_fingerprint: string;
      readonly result_ref: string;
      readonly local_result: LocalResult | null;
    }): Promise<StoredLocalEvidenceReferences> {
      const existing = state.evidence.get(input.idempotency_key);
      if (existing !== undefined) {
        if (
          existing.request_fingerprint !== input.request_fingerprint ||
          existing.result_ref !== input.result_ref
        ) {
          throw new Error(
            "Fixture Evidence Sink rejected an idempotency key bound to another result.",
          );
        }
        return existing;
      }
      evidencePersistCount += 1;
      const stored: StoredLocalEvidenceReferences = Object.freeze({
        idempotency_key: input.idempotency_key,
        request_fingerprint: input.request_fingerprint,
        result_ref: input.result_ref,
        evidence_refs: stableEvidenceRefs(input.local_result),
      });
      state.evidence.set(input.idempotency_key, stored);
      return stored;
    },
  });

  const reportPort: LocalWorkReportPort = Object.freeze({
    async report(report: LocalWorkConsumerReport): Promise<void> {
      if (nextReportFailure !== null) {
        const failure = nextReportFailure;
        nextReportFailure = null;
        throw failure;
      }
      reports.push(report);
    },
  });

  return {
    state,
    resultSink,
    evidenceSink,
    reportPort,
    reports,
    get resultPersistCount() {
      return resultPersistCount;
    },
    get evidencePersistCount() {
      return evidencePersistCount;
    },
    failNextReport(message = "Fixture report failure."): void {
      nextReportFailure = new Error(message);
    },
  };
}

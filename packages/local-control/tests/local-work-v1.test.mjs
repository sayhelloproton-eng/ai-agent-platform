import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LocalControlTransportError,
  LocalWorkConsumerError,
  createLocalWorkConsumer,
  mapWorkClaimToLocalRequest,
} from "../dist/index.js";

function claim(parameters = {}, overrides = {}) {
  return {
    local_work_version: "0.1.0-candidate",
    request_id: "local-work-request-001",
    capability_ref: "local.project.describe",
    actor: { actor_type: "worker", actor_id: "unified-worker" },
    correlation_id: "correlation-001",
    scope: { project_id: "ai-agent-platform" },
    parameters,
    budget: {
      timeout_ms: 5_000,
      max_stdout_bytes: 65_536,
      max_result_chars: 50_000,
    },
    idempotency_key: "local-work-idempotency-001",
    ...overrides,
  };
}

function localResult(overrides = {}) {
  return {
    local_result_version: "0.1.0",
    request_id: "local-work-request-001",
    capability: "local.project.describe",
    status: "SUCCEEDED",
    data: { payload: "complete local result remains private" },
    error: null,
    warnings: [],
    evidence: {
      source_type: "local_observation",
      content_hash: "sha256:test",
      observed_at: "2026-08-06T00:00:00.000Z",
    },
    meta: {
      cli_package: "@ai-agent-platform/local-control",
      cli_version: "0.1.0",
      duration_ms: 1,
      truncated: false,
    },
    ...overrides,
  };
}

function memoryPorts() {
  const records = new Map();
  const evidence = new Map();
  let resultWrites = 0;
  let evidenceWrites = 0;
  return {
    records,
    get resultWrites() { return resultWrites; },
    get evidenceWrites() { return evidenceWrites; },
    resultSink: {
      async load({ idempotency_key }) {
        return records.get(idempotency_key) ?? null;
      },
      async persist(input) {
        resultWrites += 1;
        const existing = records.get(input.idempotency_key);
        if (existing !== undefined) return existing;
        const stored = {
          ...input,
          result_ref: `result://immutable/${input.idempotency_key}`,
        };
        records.set(input.idempotency_key, stored);
        return stored;
      },
    },
    evidenceSink: {
      async persist(input) {
        evidenceWrites += 1;
        const existing = evidence.get(input.idempotency_key);
        if (existing !== undefined) return { evidence_refs: existing };
        const refs = input.local_result === null
          ? []
          : [`evidence://immutable/${input.idempotency_key}`];
        evidence.set(input.idempotency_key, refs);
        return { evidence_refs: refs };
      },
    },
  };
}

test("WorkClaimInput maps purely to an authorized LocalRequest", () => {
  const input = claim({ path: "README.md" });
  const first = mapWorkClaimToLocalRequest(input);
  const second = mapWorkClaimToLocalRequest(input);
  assert.deepEqual(first, second);
  assert.equal(first.capability, input.capability_ref);
  assert.equal(first.correlation.correlation_id, input.correlation_id);
  assert.equal(first.idempotency_key, input.idempotency_key);
  assert.equal(Object.hasOwn(first.correlation, "task_id"), false);
  assert.throws(
    () => mapWorkClaimToLocalRequest({ ...input, task: { status: "READY" } }),
    /unsupported fields/u,
  );
});

test("duplicate Local Work returns one stable result reference", async () => {
  const ports = memoryPorts();
  let executions = 0;
  const consumer = createLocalWorkConsumer({
    client: { async execute() { executions += 1; return localResult(); } },
    resultSink: ports.resultSink,
    evidenceSink: ports.evidenceSink,
  });
  const first = await consumer.run(claim());
  const second = await consumer.run(claim());
  assert.deepEqual(second, first);
  assert.equal(executions, 1);
  assert.equal(ports.resultWrites, 1);
  assert.equal(ports.evidenceWrites, 1);
});

test("different payload cannot reuse a Local Work idempotency key", async () => {
  const ports = memoryPorts();
  let executions = 0;
  const consumer = createLocalWorkConsumer({
    client: { async execute() { executions += 1; return localResult(); } },
    resultSink: ports.resultSink,
    evidenceSink: ports.evidenceSink,
  });
  await consumer.run(claim({ path: "README.md" }));
  await assert.rejects(
    consumer.run(claim({ path: "package.json" })),
    (error) =>
      error instanceof LocalWorkConsumerError &&
      error.code === "LOCAL_WORK_IDEMPOTENCY_CONFLICT" &&
      !error.retryable,
  );
  assert.equal(executions, 1);
});

test("report retry reuses the persisted result and evidence references", async () => {
  const ports = memoryPorts();
  let executions = 0;
  let reports = 0;
  const consumer = createLocalWorkConsumer({
    client: { async execute() { executions += 1; return localResult(); } },
    resultSink: ports.resultSink,
    evidenceSink: ports.evidenceSink,
    reportPort: {
      async report() {
        reports += 1;
        if (reports === 1) throw new Error("report transport unavailable");
      },
    },
  });
  await assert.rejects(consumer.run(claim()), /report transport unavailable/u);
  const retried = await consumer.run(claim());
  assert.equal(retried.result_ref, "result://immutable/local-work-idempotency-001");
  assert.deepEqual(retried.evidence_refs, [
    "evidence://immutable/local-work-idempotency-001",
  ]);
  assert.equal(executions, 1);
  assert.equal(ports.resultWrites, 1);
  assert.equal(ports.evidenceWrites, 1);
  assert.equal(reports, 2);
});

test("a new consumer resumes from Result Sink without re-execution", async () => {
  const ports = memoryPorts();
  let executions = 0;
  const options = {
    client: { async execute() { executions += 1; return localResult(); } },
    resultSink: ports.resultSink,
    evidenceSink: ports.evidenceSink,
  };
  const first = await createLocalWorkConsumer(options).run(claim());
  const second = await createLocalWorkConsumer(options).run(claim());
  assert.equal(second.result_ref, first.result_ref);
  assert.equal(executions, 1);
  assert.equal(ports.resultWrites, 1);
});

test("large Local Result remains behind references and a bounded summary", async () => {
  const ports = memoryPorts();
  const consumer = createLocalWorkConsumer({
    client: {
      async execute() {
        return localResult({ data: { body: "x".repeat(40_000) } });
      },
    },
    resultSink: ports.resultSink,
    evidenceSink: ports.evidenceSink,
  });
  const report = await consumer.run(claim());
  assert.deepEqual(Object.keys(report).sort(), [
    "correlation_id",
    "error",
    "evidence_refs",
    "idempotency_key",
    "result_ref",
    "status",
    "summary",
  ]);
  assert.ok(report.summary.length < 256);
  assert.equal(JSON.stringify(report).includes("x".repeat(100)), false);
  assert.equal(Object.hasOwn(report, "local_result"), false);
});

test("Work Consumer canonicalizes timeout, cancellation, output and process failures", async (t) => {
  const cases = [
    ["LOCAL_CLI_TIMEOUT", true],
    ["LOCAL_CLI_CANCELLED", false],
    ["LOCAL_CLI_OUTPUT_TOO_LARGE", false],
    ["LOCAL_CLI_PROCESS_FAILED", true],
  ];
  for (const [code, retryable] of cases) {
    await t.test(code, async () => {
      const ports = memoryPorts();
      const consumer = createLocalWorkConsumer({
        client: {
          async execute() {
            throw new LocalControlTransportError(
              code,
              `${code} safe message`,
              retryable,
            );
          },
        },
        resultSink: ports.resultSink,
        evidenceSink: ports.evidenceSink,
      });
      const report = await consumer.run(claim({}, {
        idempotency_key: `idempotency-${code}`,
      }));
      assert.equal(report.status, "FAILED");
      assert.equal(report.error.code, code);
      assert.equal(report.error.retryable, retryable);
      assert.equal(report.evidence_refs.length, 0);
      assert.equal(Object.hasOwn(report, "local_result"), false);
    });
  }
});

test("business failure persists the canonical Local Result but reports only safe fields", async () => {
  const ports = memoryPorts();
  const consumer = createLocalWorkConsumer({
    client: {
      async execute() {
        return localResult({
          status: "FAILED",
          data: null,
          error: {
            code: "RESOURCE_NOT_REGISTERED",
            category: "NOT_FOUND",
            message: "Registered resource was not found.",
            retryable: false,
          },
        });
      },
    },
    resultSink: ports.resultSink,
    evidenceSink: ports.evidenceSink,
  });
  const report = await consumer.run(claim());
  assert.equal(report.status, "FAILED");
  assert.equal(report.error.code, "RESOURCE_NOT_REGISTERED");
  assert.equal(report.error.retryable, false);
  assert.equal(Object.hasOwn(report, "local_result"), false);
  assert.equal(ports.records.get(claim().idempotency_key).local_result.error.code,
    "RESOURCE_NOT_REGISTERED");
});

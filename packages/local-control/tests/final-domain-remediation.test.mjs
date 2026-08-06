import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LOCAL_REQUEST_ID_SEMANTICS,
  LocalControlTransportError,
  LocalWorkConsumerError,
  classifyLocalResult,
  createLocalWorkConsumer,
  createLocalWorkContractTestFixture,
  fingerprintLocalRequest,
  mapWorkClaimToLocalRequest,
} from "../dist/index.js";

function claim(overrides = {}) {
  return {
    local_work_version: "0.1.0-candidate",
    request_id: "transport-request-001",
    capability_ref: "local.project.describe",
    actor: {
      actor_type: "task-worker",
      actor_id: "worker-primary",
    },
    correlation_id: "correlation-001",
    scope: { project_id: "ai-agent-platform" },
    parameters: {},
    budget: {
      timeout_ms: 5_000,
      max_stdout_bytes: 65_536,
      max_result_chars: 50_000,
    },
    idempotency_key: "local-work-idem-001",
    ...overrides,
  };
}

function localResult(request, status = "SUCCEEDED", overrides = {}) {
  const failed = status === "FAILED";
  return {
    local_result_version: "0.1.0",
    request_id: request.request_id,
    capability: request.capability,
    status,
    data: failed ? null : { ok: true },
    error: failed
      ? {
          code: "RUNTIME_UNAVAILABLE",
          category: "UNAVAILABLE",
          message: "Runtime unavailable.",
          retryable: true,
        }
      : null,
    warnings: [],
    evidence: {
      source_type: "local_observation",
      content_hash: "sha256:evidence-001",
      observed_at: "2026-08-06T12:00:00.000Z",
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

function immediateClient(status = "SUCCEEDED", overrides = {}) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async execute(request) {
      calls += 1;
      return localResult(request, status, overrides);
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function consumer(client, fixture, options = {}) {
  return createLocalWorkConsumer({
    client,
    resultSink: fixture.resultSink,
    evidenceSink: fixture.evidenceSink,
    reportPort: fixture.reportPort,
    ...options,
  });
}

test("request_id is a transport-attempt ID and is excluded from the business fingerprint", () => {
  assert.equal(LOCAL_REQUEST_ID_SEMANTICS, "transport-attempt-id");
  const first = mapWorkClaimToLocalRequest(claim());
  const retry = mapWorkClaimToLocalRequest(
    claim({ request_id: "transport-request-002" }),
  );
  assert.notEqual(first.request_id, retry.request_id);
  assert.equal(fingerprintLocalRequest(first), fingerprintLocalRequest(retry));
});

test("same idempotency key and business request reuse one result ref across process restart and new request_id", async () => {
  const fixture = createLocalWorkContractTestFixture();
  const firstClient = immediateClient();
  const firstConsumer = consumer(firstClient, fixture);
  const first = await firstConsumer.run(claim());

  const restartedFixture = createLocalWorkContractTestFixture({
    state: fixture.state,
  });
  const restartedClient = immediateClient();
  const restartedConsumer = consumer(restartedClient, restartedFixture);
  const replay = await restartedConsumer.run(
    claim({ request_id: "transport-request-after-restart" }),
  );

  assert.equal(first.result_ref, replay.result_ref);
  assert.deepEqual(first.evidence_refs, replay.evidence_refs);
  assert.equal(firstClient.calls, 1);
  assert.equal(restartedClient.calls, 0);
  assert.equal(fixture.resultPersistCount, 1);
  assert.equal(fixture.evidencePersistCount, 1);
  assert.equal(restartedFixture.resultPersistCount, 0);
  assert.equal(restartedFixture.evidencePersistCount, 0);
});

test("same idempotency key with a different business payload is rejected", async () => {
  const fixture = createLocalWorkContractTestFixture();
  const client = immediateClient();
  const workConsumer = consumer(client, fixture);
  await workConsumer.run(claim());

  await assert.rejects(
    workConsumer.run(
      claim({
        request_id: "transport-request-002",
        parameters: { path: "another" },
      }),
    ),
    (error) =>
      error instanceof LocalWorkConsumerError &&
      error.code === "LOCAL_WORK_IDEMPOTENCY_CONFLICT" &&
      error.retryable === false,
  );
});

test("inFlight merges concurrent duplicates and is cleaned after completion", async () => {
  const fixture = createLocalWorkContractTestFixture();
  const gate = deferred();
  let calls = 0;
  const client = {
    async execute(request) {
      calls += 1;
      await gate.promise;
      return localResult(request);
    },
  };
  const workConsumer = consumer(client, fixture, {
    inFlight: { maxEntries: 1, ttlMs: 1_000 },
  });

  const first = workConsumer.run(claim());
  const duplicate = workConsumer.run(
    claim({ request_id: "transport-request-concurrent" }),
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  gate.resolve();
  const [firstReport, duplicateReport] = await Promise.all([first, duplicate]);
  assert.equal(firstReport.result_ref, duplicateReport.result_ref);
  assert.equal(calls, 1);

  const secondKey = await workConsumer.run(
    claim({
      request_id: "transport-request-new-key",
      idempotency_key: "local-work-idem-002",
    }),
  );
  assert.ok(secondKey.result_ref);
  assert.equal(calls, 2);
});

test("inFlight enforces capacity and stale-entry TTL without allowing duplicate execution", async () => {
  const fixture = createLocalWorkContractTestFixture();
  const gate = deferred();
  let now = 0;
  const client = {
    async execute(request) {
      await gate.promise;
      return localResult(request);
    },
  };
  const workConsumer = consumer(client, fixture, {
    inFlight: { maxEntries: 1, ttlMs: 100, now: () => now },
  });

  const running = workConsumer.run(claim());
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    workConsumer.run(
      claim({
        idempotency_key: "another-key",
        request_id: "another-request",
      }),
    ),
    (error) =>
      error instanceof LocalWorkConsumerError &&
      error.code === "LOCAL_WORK_INFLIGHT_CAPACITY" &&
      error.retryable === true,
  );

  now = 101;
  await assert.rejects(
    workConsumer.run(claim({ request_id: "expired-retry" })),
    (error) =>
      error instanceof LocalWorkConsumerError &&
      error.code === "LOCAL_WORK_INFLIGHT_EXPIRED" &&
      error.retryable === true,
  );

  gate.resolve();
  await running;
});


test("unexpected preparation failure clears inFlight and allows a later retry", async () => {
  const fixture = createLocalWorkContractTestFixture();
  let calls = 0;
  const client = {
    async execute(request) {
      calls += 1;
      if (calls === 1) {
        throw new Error("unexpected adapter failure");
      }
      return localResult(request);
    },
  };
  const workConsumer = consumer(client, fixture, {
    inFlight: { maxEntries: 1, ttlMs: 1_000 },
  });

  await assert.rejects(workConsumer.run(claim()), /unexpected adapter failure/u);
  const retry = await workConsumer.run(
    claim({ request_id: "transport-request-after-unexpected-failure" }),
  );
  assert.ok(retry.result_ref);
  assert.equal(calls, 2);
});

test("non-binary Local Result statuses have explicit terminal, polling and retry semantics", () => {
  const request = mapWorkClaimToLocalRequest(claim());
  assert.deepEqual(classifyLocalResult(localResult(request, "ACCEPTED")), {
    terminal: false,
    continue_polling: true,
    retryable: false,
  });
  assert.deepEqual(classifyLocalResult(localResult(request, "PARTIAL")), {
    terminal: true,
    continue_polling: false,
    retryable: false,
  });
  assert.deepEqual(classifyLocalResult(localResult(request, "SUCCEEDED")), {
    terminal: true,
    continue_polling: false,
    retryable: false,
  });
  assert.deepEqual(classifyLocalResult(localResult(request, "FAILED")), {
    terminal: true,
    continue_polling: false,
    retryable: true,
  });
});

test("Result Sink success followed by report failure reuses the same refs without re-execution", async () => {
  const fixture = createLocalWorkContractTestFixture();
  fixture.failNextReport("network report failed");
  const client = immediateClient();
  const workConsumer = consumer(client, fixture);

  await assert.rejects(workConsumer.run(claim()), /network report failed/u);
  assert.equal(client.calls, 1);
  assert.equal(fixture.resultPersistCount, 1);
  assert.equal(fixture.evidencePersistCount, 1);

  const retry = await workConsumer.run(
    claim({ request_id: "transport-report-retry" }),
  );
  assert.equal(client.calls, 1);
  assert.equal(fixture.resultPersistCount, 1);
  assert.equal(fixture.evidencePersistCount, 1);
  assert.equal(
    retry.result_ref,
    [...fixture.state.results.values()][0].result_ref,
  );
});

test("large and partial Local Results remain inside sinks; WorkReport contains references only", async () => {
  const fixture = createLocalWorkContractTestFixture();
  const huge = "x".repeat(20_000);
  const client = immediateClient("PARTIAL", {
    data: { content: huge, cursor: "cursor-next" },
    warnings: ["bounded result"],
    meta: {
      cli_package: "@ai-agent-platform/local-control",
      cli_version: "0.1.0",
      duration_ms: 1,
      truncated: true,
    },
  });
  const report = await consumer(client, fixture).run(claim());

  assert.deepEqual(Object.keys(report).sort(), [
    "correlation_id",
    "error",
    "evidence_refs",
    "idempotency_key",
    "result_ref",
    "status",
    "summary",
  ]);
  assert.equal(report.status, "PARTIAL");
  assert.equal(JSON.stringify(report).includes(huge), false);
  assert.equal("local_result" in report, false);
  assert.equal("data" in report, false);
  assert.equal(
    [...fixture.state.results.values()][0].local_result.data.content,
    huge,
  );
});

test("Work Consumer converts timeout, cancellation and abnormal process failures into bounded reports", async () => {
  const cases = [
    ["LOCAL_CLI_TIMEOUT", true],
    ["LOCAL_CLI_CANCELLED", false],
    ["LOCAL_CLI_PROCESS_FAILED", false],
    ["LOCAL_CLI_OUTPUT_TOO_LARGE", false],
  ];

  for (const [code, retryable] of cases) {
    const fixture = createLocalWorkContractTestFixture();
    const client = {
      async execute() {
        throw new LocalControlTransportError(code, `${code} fixture`, retryable);
      },
    };
    const report = await consumer(client, fixture).run(
      claim({ idempotency_key: `idem-${code}`, request_id: `req-${code}` }),
    );
    assert.equal(report.status, "FAILED");
    assert.equal(report.error.code, code);
    assert.equal(report.error.retryable, retryable);
    assert.equal("local_result" in report, false);
  }
});

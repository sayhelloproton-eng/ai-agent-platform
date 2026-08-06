import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

import {
  LocalControlTransportError,
  createLocalControlProcessClient,
  createLocalWorkConsumer,
  executeLocalRequest,
  validateLocalResult,
} from "../dist/index.js";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, "..");
const cliScript = path.join(packageRoot, "dist", "cli.js");

function request(capability, parameters = {}, overrides = {}) {
  return {
    local_request_version: "0.1.0",
    request_id: "request-integration-001",
    capability,
    execution_mode:
      capability === "local.service.ensure_running" ? "ASYNC" : "SYNC",
    actor: {
      actor_type: "gateway",
      actor_id: "action-gateway-primary",
    },
    correlation: {
      task_id: "task-001",
      plan_node_id: "node-001",
      correlation_id: "correlation-001",
    },
    scope: { project_id: "ai-agent-platform" },
    parameters,
    budget: {
      timeout_ms: 5_000,
      max_stdout_bytes: 65_536,
      max_result_chars: 50_000,
    },
    ...overrides,
  };
}

function workClaim(capability, parameters = {}, overrides = {}) {
  return {
    local_work_version: "0.1.0-candidate",
    request_id: "request-integration-001",
    capability_ref: capability,
    actor: {
      actor_type: "gateway",
      actor_id: "action-gateway-primary",
    },
    correlation_id: "correlation-001",
    scope: { project_id: "ai-agent-platform" },
    parameters,
    budget: {
      timeout_ms: 5_000,
      max_stdout_bytes: 65_536,
      max_result_chars: 50_000,
    },
    idempotency_key: "idempotency-001",
    ...overrides,
  };
}

function memorySinks() {
  const results = new Map();
  const evidence = new Map();
  let resultWrites = 0;
  let evidenceWrites = 0;
  return {
    results,
    get resultWrites() { return resultWrites; },
    get evidenceWrites() { return evidenceWrites; },
    resultSink: {
      async load({ idempotency_key }) {
        return results.get(idempotency_key) ?? null;
      },
      async persist(input) {
        resultWrites += 1;
        const stored = {
          ...input,
          result_ref: `result://local/${input.idempotency_key}`,
        };
        results.set(input.idempotency_key, stored);
        return stored;
      },
    },
    evidenceSink: {
      async persist(input) {
        evidenceWrites += 1;
        const refs = input.local_result === null
          ? []
          : [`evidence://local/${input.idempotency_key}`];
        evidence.set(input.idempotency_key, refs);
        return { evidence_refs: refs };
      },
    },
  };
}

async function git(cwd, ...args) {
  return execFileAsync("git", args, { cwd });
}

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-adapter-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "ai-agent-platform", version: "0.0.0" }),
  );
  await fs.writeFile(path.join(root, "README.md"), "# fixture\n");
  await git(root, "init", "-b", "main");
  await git(root, "config", "user.name", "Local Control Test");
  await git(root, "config", "user.email", "local-control@example.invalid");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "fixture baseline");
  return root;
}

function processClient(root, overrides = {}) {
  return createLocalControlProcessClient({
    executable: process.execPath,
    trustedPrefixArgs: [cliScript],
    cwd: root,
    environment: { LOCAL_PROJECT_ROOT: root },
    ...overrides,
  });
}

async function createScript(source) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-script-"));
  const script = path.join(directory, "fixture.mjs");
  await fs.writeFile(script, source);
  return { directory, script };
}

test("Gateway process adapter invokes the fixed CLI protocol and matches direct results", async () => {
  const root = await createFixture();
  try {
    const input = request("local.project.describe");
    const direct = await executeLocalRequest(input, {
      registry: {
        projects: new Map([
          [
            "ai-agent-platform",
            {
              projectId: "ai-agent-platform",
              displayName: "ai-agent-platform",
              root,
              accessMode: "READ_ONLY_WITH_CONTROLLED_SERVICE_START",
            },
          ],
        ]),
        runtimes: new Map(),
        executors: new Map(),
        services: new Map(),
      },
    });
    const throughProcess = await processClient(root).execute(input);
    assert.equal(throughProcess.status, "SUCCEEDED");
    const { observed_at: directObservedAt, ...directData } = direct.data;
    const { observed_at: processObservedAt, ...processData } = throughProcess.data;
    assert.equal(typeof directObservedAt, "string");
    assert.equal(typeof processObservedAt, "string");
    assert.deepEqual(processData, directData);
    assert.equal(throughProcess.request_id, input.request_id);
    assert.equal(throughProcess.capability, input.capability);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("duplicate read requests remain stateless and preserve request identity", async () => {
  const root = await createFixture();
  try {
    const input = request("local.repository.snapshot.read");
    const client = processClient(root);
    const first = await client.execute(input);
    const second = await client.execute(input);
    assert.equal(first.status, "SUCCEEDED");
    assert.equal(second.status, "SUCCEEDED");
    assert.equal(first.request_id, second.request_id);
    assert.equal(first.data.head_sha, second.data.head_sha);
    assert.equal(first.data.worktree_state, second.data.worktree_state);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Gateway process adapter returns canonical domain failures for invalid and sensitive paths", async () => {
  const root = await createFixture();
  try {
    await fs.writeFile(path.join(root, ".env"), "SECRET=value\n");
    const client = processClient(root);
    for (const target of ["../outside", ".env"]) {
      const result = await client.execute(
        request("local.repository.file.read", { path: target }, {
          request_id: `request-${target}`,
        }),
      );
      assert.equal(result.status, "FAILED");
      assert.ok([
        "PATH_TRAVERSAL_DENIED",
        "SENSITIVE_RESOURCE_DENIED",
      ].includes(result.error.code));
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Gateway process adapter enforces timeout and output budgets", async () => {
  const root = await createFixture();
  const hanging = await createScript("setTimeout(() => {}, 10_000);\n");
  const noisy = await createScript("process.stdout.write('x'.repeat(4096));\n");
  try {
    const timeoutClient = createLocalControlProcessClient({
      executable: process.execPath,
      trustedPrefixArgs: [hanging.script],
      cwd: root,
      timeoutMs: 30,
    });
    await assert.rejects(
      timeoutClient.execute(request("local.health.read")),
      (error) =>
        error instanceof LocalControlTransportError &&
        error.code === "LOCAL_CLI_TIMEOUT" &&
        error.retryable,
    );

    const outputClient = createLocalControlProcessClient({
      executable: process.execPath,
      trustedPrefixArgs: [noisy.script],
      cwd: root,
      maxStdoutBytes: 128,
    });
    await assert.rejects(
      outputClient.execute(request("local.health.read")),
      (error) =>
        error instanceof LocalControlTransportError &&
        error.code === "LOCAL_CLI_OUTPUT_TOO_LARGE",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(hanging.directory, { recursive: true, force: true });
    await fs.rm(noisy.directory, { recursive: true, force: true });
  }
});

test("Gateway process adapter cancels a real shell:false child process", async () => {
  const root = await createFixture();
  const hanging = await createScript("setTimeout(() => {}, 10_000);\n");
  try {
    const client = createLocalControlProcessClient({
      executable: process.execPath,
      trustedPrefixArgs: [hanging.script],
      cwd: root,
      timeoutMs: 5_000,
    });
    const controller = new AbortController();
    const pending = client.execute(request("local.health.read"), {
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(
      pending,
      (error) =>
        error instanceof LocalControlTransportError &&
        error.code === "LOCAL_CLI_CANCELLED" &&
        !error.retryable,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(hanging.directory, { recursive: true, force: true });
  }
});

test("Work Consumer converts a real non-zero child exit without leaking process output", async () => {
  const root = await createFixture();
  const failing = await createScript(
    "process.stderr.write('private diagnostic'); process.exit(7);\n",
  );
  try {
    const sinks = memorySinks();
    const consumer = createLocalWorkConsumer({
      client: createLocalControlProcessClient({
        executable: process.execPath,
        trustedPrefixArgs: [failing.script],
        cwd: root,
      }),
      resultSink: sinks.resultSink,
      evidenceSink: sinks.evidenceSink,
    });
    const report = await consumer.run(workClaim("local.health.read"));
    assert.equal(report.status, "FAILED");
    assert.equal(report.error.code, "LOCAL_CLI_PROCESS_FAILED");
    assert.equal(JSON.stringify(report).includes("private diagnostic"), false);
    assert.equal(Object.hasOwn(report, "local_result"), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(failing.directory, { recursive: true, force: true });
  }
});

test("Gateway process adapter rejects extra stdout and mismatched canonical results", async () => {
  const root = await createFixture();
  const extra = await createScript("console.log('{}'); console.log('{}');\n");
  try {
    const client = createLocalControlProcessClient({
      executable: process.execPath,
      trustedPrefixArgs: [extra.script],
      cwd: root,
    });
    await assert.rejects(
      client.execute(request("local.health.read")),
      (error) =>
        error instanceof LocalControlTransportError &&
        error.code === "LOCAL_CLI_INVALID_RESULT",
    );

    const valid = await executeLocalRequest(request("local.health.read"), {
      registry: {
        projects: new Map(),
        runtimes: new Map(),
        executors: new Map(),
        services: new Map(),
      },
    });
    assert.throws(() =>
      validateLocalResult(
        { ...valid, request_id: "different-request" },
        {
          requestId: "request-integration-001",
          capability: "local.health.read",
        },
      ),
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(extra.directory, { recursive: true, force: true });
  }
});

test("Gateway process adapter only accepts trusted absolute configuration", async () => {
  const root = await createFixture();
  try {
    assert.throws(() =>
      createLocalControlProcessClient({ executable: "node", cwd: root }),
    );
    assert.throws(() =>
      createLocalControlProcessClient({
        executable: process.execPath,
        cwd: root,
        environment: { SECRET_TOKEN: "forbidden" },
      }),
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Work Consumer adapter persists results through an injected Result Ref port", async () => {
  const root = await createFixture();
  try {
    const sinks = memorySinks();
    const consumer = createLocalWorkConsumer({
      client: processClient(root),
      resultSink: sinks.resultSink,
      evidenceSink: sinks.evidenceSink,
    });
    const input = workClaim("local.project.describe");
    const report = await consumer.run(input);
    assert.equal(report.correlation_id, "correlation-001");
    assert.equal(report.idempotency_key, "idempotency-001");
    assert.equal(report.result_ref, "result://local/idempotency-001");
    assert.deepEqual(report.evidence_refs, ["evidence://local/idempotency-001"]);
    assert.equal(report.status, "SUCCEEDED");
    assert.equal(report.error, null);
    assert.equal(sinks.resultWrites, 1);
    assert.equal(Object.hasOwn(report, "local_result"), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Work Consumer adapter reports canonical retryability without changing workflow state", async () => {
  const root = await createFixture();
  try {
    await fs.writeFile(path.join(root, ".env"), "SECRET=value\n");
    const sinks = memorySinks();
    const consumer = createLocalWorkConsumer({
      client: processClient(root),
      resultSink: sinks.resultSink,
      evidenceSink: sinks.evidenceSink,
    });
    const report = await consumer.run(
      workClaim("local.repository.file.read", { path: ".env" }),
    );
    assert.equal(report.status, "FAILED");
    assert.equal(report.error.code, "SENSITIVE_RESOURCE_DENIED");
    assert.equal(report.error.retryable, false);
    assert.match(report.summary, /failed/u);
    assert.equal(Object.hasOwn(report, "local_result"), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

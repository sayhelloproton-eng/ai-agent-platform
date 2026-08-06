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

async function expectTransportError(promise, code, retryable) {
  await assert.rejects(
    promise,
    (error) =>
      error instanceof LocalControlTransportError &&
      error.code === code &&
      error.retryable === retryable,
  );
}

test("Gateway process adapter invokes the fixed shell:false CLI protocol and matches direct results", async () => {
  const root = await createFixture();
  try {
    const input = request("local.project.describe");
    const registry = {
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
    };
    const direct = await executeLocalRequest(input, { registry });
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

test("Gateway process adapter returns canonical domain failures for invalid and sensitive paths", async () => {
  const root = await createFixture();
  try {
    await fs.writeFile(path.join(root, ".env"), "SECRET=value\n");
    const client = processClient(root);
    for (const target of ["../outside", ".env"]) {
      const result = await client.execute(
        request(
          "local.repository.file.read",
          { path: target },
          { request_id: `request-${target}` },
        ),
      );
      assert.equal(result.status, "FAILED");
      assert.ok(
        ["PATH_TRAVERSAL_DENIED", "SENSITIVE_RESOURCE_DENIED"].includes(
          result.error.code,
        ),
      );
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Gateway process adapter handles timeout, cancellation, abnormal exit and output limits", async () => {
  const root = await createFixture();
  const hanging = await createScript("setTimeout(() => {}, 10_000);\n");
  const abnormal = await createScript("process.exit(7);\n");
  const noisy = await createScript("process.stdout.write('x'.repeat(4096));\n");
  const noisyError = await createScript("process.stderr.write('x'.repeat(4096));\n");
  try {
    await expectTransportError(
      createLocalControlProcessClient({
        executable: process.execPath,
        trustedPrefixArgs: [hanging.script],
        cwd: root,
        timeoutMs: 30,
      }).execute(request("local.health.read")),
      "LOCAL_CLI_TIMEOUT",
      true,
    );

    const controller = new AbortController();
    const cancelled = createLocalControlProcessClient({
      executable: process.execPath,
      trustedPrefixArgs: [hanging.script],
      cwd: root,
    }).execute(request("local.health.read"), { signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    await expectTransportError(cancelled, "LOCAL_CLI_CANCELLED", false);

    await expectTransportError(
      createLocalControlProcessClient({
        executable: process.execPath,
        trustedPrefixArgs: [abnormal.script],
        cwd: root,
      }).execute(request("local.health.read")),
      "LOCAL_CLI_PROCESS_FAILED",
      false,
    );

    await expectTransportError(
      createLocalControlProcessClient({
        executable: process.execPath,
        trustedPrefixArgs: [noisy.script],
        cwd: root,
        maxStdoutBytes: 128,
      }).execute(request("local.health.read")),
      "LOCAL_CLI_OUTPUT_TOO_LARGE",
      false,
    );

    await expectTransportError(
      createLocalControlProcessClient({
        executable: process.execPath,
        trustedPrefixArgs: [noisyError.script],
        cwd: root,
        maxStderrBytes: 128,
      }).execute(request("local.health.read")),
      "LOCAL_CLI_OUTPUT_TOO_LARGE",
      false,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    for (const fixture of [hanging, abnormal, noisy, noisyError]) {
      await fs.rm(fixture.directory, { recursive: true, force: true });
    }
  }
});

test("Gateway process adapter rejects pre-start cancellation, extra stdout and mismatched results", async () => {
  const root = await createFixture();
  const extra = await createScript("console.log('{}'); console.log('{}');\n");
  try {
    const controller = new AbortController();
    controller.abort();
    await expectTransportError(
      processClient(root).execute(request("local.health.read"), {
        signal: controller.signal,
      }),
      "LOCAL_CLI_CANCELLED",
      false,
    );

    await expectTransportError(
      createLocalControlProcessClient({
        executable: process.execPath,
        trustedPrefixArgs: [extra.script],
        cwd: root,
      }).execute(request("local.health.read")),
      "LOCAL_CLI_INVALID_RESULT",
      false,
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
    assert.doesNotThrow(() =>
      validateLocalResult(
        { ...valid, request_id: "original-transport-request" },
        { capability: "local.health.read" },
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

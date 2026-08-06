import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

import {
  executeLocalRequest
} from "../dist/index.js";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dirname, "..");

function request(capability, parameters = {}, overrides = {}) {
  const mode = capability === "local.service.ensure_running" ? "ASYNC" : "SYNC";
  return {
    local_request_version: "0.1.0",
    request_id: `request-${Math.random().toString(16).slice(2)}`,
    capability,
    execution_mode: mode,
    actor: {
      actor_type: "test",
      actor_id: "local-control-tests",
    },
    scope: { project_id: "ai-agent-platform" },
    parameters,
    ...(mode === "ASYNC" ? { idempotency_key: "test-idempotency-key" } : {}),
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
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "ai-agent-platform", version: "0.0.0" }),
  );
  await fs.mkdir(path.join(root, "src"));
  await fs.writeFile(path.join(root, "README.md"), "# fixture\nline two\n");
  await fs.writeFile(path.join(root, "src", "index.js"), "export const value = 1;\n");
  await git(root, "init", "-b", "main");
  await git(root, "config", "user.name", "Local Control Test");
  await git(root, "config", "user.email", "local-control@example.invalid");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "fixture baseline");
  return root;
}

function registryFor(root, options = {}) {
  return {
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
    runtimes: new Map([
      [
        "gateway",
        {
          runtimeRef: "gateway",
          runtimeType: "node_service",
          projectId: "ai-agent-platform",
          healthUrl: options.healthUrl ?? "http://127.0.0.1:1/health",
        },
      ],
    ]),
    executors: new Map([
      [
        "node",
        {
          executorRef: "node",
          executorType: "cli",
          executable: process.execPath,
          versionArgs: ["--version"],
          supportedOperations: ["version"],
        },
      ],
      [
        "missing",
        {
          executorRef: "missing",
          executorType: "cli",
          executable: "definitely-not-a-real-executable-local-control",
          versionArgs: ["--version"],
          supportedOperations: ["version"],
        },
      ],
    ]),
    services: new Map([
      [
        "gateway",
        {
          serviceRef: "gateway",
          runtimeRef: "gateway",
          projectId: "ai-agent-platform",
          startTemplate: {
            executable: process.execPath,
            args: ["--version"],
            cwdProjectId: "ai-agent-platform",
          },
          startAllowed: options.startAllowed ?? false,
        },
      ],
    ]),
  };
}

async function withHealthServer(run) {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: { version: "test-gateway" } }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await run(`http://127.0.0.1:${address.port}/health`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("health, capabilities and project description expose no absolute path", async () => {
  const root = await createFixture();
  try {
    const registry = registryFor(root);
    const health = await executeLocalRequest(request("local.health.read"), { registry });
    assert.equal(health.status, "SUCCEEDED");
    assert.equal(health.data.project_count, 1);

    const capabilities = await executeLocalRequest(
      request("local.capabilities.read"),
      { registry },
    );
    assert.equal(capabilities.data.capabilities.length, 10);

    const project = await executeLocalRequest(
      request("local.project.describe"),
      { registry },
    );
    assert.equal(project.data.project_id, "ai-agent-platform");
    assert.equal(JSON.stringify(project).includes(root), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("repository snapshot distinguishes modified and untracked state", async () => {
  const root = await createFixture();
  try {
    await fs.appendFile(path.join(root, "README.md"), "changed\n");
    await fs.writeFile(path.join(root, "new.txt"), "new\n");
    const result = await executeLocalRequest(
      request("local.repository.snapshot.read", { recent_commit_limit: 3 }),
      { registry: registryFor(root) },
    );
    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.data.branch, "main");
    assert.equal(result.data.worktree_state, "DIRTY");
    assert.equal(result.data.changes.modified, 1);
    assert.equal(result.data.changes.untracked, 1);
    assert.equal(result.data.recent_commits.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("file range and tree pagination return bounded canonical results", async () => {
  const root = await createFixture();
  try {
    const registry = registryFor(root);
    const file = await executeLocalRequest(
      request("local.repository.file.read", {
        path: "README.md",
        line_range: { start: 1, end: 1 },
      }),
      { registry },
    );
    assert.equal(file.status, "PARTIAL");
    assert.equal(file.data.content, "# fixture");
    assert.equal(file.data.git_state, "committed");
    assert.match(file.data.content_hash, /^sha256:/);

    const first = await executeLocalRequest(
      request("local.repository.tree.read", {
        path: ".",
        max_depth: 2,
        page_size: 1,
      }),
      { registry },
    );
    assert.equal(first.status, "PARTIAL");
    assert.equal(first.data.entries.length, 1);
    assert.equal(typeof first.data.next_cursor, "string");
    const second = await executeLocalRequest(
      request("local.repository.tree.read", {
        path: ".",
        max_depth: 2,
        page_size: 10,
        cursor: first.data.next_cursor,
      }),
      { registry },
    );
    assert.ok(second.data.entries.length >= 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("absolute paths, traversal, sensitive files and escaping symlinks are denied", async () => {
  const root = await createFixture();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-outside-"));
  try {
    await fs.writeFile(path.join(root, ".env"), "SECRET=value\n");
    await fs.writeFile(path.join(outside, "secret.txt"), "secret\n");
    await fs.symlink(path.join(outside, "secret.txt"), path.join(root, "escape.txt"));
    const registry = registryFor(root);
    for (const target of ["/etc/passwd", "../secret", ".env", "escape.txt"]) {
      const result = await executeLocalRequest(
        request("local.repository.file.read", { path: target }),
        { registry },
      );
      assert.equal(result.status, "FAILED", target);
      assert.ok(
        [
          "ABSOLUTE_PATH_DENIED",
          "PATH_TRAVERSAL_DENIED",
          "SENSITIVE_RESOURCE_DENIED",
          "SYMLINK_ESCAPE",
        ].includes(result.error.code),
        `${target}: ${result.error.code}`,
      );
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test("runtime and executor status expose deterministic availability facts", async () => {
  const root = await createFixture();
  try {
    await withHealthServer(async (healthUrl) => {
      const registry = registryFor(root, { healthUrl });
      const runtime = await executeLocalRequest(
        request("local.runtime.status.read", { runtime_ref: "gateway" }),
        { registry },
      );
      assert.equal(runtime.status, "SUCCEEDED");
      assert.equal(runtime.data.availability, "AVAILABLE");
      assert.equal(runtime.data.version, "test-gateway");

      const node = await executeLocalRequest(
        request("local.executor.status.read", { executor_ref: "node" }),
        { registry },
      );
      assert.equal(node.data.installed, true);
      assert.equal(node.data.available, true);

      const missing = await executeLocalRequest(
        request("local.executor.status.read", { executor_ref: "missing" }),
        { registry },
      );
      assert.equal(missing.status, "SUCCEEDED");
      assert.equal(missing.data.installed, false);
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("batch keeps successful child results when one child fails", async () => {
  const root = await createFixture();
  try {
    const result = await executeLocalRequest(
      request("local.query.batch", {
        queries: [
          { capability: "local.project.describe", parameters: {} },
          {
            capability: "local.repository.file.read",
            parameters: { path: ".env" },
          },
        ],
      }),
      { registry: registryFor(root) },
    );
    assert.equal(result.status, "PARTIAL");
    assert.equal(result.data.summary.succeeded, 1);
    assert.equal(result.data.summary.failed, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ensure_running is policy bounded and returns Task Center polling hints", async () => {
  const root = await createFixture();
  try {
    const denied = await executeLocalRequest(
      request("local.service.ensure_running", {
        service_ref: "gateway",
        expected_state: "RUNNING",
      }),
      { registry: registryFor(root, { startAllowed: false }) },
    );
    assert.equal(denied.status, "FAILED");
    assert.equal(denied.error.code, "SERVICE_START_NOT_ALLOWED");

    const processRunner = {
      async run() {
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      spawnDetached() {
        return { pid: 4242, startedAt: "2026-08-05T00:00:00.000Z" };
      },
    };
    const accepted = await executeLocalRequest(
      request("local.service.ensure_running", {
        service_ref: "gateway",
        expected_state: "RUNNING",
      }),
      {
        registry: registryFor(root, { startAllowed: true }),
        processRunner,
      },
    );
    assert.equal(accepted.status, "ACCEPTED");
    assert.equal(accepted.data.process_ref.pid, 4242);
    assert.equal(accepted.data.poll.capability, "local.runtime.status.read");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});


test("side-effect capability requires an idempotency key", async () => {
  const root = await createFixture();
  try {
    const input = request("local.service.ensure_running", {
      service_ref: "gateway",
    });
    delete input.idempotency_key;
    const result = await executeLocalRequest(input, {
      registry: registryFor(root, { startAllowed: true }),
    });
    assert.equal(result.status, "FAILED");
    assert.equal(result.error.code, "INVALID_REQUEST");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("valid CLI request returns structured registry failure instead of empty stdout", async () => {
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-no-registry-"));
  try {
    const environment = { ...process.env };
    delete environment.LOCAL_PROJECT_ROOT;
    const child = spawn(
      process.execPath,
      [path.join(packageRoot, "dist", "cli.js"), "invoke", "--input", "-", "--output", "json"],
      {
        cwd: outside,
        env: environment,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.stdin.end(JSON.stringify(request("local.health.read")));
    const [code] = await once(child, "close");
    assert.equal(code, 0);
    assert.equal(Buffer.concat(stderr).toString("utf8"), "");
    const result = JSON.parse(Buffer.concat(stdout).toString("utf8"));
    assert.equal(result.status, "FAILED");
    assert.equal(result.error.code, "PROJECT_NOT_REGISTERED");
  } finally {
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test("CLI uses stdin/stdout as a single JSON machine protocol", async () => {
  const root = await createFixture();
  try {
    const child = spawn(
      process.execPath,
      [path.join(packageRoot, "dist", "cli.js"), "invoke", "--input", "-", "--output", "json"],
      {
        cwd: root,
        env: { ...process.env, LOCAL_PROJECT_ROOT: root },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.stdin.end(JSON.stringify(request("local.health.read")));
    const [code] = await once(child, "close");
    assert.equal(code, 0);
    assert.equal(Buffer.concat(stderr).toString("utf8"), "");
    const output = Buffer.concat(stdout).toString("utf8");
    assert.equal(output.trim().split("\n").length, 1);
    const result = JSON.parse(output);
    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.capability, "local.health.read");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("npm pack publishes the binary, dist, schemas, docs and README only", async () => {
  const destination = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-pack-"));
  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["pack", "--json", "--pack-destination", destination],
      { cwd: packageRoot },
    );
    const report = JSON.parse(stdout);
    assert.equal(report.length, 1);
    const names = report[0].files.map((entry) => entry.path);
    assert.ok(names.includes("dist/cli.js"));
    assert.ok(names.includes("dist/index.js"));
    assert.ok(names.includes("schemas/local-request.schema.json"));
    assert.ok(names.includes("schemas/local-result.schema.json"));
    assert.ok(names.includes("README.md"));
    assert.ok(names.includes("docs/GATEWAY-INTEGRATION.md"));
    assert.ok(names.includes("docs/WORK-CONSUMER-INTEGRATION.md"));
    assert.ok(names.includes("docs/AUDIT-REMEDIATION-2026-08-05.md"));
    assert.ok(names.includes("docs/RUNBOOK.md"));
    assert.ok(names.includes("docs/MVP-VERIFICATION.md"));
    assert.equal(names.some((name) => name.startsWith("tests/")), false);
    assert.equal(names.some((name) => name.startsWith("src/")), false);
  } finally {
    await fs.rm(destination, { recursive: true, force: true });
  }
});

test("packed npm artifact installs offline and exposes the aap-local binary", async () => {
  const destination = await fs.mkdtemp(path.join(os.tmpdir(), "local-control-install-"));
  const fixture = await createFixture();
  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["pack", "--json", "--pack-destination", destination],
      { cwd: packageRoot },
    );
    const report = JSON.parse(stdout);
    const tarball = path.join(destination, report[0].filename);
    await fs.writeFile(
      path.join(destination, "package.json"),
      JSON.stringify({ name: "local-control-install-test", private: true }),
    );
    await execFileAsync(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--offline",
        tarball,
      ],
      { cwd: destination },
    );
    const binary = path.join(destination, "node_modules", ".bin", "aap-local");
    const child = spawn(
      binary,
      ["invoke", "--input", "-", "--output", "json"],
      {
        cwd: fixture,
        env: { ...process.env, LOCAL_PROJECT_ROOT: fixture },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.stdin.end(JSON.stringify(request("local.project.describe")));
    const [code] = await once(child, "close");
    assert.equal(code, 0);
    assert.equal(Buffer.concat(stderrChunks).toString("utf8"), "");
    const result = JSON.parse(Buffer.concat(stdoutChunks).toString("utf8"));
    assert.equal(result.status, "SUCCEEDED");
    assert.equal(result.data.project_id, "ai-agent-platform");
  } finally {
    await fs.rm(destination, { recursive: true, force: true });
    await fs.rm(fixture, { recursive: true, force: true });
  }
});

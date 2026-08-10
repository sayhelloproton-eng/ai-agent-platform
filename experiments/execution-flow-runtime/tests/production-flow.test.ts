import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { createFileReadCapability } from "../src/capabilities/file-read.js";
import { createFixedCommandCapability } from "../src/capabilities/fixed-command.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { runExecutionFlow } from "../src/runtime/run-flow.js";
import type { ExecutionRun, InferenceRequest } from "../src/types.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readExampleRun(): Promise<ExecutionRun> {
  return JSON.parse(
    await fs.readFile(path.join(moduleRoot, "examples", "runtime-health.flow.json"), "utf8")
  ) as ExecutionRun;
}

async function createRealEnvironment(options?: { verifierUncertain?: boolean }) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-ef4-"));
  await fs.mkdir(path.join(workspace, "fixtures"), { recursive: true });

  const expectedMajor = Number(process.versions.node.split(".")[0]);
  await fs.writeFile(
    path.join(workspace, "fixtures", "runtime-status.json"),
    JSON.stringify(
      {
        service: "execution-flow-runtime-test",
        reported_status: "healthy",
        verification_required: true,
        expected_node_major: expectedMajor,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const fileRead = await createFileReadCapability({
    root: workspace,
    name: "workspace.file.read",
  });
  const fixedCommand = createFixedCommandCapability({
    commands: {
      "node.version": {
        executable: process.execPath,
        args: ["--version"],
        cwd: workspace,
      },
    },
  });
  const capabilities = new CapabilityRegistry()
    .register(fileRead.descriptor, fileRead.handler)
    .register(fixedCommand.descriptor, fixedCommand.handler);

  const calls: InferenceRequest[] = [];
  const inferenceBackends = new InferenceBackendRegistry().register(
    "fixture",
    new FixtureInferenceBackend((request) => {
      calls.push(request);

      if (request.node_id === "fast-verify") {
        if (options?.verifierUncertain) {
          return {
            state: "uncertain",
            decision: "unknown",
            observed_node_major: null,
          };
        }

        const input = request.input as {
          readback: { expected_node_major: number; reported_status: string };
          command: { exit_code: number | null; stdout: string };
        };
        const observed = Number(input.command.stdout.match(/^v(\d+)\./)?.[1]);
        assert.equal(input.command.exit_code, 0);
        assert.equal(input.readback.reported_status, "healthy");
        assert.equal(observed, input.readback.expected_node_major);
        return {
          state: "verified",
          decision: "healthy",
          observed_node_major: observed,
        };
      }

      if (request.node_id === "reason-resolve") {
        return {
          decision: "healthy",
          resolution: "command_matches_expected",
        };
      }

      throw new Error(`Unexpected inference node: ${request.node_id}`);
    })
  );

  const run = await readExampleRun();
  run.execution_id = `ef4-unit-${Date.now()}-${Math.random()}`;
  run.correlation = { gate: "EF-4", source: "unit-real-capabilities" };
  run.flow.nodes = run.flow.nodes.map((node) =>
    node.type === "inference" ? { ...node, backend: "fixture" } : node
  );

  return { workspace, expectedMajor, capabilities, inferenceBackends, calls, run };
}

test("EF-4: real file -> FAST -> fixed command -> readback -> FAST verification completes without REASON", async () => {
  const env = await createRealEnvironment();
  try {
    const result = await runExecutionFlow(env.run, env);

    assert.equal(result.status, "completed");
    assert.equal((result.output as any).decision, "healthy");
    assert.equal((result.output as any).resolved_by, "fast");
    assert.equal((result.output as any).command_executed, true);
    assert.match((result.output as any).command.stdout, new RegExp(`^v${env.expectedMajor}\\.`));
    assert.equal((result.output as any).readback.expected_node_major, env.expectedMajor);

    assert.deepEqual(result.node_runs.map((node) => node.node_id), [
      "read-status",
      "status-route",
      "verification-required-route",
      "run-node-version",
      "readback-status",
      "fast-verify",
      "verification-route",
      "fast-done",
    ]);
    assert.deepEqual(env.calls.map((call) => call.role), ["fast"]);
    assert.deepEqual(
      result.evidence.map((item) => [item.type, item.node_id]),
      [
        ["capability-result", "read-status"],
        ["capability-result", "run-node-version"],
        ["capability-result", "readback-status"],
        ["inference-result", "fast-verify"],
      ]
    );
  } finally {
    await fs.rm(env.workspace, { recursive: true, force: true });
  }
});

test("EF-4: only Flow switch escalates uncertain post-command verification to REASON", async () => {
  const env = await createRealEnvironment({ verifierUncertain: true });
  try {
    const result = await runExecutionFlow(env.run, env);

    assert.equal(result.status, "completed");
    assert.equal((result.output as any).decision, "healthy");
    assert.equal((result.output as any).resolved_by, "reason");
    assert.equal((result.output as any).resolution, "command_matches_expected");
    assert.deepEqual(env.calls.map((call) => call.role), ["fast", "reason"]);
    assert.deepEqual(result.node_runs.map((node) => node.node_id), [
      "read-status",
      "status-route",
      "verification-required-route",
      "run-node-version",
      "readback-status",
      "fast-verify",
      "verification-route",
      "reason-resolve",
      "reason-done",
    ]);
  } finally {
    await fs.rm(env.workspace, { recursive: true, force: true });
  }
});

test("EF-4: production-shaped flow remains bounded by max_node_runs", async () => {
  const env = await createRealEnvironment();
  try {
    env.run.max_node_runs = 4;
    const result = await runExecutionFlow(env.run, env);

    assert.equal(result.status, "failed");
    assert.equal(result.error?.code, "STEP_LIMIT");
    assert.deepEqual(result.node_runs.map((node) => node.node_id), [
      "read-status",
      "status-route",
      "verification-required-route",
      "run-node-version",
    ]);
    assert.deepEqual(env.calls.map((call) => call.role), []);
  } finally {
    await fs.rm(env.workspace, { recursive: true, force: true });
  }
});

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
import type { ExecutionRun } from "../src/types.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("EF-4: deterministic verification_required=true cannot be bypassed by inference", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-deterministic-route-"));
  try {
    await fs.mkdir(path.join(workspace, "fixtures"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "fixtures", "runtime-status.json"),
      JSON.stringify({
        service: "execution-flow-runtime-test",
        reported_status: "healthy",
        verification_required: true,
        expected_node_major: Number(process.versions.node.split(".")[0]),
      }) + "\n",
      "utf8"
    );

    const fileRead = await createFileReadCapability({ root: workspace, name: "workspace.file.read" });
    const fixedCommand = createFixedCommandCapability({
      commands: {
        "node.version": { executable: process.execPath, args: ["--version"], cwd: workspace },
      },
    });
    const capabilities = new CapabilityRegistry()
      .register(fileRead.descriptor, fileRead.handler)
      .register(fixedCommand.descriptor, fixedCommand.handler);

    let inferenceCalls = 0;
    const inferenceBackends = new InferenceBackendRegistry().register(
      "fixture",
      new FixtureInferenceBackend((request) => {
        inferenceCalls += 1;
        assert.equal(request.node_id, "fast-verify");
        return {
          state: "verified",
          decision: "healthy",
          observed_node_major: Number(process.versions.node.split(".")[0]),
        };
      })
    );

    const run = JSON.parse(
      await fs.readFile(path.join(moduleRoot, "examples", "runtime-health.flow.json"), "utf8")
    ) as ExecutionRun;
    run.execution_id = "deterministic-routing-test";
    run.flow.nodes = run.flow.nodes.map((node) =>
      node.type === "inference" ? { ...node, backend: "fixture" } : node
    );

    const result = await runExecutionFlow(run, { capabilities, inferenceBackends });
    assert.equal(result.status, "completed");
    assert.equal((result.output as any).command_executed, true);
    assert.equal((result.output as any).command.command_ref, "node.version");
    assert.equal(inferenceCalls, 1);
    assert.deepEqual(
      result.node_runs.slice(0, 4).map((node) => node.node_id),
      ["read-status", "status-route", "verification-required-route", "run-node-version"]
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

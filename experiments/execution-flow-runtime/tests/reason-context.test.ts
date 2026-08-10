import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntimeEnvironment } from "../src/runtime/environment.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { runExecutionFlow } from "../src/runtime/run-flow.js";
import type { ExecutionRun, InferenceRequest } from "../src/types.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("REASON escalation receives explicit original context, evidence, and full FAST outputs", async () => {
  const run = JSON.parse(
    await fs.readFile(path.join(PACKAGE_ROOT, "examples/runtime-health.flow.json"), "utf8")
  ) as ExecutionRun;
  run.execution_id = "reason-context-test";

  const environment = await createRuntimeEnvironment({
    host: "127.0.0.1",
    port: 43170,
    workspace_root: PACKAGE_ROOT,
    max_node_runs: 16,
  });

  let reasonRequest: InferenceRequest | undefined;
  environment.inferenceBackends.register(
    "mlxhub",
    new FixtureInferenceBackend((request) => {
      if (request.node_id === "fast-verify") {
        return { state: "uncertain", decision: "unknown", observed_node_major: null };
      }
      if (request.node_id === "reason-resolve") {
        reasonRequest = request;
        return { decision: "healthy", resolution: "command_matches_expected" };
      }
      throw new Error(`Unexpected inference node: ${request.node_id}`);
    })
  );

  const result = await runExecutionFlow(run, environment);
  assert.equal(result.status, "completed");
  assert.equal((result.output as any).resolved_by, "reason");
  assert.ok(reasonRequest);

  const context = (reasonRequest!.input as any).escalation_context;
  assert.deepEqual(context.original_input, run.inputs.request);
  assert.equal(context.trigger, "fast_verification_uncertain");
  assert.equal(context.constraints.fast_output_is_not_truth, true);
  assert.equal(context.constraints.use_supplied_evidence_only, true);
  assert.equal(context.constraints.fail_closed_if_insufficient, true);
  assert.equal(context.evidence.initial_status.reported_status, "healthy");
  assert.equal(context.evidence.readback.expected_node_major, 20);
  assert.match(context.evidence.command.stdout, /^v\d+\./);
  assert.deepEqual(context.fast.verification, {
    state: "uncertain",
    decision: "unknown",
    observed_node_major: null,
  });
});

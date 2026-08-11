import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readState } from "../src/service/config.js";
import type { ExecutionRun } from "../src/types.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function productionRun(): Promise<ExecutionRun> {
  const run = JSON.parse(
    await fs.readFile(path.join(moduleRoot, "examples", "runtime-health.flow.json"), "utf8")
  ) as ExecutionRun;
  run.execution_id = `ef4-live-${Date.now()}`;
  run.correlation = {
    gate: "EF-4",
    purpose: "production-shaped-file-command-readback-verification",
  };
  return run;
}

test("EF-4 live: managed service runs real file -> FAST -> fixed command -> readback -> verification with optional REASON fallback", async () => {
  const state = await readState();
  assert.ok(
    state,
    "Execution Flow Runtime is not running. Start the configured managed service first."
  );

  const baseUrl = `http://${state.host}:${state.port}`;
  const healthResponse = await fetch(`${baseUrl}/health`, {
    signal: AbortSignal.timeout(2_000),
  });
  assert.equal(healthResponse.status, 200);
  const health = (await healthResponse.json()) as any;
  assert.equal(health.instance_id, state.instance_id);

  const response = await fetch(`${baseUrl}/v1/executions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(await productionRun()),
    signal: AbortSignal.timeout(360_000),
  });
  const result = (await response.json()) as any;

  assert.equal(response.status, 200, JSON.stringify(result, null, 2));
  assert.equal(result.status, "completed");
  assert.equal(result.output.decision, "healthy");
  assert.equal(result.output.command_executed, true);
  assert.ok(["fast", "reason"].includes(result.output.resolved_by));

  const byNode = new Map(result.node_runs.map((node: any) => [node.node_id, node]));
  assert.equal((byNode.get("run-node-version") as any)?.output?.command_ref, "node.version");
  assert.equal((byNode.get("run-node-version") as any)?.output?.exit_code, 0);
  assert.match((byNode.get("run-node-version") as any)?.output?.stdout ?? "", /^v20\./);
  assert.equal((byNode.get("readback-status") as any)?.output?.json?.expected_node_major, 20);
  assert.equal((byNode.get("readback-status") as any)?.output?.json?.reported_status, "healthy");

  const fastVerification = (byNode.get("fast-verify") as any)?.output;
  assert.ok(fastVerification);
  assert.ok(["verified", "uncertain"].includes(fastVerification.state));

  const expectedFastPath = [
    "read-status",
    "status-route",
    "verification-required-route",
    "run-node-version",
    "readback-status",
    "fast-verify",
    "verification-route",
    "fast-done",
  ];
  const expectedReasonPath = [
    "read-status",
    "status-route",
    "verification-required-route",
    "run-node-version",
    "readback-status",
    "fast-verify",
    "verification-route",
    "reason-resolve",
    "reason-done",
  ];
  const actualNodes = result.node_runs.map((node: any) => node.node_id);
  if (fastVerification.state === "verified") {
    assert.deepEqual(actualNodes, expectedFastPath);
    assert.equal(result.output.resolved_by, "fast");
  } else {
    assert.deepEqual(actualNodes, expectedReasonPath);
    assert.equal(result.output.resolved_by, "reason");
    assert.equal(result.output.resolution, "command_matches_expected");
  }

  const capabilityEvidence = result.evidence.filter(
    (item: any) => item.type === "capability-result"
  );
  assert.deepEqual(capabilityEvidence.map((item: any) => item.node_id), [
    "read-status",
    "run-node-version",
    "readback-status",
  ]);

  const inferenceEvidence = result.evidence.filter(
    (item: any) => item.type === "inference-result"
  );
  const roles = inferenceEvidence.map((item: any) => item.role);
  assert.equal(roles[0], "fast");
  assert.equal(
    inferenceEvidence[0]?.metadata?.model,
    "sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think"
  );
  if (roles.length === 2) {
    assert.equal(roles[1], "reason");
    assert.equal(
      inferenceEvidence[1]?.metadata?.model,
      "mlx-community/Qwen3.5-4B-MLX-4bit"
    );
  }
});

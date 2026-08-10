import test from "node:test";
import assert from "node:assert/strict";
import { readState } from "../src/service/config.js";

function roleEscalationRun() {
  return {
    contract: "execution.run.v0",
    execution_id: `ef3-live-${Date.now()}`,
    flow: {
      contract: "execution.flow.v0",
      flow_id: "ef3-live-fast-reason-escalation",
      version: 1,
      entry_node: "fast_assess",
      nodes: [
        {
          id: "fast_assess",
          type: "inference",
          backend: "mlxhub",
          role: "fast",
          instruction:
            "Compare primary.status and secondary.status. If they are equal, return state=determinate and decision equal to that status. If they differ, you MUST return exactly state=uncertain and decision=unknown. Do not resolve conflicting evidence in FAST.",
          input: {
            primary: { $ref: "inputs.primary" },
            secondary: { $ref: "inputs.secondary" },
          },
          output_schema: {
            type: "object",
            properties: {
              state: { enum: ["determinate", "uncertain"] },
              decision: { enum: ["healthy", "unhealthy", "unknown"] },
            },
            required: ["state", "decision"],
            additionalProperties: false,
          },
          next: "escalate",
        },
        {
          id: "escalate",
          type: "switch",
          select: { $ref: "steps.fast_assess.output.state" },
          cases: {
            determinate: "fast_done",
            uncertain: "reason_resolve",
          },
          default: "reason_resolve",
        },
        {
          id: "reason_resolve",
          type: "inference",
          backend: "mlxhub",
          role: "reason",
          instruction:
            "Resolve only the supplied conflict using resolution_policy. The policy states that the primary source is authoritative when statuses conflict. Return decision equal to primary.status and resolution=primary_authoritative.",
          input: {
            primary: { $ref: "inputs.primary" },
            secondary: { $ref: "inputs.secondary" },
            resolution_policy: { $ref: "inputs.resolution_policy" },
            fast_result: { $ref: "steps.fast_assess.output" },
          },
          output_schema: {
            type: "object",
            properties: {
              decision: { enum: ["healthy", "unhealthy"] },
              resolution: { const: "primary_authoritative" },
            },
            required: ["decision", "resolution"],
            additionalProperties: false,
          },
          next: "reason_done",
        },
        {
          id: "fast_done",
          type: "return",
          output: {
            decision: { $ref: "steps.fast_assess.output.decision" },
            resolved_by: "fast",
          },
        },
        {
          id: "reason_done",
          type: "return",
          output: {
            decision: { $ref: "steps.reason_resolve.output.decision" },
            resolved_by: "reason",
          },
        },
      ],
    },
    inputs: {
      primary: { source: "runtime-health", status: "healthy" },
      secondary: { source: "cached-observer", status: "unhealthy" },
      resolution_policy: "primary source is authoritative when the two sources conflict",
    },
    authorization: { allowed_capabilities: [] },
    max_node_runs: 8,
    correlation: { gate: "EF-3", purpose: "fast-reason-explicit-escalation" },
  };
}

test("EF-3 live: managed service runs FAST -> switch -> REASON with distinct MLXHub models", async () => {
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
    body: JSON.stringify(roleEscalationRun()),
    signal: AbortSignal.timeout(190_000),
  });
  const result = (await response.json()) as any;

  assert.equal(response.status, 200, JSON.stringify(result, null, 2));
  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { decision: "healthy", resolved_by: "reason" });
  assert.deepEqual(result.node_runs.map((node: any) => node.node_id), [
    "fast_assess",
    "escalate",
    "reason_resolve",
    "reason_done",
  ]);

  const inferenceEvidence = result.evidence.filter(
    (item: any) => item.type === "inference-result"
  );
  assert.equal(inferenceEvidence.length, 2);
  assert.deepEqual(inferenceEvidence.map((item: any) => item.role), ["fast", "reason"]);
  assert.equal(inferenceEvidence[0].backend, "mlxhub");
  assert.equal(inferenceEvidence[1].backend, "mlxhub");
  assert.equal(
    inferenceEvidence[0].metadata.model,
    "sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think"
  );
  assert.equal(
    inferenceEvidence[1].metadata.model,
    "mlx-community/Qwen3.5-4B-MLX-4bit"
  );
  assert.equal(inferenceEvidence[0].metadata.role, "fast");
  assert.equal(inferenceEvidence[1].metadata.role, "reason");
});

import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { runExecutionFlow } from "../src/runtime/run-flow.js";
import type { ExecutionRun, InferenceRequest } from "../src/types.js";

function escalationRun(primary: "healthy" | "unhealthy", secondary: "healthy" | "unhealthy"): ExecutionRun {
  return {
    contract: "execution.run.v0",
    execution_id: `ef3-${primary}-${secondary}`,
    authorization: { allowed_capabilities: [] },
    inputs: {
      primary: { source: "runtime-health", status: primary },
      secondary: { source: "cached-observer", status: secondary },
      resolution_policy: "primary source is authoritative when the two sources conflict",
    },
    flow: {
      contract: "execution.flow.v0",
      flow_id: "ef3-fast-reason-escalation",
      version: 1,
      entry_node: "fast_assess",
      nodes: [
        {
          id: "fast_assess",
          type: "inference",
          backend: "fixture",
          role: "fast",
          instruction:
            "Compare primary.status and secondary.status. If equal, return state=determinate and that decision. If they differ, return state=uncertain and decision=unknown.",
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
          backend: "fixture",
          role: "reason",
          instruction:
            "Resolve the explicit conflict using resolution_policy. Return the authoritative decision and resolution=primary_authoritative.",
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
  };
}

function fixtureWithCallLog(calls: InferenceRequest[]) {
  return new FixtureInferenceBackend((request) => {
    calls.push(request);
    if (request.role === "fast") {
      const input = request.input as {
        primary: { status: string };
        secondary: { status: string };
      };
      return input.primary.status === input.secondary.status
        ? { state: "determinate", decision: input.primary.status }
        : { state: "uncertain", decision: "unknown" };
    }

    const input = request.input as {
      primary: { status: "healthy" | "unhealthy" };
    };
    return {
      decision: input.primary.status,
      resolution: "primary_authoritative",
    };
  });
}

test("EF-3: FAST determinate output does not invoke REASON", async () => {
  const calls: InferenceRequest[] = [];
  const result = await runExecutionFlow(escalationRun("healthy", "healthy"), {
    capabilities: new CapabilityRegistry(),
    inferenceBackends: new InferenceBackendRegistry().register(
      "fixture",
      fixtureWithCallLog(calls)
    ),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { decision: "healthy", resolved_by: "fast" });
  assert.deepEqual(calls.map((call) => call.role), ["fast"]);
  assert.deepEqual(result.node_runs.map((node) => node.node_id), [
    "fast_assess",
    "escalate",
    "fast_done",
  ]);
});

test("EF-3: Flow switch explicitly escalates FAST uncertainty to a distinct REASON node", async () => {
  const calls: InferenceRequest[] = [];
  const result = await runExecutionFlow(escalationRun("healthy", "unhealthy"), {
    capabilities: new CapabilityRegistry(),
    inferenceBackends: new InferenceBackendRegistry().register(
      "fixture",
      fixtureWithCallLog(calls)
    ),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { decision: "healthy", resolved_by: "reason" });
  assert.deepEqual(calls.map((call) => call.role), ["fast", "reason"]);
  assert.notEqual(calls[0]?.instruction, calls[1]?.instruction);
  assert.deepEqual(result.node_runs.map((node) => node.node_id), [
    "fast_assess",
    "escalate",
    "reason_resolve",
    "reason_done",
  ]);
  assert.deepEqual(result.evidence.map((item) => item.role), ["fast", "reason"]);
});

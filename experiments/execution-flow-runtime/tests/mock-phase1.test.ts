import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { runExecutionFlow } from "../src/runtime/run-flow.js";
import type { ExecutionRun } from "../src/types.js";

// ============================================
// STEP 1 — ExecutionRun input / ExecutionResult output
// ============================================
test("STEP 1: minimal return-only flow — contract round-trip", async () => {
  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "mock-contract-001",
    inputs: { value: "hello" },
    authorization: { allowed_capabilities: [] },
    correlation: {
      source: "mock",
      external_ref: "opaque-001",
    },
    flow: {
      contract: "execution.flow.v0",
      flow_id: "mock-contract-flow",
      version: 1,
      entry_node: "done",
      nodes: [
        {
          id: "done",
          type: "return",
          output: { value: "$inputs.value" },
        } as any,
      ],
    },
  };

  const result = await runExecutionFlow(run, {
    capabilities: new CapabilityRegistry(),
    inferenceBackends: new InferenceBackendRegistry(),
  });

  assert.equal(result.contract, "execution.result.v0");
  assert.equal(result.execution_id, "mock-contract-001");
  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { value: "hello" });
  assert.equal(result.error, null);
  assert.deepEqual(result.correlation, {
    source: "mock",
    external_ref: "opaque-001",
  });
  assert.equal(result.node_runs.length, 1);
  assert.equal(result.node_runs[0]!.node_id, "done");
  assert.equal(result.evidence.length, 0);
});

// ============================================
// STEP 2 — Deterministic Flow, no model
// ============================================
test("STEP 2: action → switch → return — no LLM involved", async () => {
  const capabilities = new CapabilityRegistry().register(
    {
      contract: "execution.capability.v0",
      name: "mock.value.read",
      description: "Returns a fixed healthy value.",
      effects: "read",
      input_schema: {
        type: "object",
        properties: { key: { type: "string" } },
        additionalProperties: false,
      },
    },
    async (args) => {
      assert.equal(args.key, "status");
      return { value: "healthy" };
    },
  );

  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "mock-deterministic-002",
    inputs: {},
    authorization: { allowed_capabilities: ["mock.value.read"] },
    correlation: {},
    flow: {
      contract: "execution.flow.v0",
      flow_id: "mock-deterministic-flow",
      version: 1,
      entry_node: "read",
      nodes: [
        {
          id: "read",
          type: "action",
          capability: "mock.value.read",
          arguments: { key: "status" },
          next: "route",
        } as any,
        {
          id: "route",
          type: "switch",
          select: "$steps.read.output.value",
          cases: { healthy: "success", unhealthy: "failed" },
          default: "failed",
        } as any,
        {
          id: "success",
          type: "return",
          output: { healthy: true },
        } as any,
        {
          id: "failed",
          type: "return",
          output: { healthy: false },
        } as any,
      ],
    },
  };

  const result = await runExecutionFlow(run, {
    capabilities,
    inferenceBackends: new InferenceBackendRegistry(),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { healthy: true });

  const orderedIds = result.node_runs.map((nr) => nr.node_id);
  assert.deepEqual(orderedIds, ["read", "route", "success"]);

  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0]!.type, "capability-result");
  assert.equal(result.evidence[0]!.capability, "mock.value.read");
});

// ============================================
// STEP 3 — Mock Inference Node
// ============================================
test("STEP 3: action → inference → switch → return — flow decides next node", async () => {
  const capabilities = new CapabilityRegistry().register(
    {
      contract: "execution.capability.v0",
      name: "mock.value.read",
      description: "Returns runtime health.",
      effects: "read",
      input_schema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => ({ status: "healthy" }),
  );

  const inferenceBackends = new InferenceBackendRegistry().register(
    "fixture",
    new FixtureInferenceBackend((request) => {
      assert.equal(request.profile, "standard");
      assert.equal(request.instruction, "classify runtime health");
      assert.deepEqual(request.input, { status: "healthy" });
      return {
        decision: "healthy",
        confidence: 97,
      };
    }),
  );

  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "mock-inference-003",
    inputs: {},
    authorization: { allowed_capabilities: ["mock.value.read"] },
    correlation: {},
    flow: {
      contract: "execution.flow.v0",
      flow_id: "mock-inference-flow",
      version: 1,
      entry_node: "read",
      nodes: [
        {
          id: "read",
          type: "action",
          capability: "mock.value.read",
          arguments: {},
          next: "judge",
        } as any,
        {
          id: "judge",
          type: "inference",
          backend: "fixture",
          profile: "standard",
          instruction: "classify runtime health",
          input: { status: "$steps.read.output.status" },
          output_schema: {
            type: "object",
            properties: {
              decision: { enum: ["healthy", "unhealthy", "uncertain"] },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
            },
            required: ["decision", "confidence"],
            additionalProperties: false,
          },
          next: "route",
        } as any,
        {
          id: "route",
          type: "switch",
          select: "$steps.judge.output.decision",
          cases: { healthy: "success", unhealthy: "failed", uncertain: "failed" },
          default: "failed",
        } as any,
        {
          id: "success",
          type: "return",
          output: { healthy: true },
        } as any,
        {
          id: "failed",
          type: "return",
          output: { healthy: false },
        } as any,
      ],
    },
  };

  const result = await runExecutionFlow(run, {
    capabilities,
    inferenceBackends,
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { healthy: true });

  const orderedIds = result.node_runs.map((nr) => nr.node_id);
  assert.deepEqual(orderedIds, ["read", "judge", "route", "success"]);

  assert.equal(result.evidence.length, 2);
  assert.equal(result.evidence[0]!.type, "capability-result");
  assert.equal(result.evidence[1]!.type, "inference-result");
  assert.equal(result.evidence[1]!.backend, "fixture");
  assert.equal(result.evidence[1]!.profile, "standard");
});

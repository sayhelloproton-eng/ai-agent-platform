import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { runExecutionFlow } from "../src/runtime/run-flow.js";
import type { ExecutionRun } from "../src/types.js";

test("action -> inference -> switch -> return is flow-defined", async () => {
  const capabilities = new CapabilityRegistry().register(
    {
      contract: "execution.capability.v0",
      name: "fixture.read",
      description: "fixture",
      effects: "read",
      input_schema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => ({ status: "healthy" })
  );

  const inferenceBackends = new InferenceBackendRegistry().register(
    "fixture",
    new FixtureInferenceBackend(() => ({ route: "ok" }))
  );

  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "exec-1",
    authorization: { allowed_capabilities: ["fixture.read"] },
    inputs: {},
    flow: {
      contract: "execution.flow.v0",
      flow_id: "flow-1",
      version: 1,
      entry_node: "read",
      nodes: [
        {
          id: "read",
          type: "action",
          capability: "fixture.read",
          arguments: {},
          next: "judge",
        },
        {
          id: "judge",
          type: "inference",
          backend: "fixture",
          role: "fast",
          instruction: "classify health",
          input: { $ref: "steps.read.output" },
          output_schema: {
            type: "object",
            properties: {
              route: { enum: ["ok", "bad"] },
            },
            required: ["route"],
            additionalProperties: false,
          },
          next: "branch",
        },
        {
          id: "branch",
          type: "switch",
          select: { $ref: "steps.judge.output.route" },
          cases: { ok: "done", bad: "bad" },
          default: "bad",
        },
        {
          id: "done",
          type: "return",
          output: { status: "healthy" },
        },
        {
          id: "bad",
          type: "return",
          output: { status: "unhealthy" },
        },
      ],
    },
  };

  const result = await runExecutionFlow(run, {
    capabilities,
    inferenceBackends,
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.output, { status: "healthy" });
});

test("capability authorization fails closed", async () => {
  const capabilities = new CapabilityRegistry().register(
    {
      contract: "execution.capability.v0",
      name: "fixture.read",
      description: "fixture",
      effects: "read",
      input_schema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async () => ({ ok: true })
  );

  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "exec-denied",
    authorization: { allowed_capabilities: [] },
    inputs: {},
    flow: {
      contract: "execution.flow.v0",
      flow_id: "flow-denied",
      version: 1,
      entry_node: "read",
      nodes: [
        {
          id: "read",
          type: "action",
          capability: "fixture.read",
          arguments: {},
          next: "done",
        },
        {
          id: "done",
          type: "return",
          output: {},
        },
      ],
    },
  };

  const result = await runExecutionFlow(run, {
    capabilities,
    inferenceBackends: new InferenceBackendRegistry(),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "CAPABILITY_DENIED");
});

test("model output must match declared schema", async () => {
  const inferenceBackends = new InferenceBackendRegistry().register(
    "fixture",
    new FixtureInferenceBackend(() => ({ command: "rm -rf /" }))
  );

  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "exec-schema",
    authorization: { allowed_capabilities: [] },
    inputs: {},
    flow: {
      contract: "execution.flow.v0",
      flow_id: "flow-schema",
      version: 1,
      entry_node: "judge",
      nodes: [
        {
          id: "judge",
          type: "inference",
          backend: "fixture",
          role: "fast",
          instruction: "choose route",
          input: {},
          output_schema: {
            type: "object",
            properties: {
              route: { enum: ["ok", "stop"] },
            },
            required: ["route"],
            additionalProperties: false,
          },
          next: "done",
        },
        {
          id: "done",
          type: "return",
          output: {},
        },
      ],
    },
  };

  const result = await runExecutionFlow(run, {
    capabilities: new CapabilityRegistry(),
    inferenceBackends,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "SCHEMA_VALIDATION_FAILED");
});

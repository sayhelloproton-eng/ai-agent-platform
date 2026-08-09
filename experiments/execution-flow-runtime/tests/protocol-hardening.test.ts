import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { resolveBinding } from "../src/runtime/bindings.js";
import { runExecutionFlow } from "../src/runtime/run-flow.js";
import { validateExecutionRun } from "../src/runtime/validate-flow.js";
import type { ExecutionRun } from "../src/types.js";

function minimalRun(): ExecutionRun {
  return {
    contract: "execution.run.v0",
    execution_id: "protocol-minimal",
    inputs: {},
    authorization: { allowed_capabilities: [] },
    flow: {
      contract: "execution.flow.v0",
      flow_id: "protocol-minimal-flow",
      version: 1,
      entry_node: "done",
      nodes: [{ id: "done", type: "return", output: { ok: true } }],
    },
  };
}

test("published execution-run schema rejects undeclared top-level fields", () => {
  const run = minimalRun() as ExecutionRun & { evil?: boolean };
  run.evil = true;
  assert.throws(() => validateExecutionRun(run), /execution-run validation failed/);
});

test("published execution-flow schema rejects undeclared node fields", () => {
  const run = minimalRun();
  const node = run.flow.nodes[0] as (typeof run.flow.nodes)[number] & { evil?: boolean };
  node.evil = true;
  assert.throws(() => validateExecutionRun(run), /validation failed/);
});

test("bindings are explicit objects and plain dollar strings stay literal", () => {
  const context = {
    inputs: { value: "resolved" },
    steps: {},
  };

  assert.equal(resolveBinding("$inputs.value", context), "$inputs.value");
  assert.equal(resolveBinding("$PATH", context), "$PATH");
  assert.equal(resolveBinding({ $ref: "inputs.value" }, context), "resolved");
});

test("Ajv enforces JSON Schema oneOf instead of silently ignoring it", async () => {
  const inferenceBackends = new InferenceBackendRegistry().register(
    "fixture",
    new FixtureInferenceBackend(() => ({ decision: "maybe" }))
  );

  const run: ExecutionRun = {
    contract: "execution.run.v0",
    execution_id: "oneof-enforced",
    inputs: {},
    authorization: { allowed_capabilities: [] },
    flow: {
      contract: "execution.flow.v0",
      flow_id: "oneof-enforced-flow",
      version: 1,
      entry_node: "judge",
      nodes: [
        {
          id: "judge",
          type: "inference",
          backend: "fixture",
          profile: "standard",
          instruction: "choose exactly one valid decision",
          input: {},
          output_schema: {
            type: "object",
            oneOf: [
              {
                properties: { decision: { const: "yes" } },
                required: ["decision"],
              },
              {
                properties: { decision: { const: "no" } },
                required: ["decision"],
              },
            ],
            additionalProperties: false,
          },
          next: "done",
        },
        { id: "done", type: "return", output: { ok: true } },
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

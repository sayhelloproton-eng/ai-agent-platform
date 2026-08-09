import test from "node:test";
import assert from "node:assert/strict";
import { MlxHubInferenceBackend } from "../src/inference/mlxhub-backend.js";

const configured =
  Boolean(process.env.EXECUTION_FLOW_MLXHUB_BASE_URL) &&
  Boolean(process.env.EXECUTION_FLOW_MLXHUB_STANDARD_MODEL) &&
  Boolean(process.env.EXECUTION_FLOW_MLXHUB_REASONING_MODEL);

test(
  "MLXHub live backend returns schema-shaped JSON",
  { skip: !configured },
  async () => {
    const backend = new MlxHubInferenceBackend({
      baseUrl: process.env.EXECUTION_FLOW_MLXHUB_BASE_URL!,
      standardModel: process.env.EXECUTION_FLOW_MLXHUB_STANDARD_MODEL!,
      reasoningModel: process.env.EXECUTION_FLOW_MLXHUB_REASONING_MODEL!,
    });

    const result = await backend.infer({
      profile: "standard",
      instruction:
        "Return status=healthy when the input status is healthy.",
      input: { status: "healthy" },
      output_schema: {
        type: "object",
        properties: {
          status: { enum: ["healthy", "unhealthy"] },
        },
        required: ["status"],
        additionalProperties: false,
      },
      execution_id: "live-1",
      flow_id: "live-flow",
      node_id: "judge",
    });

    assert.deepEqual(result.output, { status: "healthy" });
  }
);

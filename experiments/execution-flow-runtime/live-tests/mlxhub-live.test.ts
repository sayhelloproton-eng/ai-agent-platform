import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createExecutionFlowServer } from "../src/service/server.js";
import { loadConfig } from "../src/service/config.js";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";
import { MlxHubInferenceBackend } from "../src/inference/mlxhub-backend.js";

function healthFlow(backend: string, executionId: string) {
  return {
    contract: "execution.run.v0",
    execution_id: executionId,
    flow: {
      contract: "execution.flow.v0",
      flow_id: "ef2-pluggable-health-flow",
      version: 1,
      entry_node: "judge",
      nodes: [
        {
          id: "judge",
          type: "inference",
          backend,
          role: "fast",
          instruction:
            "Classify the supplied runtime status. If status is exactly healthy, return status=healthy. Otherwise return status=unhealthy.",
          input: { status: { $ref: "inputs.status" } },
          output_schema: {
            type: "object",
            properties: { status: { enum: ["healthy", "unhealthy"] } },
            required: ["status"],
            additionalProperties: false,
          },
          next: "done",
        },
        {
          id: "done",
          type: "return",
          output: { status: { $ref: "steps.judge.output.status" } },
        },
      ],
    },
    inputs: { status: "healthy" },
    authorization: { allowed_capabilities: [] },
  };
}

async function executeThroughService(
  backendName: string,
  backend: FixtureInferenceBackend | MlxHubInferenceBackend,
  executionId: string
) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-ef2-live-"));
  const inferenceBackends = new InferenceBackendRegistry().register(
    backendName,
    backend
  );
  const service = await createExecutionFlowServer({
    config: {
      host: "127.0.0.1",
      port: 0,
      workspace_root: workspace,
      max_node_runs: 8,
    },
    instanceId: `ef2-${backendName}`,
    runtimeEnvironment: {
      capabilities: new CapabilityRegistry(),
      inferenceBackends,
    },
  });

  await service.listen();
  const address = service.server.address();
  assert.ok(address && typeof address === "object");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/executions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(healthFlow(backendName, executionId)),
    });
    return { status: response.status, body: (await response.json()) as any };
  } finally {
    await service.close();
  }
}

test("EF-2 live: the same flow is pluggable between fixture and MLXHub FAST role", async () => {
  const config = await loadConfig();
  const mlxhubConfig = config.inference?.mlxhub;
  assert.ok(
    mlxhubConfig,
    "MLXHub is not configured. Run `aap-execution-flow config mlxhub set ...` first."
  );

  const fixture = await executeThroughService(
    "fixture",
    new FixtureInferenceBackend(() => ({ status: "healthy" })),
    "ef2-fixture"
  );

  const mlxhub = await executeThroughService(
    "mlxhub",
    new MlxHubInferenceBackend({
      baseUrl: mlxhubConfig.base_url,
      fastModel: mlxhubConfig.roles.fast.model,
      reasonModel: mlxhubConfig.roles.reason.model,
      ...(mlxhubConfig.timeout_ms !== undefined
        ? { timeoutMs: mlxhubConfig.timeout_ms }
        : {}),
      ...(mlxhubConfig.roles.fast.max_tokens !== undefined
        ? { fastMaxTokens: mlxhubConfig.roles.fast.max_tokens }
        : {}),
      ...(mlxhubConfig.roles.reason.max_tokens !== undefined
        ? { reasonMaxTokens: mlxhubConfig.roles.reason.max_tokens }
        : {}),
    }),
    "ef2-mlxhub"
  );

  assert.equal(fixture.status, 200);
  assert.equal(mlxhub.status, 200);
  assert.equal(fixture.body.status, "completed");
  assert.equal(mlxhub.body.status, "completed");
  assert.deepEqual(fixture.body.output, { status: "healthy" });
  assert.deepEqual(mlxhub.body.output, { status: "healthy" });
  assert.deepEqual(
    fixture.body.node_runs.map((node: any) => node.node_id),
    ["judge", "done"]
  );
  assert.deepEqual(
    mlxhub.body.node_runs.map((node: any) => node.node_id),
    ["judge", "done"]
  );
  assert.equal(mlxhub.body.evidence[0].backend, "mlxhub");
  assert.equal(mlxhub.body.evidence[0].role, "fast");
  assert.equal(mlxhub.body.evidence[0].metadata.provider, "mlxhub");
  assert.equal(
    mlxhub.body.evidence[0].metadata.model,
    mlxhubConfig.roles.fast.model
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createExecutionFlowServer } from "../src/service/server.js";
import { CapabilityRegistry } from "../src/capabilities/registry.js";
import { InferenceBackendRegistry } from "../src/inference/registry.js";
import { FixtureInferenceBackend } from "../src/inference/fixture-backend.js";

async function withService(
  options: Parameters<typeof createExecutionFlowServer>[0],
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const service = await createExecutionFlowServer(options);
  await service.listen();
  const address = service.server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await service.close();
  }
}

test("HTTP service exposes health and executes a pure deterministic return flow", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-service-"));

  await withService(
    {
      config: {
        host: "127.0.0.1",
        port: 0,
        workspace_root: workspace,
        max_node_runs: 8,
      },
      instanceId: "service-deterministic",
    },
    async (baseUrl) => {
      const health = await fetch(`${baseUrl}/health`).then((response) => response.json()) as {
        status: string;
        instance_id: string;
      };
      assert.equal(health.status, "ok");
      assert.equal(health.instance_id, "service-deterministic");

      const run = {
        contract: "execution.run.v0",
        execution_id: "http-deterministic-run",
        correlation: {
          source: "ef-1",
          external_ref: "opaque-http-001",
        },
        flow: {
          contract: "execution.flow.v0",
          flow_id: "http-deterministic-flow",
          version: 1,
          entry_node: "done",
          nodes: [
            {
              id: "done",
              type: "return",
              output: {
                message: { $ref: "inputs.message" },
              },
            },
          ],
        },
        inputs: {
          message: "hello-http-runtime",
        },
        authorization: {
          allowed_capabilities: [],
        },
      };

      const response = await fetch(`${baseUrl}/v1/executions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(run),
      });
      const result = await response.json() as any;

      assert.equal(response.status, 200);
      assert.equal(result.contract, "execution.result.v0");
      assert.equal(result.execution_id, "http-deterministic-run");
      assert.equal(result.status, "completed");
      assert.deepEqual(result.output, { message: "hello-http-runtime" });
      assert.deepEqual(result.correlation, run.correlation);
      assert.deepEqual(
        result.node_runs.map((node: any) => node.node_id),
        ["done"]
      );
    }
  );
});

test("HTTP service executes a fixture inference flow without giving the model transition control", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-service-fixture-"));

  const capabilities = new CapabilityRegistry().register(
    {
      contract: "execution.capability.v0",
      name: "fixture.health.read",
      description: "Read deterministic fixture health.",
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
    new FixtureInferenceBackend((request) => {
      assert.equal(request.profile, "standard");
      assert.equal(request.instruction, "classify runtime health");
      assert.deepEqual(request.input, { status: "healthy" });
      return {
        decision: "healthy",
        confidence: 97,
      };
    })
  );

  await withService(
    {
      config: {
        host: "127.0.0.1",
        port: 0,
        workspace_root: workspace,
        max_node_runs: 8,
      },
      instanceId: "service-fixture",
      runtimeEnvironment: {
        capabilities,
        inferenceBackends,
      },
    },
    async (baseUrl) => {
      const run = {
        contract: "execution.run.v0",
        execution_id: "http-fixture-run",
        flow: {
          contract: "execution.flow.v0",
          flow_id: "http-fixture-flow",
          version: 1,
          entry_node: "read",
          nodes: [
            {
              id: "read",
              type: "action",
              capability: "fixture.health.read",
              arguments: {},
              next: "judge",
            },
            {
              id: "judge",
              type: "inference",
              backend: "fixture",
              profile: "standard",
              instruction: "classify runtime health",
              input: {
                status: { $ref: "steps.read.output.status" },
              },
              output_schema: {
                type: "object",
                properties: {
                  decision: {
                    enum: ["healthy", "unhealthy", "uncertain"],
                  },
                  confidence: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                  },
                },
                required: ["decision", "confidence"],
                additionalProperties: false,
              },
              next: "route",
            },
            {
              id: "route",
              type: "switch",
              select: { $ref: "steps.judge.output.decision" },
              cases: {
                healthy: "success",
                unhealthy: "failed",
                uncertain: "failed",
              },
              default: "failed",
            },
            {
              id: "success",
              type: "return",
              output: {
                healthy: true,
              },
            },
            {
              id: "failed",
              type: "return",
              output: {
                healthy: false,
              },
            },
          ],
        },
        inputs: {},
        authorization: {
          allowed_capabilities: ["fixture.health.read"],
        },
      };

      const response = await fetch(`${baseUrl}/v1/executions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(run),
      });
      const result = await response.json() as any;

      assert.equal(response.status, 200);
      assert.equal(result.status, "completed");
      assert.deepEqual(result.output, { healthy: true });
      assert.deepEqual(
        result.node_runs.map((node: any) => node.node_id),
        ["read", "judge", "route", "success"]
      );
      assert.deepEqual(
        result.evidence.map((entry: any) => entry.type),
        ["capability-result", "inference-result"]
      );
      assert.equal(result.evidence[1].backend, "fixture");
      assert.equal(result.evidence[1].profile, "standard");
    }
  );
});

test("HTTP service still executes a deterministic fixed-command flow with default environment", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-service-command-"));

  await withService(
    {
      config: {
        host: "127.0.0.1",
        port: 0,
        workspace_root: workspace,
        max_node_runs: 8,
      },
      instanceId: "service-command",
    },
    async (baseUrl) => {
      const run = {
        contract: "execution.run.v0",
        execution_id: "http-command-run",
        flow: {
          contract: "execution.flow.v0",
          flow_id: "http-command-flow",
          version: 1,
          entry_node: "version",
          nodes: [
            {
              id: "version",
              type: "action",
              capability: "process.command.run-fixed",
              arguments: { command_ref: "node.version" },
              next: "done",
            },
            {
              id: "done",
              type: "return",
              output: { version: { $ref: "steps.version.output.stdout" } },
            },
          ],
        },
        inputs: {},
        authorization: {
          allowed_capabilities: ["process.command.run-fixed"],
        },
      };

      const response = await fetch(`${baseUrl}/v1/executions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(run),
      });
      const result = await response.json() as {
        status: string;
        output: { version: string };
      };

      assert.equal(response.status, 200);
      assert.equal(result.status, "completed");
      assert.match(result.output.version, /^v\d+/);
    }
  );
});

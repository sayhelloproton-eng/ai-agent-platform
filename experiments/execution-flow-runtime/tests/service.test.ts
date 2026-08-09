import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createExecutionFlowServer } from "../src/service/server.js";

test("HTTP service exposes health and executes a deterministic fixed-command flow", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-service-"));
  const service = await createExecutionFlowServer({
    config: {
      host: "127.0.0.1",
      port: 0,
      workspace_root: workspace,
      max_node_runs: 8,
    },
    instanceId: "service-test",
  });

  await service.listen();

  const address = service.server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/health`).then((response) => response.json()) as {
      status: string;
      instance_id: string;
    };
    assert.equal(health.status, "ok");
    assert.equal(health.instance_id, "service-test");

    const run = {
      contract: "execution.run.v0" as const,
      execution_id: "http-run",
      flow: {
        contract: "execution.flow.v0" as const,
        flow_id: "http-flow",
        version: 1,
        entry_node: "version",
        nodes: [
          {
            id: "version",
            type: "action" as const,
            capability: "process.command.run-fixed",
            arguments: { command_ref: "node.version" },
            next: "done",
          },
          {
            id: "done",
            type: "return" as const,
            output: { version: "$steps.version.output.stdout" },
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
  } finally {
    await service.close();
  }
});

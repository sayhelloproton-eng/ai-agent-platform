import http from "node:http";
import { randomUUID } from "node:crypto";
import { runExecutionFlow } from "../runtime/run-flow.js";
import { createRuntimeEnvironment } from "../runtime/environment.js";
import type { RuntimeEnvironment } from "../runtime/environment.js";
import type { ExecutionRun, RuntimeConfig } from "../types.js";

export interface ExecutionFlowServerOptions {
  config: RuntimeConfig;
  instanceId?: string;
  runtimeEnvironment?: RuntimeEnvironment;
}

async function readJson(req: http.IncomingMessage, maxBytes = 1024 * 1024): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) {
      throw new Error(`Request body exceeded ${maxBytes} bytes.`);
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  payload: unknown
): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

export async function createExecutionFlowServer({
  config,
  instanceId = randomUUID(),
  runtimeEnvironment,
}: ExecutionFlowServerOptions) {
  if (!["127.0.0.1", "::1", "localhost"].includes(config.host)) {
    throw new Error("Lab HTTP service is loopback-only during the current lab stage.");
  }
  const runtime = runtimeEnvironment ?? await createRuntimeEnvironment(config);

  const server = http.createServer(async (req, res) => {
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? `${config.host}:${config.port}`}`
    );

    try {
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          module: "@ai-agent-platform/execution-flow-runtime",
          instance_id: instanceId,
          pid: process.pid,
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/runtime") {
        sendJson(res, 200, {
          contract: "execution.runtime.status.v0",
          instance_id: instanceId,
          pid: process.pid,
          host: config.host,
          port: config.port,
          workspace_root: config.workspace_root,
          capabilities: runtime.capabilities.list(),
          inference_backends: runtime.inferenceBackends.list(),
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/capabilities") {
        sendJson(res, 200, {
          contract: "execution.capabilities.v0",
          capabilities: runtime.capabilities.list(),
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/inference-backends") {
        sendJson(res, 200, {
          contract: "execution.inference-backends.v0",
          inference_backends: runtime.inferenceBackends.list(),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/executions") {
        const body = (await readJson(req)) as ExecutionRun;
        if (body.max_node_runs === undefined) {
          body.max_node_runs = config.max_node_runs;
        }
        const result = await runExecutionFlow(body, runtime);
        // A syntactically valid execution request always returns the stable
        // execution.result.v0 envelope over HTTP 200. Runtime/provider/action
        // failures are represented by result.status + result.error; they are
        // not HTTP request-validation failures.
        sendJson(res, 200, result);
        return;
      }

      sendJson(res, 404, {
        error: {
          code: "NOT_FOUND",
          message: `${req.method ?? "UNKNOWN"} ${url.pathname} is not defined.`,
        },
      });
    } catch (error) {
      sendJson(res, 400, {
        error: {
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  return {
    instanceId,
    server,
    async listen(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => resolve());
      });
    },
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

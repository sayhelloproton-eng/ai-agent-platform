import {
  verifyBearerAuthorization,
} from "@ai-agent-platform/auth";
import {
  CONTRACT_VERSION,
  validateTaskRequest,
  type TaskRequest,
  type TaskResult,
} from "@ai-agent-platform/contracts";
import {
  createCapabilityPolicy,
  evaluateCapability,
  listAllowedCapabilities,
  type CapabilityPolicy,
} from "@ai-agent-platform/policy";
import {
  createServer,
  type IncomingMessage,
  type RequestListener,
  type Server,
  type ServerResponse,
} from "node:http";

import type { RuntimeClient } from "./runtime-client.js";
import {
  resolveRequestId,
  writeError,
  writeSuccess,
} from "./response.js";

const SERVICE_NAME = "action-gateway";
const PUBLIC_ROUTES = new Set(["/health", "/ready"]);
const CAPABILITIES_ROUTE = "/v1/capabilities";
const TASKS_ROUTE = "/v1/tasks";
const MAX_BODY_BYTES = 65_536;
const DEFAULT_POLICY = createCapabilityPolicy([
  "gateway.ping",
  "runtime.status",
]);

export interface GatewayOptions {
  readonly apiKey: string;
  readonly policy?: CapabilityPolicy;
  readonly runtimeClient?: RuntimeClient;
}

interface BodyReadResult {
  readonly tooLarge: boolean;
  readonly body?: string;
}

function hasJsonContentType(request: IncomingMessage): boolean {
  const value = request.headers["content-type"];
  return (
    typeof value === "string" &&
    value.split(";", 1)[0]?.trim().toLowerCase() === "application/json"
  );
}

function contentLengthExceedsLimit(request: IncomingMessage): boolean {
  const value = request.headers["content-length"];
  return (
    typeof value === "string" &&
    /^\d+$/.test(value) &&
    Number(value) > MAX_BODY_BYTES
  );
}

function readRequestBody(request: IncomingMessage): Promise<BodyReadResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    request.on("data", (chunk: Buffer | string) => {
      if (settled) {
        return;
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        settled = true;
        chunks.length = 0;
        resolve({ tooLarge: true });
        request.resume();
        return;
      }

      chunks.push(buffer);
    });

    request.on("end", () => {
      if (!settled) {
        settled = true;
        resolve({
          tooLarge: false,
          body: Buffer.concat(chunks, totalBytes).toString("utf8"),
        });
      }
    });

    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

function createRejectedResult(task: TaskRequest): TaskResult {
  const timestamp = new Date().toISOString();

  return {
    contractVersion: CONTRACT_VERSION,
    taskId: task.taskId,
    status: "rejected",
    output: null,
    error: {
      code: "FORBIDDEN",
      message: "Capability is not allowed.",
      retryable: false,
    },
    evidence: [],
    metadata: {
      startedAt: timestamp,
      completedAt: timestamp,
      durationMs: 0,
      executor: "action-gateway",
    },
  };
}

function writeTaskResult(
  response: ServerResponse,
  requestId: string,
  result: TaskResult,
): void {
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-request-id": requestId,
  });
  response.end(JSON.stringify(result));
}

export function createGatewayHandler(options: GatewayOptions): RequestListener {
  const policy = options.policy ?? DEFAULT_POLICY;
  const allowedCapabilities = listAllowedCapabilities(policy);

  return (request, response) => {
    const requestId = resolveRequestId(request);

    void (async () => {
      const pathname = new URL(
        request.url ?? "/",
        "http://action-gateway.local",
      ).pathname;

      if (
        !PUBLIC_ROUTES.has(pathname) &&
        pathname !== CAPABILITIES_ROUTE &&
        pathname !== TASKS_ROUTE
      ) {
        writeError(
          response,
          404,
          requestId,
          "NOT_FOUND",
          "Route not found.",
        );
        return;
      }

      if (pathname === CAPABILITIES_ROUTE || pathname === TASKS_ROUTE) {
        const verification = verifyBearerAuthorization(
          request.headers.authorization,
          options.apiKey,
        );

        if (!verification.ok) {
          writeError(
            response,
            401,
            requestId,
            "UNAUTHENTICATED",
            "Authentication required.",
            { "www-authenticate": "Bearer" },
          );
          return;
        }
      }

      const allowedMethod = pathname === TASKS_ROUTE ? "POST" : "GET";
      if (request.method !== allowedMethod) {
        writeError(
          response,
          405,
          requestId,
          "METHOD_NOT_ALLOWED",
          "Method not allowed.",
          { allow: allowedMethod },
        );
        return;
      }

      if (pathname === TASKS_ROUTE) {
        if (!hasJsonContentType(request)) {
          writeError(
            response,
            415,
            requestId,
            "UNSUPPORTED_MEDIA_TYPE",
            "Content-Type must be application/json.",
          );
          return;
        }

        if (contentLengthExceedsLimit(request)) {
          writeError(
            response,
            413,
            requestId,
            "PAYLOAD_TOO_LARGE",
            "Request body is too large.",
          );
          request.resume();
          return;
        }

        const bodyResult = await readRequestBody(request);
        if (bodyResult.tooLarge) {
          writeError(
            response,
            413,
            requestId,
            "PAYLOAD_TOO_LARGE",
            "Request body is too large.",
          );
          return;
        }

        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(bodyResult.body ?? "");
        } catch {
          writeError(
            response,
            400,
            requestId,
            "INVALID_TASK",
            "Task request is invalid.",
          );
          return;
        }

        const validation = validateTaskRequest(parsedBody);
        if (
          !validation.ok ||
          validation.value.requestedBy.type !== "custom-gpt"
        ) {
          writeError(
            response,
            400,
            requestId,
            "INVALID_TASK",
            "Task request is invalid.",
          );
          return;
        }

        const task: TaskRequest = {
          ...validation.value,
          metadata: {
            ...validation.value.metadata,
            requestId,
          },
        };
        const decision = evaluateCapability(policy, task.capability);

        if (!decision.allowed) {
          writeTaskResult(response, requestId, createRejectedResult(task));
          return;
        }

        if (options.runtimeClient === undefined) {
          writeError(
            response,
            502,
            requestId,
            "RUNTIME_UNAVAILABLE",
            "Local Runtime is unavailable.",
          );
          return;
        }

        const runtimeResult = await options.runtimeClient.executeTask(
          task,
          requestId,
        );

        if (runtimeResult.ok) {
          writeTaskResult(response, requestId, runtimeResult.result);
          return;
        }

        if (runtimeResult.reason === "timeout") {
          writeError(
            response,
            504,
            requestId,
            "TIMEOUT",
            "Local Runtime request timed out.",
          );
          return;
        }

        writeError(
          response,
          502,
          requestId,
          "RUNTIME_UNAVAILABLE",
          runtimeResult.reason === "invalid-response"
            ? "Local Runtime returned an invalid response."
            : "Local Runtime is unavailable.",
        );
        return;
      }

      if (pathname === CAPABILITIES_ROUTE) {
        writeSuccess(response, 200, requestId, {
          contractVersion: CONTRACT_VERSION,
          capabilities: allowedCapabilities,
        });
        return;
      }

      const timestamp = new Date().toISOString();

      if (pathname === "/health") {
        writeSuccess(response, 200, requestId, {
          service: SERVICE_NAME,
          status: "ok",
          timestamp,
        });
        return;
      }

      writeSuccess(response, 200, requestId, {
        service: SERVICE_NAME,
        status: "ready",
        contractVersion: CONTRACT_VERSION,
        capabilities: allowedCapabilities,
        timestamp,
      });
    })().catch(() => {
      if (!response.headersSent) {
        writeError(
          response,
          500,
          requestId,
          "INTERNAL_ERROR",
          "Internal server error.",
        );
      } else {
        response.end();
      }
    });
  };
}

export function createGatewayServer(options: GatewayOptions): Server {
  return createServer(createGatewayHandler(options));
}

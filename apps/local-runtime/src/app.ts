import {
  CONTRACT_VERSION,
  validateTaskRequest,
} from "@ai-agent-platform/contracts";
import {
  createServer,
  type IncomingMessage,
  type RequestListener,
  type Server,
} from "node:http";

import {
  createRuntimeExecutor,
  type RuntimeExecutorOptions,
} from "./executor.js";
import {
  resolveRequestId,
  writeError,
  writeJson,
  writeSuccess,
} from "./response.js";

const SERVICE_NAME = "local-runtime";
const TASKS_ROUTE = "/v1/tasks";
const MAX_BODY_BYTES = 65_536;
const ALLOWED_METHODS: Readonly<Record<string, string>> = Object.freeze({
  "/health": "GET",
  "/ready": "GET",
  [TASKS_ROUTE]: "POST",
});

interface BodyReadResult {
  readonly tooLarge: boolean;
  readonly body?: string;
}

function hasJsonContentType(request: IncomingMessage): boolean {
  const value = request.headers["content-type"];
  if (typeof value !== "string") {
    return false;
  }

  return value.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function contentLengthExceedsLimit(request: IncomingMessage): boolean {
  const value = request.headers["content-length"];
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return false;
  }

  return Number(value) > MAX_BODY_BYTES;
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

export type RuntimeAppOptions = RuntimeExecutorOptions;

export function createRuntimeHandler(
  options: RuntimeAppOptions = {},
): RequestListener {
  const executor = createRuntimeExecutor(options);

  return (request, response) => {
    const requestId = resolveRequestId(request);

    void (async () => {
      const pathname = new URL(
        request.url ?? "/",
        "http://local-runtime.local",
      ).pathname;
      const allowedMethod = ALLOWED_METHODS[pathname];

      if (allowedMethod === undefined) {
        writeError(
          response,
          404,
          requestId,
          "NOT_FOUND",
          "Route not found.",
        );
        return;
      }

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

      const timestamp = new Date().toISOString();
      if (pathname === "/health") {
        writeSuccess(response, requestId, {
          service: SERVICE_NAME,
          status: "ok",
          timestamp,
        });
        return;
      }

      if (pathname === "/ready") {
        writeSuccess(response, requestId, {
          service: SERVICE_NAME,
          status: "ready",
          contractVersion: CONTRACT_VERSION,
          capabilities: executor.listCapabilities(),
          timestamp,
        });
        return;
      }

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
      if (!validation.ok) {
        writeError(
          response,
          400,
          requestId,
          "INVALID_TASK",
          "Task request is invalid.",
        );
        return;
      }

      const result = await executor.execute(validation.value);
      writeJson(response, 200, requestId, result);
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

export function createRuntimeServer(
  options: RuntimeAppOptions = {},
): Server {
  return createServer(createRuntimeHandler(options));
}

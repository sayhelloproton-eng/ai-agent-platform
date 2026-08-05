import {
  verifyBearerAuthorization,
} from "@ai-agent-platform/auth";
import {
  CONTRACT_VERSION,
  validateClaimControllerTaskRequest,
  validateGetTaskDecisionContextRequest,
  validateReleaseControllerTaskRequest,
  validateSubmitControllerCommandRequest,
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
  randomUUID,
} from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type RequestListener,
  type Server,
  type ServerResponse,
} from "node:http";

import {
  createConcurrencyGate,
  type ConcurrencyGate,
} from "./concurrency.js";
import {
  ControllerTaskControlError,
  type ControllerIdentity,
  type ControllerTaskControl,
} from "./controller-task-control.js";
import {
  createFixedWindowRateLimiter,
  type RateLimiter,
} from "./rate-limit.js";
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
const RUNTIME_STATUS_ROUTE = "/v1/runtime/status";
const CONTROLLER_CONTEXT_ROUTE = "/v1/controller/task-context";
const CONTROLLER_CLAIM_ROUTE = "/v1/controller/task-claim";
const CONTROLLER_COMMAND_ROUTE = "/v1/controller/task-command";
const CONTROLLER_RELEASE_ROUTE = "/v1/controller/task-release";
const CONTROLLER_ROUTES = new Set([
  CONTROLLER_CONTEXT_ROUTE,
  CONTROLLER_CLAIM_ROUTE,
  CONTROLLER_COMMAND_ROUTE,
  CONTROLLER_RELEASE_ROUTE,
]);
const PROTECTED_ROUTES = new Set([
  CAPABILITIES_ROUTE,
  TASKS_ROUTE,
  RUNTIME_STATUS_ROUTE,
  ...CONTROLLER_ROUTES,
]);
const MAX_BODY_BYTES = 65_536;
const TASK_RATE_LIMIT_KEY = "authenticated:/v1/tasks";
const CONTROLLER_RATE_LIMIT_KEY = "authenticated:/v1/controller";
const CAPABILITIES_RATE_LIMIT_KEY = "authenticated:/v1/capabilities";
export const DEFAULT_TASK_RATE_LIMIT = 30;
export const DEFAULT_CAPABILITIES_RATE_LIMIT = 60;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_GATEWAY_MAX_CONCURRENT_TASKS = 2;
const DEFAULT_POLICY = createCapabilityPolicy([
  "gateway.ping",
  "runtime.status",
]);

export interface GatewayOptions {
  readonly apiKey: string;
  readonly policy?: CapabilityPolicy;
  readonly runtimeClient?: RuntimeClient;
  readonly taskRateLimiter?: RateLimiter;
  readonly capabilitiesRateLimiter?: RateLimiter;
  readonly concurrencyGate?: ConcurrencyGate;
  readonly controllerTaskControl?: ControllerTaskControl;
  readonly controllerIdentity?: ControllerIdentity;
  readonly auditLog?: (entry: string) => void;
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

export function discardUnreadRequestBody(request: IncomingMessage): void {
  if (!request.readableEnded && !request.destroyed) {
    request.resume();
  }
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
  const taskRateLimiter =
    options.taskRateLimiter ??
    createFixedWindowRateLimiter({
      limit: DEFAULT_TASK_RATE_LIMIT,
      windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
    });
  const capabilitiesRateLimiter =
    options.capabilitiesRateLimiter ??
    createFixedWindowRateLimiter({
      limit: DEFAULT_CAPABILITIES_RATE_LIMIT,
      windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
    });
  const concurrencyGate =
    options.concurrencyGate ??
    createConcurrencyGate(DEFAULT_GATEWAY_MAX_CONCURRENT_TASKS);

  async function forwardTask(
    taskInput: TaskRequest,
    response: ServerResponse,
    requestId: string,
  ): Promise<void> {
    const task: TaskRequest = {
      ...taskInput,
      metadata: {
        ...taskInput.metadata,
        requestId,
      },
    };
    options.auditLog?.(
      JSON.stringify({
        event: "gateway.task.accepted",
        taskId: task.taskId,
      }),
    );
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

    const release = concurrencyGate.tryAcquire();
    if (release === undefined) {
      writeError(
        response,
        503,
        requestId,
        "BUSY",
        "Gateway task capacity is full.",
        { "retry-after": "1" },
      );
      return;
    }

    let runtimeResult;
    try {
      runtimeResult = await options.runtimeClient.executeTask(
        task,
        requestId,
      );
    } catch {
      writeError(
        response,
        502,
        requestId,
        "RUNTIME_UNAVAILABLE",
        "Local Runtime is unavailable.",
      );
      return;
    } finally {
      release();
    }

    if (runtimeResult.ok) {
      writeTaskResult(response, requestId, runtimeResult.result);
      return;
    }

    if (runtimeResult.reason === "busy") {
      writeError(
        response,
        503,
        requestId,
        "RUNTIME_BUSY",
        "Local Runtime task capacity is full.",
        { "retry-after": "1" },
      );
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
  }

  return (request, response) => {
    const requestId = resolveRequestId(request);

    void (async () => {
      const pathname = new URL(
        request.url ?? "/",
        "http://action-gateway.local",
      ).pathname;

      if (!PUBLIC_ROUTES.has(pathname) && !PROTECTED_ROUTES.has(pathname)) {
        discardUnreadRequestBody(request);
        writeError(
          response,
          404,
          requestId,
          "NOT_FOUND",
          "Route not found.",
        );
        return;
      }

      if (PROTECTED_ROUTES.has(pathname)) {
        const verification = verifyBearerAuthorization(
          request.headers.authorization,
          options.apiKey,
        );

        if (!verification.ok) {
          discardUnreadRequestBody(request);
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

      const allowedMethod =
        pathname === TASKS_ROUTE ||
        pathname === RUNTIME_STATUS_ROUTE ||
        CONTROLLER_ROUTES.has(pathname)
          ? "POST"
          : "GET";
      if (request.method !== allowedMethod) {
        discardUnreadRequestBody(request);
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

      if (PROTECTED_ROUTES.has(pathname)) {
        const rateLimitDecision =
          pathname === CAPABILITIES_ROUTE
            ? capabilitiesRateLimiter.consume(CAPABILITIES_RATE_LIMIT_KEY)
            : CONTROLLER_ROUTES.has(pathname)
              ? taskRateLimiter.consume(CONTROLLER_RATE_LIMIT_KEY)
              : taskRateLimiter.consume(TASK_RATE_LIMIT_KEY);

        if (!rateLimitDecision.allowed) {
          discardUnreadRequestBody(request);
          writeError(
            response,
            429,
            requestId,
            "RATE_LIMITED",
            "Too many requests.",
            {
              "retry-after": String(rateLimitDecision.retryAfterSeconds),
            },
          );
          return;
        }
      }

      if (CONTROLLER_ROUTES.has(pathname)) {
        if (!hasJsonContentType(request)) {
          discardUnreadRequestBody(request);
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
          discardUnreadRequestBody(request);
          writeError(
            response,
            413,
            requestId,
            "PAYLOAD_TOO_LARGE",
            "Request body is too large.",
          );
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
            "CONTROLLER_INVALID_REQUEST",
            "Controller request is invalid.",
          );
          return;
        }

        const taskControl = options.controllerTaskControl;
        const identity = options.controllerIdentity;
        if (taskControl === undefined || identity === undefined) {
          writeError(
            response,
            503,
            requestId,
            "CONTROLLER_UNAVAILABLE",
            "Controller Task Control fixture is unavailable.",
          );
          return;
        }

        try {
          let result: unknown;
          if (pathname === CONTROLLER_CONTEXT_ROUTE) {
            const validation = validateGetTaskDecisionContextRequest(parsedBody);
            if (!validation.ok) {
              writeError(response, 400, requestId, "CONTROLLER_INVALID_REQUEST", "Controller request is invalid.");
              return;
            }
            result = taskControl.getDecisionContext(validation.value, identity);
          } else if (pathname === CONTROLLER_CLAIM_ROUTE) {
            const validation = validateClaimControllerTaskRequest(parsedBody);
            if (!validation.ok) {
              writeError(response, 400, requestId, "CONTROLLER_INVALID_REQUEST", "Controller request is invalid.");
              return;
            }
            result = taskControl.claimTask(validation.value, identity);
          } else if (pathname === CONTROLLER_COMMAND_ROUTE) {
            const validation = validateSubmitControllerCommandRequest(parsedBody);
            if (!validation.ok) {
              writeError(response, 400, requestId, "CONTROLLER_INVALID_REQUEST", "Controller request is invalid.");
              return;
            }
            result = taskControl.submitCommand(validation.value, identity);
          } else {
            const validation = validateReleaseControllerTaskRequest(parsedBody);
            if (!validation.ok) {
              writeError(response, 400, requestId, "CONTROLLER_INVALID_REQUEST", "Controller request is invalid.");
              return;
            }
            result = taskControl.releaseTask(validation.value, identity);
          }
          options.auditLog?.(
            JSON.stringify({
              event: "gateway.controller.accepted",
              route: pathname,
              taskId:
                typeof parsedBody === "object" &&
                parsedBody !== null &&
                "taskId" in parsedBody &&
                typeof parsedBody.taskId === "string"
                  ? parsedBody.taskId
                  : "[unknown]",
              profileId: identity.profileId,
            }),
          );
          writeSuccess(response, 200, requestId, result);
        } catch (error: unknown) {
          if (error instanceof ControllerTaskControlError) {
            writeError(
              response,
              error.httpStatus,
              requestId,
              error.code,
              error.message,
            );
            return;
          }
          throw error;
        }
        return;
      }

      if (pathname === TASKS_ROUTE) {
        if (!hasJsonContentType(request)) {
          discardUnreadRequestBody(request);
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
          discardUnreadRequestBody(request);
          writeError(
            response,
            413,
            requestId,
            "PAYLOAD_TOO_LARGE",
            "Request body is too large.",
          );
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

        await forwardTask(validation.value, response, requestId);
        return;
      }

      if (pathname === RUNTIME_STATUS_ROUTE) {
        discardUnreadRequestBody(request);
        const task: TaskRequest = {
          contractVersion: CONTRACT_VERSION,
          taskId: `custom-gpt-runtime-status-${randomUUID()}`,
          capability: "runtime.status",
          input: {},
          requestedBy: {
            type: "custom-gpt",
            subject: "custom-gpt-action",
          },
          metadata: {
            requestedAt: new Date().toISOString(),
          },
        };
        await forwardTask(task, response, requestId);
        return;
      }

      if (pathname === CAPABILITIES_ROUTE) {
        discardUnreadRequestBody(request);
        writeSuccess(response, 200, requestId, {
          contractVersion: CONTRACT_VERSION,
          capabilities: allowedCapabilities,
        });
        return;
      }

      const timestamp = new Date().toISOString();

      if (pathname === "/health") {
        discardUnreadRequestBody(request);
        writeSuccess(response, 200, requestId, {
          service: SERVICE_NAME,
          status: "ok",
          timestamp,
        });
        return;
      }

      discardUnreadRequestBody(request);
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

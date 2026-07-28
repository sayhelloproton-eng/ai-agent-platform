import {
  CAPABILITY_NAMES,
  CONTRACT_VERSION,
} from "@ai-agent-platform/contracts";
import {
  createServer,
  type RequestListener,
  type Server,
} from "node:http";

import {
  resolveRequestId,
  writeError,
  writeSuccess,
} from "./response.js";

const SERVICE_NAME = "action-gateway";
const GET_ROUTES = new Set(["/health", "/ready"]);

export function createGatewayHandler(): RequestListener {
  return (request, response) => {
    const requestId = resolveRequestId(request);

    try {
      const pathname = new URL(
        request.url ?? "/",
        "http://action-gateway.local",
      ).pathname;

      if (!GET_ROUTES.has(pathname)) {
        writeError(
          response,
          404,
          requestId,
          "NOT_FOUND",
          "Route not found.",
        );
        return;
      }

      if (request.method !== "GET") {
        writeError(
          response,
          405,
          requestId,
          "METHOD_NOT_ALLOWED",
          "Method not allowed.",
          { allow: "GET" },
        );
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
        capabilities: CAPABILITY_NAMES,
        timestamp,
      });
    } catch {
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
    }
  };
}

export function createGatewayServer(): Server {
  return createServer(createGatewayHandler());
}

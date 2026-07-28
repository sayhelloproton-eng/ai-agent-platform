import {
  verifyBearerAuthorization,
} from "@ai-agent-platform/auth";
import {
  CONTRACT_VERSION,
} from "@ai-agent-platform/contracts";
import {
  createCapabilityPolicy,
  listAllowedCapabilities,
  type CapabilityPolicy,
} from "@ai-agent-platform/policy";
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
const PUBLIC_ROUTES = new Set(["/health", "/ready"]);
const CAPABILITIES_ROUTE = "/v1/capabilities";
const DEFAULT_POLICY = createCapabilityPolicy(["gateway.ping"]);

export interface GatewayOptions {
  readonly apiKey: string;
  readonly policy?: CapabilityPolicy;
}

export function createGatewayHandler(options: GatewayOptions): RequestListener {
  const policy = options.policy ?? DEFAULT_POLICY;
  const allowedCapabilities = listAllowedCapabilities(policy);

  return (request, response) => {
    const requestId = resolveRequestId(request);

    try {
      const pathname = new URL(
        request.url ?? "/",
        "http://action-gateway.local",
      ).pathname;

      if (!PUBLIC_ROUTES.has(pathname) && pathname !== CAPABILITIES_ROUTE) {
        writeError(
          response,
          404,
          requestId,
          "NOT_FOUND",
          "Route not found.",
        );
        return;
      }

      if (pathname === CAPABILITIES_ROUTE) {
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

export function createGatewayServer(options: GatewayOptions): Server {
  return createServer(createGatewayHandler(options));
}

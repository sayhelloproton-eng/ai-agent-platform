import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { TaskResult } from "@ai-agent-platform/contracts";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export interface SuccessEnvelope<T> {
  readonly ok: true;
  readonly requestId: string;
  readonly data: T;
}

export interface ErrorEnvelope {
  readonly ok: false;
  readonly requestId: string;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export function resolveRequestId(request: IncomingMessage): string {
  const candidate = request.headers["x-request-id"];
  return typeof candidate === "string" &&
    REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}

export function writeJson(
  response: ServerResponse,
  statusCode: number,
  requestId: string,
  payload: SuccessEnvelope<unknown> | ErrorEnvelope | TaskResult,
  headers: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-request-id": requestId,
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

export function writeSuccess<T>(
  response: ServerResponse,
  requestId: string,
  data: T,
): void {
  writeJson(response, 200, requestId, {
    ok: true,
    requestId,
    data,
  });
}

export function writeError(
  response: ServerResponse,
  statusCode: number,
  requestId: string,
  code: string,
  message: string,
  headers?: Readonly<Record<string, string>>,
): void {
  writeJson(
    response,
    statusCode,
    requestId,
    {
      ok: false,
      requestId,
      error: { code, message },
    },
    headers,
  );
}

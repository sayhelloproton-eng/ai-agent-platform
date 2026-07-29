const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

const HEALTH_BODY = {
  ok: true,
  service: "ai-agent-platform-edge",
  status: "placeholder",
} as const;

export const MAX_REQUEST_BODY_BYTES = 65_536;
export const MAX_ORIGIN_RESPONSE_BYTES = 65_536;
export const MIN_API_KEY_LENGTH = 32;
export const MAX_API_KEY_LENGTH = 256;
export const MAX_REQUEST_ID_LENGTH = 128;
export const ORIGIN_TIMEOUT_MS = 5_000;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ORIGIN_TIMEOUT_SENTINEL = Symbol("origin-timeout");

export interface EdgeBindings {
  readonly EDGE_CLIENT_API_KEY?: string;
  readonly EDGE_ORIGIN_BASE_URL?: string;
  readonly EDGE_ORIGIN_API_KEY?: string;
}

type OriginFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface EdgeDependencies {
  readonly fetch?: OriginFetch;
  readonly randomUUID?: () => string;
  readonly originTimeoutMs?: number;
}

type EdgeErrorCode =
  | "EDGE_UNAUTHENTICATED"
  | "EDGE_NOT_CONFIGURED"
  | "EDGE_METHOD_NOT_ALLOWED"
  | "EDGE_NOT_FOUND"
  | "EDGE_UNSUPPORTED_MEDIA_TYPE"
  | "EDGE_REQUEST_TOO_LARGE"
  | "EDGE_BAD_REQUEST"
  | "EDGE_ORIGIN_TIMEOUT"
  | "EDGE_ORIGIN_UNAVAILABLE"
  | "EDGE_ORIGIN_INVALID_RESPONSE"
  | "EDGE_ORIGIN_RESPONSE_TOO_LARGE";

const ERROR_MESSAGES: Readonly<Record<EdgeErrorCode, string>> = {
  EDGE_UNAUTHENTICATED: "Authentication required.",
  EDGE_NOT_CONFIGURED: "Edge origin is not configured.",
  EDGE_METHOD_NOT_ALLOWED: "Method not allowed.",
  EDGE_NOT_FOUND: "Route not found.",
  EDGE_UNSUPPORTED_MEDIA_TYPE: "Content-Type must be application/json.",
  EDGE_REQUEST_TOO_LARGE: "Request body is too large.",
  EDGE_BAD_REQUEST: "Request body could not be read.",
  EDGE_ORIGIN_TIMEOUT: "Origin request timed out.",
  EDGE_ORIGIN_UNAVAILABLE: "Origin is unavailable.",
  EDGE_ORIGIN_INVALID_RESPONSE: "Origin returned an invalid response.",
  EDGE_ORIGIN_RESPONSE_TOO_LARGE: "Origin response is too large.",
};

function jsonResponse(
  body: unknown,
  status: number,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(JSON_HEADERS);
  if (headers !== undefined) {
    new Headers(headers).forEach((value, name) => {
      responseHeaders.set(name, value);
    });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function errorResponse(
  code: EdgeErrorCode,
  status: number,
  headers?: HeadersInit,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message: ERROR_MESSAGES[code],
      },
    },
    status,
    headers,
  );
}

function isValidApiKey(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_API_KEY_LENGTH &&
    value.length <= MAX_API_KEY_LENGTH &&
    !/\s/.test(value)
  );
}

async function securelyEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index]! ^ rightBytes[index]!;
  }

  return difference === 0;
}

async function isAuthenticated(
  request: Request,
  configuredKey: string | undefined,
): Promise<boolean> {
  const authorization = request.headers.get("authorization");
  if (!isValidApiKey(configuredKey) || authorization === null) {
    return false;
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (match === null || !isValidApiKey(match[1])) {
    return false;
  }

  return securelyEqual(match[1]!, configuredKey);
}

function resolveOriginBaseUrl(value: string | undefined): URL | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      (url.pathname !== "" && url.pathname !== "/") ||
      hostname === "trycloudflare.com" ||
      !hostname.endsWith(".trycloudflare.com")
    ) {
      return undefined;
    }

    return url;
  } catch {
    return undefined;
  }
}

function isJsonContentType(value: string | null): boolean {
  if (value === null) {
    return false;
  }

  return value.split(";", 1)[0]!.trim().toLowerCase() === "application/json";
}

type LimitedReadResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly reason: "too-large" | "read-failed" };

async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
): Promise<LimitedReadResult> {
  if (body === null) {
    return { ok: false, reason: "read-failed" };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }

      totalBytes += next.value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(next.value);
    }
  } catch {
    return { ok: false, reason: "read-failed" };
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    return { ok: false, reason: "read-failed" };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

function requestBodyLengthTooLarge(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) {
    return false;
  }

  return /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_REQUEST_BODY_BYTES;
}

function isValidRequestId(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(value)
  );
}

function createRequestId(
  request: Request,
  randomUUID: () => string,
): string {
  const supplied = request.headers.get("x-request-id");
  if (isValidRequestId(supplied)) {
    return supplied;
  }

  const generated = randomUUID();
  return isValidRequestId(generated) ? generated : crypto.randomUUID();
}

function safeOriginResponseHeaders(
  originHeaders: Headers,
  edgeRequestId: string,
): Headers {
  const headers = new Headers(JSON_HEADERS);
  for (const name of ["content-type", "retry-after"]) {
    const value = originHeaders.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  const originRequestId = originHeaders.get("x-request-id");
  headers.set(
    "x-request-id",
    isValidRequestId(originRequestId) ? originRequestId : edgeRequestId,
  );
  headers.set("cache-control", "no-store");
  return headers;
}

function isValidJson(bytes: Uint8Array): boolean {
  try {
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return true;
  } catch {
    return false;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

async function forwardToOrigin(
  request: Request,
  bindings: EdgeBindings,
  path: "/v1/capabilities" | "/v1/tasks",
  dependencies: EdgeDependencies,
  requestId: string,
): Promise<Response> {
  const originBaseUrl = resolveOriginBaseUrl(bindings.EDGE_ORIGIN_BASE_URL);
  const originApiKey = bindings.EDGE_ORIGIN_API_KEY;
  const clientApiKey = bindings.EDGE_CLIENT_API_KEY;
  const proxyError = (code: EdgeErrorCode, status: number): Response =>
    errorResponse(code, status, { "x-request-id": requestId });
  if (
    originBaseUrl === undefined ||
    !isValidApiKey(originApiKey) ||
    !isValidApiKey(clientApiKey) ||
    await securelyEqual(clientApiKey, originApiKey)
  ) {
    return proxyError("EDGE_NOT_CONFIGURED", 503);
  }

  let body: Uint8Array | undefined;
  if (path === "/v1/tasks") {
    if (!isJsonContentType(request.headers.get("content-type"))) {
      return proxyError("EDGE_UNSUPPORTED_MEDIA_TYPE", 415);
    }
    if (requestBodyLengthTooLarge(request)) {
      return proxyError("EDGE_REQUEST_TOO_LARGE", 413);
    }

    const bodyResult = await readLimitedBody(
      request.body,
      MAX_REQUEST_BODY_BYTES,
    );
    if (!bodyResult.ok) {
      return bodyResult.reason === "too-large"
        ? proxyError("EDGE_REQUEST_TOO_LARGE", 413)
        : proxyError("EDGE_BAD_REQUEST", 400);
    }
    body = bodyResult.bytes;
  }

  const fetchOrigin = dependencies.fetch ?? fetch;
  const headers = new Headers({
    authorization: `Bearer ${originApiKey}`,
    "x-request-id": requestId,
  });
  if (path === "/v1/tasks") {
    headers.set("content-type", request.headers.get("content-type")!);
  }

  const target = new URL(path, originBaseUrl);
  const controller = new AbortController();
  const timeoutMs = dependencies.originTimeoutMs ?? ORIGIN_TIMEOUT_MS;
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(ORIGIN_TIMEOUT_SENTINEL);
    }, timeoutMs);
  });
  const raceDeadline = <T>(operation: Promise<T>): Promise<T> =>
    Promise.race([operation, timeoutPromise]);

  try {
    let originResponse: Response;
    try {
      const originRequest: RequestInit = {
        method: request.method,
        headers,
        redirect: "error",
        signal: controller.signal,
        ...(body === undefined ? {} : { body: toArrayBuffer(body) }),
      };
      originResponse = await raceDeadline(fetchOrigin(target, originRequest));
    } catch (error) {
      return error === ORIGIN_TIMEOUT_SENTINEL
        ? proxyError("EDGE_ORIGIN_TIMEOUT", 504)
        : proxyError("EDGE_ORIGIN_UNAVAILABLE", 502);
    }

    if (originResponse.status >= 300 && originResponse.status < 400) {
      return proxyError("EDGE_ORIGIN_INVALID_RESPONSE", 502);
    }
    if (!isJsonContentType(originResponse.headers.get("content-type"))) {
      return proxyError("EDGE_ORIGIN_INVALID_RESPONSE", 502);
    }

    let responseBody: LimitedReadResult;
    try {
      responseBody = await raceDeadline(
        readLimitedBody(
          originResponse.body,
          MAX_ORIGIN_RESPONSE_BYTES,
        ),
      );
    } catch (error) {
      return error === ORIGIN_TIMEOUT_SENTINEL
        ? proxyError("EDGE_ORIGIN_TIMEOUT", 504)
        : proxyError("EDGE_ORIGIN_INVALID_RESPONSE", 502);
    }
    if (!responseBody.ok) {
      return responseBody.reason === "too-large"
        ? proxyError("EDGE_ORIGIN_RESPONSE_TOO_LARGE", 502)
        : proxyError("EDGE_ORIGIN_INVALID_RESPONSE", 502);
    }
    if (!isValidJson(responseBody.bytes)) {
      return proxyError("EDGE_ORIGIN_INVALID_RESPONSE", 502);
    }

    return new Response(toArrayBuffer(responseBody.bytes), {
      status: originResponse.status,
      headers: safeOriginResponseHeaders(originResponse.headers, requestId),
    });
  } finally {
    clearTimeout(timeout!);
  }
}

export async function handleRequest(
  request: Request,
  bindings: EdgeBindings = {},
  dependencies: EdgeDependencies = {},
): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/health") {
    return request.method === "GET"
      ? jsonResponse(HEALTH_BODY, 200)
      : errorResponse("EDGE_METHOD_NOT_ALLOWED", 405, { allow: "GET" });
  }

  const route =
    pathname === "/v1/capabilities"
      ? { method: "GET", path: "/v1/capabilities" as const }
      : pathname === "/v1/tasks"
        ? { method: "POST", path: "/v1/tasks" as const }
        : undefined;

  if (route === undefined) {
    return errorResponse("EDGE_NOT_FOUND", 404);
  }

  if (!(await isAuthenticated(request, bindings.EDGE_CLIENT_API_KEY))) {
    return errorResponse("EDGE_UNAUTHENTICATED", 401, {
      "www-authenticate": "Bearer",
    });
  }

  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID());
  const requestId = createRequestId(request, randomUUID);

  if (request.method !== route.method) {
    return errorResponse("EDGE_METHOD_NOT_ALLOWED", 405, {
      allow: route.method,
      "x-request-id": requestId,
    });
  }

  return forwardToOrigin(
    request,
    bindings,
    route.path,
    dependencies,
    requestId,
  );
}

export default {
  fetch(request: Request, bindings: EdgeBindings): Promise<Response> {
    return handleRequest(request, bindings);
  },
};

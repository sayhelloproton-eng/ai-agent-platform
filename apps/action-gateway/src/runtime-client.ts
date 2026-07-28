import { isValidApiKeyFormat } from "@ai-agent-platform/auth";
import {
  validateTaskResult,
  type TaskRequest,
  type TaskResult,
} from "@ai-agent-platform/contracts";

const DEFAULT_TIMEOUT_MS = 3_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 65_536;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export type RuntimeClientResult =
  | {
      readonly ok: true;
      readonly result: TaskResult;
    }
  | {
      readonly ok: false;
      readonly reason:
        | "timeout"
        | "unavailable"
        | "invalid-response"
        | "busy";
    };

export interface RuntimeClient {
  executeTask(
    task: TaskRequest,
    requestId: string,
  ): Promise<RuntimeClientResult>;
}

export interface HttpRuntimeClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs?: number;
}

function resolveBaseUrl(input: string): URL {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Runtime URL must be a valid Loopback HTTP URL.");
  }

  if (
    url.protocol !== "http:" ||
    !LOOPBACK_HOSTS.has(url.hostname) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.pathname !== "/" ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error("Runtime URL must be a valid Loopback HTTP URL.");
  }

  return url;
}

function resolveApiKey(input: string): string {
  if (!isValidApiKeyFormat(input)) {
    throw new Error(
      "Runtime API key must contain 32 to 256 non-whitespace characters.",
    );
  }

  return input;
}

function resolveTimeout(input: number | undefined): number {
  const timeout = input ?? DEFAULT_TIMEOUT_MS;

  if (
    !Number.isInteger(timeout) ||
    timeout < MIN_TIMEOUT_MS ||
    timeout > MAX_TIMEOUT_MS
  ) {
    throw new Error("Runtime timeout must be an integer from 100 to 30000 ms.");
  }

  return timeout;
}

async function readLimitedJson(response: Response): Promise<unknown> {
  if (response.body === null) {
    throw new Error("Runtime response body is missing.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }

      totalBytes += chunk.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Runtime response body is too large.");
      }

      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createHttpRuntimeClient(
  options: HttpRuntimeClientOptions,
): RuntimeClient {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const apiKey = resolveApiKey(options.apiKey);
  const timeoutMs = resolveTimeout(options.timeoutMs);
  const tasksUrl = new URL("/v1/tasks", baseUrl);

  return {
    async executeTask(task, requestId): Promise<RuntimeClientResult> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(tasksUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "x-request-id": requestId,
          },
          body: JSON.stringify(task),
          redirect: "error",
          signal: controller.signal,
        });

        if (response.status === 503) {
          void response.body?.cancel();
          return { ok: false, reason: "busy" };
        }

        if (response.status !== 200) {
          void response.body?.cancel();
          return { ok: false, reason: "unavailable" };
        }

        let body: unknown;
        try {
          body = await readLimitedJson(response);
        } catch (error: unknown) {
          if (
            controller.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return { ok: false, reason: "timeout" };
          }

          return { ok: false, reason: "invalid-response" };
        }

        const validation = validateTaskResult(body);
        return validation.ok && validation.value.taskId === task.taskId
          ? { ok: true, result: validation.value }
          : { ok: false, reason: "invalid-response" };
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return { ok: false, reason: "timeout" };
        }

        return { ok: false, reason: "unavailable" };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

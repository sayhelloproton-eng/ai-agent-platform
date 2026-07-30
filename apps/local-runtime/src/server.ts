import { isValidApiKeyFormat } from "@ai-agent-platform/auth";
import { pathToFileURL } from "node:url";

import {
  createRuntimeServer,
  DEFAULT_RUNTIME_MAX_CONCURRENT_TASKS,
} from "./app.js";
import { createConcurrencyGate } from "./concurrency.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8790;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function resolveHost(input: string | undefined): string {
  const host = input ?? DEFAULT_HOST;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("Host must be a loopback address.");
  }

  return host;
}

function resolvePort(input: string | undefined): number {
  if (input === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(input)) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  const port = Number(input);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  return port;
}

function resolveApiKey(input: string | undefined): string {
  if (!isValidApiKeyFormat(input)) {
    throw new Error(
      "Runtime API key must contain 32 to 256 non-whitespace characters.",
    );
  }

  return input;
}

function resolveMaximumConcurrency(input: string | undefined): number {
  if (input === undefined) {
    return DEFAULT_RUNTIME_MAX_CONCURRENT_TASKS;
  }

  if (!/^\d+$/.test(input)) {
    throw new Error(
      "Runtime concurrency limit must be an integer from 1 to 16.",
    );
  }

  const limit = Number(input);
  if (!Number.isInteger(limit) || limit < 1 || limit > 16) {
    throw new Error(
      "Runtime concurrency limit must be an integer from 1 to 16.",
    );
  }

  return limit;
}

export interface LocalRuntimeConfiguration {
  readonly host: string;
  readonly port: number;
  readonly apiKey: string;
  readonly maxConcurrentTasks: number;
}

export function resolveLocalRuntimeConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): LocalRuntimeConfiguration {
  return {
    host: resolveHost(environment.LOCAL_RUNTIME_HOST),
    port: resolvePort(environment.LOCAL_RUNTIME_PORT),
    apiKey: resolveApiKey(environment.LOCAL_RUNTIME_API_KEY),
    maxConcurrentTasks: resolveMaximumConcurrency(
      environment.LOCAL_RUNTIME_MAX_CONCURRENT_TASKS,
    ),
  };
}

function startLocalRuntime(): void {
  try {
    const configuration = resolveLocalRuntimeConfiguration(process.env);
    const server = createRuntimeServer({
      apiKey: configuration.apiKey,
      auditLog: (entry) => console.log(entry),
      concurrencyGate: createConcurrencyGate(
        configuration.maxConcurrentTasks,
      ),
    });

    server.once("error", () => {
      console.error("Local Runtime failed to start.");
      process.exitCode = 1;
    });

    server.listen(configuration.port, configuration.host, () => {
      console.log(
        `Local Runtime listening on http://${configuration.host}:${configuration.port}`,
      );
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Invalid server configuration.";
    console.error(`Local Runtime failed to start: ${message}`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  startLocalRuntime();
}

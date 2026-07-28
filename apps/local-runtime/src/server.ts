import { isValidApiKeyFormat } from "@ai-agent-platform/auth";
import { pathToFileURL } from "node:url";

import { createRuntimeServer } from "./app.js";

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

export interface LocalRuntimeConfiguration {
  readonly host: string;
  readonly port: number;
  readonly apiKey: string;
}

export function resolveLocalRuntimeConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): LocalRuntimeConfiguration {
  return {
    host: resolveHost(environment.LOCAL_RUNTIME_HOST),
    port: resolvePort(environment.LOCAL_RUNTIME_PORT),
    apiKey: resolveApiKey(environment.LOCAL_RUNTIME_API_KEY),
  };
}

function startLocalRuntime(): void {
  try {
    const configuration = resolveLocalRuntimeConfiguration(process.env);
    const server = createRuntimeServer({ apiKey: configuration.apiKey });

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

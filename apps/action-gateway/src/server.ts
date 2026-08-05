import { isValidApiKeyFormat } from "@ai-agent-platform/auth";
import {
  JsonFileTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TaskControlService,
} from "@ai-agent-platform/task-control";
import { mkdir } from "node:fs/promises";
import type { Server } from "node:http";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createGatewayServer,
  DEFAULT_GATEWAY_MAX_CONCURRENT_TASKS,
} from "./app.js";
import { createConcurrencyGate } from "./concurrency.js";
import { createTaskControlControllerAdapter } from "./task-control-controller-adapter.js";
import { createHttpRuntimeClient } from "./runtime-client.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_RUNTIME_URL = "http://127.0.0.1:8790";
const DEFAULT_RUNTIME_TIMEOUT_MS = 3_000;
const DEFAULT_CONTROLLER_PROFILE_ID = "ai-agent-platform-controller";
const DEFAULT_TASK_CONTROL_STATE_PATH = ".runtime/task-control/state.json";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
export const GATEWAY_HEADERS_TIMEOUT_MS = 10_000;
export const GATEWAY_REQUEST_TIMEOUT_MS = 20_000;
export const GATEWAY_KEEP_ALIVE_TIMEOUT_MS = 5_000;
export const GATEWAY_SOCKET_TIMEOUT_MS = 20_000;

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

  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  return port;
}

function resolveApiKey(input: string | undefined): string {
  if (!isValidApiKeyFormat(input)) {
    throw new Error(
      "API key must contain 32 to 256 non-whitespace characters.",
    );
  }

  return input;
}

function resolveRuntimeTimeout(input: string | undefined): number {
  if (input === undefined) {
    return DEFAULT_RUNTIME_TIMEOUT_MS;
  }

  if (!/^\d+$/.test(input)) {
    throw new Error("Runtime timeout must be an integer from 100 to 30000 ms.");
  }

  return Number(input);
}

function resolveMaximumConcurrency(input: string | undefined): number {
  if (input === undefined) {
    return DEFAULT_GATEWAY_MAX_CONCURRENT_TASKS;
  }

  if (!/^\d+$/.test(input)) {
    throw new Error(
      "Gateway concurrency limit must be an integer from 1 to 32.",
    );
  }

  const limit = Number(input);
  if (!Number.isInteger(limit) || limit < 1 || limit > 32) {
    throw new Error(
      "Gateway concurrency limit must be an integer from 1 to 32.",
    );
  }

  return limit;
}


function resolveTaskControlStatePath(input: string | undefined): string {
  const value = input?.trim() || DEFAULT_TASK_CONTROL_STATE_PATH;
  if (value.includes("\u0000") || value.includes("\n") || value.includes("\r")) {
    throw new Error("Task Control state path contains invalid characters.");
  }
  return value;
}

function resolveControllerProfileId(input: string | undefined): string {
  const value = input ?? DEFAULT_CONTROLLER_PROFILE_ID;
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(value)) {
    throw new Error(
      "Controller profile ID must use lowercase letters, digits, dot, underscore, or hyphen.",
    );
  }
  return value;
}

export interface ActionGatewayConfiguration {
  readonly host: string;
  readonly port: number;
  readonly apiKey: string;
  readonly runtimeUrl: string;
  readonly runtimeApiKey: string;
  readonly runtimeTimeoutMs: number;
  readonly maxConcurrentTasks: number;
  readonly controllerProfileId: string;
  readonly taskControlStatePath: string;
}

export function resolveActionGatewayConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): ActionGatewayConfiguration {
  return {
    host: resolveHost(environment.ACTION_GATEWAY_HOST),
    port: resolvePort(environment.ACTION_GATEWAY_PORT),
    apiKey: resolveApiKey(environment.ACTION_GATEWAY_API_KEY),
    runtimeUrl:
      environment.ACTION_GATEWAY_RUNTIME_URL ?? DEFAULT_RUNTIME_URL,
    runtimeApiKey: resolveApiKey(
      environment.ACTION_GATEWAY_RUNTIME_API_KEY,
    ),
    runtimeTimeoutMs: resolveRuntimeTimeout(
      environment.ACTION_GATEWAY_RUNTIME_TIMEOUT_MS,
    ),
    maxConcurrentTasks: resolveMaximumConcurrency(
      environment.ACTION_GATEWAY_MAX_CONCURRENT_TASKS,
    ),
    controllerProfileId: resolveControllerProfileId(
      environment.ACTION_GATEWAY_CONTROLLER_PROFILE_ID,
    ),
    taskControlStatePath: resolveTaskControlStatePath(
      environment.ACTION_GATEWAY_TASK_CONTROL_STATE_PATH,
    ),
  };
}

export function configureGatewayServerTimeouts(server: Server): Server {
  server.headersTimeout = GATEWAY_HEADERS_TIMEOUT_MS;
  server.requestTimeout = GATEWAY_REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = GATEWAY_KEEP_ALIVE_TIMEOUT_MS;
  server.setTimeout(GATEWAY_SOCKET_TIMEOUT_MS);
  return server;
}

export async function startActionGateway(): Promise<void> {
  try {
    const configuration = resolveActionGatewayConfiguration(process.env);
    await mkdir(dirname(configuration.taskControlStatePath), { recursive: true });
    const taskControlStore = await JsonFileTaskControlStore.open(
      configuration.taskControlStatePath,
    );
    const taskControlService = new TaskControlService(
      taskControlStore,
      new SystemClock(),
      new RandomIdGenerator(),
    );
    await taskControlService.recoverAll();
    const controllerTaskControl = createTaskControlControllerAdapter(
      taskControlService,
      { projectId: "ai-agent-platform" },
    );
    const runtimeClient = createHttpRuntimeClient({
      baseUrl: configuration.runtimeUrl,
      apiKey: configuration.runtimeApiKey,
      timeoutMs: configuration.runtimeTimeoutMs,
    });
    const server = configureGatewayServerTimeouts(
      createGatewayServer({
        apiKey: configuration.apiKey,
        runtimeClient,
        auditLog: (entry) => console.log(entry),
        concurrencyGate: createConcurrencyGate(
          configuration.maxConcurrentTasks,
        ),
        controllerTaskControl,
        controllerIdentity: {
          profileId: configuration.controllerProfileId,
          roleId: "controller",
          projectIds: ["ai-agent-platform"],
        },
      }),
    );

    server.once("error", () => {
      console.error("Action Gateway failed to start.");
      process.exitCode = 1;
    });

    server.listen(configuration.port, configuration.host, () => {
      console.log(
        `Action Gateway listening on http://${configuration.host}:${configuration.port}`,
      );
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Invalid server configuration.";
    console.error(`Action Gateway failed to start: ${message}`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  void startActionGateway();
}

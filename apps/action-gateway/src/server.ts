import { isValidApiKeyFormat } from "@ai-agent-platform/auth";
import { createLocalControlProcessClient } from "@ai-agent-platform/local-control";
import {
  JsonFileTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TaskControlService,
} from "@ai-agent-platform/task-control";
import { mkdir } from "node:fs/promises";
import type { Server } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createGatewayServer,
  DEFAULT_GATEWAY_MAX_CONCURRENT_TASKS,
} from "./app.js";
import { createConcurrencyGate } from "./concurrency.js";
import { createBrowserHostServerAdapter } from "./browser-host-server-adapter.js";
import { createLocalWorkWorker } from "./local-work-worker.js";
import { createMobileWorkWorker } from "./mobile-work-worker.js";
import { createMobileInferenceAdapter } from "./mobile-inference-adapter.js";
import { Phase2IntegrationStore } from "./phase2-integration-store.js";
import { createPhase2TaskIntakeAdapter } from "./phase2-task-intake.js";
import { JsonFileControllerIdempotencySnapshotStore } from "./controller-idempotency-store.js";
import { createTaskControlControllerAdapter } from "./task-control-controller-adapter.js";
import { createHttpRuntimeClient } from "./runtime-client.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_RUNTIME_URL = "http://127.0.0.1:8790";
const DEFAULT_RUNTIME_TIMEOUT_MS = 3_000;
const DEFAULT_CONTROLLER_PROFILE_ID = "ai-agent-platform-controller";
const DEFAULT_TASK_CONTROL_STATE_PATH = ".runtime/task-control/state.json";
const DEFAULT_CONTROLLER_IDEMPOTENCY_STATE_PATH =
  ".runtime/task-control/controller-idempotency.json";
const DEFAULT_PHASE2_INTEGRATION_STATE_PATH =
  ".runtime/task-control/phase2-integration.json";
const DEFAULT_LOCAL_WORKER_POLL_MS = 1_000;
const DEFAULT_MOB_WORKER_POLL_MS = 2_000;
const DEFAULT_MOB_REASON_MAX_TOKENS = 2048;
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


function resolveStatePath(input: string | undefined, fallback: string): string {
  const value = input?.trim() || fallback;
  if (value.includes("\u0000") || value.includes("\n") || value.includes("\r")) {
    throw new Error("Gateway state path contains invalid characters.");
  }
  return value;
}


function resolveLocalWorkerPollMs(input: string | undefined): number {
  if (input === undefined) return DEFAULT_LOCAL_WORKER_POLL_MS;
  if (!/^\d+$/.test(input)) {
    throw new Error("Local Worker poll interval must be an integer from 100 to 60000 ms.");
  }
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < 100 || value > 60_000) {
    throw new Error("Local Worker poll interval must be an integer from 100 to 60000 ms.");
  }
  return value;
}

function resolveProjectRoot(input: string | undefined): string {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  return resolve(input?.trim() || defaultRoot);
}

function resolveMobBaseUrl(input: string | undefined): string | null {
  const value = input?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("MOB base URL must use http or https protocol.");
    }
    return value;
  } catch {
    throw new Error("MOB base URL must be a valid URL.");
  }
}

function resolveMobWorkerPollMs(input: string | undefined): number {
  if (input === undefined) return DEFAULT_MOB_WORKER_POLL_MS;
  if (!/^\d+$/.test(input)) {
    throw new Error("MOB Worker poll interval must be an integer from 100 to 60000 ms.");
  }
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < 100 || value > 60_000) {
    throw new Error("MOB Worker poll interval must be an integer from 100 to 60000 ms.");
  }
  return value;
}

function resolveMobReasonMaxTokens(input: string | undefined): number {
  if (input === undefined) return DEFAULT_MOB_REASON_MAX_TOKENS;
  if (!/^\d+$/.test(input)) {
    throw new Error("MOB REASON max tokens must be an integer from 1 to 32768.");
  }
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < 1 || value > 32768) {
    throw new Error("MOB REASON max tokens must be an integer from 1 to 32768.");
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
  readonly controllerIdempotencyStatePath: string;
  readonly phase2IntegrationStatePath: string;
  readonly localWorkerPollMs: number;
  readonly projectRoot: string;
  readonly mobBaseUrl: string | null;
  readonly mobWorkerPollMs: number;
  readonly mobReasonMaxTokens: number;
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
    taskControlStatePath: resolveStatePath(
      environment.ACTION_GATEWAY_TASK_CONTROL_STATE_PATH,
      DEFAULT_TASK_CONTROL_STATE_PATH,
    ),
    controllerIdempotencyStatePath: resolveStatePath(
      environment.ACTION_GATEWAY_CONTROLLER_IDEMPOTENCY_STATE_PATH,
      DEFAULT_CONTROLLER_IDEMPOTENCY_STATE_PATH,
    ),
    phase2IntegrationStatePath: resolveStatePath(
      environment.ACTION_GATEWAY_PHASE2_INTEGRATION_STATE_PATH,
      DEFAULT_PHASE2_INTEGRATION_STATE_PATH,
    ),
    localWorkerPollMs: resolveLocalWorkerPollMs(
      environment.ACTION_GATEWAY_LOCAL_WORKER_POLL_MS,
    ),
    projectRoot: resolveProjectRoot(environment.ACTION_GATEWAY_PROJECT_ROOT),
    mobBaseUrl: resolveMobBaseUrl(
      environment.ACTION_GATEWAY_MOB_BASE_URL,
    ),
    mobWorkerPollMs: resolveMobWorkerPollMs(
      environment.ACTION_GATEWAY_MOB_WORKER_POLL_MS,
    ),
    mobReasonMaxTokens: resolveMobReasonMaxTokens(
      environment.ACTION_GATEWAY_MOB_REASON_MAX_TOKENS,
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
    await Promise.all([
      mkdir(dirname(configuration.taskControlStatePath), { recursive: true }),
      mkdir(dirname(configuration.controllerIdempotencyStatePath), {
        recursive: true,
      }),
      mkdir(dirname(configuration.phase2IntegrationStatePath), {
        recursive: true,
      }),
    ]);
    const taskControlStore = await JsonFileTaskControlStore.open(
      configuration.taskControlStatePath,
    );
    const taskControlService = new TaskControlService(
      taskControlStore,
      new SystemClock(),
      new RandomIdGenerator(),
    );
    await taskControlService.recoverAll();
    const controllerIdempotencyStore =
      await JsonFileControllerIdempotencySnapshotStore.open(
        configuration.controllerIdempotencyStatePath,
      );
    const phase2IntegrationStore = await Phase2IntegrationStore.open(
      configuration.phase2IntegrationStatePath,
    );
    const controllerTaskControl = createTaskControlControllerAdapter(
      taskControlService,
      {
        projectId: "ai-agent-platform",
        idempotencyStore: controllerIdempotencyStore,
        approvalGrantRegistrar: phase2IntegrationStore,
      },
    );
    const phase2TaskIntake = createPhase2TaskIntakeAdapter(
      taskControlService,
      phase2IntegrationStore,
    );
    const browserHostServer = createBrowserHostServerAdapter(
      taskControlService,
      phase2IntegrationStore,
    );
    const localControlClient = createLocalControlProcessClient({
      executable: process.execPath,
      trustedPrefixArgs: [
        resolve(configuration.projectRoot, "packages/local-control/dist/cli.js"),
      ],
      cwd: configuration.projectRoot,
      environment: { LOCAL_PROJECT_ROOT: configuration.projectRoot },
      timeoutMs: 15_000,
    });
    const localWorkWorker = createLocalWorkWorker({
      taskControl: taskControlService,
      integrationStore: phase2IntegrationStore,
      client: localControlClient,
    });
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
        phase2TaskIntake,
        browserHostServer,
        approvalGrantRegistrar: phase2IntegrationStore,
        approvalDraftReader: phase2IntegrationStore,
      }),
    );

    let workerRunning = false;
    const workerTimer = setInterval(() => {
      if (workerRunning) return;
      workerRunning = true;
      void localWorkWorker.runOnce()
        .then((result) => {
          if (result.processed > 0 || result.failed > 0) {
            console.log(JSON.stringify({ event: "gateway.local-worker.cycle", ...result }));
          }
        })
        .catch((error: unknown) => {
          console.error(`Local Work Worker cycle failed: ${error instanceof Error ? error.message : "unknown error"}`);
        })
        .finally(() => { workerRunning = false; });
    }, configuration.localWorkerPollMs);
    workerTimer.unref();

    // Mobile Inference Worker (only when MOB endpoint is configured)
    if (configuration.mobBaseUrl !== null) {
      const mobAdapter = createMobileInferenceAdapter({
        baseUrl: configuration.mobBaseUrl,
        reasonMaxTokens: configuration.mobReasonMaxTokens,
      });
      const mobileWorkWorker = createMobileWorkWorker({
        taskControl: taskControlService,
        integrationStore: phase2IntegrationStore,
        adapter: mobAdapter,
      });

      let mobWorkerRunning = false;
      const mobWorkerTimer = setInterval(() => {
        if (mobWorkerRunning) return;
        mobWorkerRunning = true;
        void mobileWorkWorker.runOnce()
          .then((result) => {
            if (result.processed > 0 || result.failed > 0) {
              console.log(JSON.stringify({ event: "gateway.mob-worker.cycle", ...result }));
            }
          })
          .catch((error: unknown) => {
            console.error(`Mobile Work Worker cycle failed: ${error instanceof Error ? error.message : "unknown error"}`);
          })
          .finally(() => { mobWorkerRunning = false; });
      }, configuration.mobWorkerPollMs);
      mobWorkerTimer.unref();
    }

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

import fs from "node:fs";
import path from "node:path";

import { LocalControlError } from "./errors.js";
import { assertLoopbackUrl } from "./policy.js";

export interface ProjectRegistration {
  readonly projectId: string;
  readonly displayName: string;
  readonly root: string;
  readonly accessMode: "READ_ONLY_WITH_CONTROLLED_SERVICE_START";
}

export interface RuntimeRegistration {
  readonly runtimeRef: string;
  readonly runtimeType: "node_service" | "process";
  readonly projectId: string;
  readonly healthUrl: string;
}

export interface ExecutorRegistration {
  readonly executorRef: string;
  readonly executorType: "cli";
  readonly executable: string;
  readonly versionArgs: readonly string[];
  readonly supportedOperations: readonly string[];
}

export interface ServiceStartTemplate {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwdProjectId: string;
}

export interface ServiceRegistration {
  readonly serviceRef: string;
  readonly runtimeRef: string;
  readonly projectId: string;
  readonly startTemplate: ServiceStartTemplate;
  readonly startAllowed: boolean;
}

export interface LocalRegistry {
  readonly projects: ReadonlyMap<string, ProjectRegistration>;
  readonly runtimes: ReadonlyMap<string, RuntimeRegistration>;
  readonly executors: ReadonlyMap<string, ExecutorRegistration>;
  readonly services: ReadonlyMap<string, ServiceRegistration>;
}

function isRepositoryRoot(candidate: string): boolean {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(candidate, "package.json"), "utf8"),
    ) as { readonly name?: unknown };
    return packageJson.name === "ai-agent-platform";
  } catch {
    return false;
  }
}

function discoverProjectRoot(start: string): string | undefined {
  let current = path.resolve(start);
  while (true) {
    if (isRepositoryRoot(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function resolveProjectRoot(
  environment: NodeJS.ProcessEnv,
  cwd: string,
): string {
  const configured = environment.LOCAL_PROJECT_ROOT;
  const candidate =
    configured === undefined || configured.trim().length === 0
      ? discoverProjectRoot(cwd)
      : path.resolve(configured);
  if (candidate === undefined || !isRepositoryRoot(candidate)) {
    throw new LocalControlError(
      "PROJECT_NOT_REGISTERED",
      "NOT_FOUND",
      "The ai-agent-platform project root is not registered.",
      {
        recommendedAction:
          "Set LOCAL_PROJECT_ROOT to the ai-agent-platform repository root.",
      },
    );
  }
  return fs.realpathSync(candidate);
}

function readBoolean(input: string | undefined): boolean {
  return input?.trim().toLowerCase() === "true" || input === "1";
}

export function createDefaultRegistry(options: {
  readonly environment?: NodeJS.ProcessEnv;
  readonly cwd?: string;
} = {}): LocalRegistry {
  const environment = options.environment ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const projectRoot = resolveProjectRoot(environment, cwd);
  const healthUrl =
    environment.LOCAL_GATEWAY_HEALTH_URL ??
    "http://127.0.0.1:8787/health";
  assertLoopbackUrl(healthUrl);

  const projects = new Map<string, ProjectRegistration>([
    [
      "ai-agent-platform",
      {
        projectId: "ai-agent-platform",
        displayName: "ai-agent-platform",
        root: projectRoot,
        accessMode: "READ_ONLY_WITH_CONTROLLED_SERVICE_START",
      },
    ],
  ]);

  const runtimes = new Map<string, RuntimeRegistration>([
    [
      "gateway",
      {
        runtimeRef: "gateway",
        runtimeType: "node_service",
        projectId: "ai-agent-platform",
        healthUrl,
      },
    ],
  ]);

  const executors = new Map<string, ExecutorRegistration>([
    [
      "git",
      {
        executorRef: "git",
        executorType: "cli",
        executable: "git",
        versionArgs: ["--version"],
        supportedOperations: [
          "version",
          "repository_snapshot",
          "repository_file_state",
        ],
      },
    ],
    [
      "node",
      {
        executorRef: "node",
        executorType: "cli",
        executable: process.execPath,
        versionArgs: ["--version"],
        supportedOperations: ["version"],
      },
    ],
    [
      "codex",
      {
        executorRef: "codex",
        executorType: "cli",
        executable: "codex",
        versionArgs: ["--version"],
        supportedOperations: ["version", "status"],
      },
    ],
    [
      "opencode",
      {
        executorRef: "opencode",
        executorType: "cli",
        executable: "opencode",
        versionArgs: ["--version"],
        supportedOperations: ["version", "status"],
      },
    ],
  ]);

  const services = new Map<string, ServiceRegistration>([
    [
      "gateway",
      {
        serviceRef: "gateway",
        runtimeRef: "gateway",
        projectId: "ai-agent-platform",
        startTemplate: {
          executable: "npm",
          args: ["run", "local:start"],
          cwdProjectId: "ai-agent-platform",
        },
        startAllowed: readBoolean(
          environment.LOCAL_CONTROL_ALLOW_SERVICE_START,
        ),
      },
    ],
  ]);

  return { projects, runtimes, executors, services };
}

export function getProject(
  registry: LocalRegistry,
  projectId: string,
): ProjectRegistration {
  const project = registry.projects.get(projectId);
  if (project === undefined) {
    throw new LocalControlError(
      "PROJECT_NOT_REGISTERED",
      "NOT_FOUND",
      "Project is not registered.",
      { details: { project_id: projectId } },
    );
  }
  return project;
}

export function getRuntime(
  registry: LocalRegistry,
  runtimeRef: string,
): RuntimeRegistration {
  const runtime = registry.runtimes.get(runtimeRef);
  if (runtime === undefined) {
    throw new LocalControlError(
      "RESOURCE_NOT_REGISTERED",
      "NOT_FOUND",
      "Runtime is not registered.",
      { details: { runtime_ref: runtimeRef } },
    );
  }
  return runtime;
}

export function getExecutor(
  registry: LocalRegistry,
  executorRef: string,
): ExecutorRegistration {
  const executor = registry.executors.get(executorRef);
  if (executor === undefined) {
    throw new LocalControlError(
      "RESOURCE_NOT_REGISTERED",
      "NOT_FOUND",
      "Executor is not registered.",
      { details: { executor_ref: executorRef } },
    );
  }
  return executor;
}

export function getService(
  registry: LocalRegistry,
  serviceRef: string,
): ServiceRegistration {
  const service = registry.services.get(serviceRef);
  if (service === undefined) {
    throw new LocalControlError(
      "SERVICE_NOT_REGISTERED",
      "NOT_FOUND",
      "Service is not registered.",
      { details: { service_ref: serviceRef } },
    );
  }
  return service;
}

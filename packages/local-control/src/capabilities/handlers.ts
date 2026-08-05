import {
  CAPABILITY_DESCRIPTORS,
  getCapabilityDescriptor,
} from "../capability-registry.js";
import {
  LOCAL_CLI_VERSION,
  LOCAL_REQUEST_VERSION,
  LOCAL_RESULT_VERSION,
  type JsonObject,
  type LocalRequest,
  type LocalResultStatus,
} from "../contracts.js";
import { LocalControlError } from "../errors.js";
import {
  HARD_MAX_BATCH_SIZE,
  clampInteger,
} from "../policy.js";
import type { ProcessRunner } from "../process.js";
import {
  getExecutor,
  getProject,
  getRuntime,
  getService,
  type LocalRegistry,
} from "../registry.js";
import {
  readProjectFile,
  readProjectTree,
} from "../adapters/file-adapter.js";
import {
  readFileGitState,
  readRepositorySnapshot,
} from "../adapters/git-adapter.js";
import { readRuntimeStatus } from "../adapters/runtime-adapter.js";
import { readExecutorStatus } from "../adapters/executor-adapter.js";
import { ensureServiceRunning } from "../adapters/service-adapter.js";

export interface CapabilityExecution {
  readonly status: LocalResultStatus;
  readonly data: JsonObject;
  readonly warnings?: readonly string[];
  readonly truncated?: boolean;
}

export interface HandlerContext {
  readonly registry: LocalRegistry;
  readonly processRunner: ProcessRunner;
  readonly executeChild: (request: LocalRequest) => Promise<{
    readonly status: LocalResultStatus;
    readonly data: JsonObject | null;
    readonly error: JsonObject | null;
    readonly warnings: readonly string[];
    readonly truncated: boolean;
  }>;
}

function readStringParameter(
  parameters: JsonObject,
  key: string,
): string {
  const value = parameters[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      `parameters.${key} must be a non-empty string.`,
    );
  }
  return value;
}

function resolveProjectId(request: LocalRequest): string {
  const scopeProject = request.scope?.project_id;
  const parameterProject = request.parameters.project_id;
  const projectId =
    typeof parameterProject === "string"
      ? parameterProject
      : typeof scopeProject === "string"
        ? scopeProject
        : "ai-agent-platform";
  return projectId;
}

export async function executeCapability(
  request: LocalRequest,
  context: HandlerContext,
): Promise<CapabilityExecution> {
  const projectId = resolveProjectId(request);
  switch (request.capability) {
    case "local.health.read":
      return {
        status: "SUCCEEDED",
        data: {
          cli_status: "AVAILABLE",
          cli_version: LOCAL_CLI_VERSION,
          request_contract_version: LOCAL_REQUEST_VERSION,
          result_contract_version: LOCAL_RESULT_VERSION,
          registry_status: "LOADED",
          project_count: context.registry.projects.size,
          runtime_count: context.registry.runtimes.size,
          executor_count: context.registry.executors.size,
          service_count: context.registry.services.size,
          observed_at: new Date().toISOString(),
        },
      };

    case "local.capabilities.read":
      return {
        status: "SUCCEEDED",
        data: {
          capabilities: CAPABILITY_DESCRIPTORS.map((descriptor) => ({
            ...descriptor,
          })),
          observed_at: new Date().toISOString(),
        },
      };

    case "local.project.describe": {
      const project = getProject(context.registry, projectId);
      return {
        status: "SUCCEEDED",
        data: {
          project_id: project.projectId,
          display_name: project.displayName,
          resource_types: [
            "repository",
            "file",
            "runtime",
            "executor",
            "service",
          ],
          access_mode: project.accessMode,
          observed_at: new Date().toISOString(),
        },
      };
    }

    case "local.repository.snapshot.read": {
      const project = getProject(context.registry, projectId);
      const recentCommitLimit = clampInteger(
        request.parameters.recent_commit_limit,
        5,
        1,
        20,
        "parameters.recent_commit_limit",
      );
      const data = await readRepositorySnapshot(
        {
          project,
          processRunner: context.processRunner,
          timeoutMs: request.budget.timeout_ms,
          maxOutputBytes: request.budget.max_stdout_bytes,
        },
        recentCommitLimit,
      );
      return { status: "SUCCEEDED", data };
    }

    case "local.repository.tree.read": {
      const project = getProject(context.registry, projectId);
      const result = await readProjectTree(project, request.parameters);
      return {
        status: result.truncated ? "PARTIAL" : "SUCCEEDED",
        data: result.data,
        warnings: result.warnings,
        truncated: result.truncated,
      };
    }

    case "local.repository.file.read": {
      const project = getProject(context.registry, projectId);
      const result = await readProjectFile(
        project,
        request.parameters,
        request.budget.max_result_chars,
      );
      const pathValue = result.data.path;
      if (typeof pathValue !== "string") {
        throw new LocalControlError(
          "INTERNAL_ERROR",
          "INTERNAL",
          "File Adapter returned an invalid path.",
        );
      }
      const gitState = await readFileGitState(
        {
          project,
          processRunner: context.processRunner,
          timeoutMs: request.budget.timeout_ms,
          maxOutputBytes: request.budget.max_stdout_bytes,
        },
        pathValue,
      );
      return {
        status: result.truncated ? "PARTIAL" : "SUCCEEDED",
        data: { ...result.data, git_state: gitState },
        truncated: result.truncated,
      };
    }

    case "local.runtime.status.read": {
      const runtimeRef = readStringParameter(request.parameters, "runtime_ref");
      const runtime = getRuntime(context.registry, runtimeRef);
      return {
        status: "SUCCEEDED",
        data: await readRuntimeStatus(runtime, request.budget.timeout_ms),
      };
    }

    case "local.executor.status.read": {
      const executorRef = readStringParameter(
        request.parameters,
        "executor_ref",
      );
      const executor = getExecutor(context.registry, executorRef);
      const project = getProject(context.registry, projectId);
      return {
        status: "SUCCEEDED",
        data: await readExecutorStatus({
          executor,
          project,
          processRunner: context.processRunner,
          timeoutMs: request.budget.timeout_ms,
          maxOutputBytes: request.budget.max_stdout_bytes,
        }),
      };
    }

    case "local.query.batch": {
      const queries = request.parameters.queries;
      if (!Array.isArray(queries) || queries.length === 0) {
        throw new LocalControlError(
          "INVALID_REQUEST",
          "VALIDATION",
          "parameters.queries must be a non-empty array.",
        );
      }
      if (queries.length > HARD_MAX_BATCH_SIZE) {
        throw new LocalControlError(
          "BUDGET_EXCEEDED",
          "VALIDATION",
          `Batch contains more than ${HARD_MAX_BATCH_SIZE} queries.`,
        );
      }
      const results = [];
      let failed = 0;
      let partial = 0;
      for (const [index, query] of queries.entries()) {
        if (query === null || typeof query !== "object" || Array.isArray(query)) {
          throw new LocalControlError(
            "INVALID_REQUEST",
            "VALIDATION",
            `parameters.queries[${index}] must be an object.`,
          );
        }
        const record = query as Record<string, unknown>;
        const capability = record.capability;
        if (typeof capability !== "string") {
          throw new LocalControlError(
            "INVALID_REQUEST",
            "VALIDATION",
            `parameters.queries[${index}].capability is required.`,
          );
        }
        const descriptor = CAPABILITY_DESCRIPTORS.find(
          (candidate) => candidate.capability === capability,
        );
        if (descriptor === undefined || !descriptor.batch_allowed) {
          throw new LocalControlError(
            "CAPABILITY_DENIED",
            "FORBIDDEN",
            "Batch only accepts registered read-only child capabilities.",
            { details: { capability } },
          );
        }
        const parameters = record.parameters;
        if (
          parameters === null ||
          typeof parameters !== "object" ||
          Array.isArray(parameters)
        ) {
          throw new LocalControlError(
            "INVALID_REQUEST",
            "VALIDATION",
            `parameters.queries[${index}].parameters must be an object.`,
          );
        }
        const child = await context.executeChild({
          ...request,
          request_id: `${request.request_id}:${index + 1}`,
          capability: descriptor.capability,
          execution_mode: descriptor.execution_mode,
          parameters: parameters as JsonObject,
        });
        if (child.status === "FAILED") {
          failed += 1;
        } else if (child.status === "PARTIAL") {
          partial += 1;
        }
        results.push({
          capability: descriptor.capability,
          status: child.status,
          data: child.data,
          error: child.error,
          warnings: [...child.warnings],
          truncated: child.truncated,
        });
      }
      return {
        status: failed > 0 || partial > 0 ? "PARTIAL" : "SUCCEEDED",
        data: {
          results,
          summary: {
            total: results.length,
            failed,
            partial,
            succeeded: results.length - failed - partial,
          },
          observed_at: new Date().toISOString(),
        },
        truncated: partial > 0,
      };
    }

    case "local.service.ensure_running": {
      const serviceRef = readStringParameter(request.parameters, "service_ref");
      const expectedState = request.parameters.expected_state;
      if (expectedState !== undefined && expectedState !== "RUNNING") {
        throw new LocalControlError(
          "INVALID_REQUEST",
          "VALIDATION",
          "parameters.expected_state must be RUNNING when provided.",
        );
      }
      const service = getService(context.registry, serviceRef);
      const result = await ensureServiceRunning({
        registry: context.registry,
        service,
        processRunner: context.processRunner,
        timeoutMs: request.budget.timeout_ms,
      });
      return { status: result.status, data: result.data };
    }
  }

  getCapabilityDescriptor(request.capability);
  throw new LocalControlError(
    "CAPABILITY_NOT_FOUND",
    "NOT_FOUND",
    "Local Capability handler was not found.",
  );
}

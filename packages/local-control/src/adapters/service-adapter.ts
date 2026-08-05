import type { JsonObject } from "../contracts.js";
import { LocalControlError } from "../errors.js";
import type { ProcessRunner } from "../process.js";
import type {
  LocalRegistry,
  ServiceRegistration,
} from "../registry.js";
import { getProject, getRuntime } from "../registry.js";
import { readRuntimeStatus } from "./runtime-adapter.js";

export interface EnsureServiceResult {
  readonly status: "SUCCEEDED" | "ACCEPTED";
  readonly data: JsonObject;
}

export async function ensureServiceRunning(options: {
  readonly registry: LocalRegistry;
  readonly service: ServiceRegistration;
  readonly processRunner: ProcessRunner;
  readonly timeoutMs: number;
}): Promise<EnsureServiceResult> {
  const runtime = getRuntime(options.registry, options.service.runtimeRef);
  const current = await readRuntimeStatus(runtime, options.timeoutMs);
  if (current.availability === "AVAILABLE") {
    return {
      status: "SUCCEEDED",
      data: {
        service_ref: options.service.serviceRef,
        action: "ENSURE_RUNNING",
        initial_state: "RUNNING",
        result_state: "ALREADY_RUNNING",
        runtime_observation: current,
        observed_at: new Date().toISOString(),
      },
    };
  }

  if (!options.service.startAllowed) {
    throw new LocalControlError(
      "SERVICE_START_NOT_ALLOWED",
      "FORBIDDEN",
      "Registered service start is disabled by local policy.",
      {
        recommendedAction:
          "Enable the reviewed local service start policy before retrying.",
        details: { service_ref: options.service.serviceRef },
      },
    );
  }

  const project = getProject(
    options.registry,
    options.service.startTemplate.cwdProjectId,
  );
  const processRef = options.processRunner.spawnDetached(
    options.service.startTemplate.executable,
    options.service.startTemplate.args,
    { cwd: project.root },
  );
  return {
    status: "ACCEPTED",
    data: {
      service_ref: options.service.serviceRef,
      action: "ENSURE_RUNNING",
      initial_state: "STOPPED_OR_UNREACHABLE",
      result_state: "START_REQUESTED",
      process_ref: {
        pid: processRef.pid,
        started_at: processRef.startedAt,
        service_ref: options.service.serviceRef,
      },
      poll: {
        capability: "local.runtime.status.read",
        execution_mode: "SYNC",
        parameters: { runtime_ref: options.service.runtimeRef },
        not_before_ms: 1000,
      },
      observed_at: new Date().toISOString(),
    },
  };
}

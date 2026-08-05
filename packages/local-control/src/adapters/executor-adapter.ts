import type { JsonObject } from "../contracts.js";
import { LocalControlError } from "../errors.js";
import type { ProcessRunner } from "../process.js";
import type {
  ExecutorRegistration,
  ProjectRegistration,
} from "../registry.js";

function firstLine(input: string): string | null {
  const line = input.split(/\r?\n/).find((candidate) => candidate.trim().length > 0);
  return line?.trim() ?? null;
}

export async function readExecutorStatus(options: {
  readonly executor: ExecutorRegistration;
  readonly project: ProjectRegistration;
  readonly processRunner: ProcessRunner;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}): Promise<JsonObject> {
  try {
    const result = await options.processRunner.run(
      options.executor.executable,
      options.executor.versionArgs,
      {
        cwd: options.project.root,
        timeoutMs: options.timeoutMs,
        maxOutputBytes: options.maxOutputBytes,
      },
    );
    const version = firstLine(result.stdout) ?? firstLine(result.stderr);
    return {
      executor_ref: options.executor.executorRef,
      executor_type: options.executor.executorType,
      installed: true,
      available: result.exitCode === 0,
      version,
      supported_operations: [...options.executor.supportedOperations],
      health_summary:
        result.exitCode === 0
          ? "available"
          : `version command exited with code ${result.exitCode}`,
      observed_at: new Date().toISOString(),
    };
  } catch (error) {
    if (
      error instanceof LocalControlError &&
      error.code === "DEPENDENCY_NOT_AVAILABLE"
    ) {
      return {
        executor_ref: options.executor.executorRef,
        executor_type: options.executor.executorType,
        installed: false,
        available: false,
        version: null,
        supported_operations: [...options.executor.supportedOperations],
        health_summary: "not installed",
        observed_at: new Date().toISOString(),
      };
    }
    throw error;
  }
}

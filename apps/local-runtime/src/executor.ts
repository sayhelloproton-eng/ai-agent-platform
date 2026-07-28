import {
  CONTRACT_VERSION,
  type CapabilityName,
  type ContractError,
  type JsonObject,
  type TaskRequest,
  type TaskResult,
  type TaskResultStatus,
} from "@ai-agent-platform/contracts";
import {
  createCapabilityPolicy,
  evaluateCapability,
  listAllowedCapabilities,
  type CapabilityPolicy,
} from "@ai-agent-platform/policy";

import { getCapabilityHandler } from "./handlers.js";

const DEFAULT_POLICY = createCapabilityPolicy([
  "gateway.ping",
  "runtime.status",
]);

export interface RuntimeExecutorOptions {
  readonly policy?: CapabilityPolicy;
  readonly now?: () => Date;
}

export interface RuntimeExecutor {
  execute(task: TaskRequest): Promise<TaskResult>;
  listCapabilities(): readonly CapabilityName[];
}

interface ResultFields {
  readonly status: TaskResultStatus;
  readonly output: JsonObject | null;
  readonly error: ContractError | null;
}

function safeDuration(startedAt: Date, completedAt: Date): number {
  const duration = completedAt.getTime() - startedAt.getTime();
  return Number.isFinite(duration) ? Math.max(0, duration) : 0;
}

function createResult(
  task: TaskRequest,
  fields: ResultFields,
  startedAt: Date,
  completedAt: Date,
): TaskResult {
  return {
    contractVersion: CONTRACT_VERSION,
    taskId: task.taskId,
    status: fields.status,
    output: fields.output,
    error: fields.error,
    evidence: [],
    metadata: {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: safeDuration(startedAt, completedAt),
      executor: "local-runtime",
    },
  };
}

function errorResult(
  task: TaskRequest,
  status: "failed" | "rejected",
  code: ContractError["code"],
  message: string,
  startedAt: Date,
  completedAt: Date,
): TaskResult {
  return createResult(
    task,
    {
      status,
      output: null,
      error: {
        code,
        message,
        retryable: false,
      },
    },
    startedAt,
    completedAt,
  );
}

export function createRuntimeExecutor(
  options: RuntimeExecutorOptions = {},
): RuntimeExecutor {
  const policy = options.policy ?? DEFAULT_POLICY;
  const now = options.now ?? (() => new Date());
  const capabilities = listAllowedCapabilities(policy);

  return {
    async execute(task): Promise<TaskResult> {
      const startedAt = now();
      const decision = evaluateCapability(policy, task.capability);

      if (!decision.allowed) {
        return errorResult(
          task,
          "rejected",
          "FORBIDDEN",
          "Capability is not allowed.",
          startedAt,
          now(),
        );
      }

      const handler = getCapabilityHandler(decision.capability);
      if (handler === undefined) {
        return errorResult(
          task,
          "failed",
          "CAPABILITY_NOT_FOUND",
          "Capability handler was not found.",
          startedAt,
          now(),
        );
      }

      if (Object.keys(task.input).length !== 0) {
        return errorResult(
          task,
          "failed",
          "INVALID_TASK",
          "Capability input must be an empty object.",
          startedAt,
          now(),
        );
      }

      try {
        const output = await handler(task.input, { capabilities });
        return createResult(
          task,
          {
            status: "succeeded",
            output,
            error: null,
          },
          startedAt,
          now(),
        );
      } catch {
        return errorResult(
          task,
          "failed",
          "EXECUTION_FAILED",
          "Capability execution failed.",
          startedAt,
          now(),
        );
      }
    },

    listCapabilities(): readonly CapabilityName[] {
      return Object.freeze([...capabilities]);
    },
  };
}

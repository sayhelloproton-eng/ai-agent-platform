import {
  LOCAL_REQUEST_VERSION,
  executeLocalRequest,
  type ExecuteLocalRequestOptions,
  type JsonObject as LocalJsonObject,
  type LocalCapability,
} from "@ai-agent-platform/local-control";

import {
  CapabilityRegistry,
  ExecutionFlowError,
  type CapabilityDescriptor,
} from "../../execution-flow-runtime/index.js";

export interface RegisterLocalControlAdapterOptions {
  localControl?: ExecuteLocalRequestOptions;
  capabilities?: readonly LocalCapability[];
}

const EMPTY_OBJECT_SCHEMA = {
  type: "object",
  additionalProperties: true,
} as const;

function descriptor(capability: LocalCapability): CapabilityDescriptor {
  return {
    contract: "execution.capability.v0",
    name: capability,
    description: `Local Control adapter for ${capability}.`,
    effects: "read",
    input_schema: structuredClone(EMPTY_OBJECT_SCHEMA),
  };
}

export function registerLocalControlCapabilities(
  registry: CapabilityRegistry,
  options: RegisterLocalControlAdapterOptions = {},
): CapabilityRegistry {
  const capabilities = options.capabilities ?? ["local.health.read"];

  for (const capability of capabilities) {
    registry.register(descriptor(capability), async (args, context) => {
      const result = await executeLocalRequest(
        {
          local_request_version: LOCAL_REQUEST_VERSION,
          request_id: `execution:${context.execution_id}:${context.node_id}`,
          capability,
          execution_mode: "SYNC",
          actor: {
            actor_type: "execution-flow-runtime",
            actor_id: "phase3-runtime-integration-spike",
          },
          correlation: {
            correlation_id: context.execution_id,
          },
          scope: {
            project_id: "ai-agent-platform",
          },
          parameters: structuredClone(args) as LocalJsonObject,
          budget: {
            timeout_ms: 5_000,
            max_stdout_bytes: 65_536,
            max_result_chars: 50_000,
          },
        },
        options.localControl,
      );

      if (result.status === "FAILED") {
        throw new ExecutionFlowError(
          result.error?.code ?? "LOCAL_CONTROL_FAILED",
          result.error?.message ?? `Local Control failed: ${capability}`,
          { local_result: result },
        );
      }

      return result;
    });
  }

  return registry;
}

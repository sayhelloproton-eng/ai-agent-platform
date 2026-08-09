import path from "node:path";
import { CapabilityRegistry } from "../capabilities/registry.js";
import { createFileReadCapability } from "../capabilities/file-read.js";
import { createFixedCommandCapability } from "../capabilities/fixed-command.js";
import { InferenceBackendRegistry } from "../inference/registry.js";
import { MlxHubInferenceBackend } from "../inference/mlxhub-backend.js";
import type { RuntimeConfig } from "../types.js";


function positiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export interface RuntimeEnvironment {
  capabilities: CapabilityRegistry;
  inferenceBackends: InferenceBackendRegistry;
}

export async function createRuntimeEnvironment(
  config: RuntimeConfig,
  env: NodeJS.ProcessEnv = process.env
): Promise<RuntimeEnvironment> {
  const capabilities = new CapabilityRegistry();

  const fileRead = await createFileReadCapability({
    root: config.workspace_root,
    name: "workspace.file.read",
  });
  capabilities.register(fileRead.descriptor, fileRead.handler);

  const fixedCommand = createFixedCommandCapability({
    commands: {
      "node.version": {
        executable: process.execPath,
        args: ["--version"],
        cwd: path.resolve(config.workspace_root),
      },
    },
  });
  capabilities.register(fixedCommand.descriptor, fixedCommand.handler);

  const inferenceBackends = new InferenceBackendRegistry();

  const baseUrl = env.EXECUTION_FLOW_MLXHUB_BASE_URL;
  const standardModel = env.EXECUTION_FLOW_MLXHUB_STANDARD_MODEL;
  const reasoningModel = env.EXECUTION_FLOW_MLXHUB_REASONING_MODEL;

  if (baseUrl && standardModel && reasoningModel) {
    inferenceBackends.register(
      "mlxhub",
      new MlxHubInferenceBackend({
        baseUrl,
        standardModel,
        reasoningModel,
        ...(env.EXECUTION_FLOW_MLXHUB_API_KEY
          ? { apiKey: env.EXECUTION_FLOW_MLXHUB_API_KEY }
          : {}),
        ...(positiveInt(env.EXECUTION_FLOW_MLXHUB_STANDARD_MAX_TOKENS)
          ? {
              standardMaxTokens: positiveInt(
                env.EXECUTION_FLOW_MLXHUB_STANDARD_MAX_TOKENS
              )!,
            }
          : {}),
        ...(positiveInt(env.EXECUTION_FLOW_MLXHUB_REASONING_MAX_TOKENS)
          ? {
              reasoningMaxTokens: positiveInt(
                env.EXECUTION_FLOW_MLXHUB_REASONING_MAX_TOKENS
              )!,
            }
          : {}),
      })
    );
  }

  return { capabilities, inferenceBackends };
}

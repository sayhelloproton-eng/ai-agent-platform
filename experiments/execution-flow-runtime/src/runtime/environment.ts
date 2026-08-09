import path from "node:path";
import { CapabilityRegistry } from "../capabilities/registry.js";
import { createFileReadCapability } from "../capabilities/file-read.js";
import { createFixedCommandCapability } from "../capabilities/fixed-command.js";
import { InferenceBackendRegistry } from "../inference/registry.js";
import { MlxHubInferenceBackend } from "../inference/mlxhub-backend.js";
import type { RuntimeConfig } from "../types.js";

export interface RuntimeEnvironment {
  capabilities: CapabilityRegistry;
  inferenceBackends: InferenceBackendRegistry;
}

export async function createRuntimeEnvironment(
  config: RuntimeConfig
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
  const mlxhub = config.inference?.mlxhub;

  if (mlxhub) {
    inferenceBackends.register(
      "mlxhub",
      new MlxHubInferenceBackend({
        baseUrl: mlxhub.base_url,
        fastModel: mlxhub.roles.fast.model,
        reasonModel: mlxhub.roles.reason.model,
        ...(mlxhub.timeout_ms !== undefined
          ? { timeoutMs: mlxhub.timeout_ms }
          : {}),
        ...(mlxhub.roles.fast.max_tokens !== undefined
          ? { fastMaxTokens: mlxhub.roles.fast.max_tokens }
          : {}),
        ...(mlxhub.roles.reason.max_tokens !== undefined
          ? { reasonMaxTokens: mlxhub.roles.reason.max_tokens }
          : {}),
      })
    );
  }

  return { capabilities, inferenceBackends };
}

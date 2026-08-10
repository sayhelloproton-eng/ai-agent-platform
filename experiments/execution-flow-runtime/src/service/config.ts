import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ExecutionFlowError } from "../runtime/errors.js";
import type {
  RuntimeConfig,
  RuntimeInferenceRoleConfig,
  RuntimeLock,
  RuntimeMlxHubConfig,
  RuntimeState,
} from "../types.js";

export const RUNTIME_HOME =
  process.env.EXECUTION_FLOW_RUNTIME_HOME ??
  path.join(os.homedir(), ".ai-agent-platform", "execution-flow-runtime");

export const CONFIG_PATH = path.join(RUNTIME_HOME, "config.json");
export const STATE_PATH = path.join(RUNTIME_HOME, "runtime.json");
export const LOCK_PATH = path.join(RUNTIME_HOME, "runtime.lock");
export const LOG_PATH = path.join(RUNTIME_HOME, "runtime.log");

export function defaultConfig(cwd = process.cwd()): RuntimeConfig {
  return {
    host: "127.0.0.1",
    port: 43170,
    workspace_root: path.resolve(cwd),
    max_node_runs: 16,
  };
}

function positiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${field} must be a positive integer when provided.`);
  }
  return value as number;
}

function parseRoleConfig(value: unknown, field: string): RuntimeInferenceRoleConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  const object = value as Record<string, unknown>;
  if (typeof object.model !== "string" || object.model.length === 0) {
    throw new Error(`${field}.model must be a non-empty string.`);
  }
  const maxTokens = positiveInt(object.max_tokens, `${field}.max_tokens`);
  return {
    model: object.model,
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
  };
}

function parseMlxHubConfig(value: unknown): RuntimeMlxHubConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("inference.mlxhub must be an object.");
  }
  const object = value as Record<string, unknown>;
  if (typeof object.base_url !== "string" || object.base_url.length === 0) {
    throw new Error("inference.mlxhub.base_url must be a non-empty string.");
  }
  const roles = object.roles;
  if (!roles || typeof roles !== "object" || Array.isArray(roles)) {
    throw new Error("inference.mlxhub.roles must be an object.");
  }
  const roleObject = roles as Record<string, unknown>;
  const timeoutMs = positiveInt(object.timeout_ms, "inference.mlxhub.timeout_ms");
  return {
    base_url: object.base_url.replace(/\/$/, ""),
    ...(timeoutMs !== undefined ? { timeout_ms: timeoutMs } : {}),
    roles: {
      fast: parseRoleConfig(roleObject.fast, "inference.mlxhub.roles.fast"),
      reason: parseRoleConfig(roleObject.reason, "inference.mlxhub.roles.reason"),
    },
  };
}

export function normalizeRuntimeConfig(value: unknown): RuntimeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Runtime config must be an object.");
  }
  const parsed = value as Record<string, unknown>;

  if (
    typeof parsed.host !== "string" ||
    !Number.isInteger(parsed.port) ||
    typeof parsed.workspace_root !== "string" ||
    !Number.isInteger(parsed.max_node_runs)
  ) {
    throw new Error(`Invalid runtime config: ${CONFIG_PATH}`);
  }

  const config: RuntimeConfig = {
    host: parsed.host,
    port: parsed.port as number,
    workspace_root: parsed.workspace_root,
    max_node_runs: parsed.max_node_runs as number,
  };

  if (parsed.inference !== undefined) {
    if (!parsed.inference || typeof parsed.inference !== "object" || Array.isArray(parsed.inference)) {
      throw new Error("inference must be an object when provided.");
    }
    const inference = parsed.inference as Record<string, unknown>;
    if (inference.mlxhub !== undefined) {
      config.inference = { mlxhub: parseMlxHubConfig(inference.mlxhub) };
    }
  }

  return config;
}

export async function writeConfig(config: RuntimeConfig): Promise<void> {
  const normalized = normalizeRuntimeConfig(config);
  await fs.mkdir(RUNTIME_HOME, { recursive: true });
  const temp = `${CONFIG_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(normalized, null, 2) + "\n", "utf8");
  await fs.rename(temp, CONFIG_PATH);
}


export async function loadConfig(): Promise<RuntimeConfig> {
  const content = await fs.readFile(CONFIG_PATH, "utf8");
  return normalizeRuntimeConfig(JSON.parse(content));
}

export async function readState(): Promise<RuntimeState | undefined> {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, "utf8")) as RuntimeState;
  } catch {
    return undefined;
  }
}

export async function writeState(state: RuntimeState): Promise<void> {
  await fs.mkdir(RUNTIME_HOME, { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

export async function removeState(): Promise<void> {
  await fs.rm(STATE_PATH, { force: true });
}

export async function removeStateIfOwned(
  instanceId: string,
  pid: number
): Promise<boolean> {
  const current = await readState();
  if (!current) return true;
  if (current.instance_id !== instanceId || current.pid !== pid) return false;
  await removeState();
  return true;
}

export async function readRuntimeLock(): Promise<RuntimeLock | undefined> {
  try {
    return JSON.parse(await fs.readFile(LOCK_PATH, "utf8")) as RuntimeLock;
  } catch {
    return undefined;
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireRuntimeLock(lock: RuntimeLock): Promise<void> {
  await fs.mkdir(RUNTIME_HOME, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await fs.open(LOCK_PATH, "wx");
      try {
        await handle.writeFile(JSON.stringify(lock, null, 2) + "\n");
      } finally {
        await handle.close();
      }
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") throw error;

      const existing = await readRuntimeLock();
      if (!existing) {
        throw new ExecutionFlowError(
          "SERVICE_LOCK_UNVERIFIED",
          "Execution Flow Runtime lock exists but its owner could not be verified."
        );
      }
      if (pidAlive(existing.pid)) {
        throw new ExecutionFlowError(
          "SERVICE_ALREADY_RUNNING",
          `Execution Flow Runtime lock is already held by live PID ${existing.pid} (${existing.instance_id}).`
        );
      }

      const released = await releaseRuntimeLock(existing.instance_id, existing.pid);
      if (!released) {
        throw new ExecutionFlowError(
          "SERVICE_LOCK_CHANGED",
          "Execution Flow Runtime lock changed while clearing a stale owner."
        );
      }
    }
  }

  throw new ExecutionFlowError(
    "SERVICE_LOCK_FAILED",
    "Execution Flow Runtime could not acquire its singleton lock."
  );
}

export async function releaseRuntimeLock(
  instanceId: string,
  pid: number
): Promise<boolean> {
  const current = await readRuntimeLock();
  if (!current) return true;
  if (current.instance_id !== instanceId || current.pid !== pid) return false;
  await fs.rm(LOCK_PATH, { force: true });
  return true;
}

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ExecutionFlowError } from "../runtime/errors.js";
import type { RuntimeConfig, RuntimeLock, RuntimeState } from "../types.js";

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

export async function ensureRuntimeHome(cwd = process.cwd()): Promise<RuntimeConfig> {
  await fs.mkdir(RUNTIME_HOME, { recursive: true });

  try {
    return await loadConfig();
  } catch {
    const config = defaultConfig(cwd);
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", {
      flag: "wx",
    }).catch(() => undefined);
    return await loadConfig();
  }
}

export async function loadConfig(): Promise<RuntimeConfig> {
  const content = await fs.readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<RuntimeConfig>;

  if (
    typeof parsed.host !== "string" ||
    !Number.isInteger(parsed.port) ||
    typeof parsed.workspace_root !== "string" ||
    !Number.isInteger(parsed.max_node_runs)
  ) {
    throw new Error(`Invalid runtime config: ${CONFIG_PATH}`);
  }

  return parsed as RuntimeConfig;
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

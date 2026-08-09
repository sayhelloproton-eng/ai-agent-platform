import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RuntimeConfig, RuntimeState } from "../types.js";

export const RUNTIME_HOME =
  process.env.EXECUTION_FLOW_RUNTIME_HOME ??
  path.join(os.homedir(), ".ai-agent-platform", "execution-flow-runtime");

export const CONFIG_PATH = path.join(RUNTIME_HOME, "config.json");
export const STATE_PATH = path.join(RUNTIME_HOME, "runtime.json");
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

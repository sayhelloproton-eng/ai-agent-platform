import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { getCliManifest } from "./manifest.js";
import { listDocTopics, listSpecs, readDocTopic, readSpec } from "./docs.js";
import {
  CONFIG_PATH,
  LOG_PATH,
  RUNTIME_HOME,
  STATE_PATH,
  ensureRuntimeHome,
  defaultConfig,
  loadConfig,
  readState,
  removeState,
  writeState,
} from "../service/config.js";
import { createExecutionFlowServer } from "../service/server.js";
import { createRuntimeEnvironment } from "../runtime/environment.js";
import { runExecutionFlow } from "../runtime/run-flow.js";
import { validateExecutionRun } from "../runtime/validate-flow.js";
import type { ExecutionRun } from "../types.js";

const CLI_PATH = fileURLToPath(new URL("../../cli.ts", import.meta.url));
const PACKAGE_ROOT = path.resolve(path.dirname(CLI_PATH));

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

function print(value: unknown, json = false): void {
  if (json || typeof value !== "string") {
    process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  } else {
    process.stdout.write(value.endsWith("\n") ? value : value + "\n");
  }
}

function helpText(): string {
  return [
    "@ai-agent-platform/execution-flow-runtime",
    "",
    "TypeScript source-only execution-flow runtime.",
    "",
    "Primary commands:",
    "  aap-execution-flow install",
    "  aap-execution-flow start",
    "  aap-execution-flow stop",
    "  aap-execution-flow status",
    "  aap-execution-flow doctor",
    "  aap-execution-flow run --file <execution-run.json>",
    "  aap-execution-flow validate --file <execution-run.json>",
    "  aap-execution-flow docs <topic>",
    "  aap-execution-flow spec <name>",
    "  aap-execution-flow describe --json",
    "",
    "AI entry:",
    "  aap-execution-flow describe --json",
    "  aap-execution-flow docs ai --json",
    "",
    "The CLI is intentionally self-describing. Use `describe --json` before automation.",
  ].join("\n");
}

async function fetchHealth(host: string, port: number) {
  try {
    const response = await fetch(`http://${host}:${port}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as Record<string, unknown>;
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

async function commandInstall(json: boolean): Promise<void> {
  const config = await ensureRuntimeHome();
  print(
    {
      ok: true,
      action: "runtime-home-initialized",
      package_install:
        "npm install @ai-agent-platform/execution-flow-runtime",
      runtime_home: RUNTIME_HOME,
      config_path: CONFIG_PATH,
      state_path: STATE_PATH,
      log_path: LOG_PATH,
      config,
    },
    json
  );
}

async function commandServe(): Promise<void> {
  const config = await ensureRuntimeHome();
  const instanceId =
    process.env.EXECUTION_FLOW_INSTANCE_ID ?? randomUUID();
  const service = await createExecutionFlowServer({
    config,
    instanceId,
  });

  await service.listen();
  await writeState({
    instance_id: instanceId,
    pid: process.pid,
    host: config.host,
    port: config.port,
    started_at: new Date().toISOString(),
  });

  const shutdown = async () => {
    try {
      await service.close();
    } finally {
      await removeState();
      process.exit(0);
    }
  };

  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());

  process.stdout.write(
    JSON.stringify({
      status: "running",
      instance_id: instanceId,
      pid: process.pid,
      host: config.host,
      port: config.port,
    }) + "\n"
  );
}

async function commandStart(json: boolean): Promise<void> {
  const config = await ensureRuntimeHome();
  const previous = await readState();

  if (previous && pidAlive(previous.pid)) {
    const health = await fetchHealth(previous.host, previous.port);
    if (health?.instance_id === previous.instance_id) {
      print({ ok: true, status: "already-running", state: previous }, json);
      return;
    }
  }

  await removeState();
  const instanceId = randomUUID();

  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const logFd = fsSync.openSync(LOG_PATH, "a");

  const child = spawn(
    process.execPath,
    ["--import", "tsx", CLI_PATH, "_serve"],
    {
      cwd: PACKAGE_ROOT,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: {
        ...process.env,
        EXECUTION_FLOW_INSTANCE_ID: instanceId,
      },
    }
  );

  child.unref();
  fsSync.closeSync(logFd);

  const deadline = Date.now() + 7000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const state = await readState();
    if (
      state?.instance_id === instanceId &&
      state.pid === child.pid
    ) {
      const health = await fetchHealth(state.host, state.port);
      if (health?.instance_id === instanceId) {
        print({ ok: true, status: "started", state }, json);
        return;
      }
    }
  }

  if (child.pid) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
  throw new Error(`Service did not become ready. See ${LOG_PATH}`);
}

async function commandStatus(json: boolean): Promise<void> {
  const state = await readState();
  if (!state) {
    print({ ok: true, status: "stopped" }, json);
    return;
  }

  const alive = pidAlive(state.pid);
  const health = await fetchHealth(state.host, state.port);
  const identityMatch = health?.instance_id === state.instance_id;

  print(
    {
      ok: true,
      status: alive && identityMatch ? "running" : "stale",
      pid_alive: alive,
      identity_match: identityMatch,
      state,
      health: health ?? null,
    },
    json
  );
}

async function commandStop(
  json: boolean,
  force: boolean
): Promise<void> {
  const state = await readState();
  if (!state) {
    print({ ok: true, status: "already-stopped" }, json);
    return;
  }

  const alive = pidAlive(state.pid);
  if (!alive) {
    await removeState();
    print({ ok: true, status: "stale-state-removed" }, json);
    return;
  }

  const health = await fetchHealth(state.host, state.port);
  const identityMatch = health?.instance_id === state.instance_id;

  if (!identityMatch && !force) {
    throw new Error(
      "Stored PID is alive but service identity could not be verified. Refusing to kill it. Retry with `stop --force` only after checking the PID."
    );
  }

  process.kill(state.pid, "SIGTERM");

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(state.pid)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (pidAlive(state.pid) && force) {
    process.kill(state.pid, "SIGKILL");
  }

  await removeState();
  print({ ok: true, status: "stopped", pid: state.pid }, json);
}

async function commandDoctor(json: boolean): Promise<void> {
  let config: unknown = null;
  let configError: string | null = null;

  try {
    config = await loadConfig();
  } catch (error) {
    configError = error instanceof Error ? error.message : String(error);
  }

  const mlxhub = {
    base_url: Boolean(process.env.EXECUTION_FLOW_MLXHUB_BASE_URL),
    standard_model: Boolean(
      process.env.EXECUTION_FLOW_MLXHUB_STANDARD_MODEL
    ),
    reasoning_model: Boolean(
      process.env.EXECUTION_FLOW_MLXHUB_REASONING_MODEL
    ),
  };

  const checks = {
    node_major_20: Number(process.versions.node.split(".")[0]) === 20,
    runtime_home_exists: fsSync.existsSync(RUNTIME_HOME),
    config_valid: configError === null,
    mlxhub_configured:
      mlxhub.base_url &&
      mlxhub.standard_model &&
      mlxhub.reasoning_model,
  };

  print(
    {
      ok: checks.node_major_20 && checks.config_valid,
      checks,
      config,
      config_error: configError,
      mlxhub,
    },
    json
  );
}

async function readRunFile(args: string[]): Promise<ExecutionRun> {
  const file = option(args, "--file");
  if (!file) throw new Error("--file <execution-run.json> is required.");
  return JSON.parse(await fs.readFile(path.resolve(file), "utf8")) as ExecutionRun;
}

async function commandRun(args: string[], json: boolean): Promise<void> {
  const run = await readRunFile(args);
  const config = await loadConfig().catch(() => defaultConfig());
  const runtime = await createRuntimeEnvironment(config);

  if (run.max_node_runs === undefined) {
    run.max_node_runs = config.max_node_runs;
  }

  const result = await runExecutionFlow(run, runtime);
  print(result, true || json);
  if (result.status !== "completed") process.exitCode = 2;
}

async function commandValidate(args: string[], json: boolean): Promise<void> {
  const run = await readRunFile(args);
  validateExecutionRun(run);
  print(
    {
      ok: true,
      contract: run.contract,
      execution_id: run.execution_id,
      flow_id: run.flow.flow_id,
      node_count: run.flow.nodes.length,
    },
    json
  );
}

async function commandCapabilities(json: boolean): Promise<void> {
  const config = await loadConfig().catch(() => defaultConfig());
  const runtime = await createRuntimeEnvironment(config);
  print(
    {
      contract: "execution.capabilities.v0",
      capabilities: runtime.capabilities.list(),
    },
    true || json
  );
}

async function commandProviders(json: boolean): Promise<void> {
  const config = await loadConfig().catch(() => defaultConfig());
  const runtime = await createRuntimeEnvironment(config);
  print(
    {
      contract: "execution.inference-backends.v0",
      inference_backends: runtime.inferenceBackends.list(),
    },
    true || json
  );
}

async function commandDocs(args: string[], json: boolean): Promise<void> {
  const topic = args.find((arg) => !arg.startsWith("-")) ?? "list";
  if (topic === "list") {
    print({ topics: listDocTopics() }, true || json);
    return;
  }

  const content = await readDocTopic(topic);
  print(json ? { topic, format: "markdown", content } : content, json);
}

async function commandSpec(args: string[], json: boolean): Promise<void> {
  const name = args.find((arg) => !arg.startsWith("-")) ?? "list";
  if (name === "list") {
    print({ specs: listSpecs() }, true || json);
    return;
  }

  const schema = await readSpec(name);
  print(json ? { name, schema } : schema, true);
}

export async function main(argv: string[]): Promise<void> {
  const [command = "help", ...args] = argv;
  const json = hasFlag(args, "--json");

  try {
    if (command === "help" || command === "--help" || command === "-h") {
      print(helpText(), false);
      return;
    }

    if (command === "describe") {
      print(getCliManifest(), true);
      return;
    }

    if (command === "install") {
      await commandInstall(json);
      return;
    }

    if (command === "serve" || command === "_serve") {
      await commandServe();
      return;
    }

    if (command === "start") {
      await commandStart(json);
      return;
    }

    if (command === "status") {
      await commandStatus(json);
      return;
    }

    if (command === "stop") {
      await commandStop(json, hasFlag(args, "--force"));
      return;
    }

    if (command === "restart") {
      await commandStop(json, hasFlag(args, "--force"));
      await commandStart(json);
      return;
    }

    if (command === "doctor") {
      await commandDoctor(json);
      return;
    }

    if (command === "run") {
      await commandRun(args, json);
      return;
    }

    if (command === "validate") {
      await commandValidate(args, json);
      return;
    }

    if (command === "capabilities") {
      await commandCapabilities(json);
      return;
    }

    if (command === "providers") {
      await commandProviders(json);
      return;
    }

    if (command === "docs") {
      await commandDocs(args, json);
      return;
    }

    if (command === "spec") {
      await commandSpec(args, json);
      return;
    }

    throw new Error(
      `Unknown command: ${command}. Run \`aap-execution-flow help\` or \`aap-execution-flow describe --json\`.`
    );
  } catch (error) {
    const payload = {
      ok: false,
      error: {
        code: "CLI_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    };

    if (json) {
      print(payload, true);
    } else {
      process.stderr.write(`ERROR: ${payload.error.message}\n`);
    }
    process.exitCode = 1;
  }
}

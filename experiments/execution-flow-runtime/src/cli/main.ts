import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { getCliManifest } from "./manifest.js";
import { getDeploymentRequirements } from "../deployment/requirements.js";
import { listDocTopics, listSpecs, readDocTopic, readSpec } from "./docs.js";
import {
  CONFIG_PATH,
  LOCK_PATH,
  LOG_PATH,
  RUNTIME_HOME,
  STATE_PATH,
  loadConfig,
  readRuntimeLock,
  readState,
  removeStateIfOwned,
  acquireRuntimeLock,
  releaseRuntimeLock,
  writeState,
  writeConfig,
} from "../service/config.js";
import { createExecutionFlowServer } from "../service/server.js";
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
    "  aap-execution-flow deployment requirements --json",
    "  aap-execution-flow start",
    "  aap-execution-flow stop",
    "  aap-execution-flow restart",
    "  aap-execution-flow status",
    "  aap-execution-flow doctor",
    "  aap-execution-flow config show [--json]",
    "  aap-execution-flow config mlxhub set --base-url <url> --fast-model <id> --reason-model <id>",
    "  aap-execution-flow config mlxhub clear",
    "  aap-execution-flow run --file <execution-run.json>",
    "  aap-execution-flow validate --file <execution-run.json>",
    "  aap-execution-flow docs <topic>",
    "  aap-execution-flow spec <name>",
    "  aap-execution-flow describe --json",
    "",
    "Platform deployment discovery:",
    "  aap-execution-flow deployment requirements --json",
    "  This command is read-only. A platform Deployment Planner aggregates all module descriptors.",
    "",
    "AI runtime discovery:",
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

async function requireRunningState() {
  const state = await readState();
  if (!state) {
    throw new Error("Execution Flow Runtime is not running. Start it with `aap-execution-flow start`.");
  }
  const health = await fetchHealth(state.host, state.port);
  if (health?.instance_id !== state.instance_id) {
    throw new Error("Execution Flow Runtime state exists but the managed service identity is not verified.");
  }
  return state;
}

async function requestManagedService(
  pathname: string,
  init?: RequestInit
): Promise<{ status: number; body: unknown }> {
  const state = await requireRunningState();
  const response = await fetch(`http://${state.host}:${state.port}${pathname}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(130_000),
  });
  const body = await response.json().catch(() => undefined);
  return { status: response.status, body };
}

function positiveOption(args: string[], name: string): number | undefined {
  const raw = option(args, name);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

async function commandDeployment(args: string[], json: boolean): Promise<void> {
  const action = args.find((arg) => !arg.startsWith("-")) ?? "requirements";
  if (action !== "requirements") {
    throw new Error(
      "Usage: aap-execution-flow deployment requirements [--json]"
    );
  }
  print(getDeploymentRequirements(), true || json);
}

async function commandServe(): Promise<void> {
  const config = await loadConfig().catch(() => {
    throw new Error("Execution Flow Runtime configuration is missing. Platform deployment must resolve module requirements and provision runtime config before start.");
  });
  const instanceId =
    process.env.EXECUTION_FLOW_INSTANCE_ID ?? randomUUID();
  const startedAt = new Date().toISOString();
  const lock = {
    instance_id: instanceId,
    pid: process.pid,
    host: config.host,
    port: config.port,
    started_at: startedAt,
    lock_created_at: startedAt,
  };

  await acquireRuntimeLock(lock);

  let service: Awaited<ReturnType<typeof createExecutionFlowServer>> | undefined;
  try {
    service = await createExecutionFlowServer({
      config,
      instanceId,
    });
    await service.listen();
    await writeState({
      instance_id: instanceId,
      pid: process.pid,
      host: config.host,
      port: config.port,
      started_at: startedAt,
    });
  } catch (error) {
    await releaseRuntimeLock(instanceId, process.pid);
    throw error;
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await service?.close();
    } finally {
      await removeStateIfOwned(instanceId, process.pid);
      await releaseRuntimeLock(instanceId, process.pid);
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
      singleton_scope: RUNTIME_HOME,
    }) + "\n"
  );
}

type StartResult =
  | {
      ok: true;
      status: "started";
      state: NonNullable<Awaited<ReturnType<typeof readState>>>;
    }
  | {
      ok: true;
      status: "already-running";
      state: NonNullable<Awaited<ReturnType<typeof readState>>>;
    };

async function startRuntime(): Promise<StartResult> {
  const config = await loadConfig().catch(() => {
    throw new Error("Execution Flow Runtime configuration is missing. Platform deployment must provision runtime config before start.");
  });
  const previous = await readState();

  if (previous) {
    const alive = pidAlive(previous.pid);
    if (alive) {
      const health = await fetchHealth(previous.host, previous.port);
      if (health?.instance_id === previous.instance_id) {
        return { ok: true, status: "already-running", state: previous };
      }
      throw new Error(
        `Stored PID ${previous.pid} is alive but runtime identity is not verified. Refusing to start a second service.`
      );
    }
    await removeStateIfOwned(previous.instance_id, previous.pid);
    await releaseRuntimeLock(previous.instance_id, previous.pid);
  }

  const existingLock = await readRuntimeLock();
  if (existingLock) {
    if (pidAlive(existingLock.pid)) {
      const health = await fetchHealth(existingLock.host, existingLock.port);
      if (health?.instance_id === existingLock.instance_id) {
        await writeState({
          instance_id: existingLock.instance_id,
          pid: existingLock.pid,
          host: existingLock.host,
          port: existingLock.port,
          started_at: existingLock.started_at,
        });
        const state = await readState();
        if (!state) {
          throw new Error("Runtime state was not restored from the verified singleton lock.");
        }
        return { ok: true, status: "already-running", state };
      }
      throw new Error(
        `Runtime lock belongs to live PID ${existingLock.pid}, but identity is not verified. Refusing to start a second service.`
      );
    }
    await releaseRuntimeLock(existingLock.instance_id, existingLock.pid);
  }

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
        return { ok: true, status: "started", state };
      }
    }
  }

  if (child.pid) {
    const state = await readState();
    const health = state
      ? await fetchHealth(state.host, state.port)
      : undefined;
    if (
      state?.instance_id === instanceId &&
      state.pid === child.pid &&
      health?.instance_id === instanceId
    ) {
      try {
        process.kill(child.pid, "SIGTERM");
      } catch {
        // ignore only after identity was verified
      }
    }
  }
  throw new Error(`Service did not become ready. See ${LOG_PATH}`);
}

async function commandStart(json: boolean): Promise<void> {
  print(await startRuntime(), json);
}

async function commandStatus(json: boolean): Promise<void> {
  const state = await readState();
  const lock = await readRuntimeLock();
  if (!state && !lock) {
    print({ ok: true, status: "stopped" }, json);
    return;
  }

  const observed = state ?? lock;
  if (!observed) {
    print({ ok: true, status: "stopped" }, json);
    return;
  }

  const alive = pidAlive(observed.pid);
  const health = await fetchHealth(observed.host, observed.port);
  const identityMatch = health?.instance_id === observed.instance_id;

  print(
    {
      ok: true,
      status: alive && identityMatch ? "running" : "stale",
      pid_alive: alive,
      identity_match: identityMatch,
      state: state ?? null,
      lock: lock ?? null,
      health: health ?? null,
      singleton_scope: RUNTIME_HOME,
    },
    json
  );
}

type StopResult =
  | { ok: true; status: "already-stopped" }
  | { ok: true; status: "stale-state-removed" }
  | {
      ok: true;
      status: "stale-state-removed-unverified-process-left-running";
      pid: number;
      killed: false;
      lock_preserved: boolean;
    }
  | { ok: true; status: "stopped"; pid: number };

async function stopRuntime(force: boolean): Promise<StopResult> {
  const state = await readState();
  const lock = await readRuntimeLock();

  if (
    state &&
    lock &&
    (state.instance_id !== lock.instance_id || state.pid !== lock.pid)
  ) {
    throw new Error(
      "Runtime state and singleton lock disagree. Refusing to signal any PID until identity is reconciled."
    );
  }

  const observed = state ?? lock;
  if (!observed) {
    return { ok: true, status: "already-stopped" };
  }

  const alive = pidAlive(observed.pid);
  if (!alive) {
    await removeStateIfOwned(observed.instance_id, observed.pid);
    await releaseRuntimeLock(observed.instance_id, observed.pid);
    return { ok: true, status: "stale-state-removed" };
  }

  const health = await fetchHealth(observed.host, observed.port);
  const identityMatch = health?.instance_id === observed.instance_id;

  if (!identityMatch) {
    if (force) {
      await removeStateIfOwned(observed.instance_id, observed.pid);
      return {
        ok: true,
        status: "stale-state-removed-unverified-process-left-running",
        pid: observed.pid,
        killed: false,
        lock_preserved: Boolean(lock),
      };
    }
    throw new Error(
      "Stored PID is alive but service identity could not be verified. Refusing to kill it. `stop --force` only clears stale state; it never kills an unverified PID."
    );
  }

  process.kill(observed.pid, "SIGTERM");

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(observed.pid)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (pidAlive(observed.pid)) {
    if (!force) {
      throw new Error(
        `Verified service PID ${observed.pid} did not stop within 5000 ms. State is retained. Retry with stop --force to SIGKILL this verified service.`
      );
    }
    process.kill(observed.pid, "SIGKILL");
    const killDeadline = Date.now() + 2000;
    while (Date.now() < killDeadline && pidAlive(observed.pid)) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (pidAlive(observed.pid)) {
      throw new Error(
        `Verified service PID ${observed.pid} remained alive after SIGKILL.`
      );
    }
  }

  await removeStateIfOwned(observed.instance_id, observed.pid);
  await releaseRuntimeLock(observed.instance_id, observed.pid);
  return { ok: true, status: "stopped", pid: observed.pid };
}

async function commandStop(
  json: boolean,
  force: boolean
): Promise<void> {
  print(await stopRuntime(force), json);
}

async function commandRestart(
  json: boolean,
  force: boolean
): Promise<void> {
  const previous = await stopRuntime(force);
  const current = await startRuntime();
  print(
    {
      ok: true,
      status: "restarted",
      previous,
      current,
    },
    json
  );
}

async function commandDoctor(json: boolean): Promise<void> {
  let config: Awaited<ReturnType<typeof loadConfig>> | null = null;
  let configError: string | null = null;

  try {
    config = await loadConfig();
  } catch (error) {
    configError = error instanceof Error ? error.message : String(error);
  }

  const mlxhub = config?.inference?.mlxhub;
  const checks = {
    node_major_20: Number(process.versions.node.split(".")[0]) === 20,
    runtime_home_exists: fsSync.existsSync(RUNTIME_HOME),
    config_valid: configError === null,
    mlxhub_configured: Boolean(
      mlxhub?.base_url && mlxhub.roles.fast.model && mlxhub.roles.reason.model
    ),
  };

  print(
    {
      ok: checks.node_major_20 && checks.config_valid,
      checks,
      config,
      config_error: configError,
      inference: {
        mlxhub: mlxhub
          ? {
              configured: true,
              base_url: mlxhub.base_url,
              roles: {
                fast: { model: mlxhub.roles.fast.model },
                reason: { model: mlxhub.roles.reason.model },
              },
            }
          : { configured: false },
      },
    },
    json
  );
}

async function commandConfig(args: string[], json: boolean): Promise<void> {
  const scope = args.find((arg) => !arg.startsWith("-")) ?? "show";

  if (scope === "show") {
    print(
      {
        ok: true,
        runtime_home: RUNTIME_HOME,
        config_path: CONFIG_PATH,
        config: await loadConfig(),
      },
      true || json
    );
    return;
  }

  if (scope !== "mlxhub") {
    throw new Error(
      "Usage: aap-execution-flow config [show | mlxhub set | mlxhub clear]"
    );
  }

  const mlxhubIndex = args.indexOf("mlxhub");
  const action = args.slice(mlxhubIndex + 1).find((arg) => !arg.startsWith("-"));
  if (action === "clear") {
    const config = await loadConfig();
    if (config.inference?.mlxhub) {
      const next = structuredClone(config);
      if (next.inference) {
        delete next.inference.mlxhub;
        if (Object.keys(next.inference).length === 0) delete next.inference;
      }
      await writeConfig(next);
    }
    print(
      {
        ok: true,
        action: "mlxhub-config-cleared",
        runtime_home: RUNTIME_HOME,
        config: await loadConfig(),
      },
      true || json
    );
    return;
  }

  if (action !== "set") {
    throw new Error(
      "Usage: aap-execution-flow config mlxhub set --base-url <url> --fast-model <id> --reason-model <id> [--fast-max-tokens <n>] [--reason-max-tokens <n>] [--timeout-ms <n>]"
    );
  }

  const baseUrl = option(args, "--base-url");
  const fastModel = option(args, "--fast-model");
  const reasonModel = option(args, "--reason-model");
  if (!baseUrl || !fastModel || !reasonModel) {
    throw new Error(
      "--base-url, --fast-model and --reason-model are required."
    );
  }

  const fastMaxTokens = positiveOption(args, "--fast-max-tokens");
  const reasonMaxTokens = positiveOption(args, "--reason-max-tokens");
  const timeoutMs = positiveOption(args, "--timeout-ms");
  const config = await loadConfig();
  const next = structuredClone(config);
  next.inference = {
    ...(next.inference ?? {}),
    mlxhub: {
      base_url: baseUrl,
      ...(timeoutMs !== undefined ? { timeout_ms: timeoutMs } : {}),
      roles: {
        fast: {
          model: fastModel,
          ...(fastMaxTokens !== undefined
            ? { max_tokens: fastMaxTokens }
            : { max_tokens: 1024 }),
        },
        reason: {
          model: reasonModel,
          ...(reasonMaxTokens !== undefined
            ? { max_tokens: reasonMaxTokens }
            : {}),
        },
      },
    },
  };

  await writeConfig(next);
  print(
    {
      ok: true,
      action: "mlxhub-config-updated",
      runtime_home: RUNTIME_HOME,
      config: await loadConfig(),
    },
    true || json
  );
}

async function readRunFile(args: string[]): Promise<ExecutionRun> {
  const file = option(args, "--file");
  if (!file) throw new Error("--file <execution-run.json> is required.");
  return JSON.parse(await fs.readFile(path.resolve(file), "utf8")) as ExecutionRun;
}

async function commandRun(args: string[], json: boolean): Promise<void> {
  const run = await readRunFile(args);
  const response = await requestManagedService("/v1/executions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(run),
  });
  print(response.body, true || json);
  if (response.status < 200 || response.status >= 300) process.exitCode = 2;
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
  const response = await requestManagedService("/v1/capabilities");
  if (response.status !== 200) {
    throw new Error(`Managed service returned HTTP ${response.status}.`);
  }
  print(response.body, true || json);
}

async function commandProviders(json: boolean): Promise<void> {
  const response = await requestManagedService("/v1/inference-backends");
  if (response.status !== 200) {
    throw new Error(`Managed service returned HTTP ${response.status}.`);
  }
  print(response.body, true || json);
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

    if (command === "deployment") {
      await commandDeployment(args, json);
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
      await commandRestart(json, hasFlag(args, "--force"));
      return;
    }

    if (command === "doctor") {
      await commandDoctor(json);
      return;
    }

    if (command === "config") {
      await commandConfig(args, json);
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

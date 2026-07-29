import { execFile as execFileCallback, spawn as spawnChild } from "node:child_process";
import { access, chmod, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import net from "node:net";

export const BRIDGE_STATE_FILE = "/tmp/ai-agent-platform-edge-bridge.json";
export const FIXED_WORKER_HEALTH_URL =
  "https://edge.ai-agent-platform.workers.dev/health";
export const DEFAULT_GATEWAY_PORT = 8787;
export const DEFAULT_RUNTIME_PORT = 8790;
export const NETWORK_TIMEOUT_MS = 3_000;
export const READY_TIMEOUT_MS = 10_000;
export const TUNNEL_URL_TIMEOUT_MS = 15_000;
export const MAX_NETWORK_RESPONSE_BYTES = 65_536;
export const MAX_TUNNEL_OUTPUT_BYTES = 65_536;
export const LOCAL_STACK_TERM_GRACE_MS = 5_000;
export const CHILD_TERM_GRACE_MS = 2_000;
export const KILL_CONFIRM_TIMEOUT_MS = 1_000;

const REQUIRED_ENVIRONMENT_NAMES = Object.freeze([
  "ACTION_GATEWAY_API_KEY",
  "ACTION_GATEWAY_RUNTIME_API_KEY",
  "LOCAL_RUNTIME_API_KEY",
]);
const SUPPORTED_PLATFORMS = new Set(["darwin", "linux"]);
const TUNNEL_URL_PATTERN = /https?:\/\/[^\s"'<>]+/gu;
const CLOUDFLARED_ENVIRONMENT_ALLOWLIST = Object.freeze([
  "PATH",
  "HOME",
  "TMPDIR",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
]);
const EDGE_AND_CLOUDFLARE_SECRET_NAMES = Object.freeze([
  "EDGE_CLIENT_API_KEY",
  "EDGE_ORIGIN_API_KEY",
  "EDGE_ORIGIN_BASE_URL",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_API_KEY",
  "CF_API_TOKEN",
]);

export class BridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
  }
}

function defaultExecFile(file, args) {
  return new Promise((resolve, reject) => {
    execFileCallback(
      file,
      args,
      { encoding: "utf8", timeout: 5_000, maxBuffer: 64 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function defaults(overrides = {}) {
  return {
    platform: process.platform,
    environment: process.env,
    homeDirectory: homedir(),
    pid: process.pid,
    now: () => new Date(),
    log: (message) => console.log(message),
    error: (message) => console.error(message),
    spawn: spawnChild,
    execFile: defaultExecFile,
    fetch: globalThis.fetch,
    access,
    readFile,
    writeFile,
    chmod,
    removeFile: (path) => rm(path, { force: true }),
    signalSource: process,
    processAlive: defaultProcessAlive,
    processIsBridge: defaultProcessIsBridge,
    portAvailable: defaultPortAvailable,
    ...overrides,
  };
}

export function isValidApiKey(value) {
  return (
    typeof value === "string" &&
    value.length >= 32 &&
    value.length <= 256 &&
    !/\s/u.test(value)
  );
}

export function validateBridgeKeys(environment) {
  const externalKey = environment.ACTION_GATEWAY_API_KEY;
  const gatewayRuntimeKey = environment.ACTION_GATEWAY_RUNTIME_API_KEY;
  const runtimeKey = environment.LOCAL_RUNTIME_API_KEY;

  if (!isValidApiKey(externalKey)) {
    throw new BridgeError(
      "INVALID_EXTERNAL_KEY",
      "A valid external Gateway API key is required.",
    );
  }
  if (!isValidApiKey(gatewayRuntimeKey) || !isValidApiKey(runtimeKey)) {
    throw new BridgeError(
      "INVALID_INTERNAL_KEY",
      "Valid internal Runtime API keys are required.",
    );
  }
  if (gatewayRuntimeKey !== runtimeKey) {
    throw new BridgeError(
      "INTERNAL_KEY_MISMATCH",
      "The two internal Runtime API keys must match.",
    );
  }
  if (externalKey === gatewayRuntimeKey) {
    throw new BridgeError(
      "KEY_DOMAINS_NOT_ISOLATED",
      "External and internal API keys must be different.",
    );
  }

  return { externalKey, internalKey: gatewayRuntimeKey };
}

export function resolvePort(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (!/^\d+$/u.test(value)) {
    throw new BridgeError(
      "INVALID_PORT",
      "Bridge ports must be integers from 1 to 65535.",
    );
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new BridgeError(
      "INVALID_PORT",
      "Bridge ports must be integers from 1 to 65535.",
    );
  }
  return port;
}

export function resolveSafeRuntimeUrl(environment, runtimePort) {
  const expected = new URL(`http://127.0.0.1:${runtimePort}`);
  const configured = environment.ACTION_GATEWAY_RUNTIME_URL;
  if (configured === undefined) {
    return expected.origin;
  }
  try {
    const candidate = new URL(configured);
    if (candidate.href !== expected.href) {
      throw new Error("unsafe");
    }
    return expected.origin;
  } catch {
    throw new BridgeError(
      "UNSAFE_RUNTIME_URL",
      "Gateway Runtime URL must use the controlled Loopback Runtime.",
    );
  }
}

function assertLoopbackEnvironment(environment) {
  const gatewayHost = environment.ACTION_GATEWAY_HOST ?? "127.0.0.1";
  const runtimeHost = environment.LOCAL_RUNTIME_HOST ?? "127.0.0.1";
  if (gatewayHost !== "127.0.0.1" || runtimeHost !== "127.0.0.1") {
    throw new BridgeError(
      "NON_LOOPBACK_CONFIGURATION",
      "Edge Bridge requires both services to use 127.0.0.1.",
    );
  }
}

export function validateTunnelUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const suffix = ".trycloudflare.com";
    const subdomain = hostname.endsWith(suffix)
      ? hostname.slice(0, -suffix.length)
      : "";
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== "" ||
      hostname === "trycloudflare.com" ||
      !hostname.endsWith(suffix) ||
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(subdomain)
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function extractTunnelUrl(output) {
  for (const candidate of output.match(TUNNEL_URL_PATTERN) ?? []) {
    const validated = validateTunnelUrl(candidate);
    if (validated !== undefined) {
      return validated;
    }
  }
  return undefined;
}

async function fileExists(path, dependencies) {
  try {
    await dependencies.access(path);
    return true;
  } catch {
    return false;
  }
}

function defaultProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function defaultProcessIsBridge(pid, dependencies) {
  if (!defaultProcessAlive(pid)) {
    return false;
  }
  try {
    const result = await dependencies.execFile("ps", [
      "-p",
      String(pid),
      "-o",
      "command=",
    ]);
    return /\bnode\b.*\bscripts\/edge-bridge\.mjs\b.*\brun\b/u.test(
      result.stdout,
    );
  } catch {
    return false;
  }
}

async function readBridgeState(dependencies) {
  if (!(await fileExists(BRIDGE_STATE_FILE, dependencies))) {
    return undefined;
  }
  try {
    const raw = await dependencies.readFile(BRIDGE_STATE_FILE, "utf8");
    if (Buffer.byteLength(raw, "utf8") > 4_096) {
      return { invalid: true };
    }
    const state = JSON.parse(raw);
    return { state };
  } catch {
    return { invalid: true };
  }
}

export async function ensureNoActiveState(inputDependencies = {}) {
  const dependencies = defaults(inputDependencies);
  const current = await readBridgeState(dependencies);
  if (current === undefined) {
    return;
  }

  const pid = current.state?.pid;
  const looksLikeState =
    current.invalid !== true &&
    current.state?.version === 1 &&
    current.state?.status === "running" &&
    Number.isSafeInteger(pid) &&
    pid > 1;

  if (
    looksLikeState &&
    dependencies.processAlive(pid) &&
    await dependencies.processIsBridge(pid, dependencies)
  ) {
    throw new BridgeError(
      "BRIDGE_ALREADY_RUNNING",
      "An active Edge Bridge state already exists.",
    );
  }

  await dependencies.removeFile(BRIDGE_STATE_FILE);
}

async function assertNoBridgeStateFile(dependencies) {
  if (await fileExists(BRIDGE_STATE_FILE, dependencies)) {
    throw new BridgeError(
      "BRIDGE_STATE_PRESENT",
      "An Edge Bridge state file already exists and must be reviewed.",
    );
  }
}

async function assertNoCloudflaredConfiguration(dependencies) {
  for (const name of ["config.yaml", "config.yml"]) {
    const path = join(dependencies.homeDirectory, ".cloudflared", name);
    if (await fileExists(path, dependencies)) {
      throw new BridgeError(
        "CLOUDFLARED_CONFIG_PRESENT",
        `Cloudflare configuration ${name} must be reviewed before Quick Tunnel use.`,
      );
    }
  }
}

async function assertCloudflared(dependencies) {
  try {
    const version = await dependencies.execFile("cloudflared", ["--version"]);
    if (
      typeof version.stdout !== "string" ||
      version.stdout.trim().length === 0
    ) {
      throw new BridgeError(
        "CLOUDFLARED_VERSION_UNAVAILABLE",
        "cloudflared version could not be read.",
      );
    }
    return version.stdout.trim().split(/\r?\n/u, 1)[0];
  } catch (error) {
    if (error instanceof BridgeError) {
      throw error;
    }
    if (error?.code === "ENOENT") {
      throw new BridgeError(
        "CLOUDFLARED_NOT_FOUND",
        "cloudflared is not installed or not available on PATH.",
      );
    }
    throw new BridgeError(
      "CLOUDFLARED_VERSION_UNAVAILABLE",
      "cloudflared version could not be read.",
    );
  }
}

async function assertLocalStackContract(dependencies) {
  const files = [
    "scripts/local-stack.mjs",
    "apps/action-gateway/src/server.ts",
    "apps/local-runtime/src/server.ts",
  ];
  const contents = [];
  for (const path of files) {
    if (!(await fileExists(path, dependencies))) {
      throw new BridgeError(
        "LOCAL_STACK_ENTRY_MISSING",
        "The Local Stack startup contract is unavailable.",
      );
    }
    contents.push(await dependencies.readFile(path, "utf8"));
  }

  const combined = contents.join("\n");
  if (
    !contents.every((content) =>
      content.includes('const DEFAULT_HOST = "127.0.0.1"')) ||
    !REQUIRED_ENVIRONMENT_NAMES.every((name) => combined.includes(name))
  ) {
    throw new BridgeError(
      "LOCAL_STACK_CONTRACT_CHANGED",
      "The Local Stack loopback or authentication contract has changed.",
    );
  }
}

function throwIfCancelled(signal) {
  if (signal?.aborted) {
    throw signal.reason ?? new BridgeInterrupted("cancelled");
  }
}

function cancellableDelay(milliseconds, signal) {
  throwIfCancelled(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(
        signal.reason ?? new BridgeInterrupted("cancelled"),
      );
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function readLimitedResponse(response, maximumBytes, signal) {
  if (response.body === null) {
    return new Uint8Array();
  }
  const reader = response.body.getReader();
  const onAbort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      throwIfCancelled(signal);
      const item = await reader.read();
      if (item.done) {
        break;
      }
      length += item.value.byteLength;
      if (length > maximumBytes) {
        try {
          await reader.cancel();
        } catch {
          // The size decision is already final.
        }
        throw new BridgeError(
          "NETWORK_RESPONSE_TOO_LARGE",
          "A Bridge verification response exceeded the safe limit.",
        );
      }
      chunks.push(item.value);
    }
  } catch (error) {
    if (error instanceof BridgeError) {
      throw error;
    }
    throw new BridgeError(
      "NETWORK_READ_FAILED",
      "A Bridge verification response could not be read.",
    );
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function boundedFetch(
  url,
  options = {},
  inputDependencies = {},
) {
  const dependencies = defaults(inputDependencies);
  const controller = new AbortController();
  const lifecycleSignal = options.signal ?? dependencies.lifecycleSignal;
  const timeoutMs = options.timeoutMs ?? NETWORK_TIMEOUT_MS;
  const sentinel = Symbol("network-timeout");
  const cancelled = Symbol("lifecycle-cancelled");
  let timer;
  let onLifecycleAbort;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(sentinel);
      reject(sentinel);
    }, timeoutMs);
  });
  const lifecycleCancellation = new Promise((_, reject) => {
    onLifecycleAbort = () => {
      controller.abort(
        lifecycleSignal?.reason ?? new BridgeInterrupted("cancelled"),
      );
      reject(cancelled);
    };
    if (lifecycleSignal?.aborted) {
      onLifecycleAbort();
      return;
    }
    lifecycleSignal?.addEventListener("abort", onLifecycleAbort, {
      once: true,
    });
  });
  try {
    let response;
    try {
      response = await Promise.race([
        dependencies.fetch(url, {
          method: options.method ?? "GET",
          headers: options.headers,
          redirect: "error",
          signal: controller.signal,
        }),
        timeout,
        lifecycleCancellation,
      ]);
    } catch (error) {
      if (error === cancelled) {
        throwIfCancelled(lifecycleSignal);
      }
      throw new BridgeError(
        error === sentinel ? "NETWORK_TIMEOUT" : "NETWORK_UNAVAILABLE",
        error === sentinel
          ? "A Bridge verification request timed out."
          : "A Bridge verification request failed.",
      );
    }
    const body = await Promise.race([
      readLimitedResponse(
        response,
        options.maximumBytes ?? MAX_NETWORK_RESPONSE_BYTES,
        controller.signal,
      ),
      timeout,
      lifecycleCancellation,
    ]).catch((error) => {
      if (error === cancelled) {
        throwIfCancelled(lifecycleSignal);
      }
      if (error === sentinel) {
        throw new BridgeError(
          "NETWORK_TIMEOUT",
          "A Bridge verification request timed out.",
        );
      }
      throw error;
    });
    return { response, body };
  } finally {
    clearTimeout(timer);
    lifecycleSignal?.removeEventListener("abort", onLifecycleAbort);
  }
}

async function checkFixedWorker(dependencies) {
  try {
    const { response, body } = await boundedFetch(
      FIXED_WORKER_HEALTH_URL,
      {},
      dependencies,
    );
    if (!response.ok) {
      throw new BridgeError(
        "FIXED_WORKER_UNREACHABLE",
        "The fixed Worker health endpoint is not ready.",
      );
    }
    const parsed = JSON.parse(new TextDecoder().decode(body));
    if (parsed?.service !== "ai-agent-platform-edge") {
      throw new BridgeError(
        "FIXED_WORKER_INVALID",
        "The fixed Worker health response is invalid.",
      );
    }
  } catch (error) {
    if (error instanceof BridgeInterrupted) {
      throw error;
    }
    if (
      error instanceof BridgeError &&
      error.code.startsWith("FIXED_WORKER_")
    ) {
      throw error;
    }
    throw new BridgeError(
      "FIXED_WORKER_UNREACHABLE",
      "The fixed Worker health endpoint is not reachable.",
    );
  }
}

export async function checkBridge(inputDependencies = {}, options = {}) {
  const dependencies = defaults(inputDependencies);
  if (!SUPPORTED_PLATFORMS.has(dependencies.platform)) {
    throw new BridgeError(
      "UNSUPPORTED_PLATFORM",
      "Edge Bridge is supported only on macOS and Linux.",
    );
  }

  const version = await assertCloudflared(dependencies);
  await assertLocalStackContract(dependencies);
  assertLoopbackEnvironment(dependencies.environment);
  if (!options.skipStateCheck) {
    await assertNoBridgeStateFile(dependencies);
  }
  await assertNoCloudflaredConfiguration(dependencies);
  await checkFixedWorker(dependencies);
  dependencies.log(`Edge Bridge check passed (${version}).`);
  return {
    ok: true,
    cloudflaredVersion: version,
    environmentNames: [...REQUIRED_ENVIRONMENT_NAMES],
  };
}

function defaultPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

function waitForChildExit(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({
      code: child.exitCode,
      signal: child.signalCode,
    });
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) {
        return;
      }
      settled = true;
      child.off("error", onError);
      child.off("exit", onExit);
      signal?.removeEventListener("abort", onAbort);
      if (error !== undefined) {
        reject(error);
      } else {
        resolve(result);
      }
    };
    const onError = () => {
      finish(
        new BridgeError(
          "MANAGED_PROCESS_FAILED",
          "A managed child process failed.",
        ),
      );
    };
    const onExit = (code, exitSignal) => {
      finish(undefined, { code, signal: exitSignal });
    };
    const onAbort = () => {
      finish(
        signal.reason instanceof Error
          ? signal.reason
          : new BridgeInterrupted("cancelled"),
      );
    };
    child.once("error", onError);
    child.once("exit", onExit);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function childHasExited(child) {
  return (
    child === undefined ||
    child.exitCode !== null ||
    child.signalCode !== null
  );
}

function waitForExitWithin(child, timeoutMs) {
  if (childHasExited(child)) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exited) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const onError = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function stopManagedChild(
  child,
  termGraceMs,
  dependencies,
) {
  if (
    child === undefined ||
    child.exitCode !== null ||
    child.signalCode !== null
  ) {
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    throw new BridgeError(
      "CLEANUP_FAILED",
      "A managed child process could not be stopped.",
    );
  }
  if (await waitForExitWithin(child, termGraceMs)) {
    dependencies.log("Managed child process stopped.");
    return;
  }
  try {
    child.kill("SIGKILL");
  } catch {
    throw new BridgeError(
      "CLEANUP_FAILED",
      "A managed child process could not be force-stopped.",
    );
  }
  const confirmed = await waitForExitWithin(
    child,
    dependencies.killConfirmTimeoutMs ?? KILL_CONFIRM_TIMEOUT_MS,
  );
  if (!confirmed) {
    throw new BridgeError(
      "CLEANUP_FAILED",
      "A managed child process did not exit before the cleanup deadline.",
    );
  }
  dependencies.log("Managed child process stopped.");
}

function spawnManaged(dependencies, command, args, options) {
  return dependencies.spawn(command, args, {
    cwd: process.cwd(),
    detached: false,
    ...options,
  });
}

function createCloudflaredEnvironment(environment) {
  const allowed = {};
  for (const name of CLOUDFLARED_ENVIRONMENT_ALLOWLIST) {
    if (typeof environment[name] === "string") {
      allowed[name] = environment[name];
    }
  }
  return allowed;
}

function withoutEnvironmentNames(environment, names) {
  const childEnvironment = { ...environment };
  for (const name of names) {
    delete childEnvironment[name];
  }
  return childEnvironment;
}

export function createBuildEnvironment(environment) {
  return withoutEnvironmentNames(environment, [
    ...REQUIRED_ENVIRONMENT_NAMES,
    ...EDGE_AND_CLOUDFLARE_SECRET_NAMES,
  ]);
}

export function createLocalStackEnvironment(environment, runtimeUrl) {
  return {
    ...withoutEnvironmentNames(
      environment,
      EDGE_AND_CLOUDFLARE_SECRET_NAMES,
    ),
    ACTION_GATEWAY_RUNTIME_URL: runtimeUrl,
  };
}

function startLocalStackBuild(dependencies) {
  return spawnManaged(
    dependencies,
    "npm",
    ["run", "local:build"],
    {
      env: createBuildEnvironment(dependencies.environment),
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
}

async function waitForExpectedStatus(
  url,
  expectedStatus,
  headers,
  dependencies,
) {
  const signal = dependencies.lifecycleSignal;
  const deadline =
    Date.now() + (dependencies.readyTimeoutMs ?? READY_TIMEOUT_MS);
  while (Date.now() < deadline) {
    throwIfCancelled(signal);
    try {
      const result = await boundedFetch(
        url,
        { headers, timeoutMs: 500, signal },
        dependencies,
      );
      if (result.response.status === expectedStatus) {
        return result;
      }
    } catch (error) {
      if (error instanceof BridgeInterrupted) {
        throw error;
      }
      // Readiness polling is finite and bounded.
    }
    await cancellableDelay(dependencies.pollDelayMs ?? 50, signal);
  }
  throw new BridgeError(
    "SERVICE_NOT_READY",
    "A Bridge service did not become ready in time.",
  );
}

async function verifyLocalStack(configuration, keys, dependencies) {
  await waitForExpectedStatus(
    `http://127.0.0.1:${configuration.runtimePort}/ready`,
    200,
    undefined,
    dependencies,
  );
  await waitForExpectedStatus(
    `http://127.0.0.1:${configuration.gatewayPort}/health`,
    200,
    undefined,
    dependencies,
  );
  await waitForExpectedStatus(
    `http://127.0.0.1:${configuration.gatewayPort}/v1/capabilities`,
    401,
    undefined,
    dependencies,
  );
  await waitForExpectedStatus(
    `http://127.0.0.1:${configuration.gatewayPort}/v1/capabilities`,
    200,
    { authorization: `Bearer ${keys.externalKey}` },
    dependencies,
  );
}

export function waitForTunnelUrl(child, inputDependencies = {}) {
  const dependencies = defaults(inputDependencies);
  const signal = dependencies.lifecycleSignal;
  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const finish = (error, url) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
      child.off("error", onError);
      signal?.removeEventListener("abort", onAbort);
      if (error !== undefined) {
        reject(error);
      } else {
        resolve(url);
      }
    };
    const onData = (chunk) => {
      output += chunk.toString();
      if (Buffer.byteLength(output, "utf8") > MAX_TUNNEL_OUTPUT_BYTES) {
        finish(
          new BridgeError(
            "TUNNEL_OUTPUT_TOO_LARGE",
            "cloudflared output exceeded the safe limit.",
          ),
        );
        return;
      }
      const url = extractTunnelUrl(output);
      if (url !== undefined) {
        finish(undefined, url);
      }
    };
    const onExit = () => {
      finish(
        new BridgeError(
          "TUNNEL_EXITED",
          "cloudflared exited before publishing a valid URL.",
        ),
      );
    };
    const onError = () => {
      finish(
        new BridgeError(
          "TUNNEL_START_FAILED",
          "cloudflared could not be started.",
        ),
      );
    };
    const onAbort = () => {
      finish(
        signal.reason instanceof Error
          ? signal.reason
          : new BridgeInterrupted("cancelled"),
      );
    };
    const timer = setTimeout(() => {
      finish(
        new BridgeError(
          "TUNNEL_URL_TIMEOUT",
          "A valid Quick Tunnel URL was not published in time.",
        ),
      );
    }, dependencies.tunnelUrlTimeoutMs ?? TUNNEL_URL_TIMEOUT_MS);

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("exit", onExit);
    child.once("error", onError);
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function verifyTunnel(origin, externalKey, dependencies) {
  await waitForExpectedStatus(`${origin}/health`, 200, undefined, dependencies);
  await waitForExpectedStatus(
    `${origin}/v1/capabilities`,
    401,
    undefined,
    dependencies,
  );
  await waitForExpectedStatus(
    `${origin}/v1/capabilities`,
    200,
    { authorization: `Bearer ${externalKey}` },
    dependencies,
  );
}

export function createStateRecord({
  pid,
  cloudflaredPid,
  gatewayOrigin,
  startedAt,
}) {
  return {
    version: 1,
    status: "running",
    startedAt: startedAt.toISOString(),
    pid,
    cloudflaredPid,
    gatewayOrigin,
  };
}

async function createOwnedState(record, dependencies) {
  let created = false;
  try {
    await dependencies.writeFile(
      BRIDGE_STATE_FILE,
      `${JSON.stringify(record, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    created = true;
    await dependencies.chmod(BRIDGE_STATE_FILE, 0o600);
    return { owned: true };
  } catch {
    if (created) {
      try {
        await dependencies.removeFile(BRIDGE_STATE_FILE);
      } catch {
        throw new BridgeError(
          "STATE_ROLLBACK_FAILED",
          "Bridge state creation failed and rollback was incomplete.",
        );
      }
    }
    throw new BridgeError(
      "STATE_WRITE_FAILED",
      "Bridge state could not be created safely.",
    );
  }
}

function waitForUnexpectedExit(localStack, cloudflared, signal) {
  return new Promise((_resolve, reject) => {
    const listeners = [];
    const finish = (error) => {
      for (const [child, event, listener] of listeners) {
        child.off(event, listener);
      }
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    };
    const onAbort = () => {
      finish(
        signal.reason instanceof Error
          ? signal.reason
          : new BridgeInterrupted("cancelled"),
      );
    };
    for (const [name, child] of [
      ["Local Stack", localStack],
      ["cloudflared", cloudflared],
    ]) {
      const onExit = () => {
        finish(
          new BridgeError(
            "MANAGED_PROCESS_EXITED",
            `${name} exited unexpectedly.`,
          ),
        );
      };
      const onError = () => {
        finish(
          new BridgeError(
            "MANAGED_PROCESS_FAILED",
            `${name} failed unexpectedly.`,
          ),
        );
      };
      listeners.push([child, "exit", onExit], [child, "error", onError]);
      child.once("exit", onExit);
      child.once("error", onError);
    }
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

class BridgeInterrupted extends Error {
  constructor(signal) {
    super("Bridge interrupted.");
    this.signal = signal;
  }
}

function watchInterrupts(signalSource, controller) {
  const listeners = [];
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const listener = () => {
      if (!controller.signal.aborted) {
        controller.abort(new BridgeInterrupted(signal));
      }
    };
    listeners.push([signal, listener]);
    signalSource.once(signal, listener);
  }
  return {
    dispose() {
      for (const [signal, listener] of listeners) {
        signalSource.off?.(signal, listener);
      }
    },
  };
}

export async function runBridge(inputDependencies = {}) {
  const baseDependencies = defaults(inputDependencies);
  const lifecycle = new AbortController();
  const dependencies = {
    ...baseDependencies,
    lifecycleSignal: lifecycle.signal,
  };
  const interrupts = watchInterrupts(
    dependencies.signalSource,
    lifecycle,
  );
  let buildProcess;
  let localStack;
  let cloudflared;
  let gatewayOrigin;
  let cleanupPromise;
  let stateOwned = false;
  const cleanup = () => {
    if (cleanupPromise === undefined) {
      cleanupPromise = (async () => {
        const cleanupTasks = [
          stopManagedChild(
            cloudflared,
            dependencies.childTermGraceMs ?? CHILD_TERM_GRACE_MS,
            dependencies,
          ),
          stopManagedChild(
            localStack,
            dependencies.localStackTermGraceMs ??
              LOCAL_STACK_TERM_GRACE_MS,
            dependencies,
          ),
          stopManagedChild(
            buildProcess,
            dependencies.childTermGraceMs ?? CHILD_TERM_GRACE_MS,
            dependencies,
          ),
        ];
        if (stateOwned) {
          cleanupTasks.push(
            dependencies.removeFile(BRIDGE_STATE_FILE).then(() => {
              stateOwned = false;
            }),
          );
        }
        const results = await Promise.allSettled(cleanupTasks);
        if (results.some((result) => result.status === "rejected")) {
          throw new BridgeError(
            "CLEANUP_FAILED",
            "Edge Bridge cleanup did not fully complete before its deadline.",
          );
        }
        dependencies.log("Edge Bridge cleanup complete.");
      })();
    }
    return cleanupPromise;
  };

  try {
    const keys = validateBridgeKeys(dependencies.environment);
    assertLoopbackEnvironment(dependencies.environment);
    await ensureNoActiveState(dependencies);
    throwIfCancelled(lifecycle.signal);
    await checkBridge(dependencies, { skipStateCheck: true });
    throwIfCancelled(lifecycle.signal);
    const gatewayPort = resolvePort(
      dependencies.environment.ACTION_GATEWAY_PORT,
      DEFAULT_GATEWAY_PORT,
    );
    const runtimePort = resolvePort(
      dependencies.environment.LOCAL_RUNTIME_PORT,
      DEFAULT_RUNTIME_PORT,
    );
    const runtimeUrl = resolveSafeRuntimeUrl(
      dependencies.environment,
      runtimePort,
    );
    if (
      !(await dependencies.portAvailable(gatewayPort)) ||
      !(await dependencies.portAvailable(runtimePort))
    ) {
      throw new BridgeError(
        "PORT_IN_USE",
        "A required Loopback port is already in use.",
      );
    }
    throwIfCancelled(lifecycle.signal);

    buildProcess = startLocalStackBuild(dependencies);
    const buildResult = await waitForChildExit(
      buildProcess,
      lifecycle.signal,
    );
    if (buildResult.code !== 0) {
      throw new BridgeError(
        "LOCAL_BUILD_FAILED",
        "Local Stack build failed.",
      );
    }
    buildProcess = undefined;
    localStack = spawnManaged(
      dependencies,
      process.execPath,
      ["scripts/local-stack.mjs"],
      {
        env: createLocalStackEnvironment(
          dependencies.environment,
          runtimeUrl,
        ),
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
    await verifyLocalStack(
      { gatewayPort, runtimePort },
      keys,
      dependencies,
    );

    const cloudflaredEnvironment = createCloudflaredEnvironment(
      dependencies.environment,
    );
    cloudflared = spawnManaged(
      dependencies,
      "cloudflared",
      [
        "tunnel",
        "--url",
        `http://127.0.0.1:${gatewayPort}`,
        "--no-autoupdate",
      ],
      {
        env: cloudflaredEnvironment,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    gatewayOrigin = await waitForTunnelUrl(cloudflared, dependencies);
    await verifyTunnel(gatewayOrigin, keys.externalKey, dependencies);
    const stateOwnership = await createOwnedState(
      createStateRecord({
        pid: dependencies.pid,
        cloudflaredPid: cloudflared.pid,
        gatewayOrigin,
        startedAt: dependencies.now(),
      }),
      dependencies,
    );
    stateOwned = stateOwnership.owned;
    throwIfCancelled(lifecycle.signal);
    dependencies.log(`Quick Tunnel ready: ${gatewayOrigin}`);
    dependencies.log("Ctrl+C to disconnect");
    await waitForUnexpectedExit(
      localStack,
      cloudflared,
      lifecycle.signal,
    );
  } catch (error) {
    let cleanupError;
    try {
      await cleanup();
    } catch (caught) {
      cleanupError = caught;
    }
    if (cleanupError instanceof BridgeError) {
      throw cleanupError;
    }
    if (error instanceof BridgeInterrupted) {
      return { ok: true, gatewayOrigin, signal: error.signal };
    }
    if (error instanceof BridgeError) {
      throw error;
    }
    throw new BridgeError("BRIDGE_FAILED", "Edge Bridge failed safely.");
  } finally {
    interrupts.dispose();
  }
}

async function main() {
  const mode = process.argv[2];
  try {
    if (mode === "check") {
      await checkBridge();
      return;
    }
    if (mode === "run") {
      await runBridge();
      return;
    }
    throw new BridgeError(
      "INVALID_MODE",
      "Usage: node scripts/edge-bridge.mjs <check|run>",
    );
  } catch (error) {
    const message =
      error instanceof BridgeError
        ? error.message
        : "Edge Bridge failed safely.";
    console.error(message);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  await main();
}

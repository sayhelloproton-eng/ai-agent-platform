import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { arch, platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = resolve(APP_ROOT, "../..");
export const RUNTIME_DIR = resolve(APP_ROOT, ".runtime");
export const LOCAL_CLI = resolve(RUNTIME_DIR, "bin/devtunnel");
export const STATE_FILE = resolve(RUNTIME_DIR, "state.json");
export const LOG_DIR = resolve(RUNTIME_DIR, "logs");
export const OPENAPI_TEMPLATE = resolve(
  APP_ROOT,
  "openapi/custom-gpt-action.openapi.template.yaml",
);
export const OPENAPI_RESOLVED = resolve(
  RUNTIME_DIR,
  "custom-gpt-action.openapi.yaml",
);
export const PRIVATE_CONFIG = resolve(
  process.env.HOME ?? "",
  ".config/ai-agent-platform/dev-tunnel.env",
);
export const LEGACY_CONFIG = resolve(
  process.env.HOME ?? "",
  ".config/ai-agent-platform/edge-bridge.env",
);
export const DEFAULT_TUNNEL_ID = "ai-agent-platform-mvp";
export const GATEWAY_URL = "http://127.0.0.1:8787";
export const RUNTIME_URL = "http://127.0.0.1:8790";
export const CLI_DOWNLOAD_URL =
  "https://aka.ms/TunnelsCliDownload/osx-x64-zip";

const SECRET_NAMES = new Set([
  "EDGE_CLIENT_API_KEY",
  "ACTION_GATEWAY_API_KEY",
  "ACTION_GATEWAY_RUNTIME_API_KEY",
  "LOCAL_RUNTIME_API_KEY",
  "GATEWAY_CLIENT_API_KEY",
  "GATEWAY_RUNTIME_API_KEY",
]);
const SAFE_BASE_ENVIRONMENT_NAMES = Object.freeze([
  "HOME",
  "PATH",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "USER",
  "LOGNAME",
  "SHELL",
  "TZ",
]);
const SAFE_NETWORK_ENVIRONMENT_NAMES = Object.freeze([
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "all_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
]);
const FORBIDDEN_CHILD_ENVIRONMENT_NAME =
  /KEY|TOKEN|SECRET|PASSWORD|AUTHORIZATION|CLOUDFLARE|OPENAI/iu;
const MAX_VERIFY_RESPONSE_BYTES = 65_536;
const DEFAULT_VERIFY_REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_VERIFY_TOTAL_TIMEOUT_MS = 30_000;
const DEFAULT_VERIFY_MAX_ATTEMPTS = 1;
const DEFAULT_VERIFY_RETRY_DELAY_MS = 250;
const TRANSIENT_VERIFY_HTTP_STATUSES = new Set([429, 502, 503, 504]);

export class DevTunnelError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "DevTunnelError";
    this.code = code;
  }
}

export function ensureRuntimeDirectories() {
  mkdirSync(resolve(RUNTIME_DIR, "bin"), { recursive: true, mode: 0o700 });
  mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
  chmodSync(RUNTIME_DIR, 0o700);
  chmodSync(resolve(RUNTIME_DIR, "bin"), 0o700);
  chmodSync(LOG_DIR, 0o700);
}

export function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    values[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim();
  }
  return values;
}

export function readPrivateConfig(path = PRIVATE_CONFIG) {
  if (!existsSync(path)) return {};
  return parseEnv(readFileSync(path, "utf8"));
}

function serializeEnv(values) {
  return `${Object.entries(values)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n")}\n`;
}

export function writePrivateConfig(values, path = PRIVATE_CONFIG) {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const temporary = resolve(
    directory,
    `.dev-tunnel.env.${process.pid}.tmp`,
  );
  writeFileSync(temporary, serializeEnv(values), {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

export function migrateLegacyConfig({
  legacyPath = LEGACY_CONFIG,
  targetPath = PRIVATE_CONFIG,
} = {}) {
  const targetExisted = existsSync(targetPath);
  const target = readPrivateConfig(targetPath);
  const legacy = readPrivateConfig(legacyPath);
  const clientKey =
    target.GATEWAY_CLIENT_API_KEY ??
    legacy.EDGE_CLIENT_API_KEY ??
    legacy.ACTION_GATEWAY_API_KEY;
  const runtimeKey =
    target.GATEWAY_RUNTIME_API_KEY ??
    legacy.ACTION_GATEWAY_RUNTIME_API_KEY ??
    legacy.LOCAL_RUNTIME_API_KEY;
  if (!isValidApiKey(clientKey) || !isValidApiKey(runtimeKey)) {
    throw new DevTunnelError("PRIVATE_CONFIG_INVALID");
  }
  assertIsolatedKeyDomains(clientKey, runtimeKey);
  const merged = {
    ...target,
    DEV_TUNNEL_ID: target.DEV_TUNNEL_ID ?? DEFAULT_TUNNEL_ID,
    GATEWAY_CLIENT_API_KEY: clientKey,
    GATEWAY_RUNTIME_API_KEY: runtimeKey,
  };
  writePrivateConfig(merged, targetPath);
  return {
    migrated: !targetExisted || Object.keys(target).length === 0,
    legacyExists: existsSync(legacyPath),
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

export function assertIsolatedKeyDomains(clientKey, runtimeKey) {
  if (clientKey === runtimeKey) {
    throw new DevTunnelError("KEY_DOMAINS_NOT_ISOLATED");
  }
}

export function secretSafe(value) {
  if (typeof value !== "string") return value;
  let safe = value;
  for (const name of SECRET_NAMES) {
    safe = safe.replace(
      new RegExp(`(${name}\\s*[=:]\\s*)[^\\s]+`, "giu"),
      `$1[REDACTED]`,
    );
  }
  safe = safe.replace(/Bearer\s+[^\s]+/giu, "Bearer [REDACTED]");
  return safe;
}

export function resolveCli({
  localPath = LOCAL_CLI,
  pathLookup = spawnSync,
} = {}) {
  if (existsSync(localPath)) return { path: localPath, source: "app-local" };
  const result = pathLookup("sh", ["-c", "command -v devtunnel"], {
    encoding: "utf8",
  });
  const found = result.status === 0 ? result.stdout.trim() : "";
  if (found !== "") return { path: found, source: "PATH" };
  throw new DevTunnelError("CLI_NOT_FOUND");
}

export function assertSupportedArchitecture({
  currentPlatform = platform(),
  currentArch = arch(),
} = {}) {
  if (currentPlatform !== "darwin" || currentArch !== "x64") {
    throw new DevTunnelError("UNSUPPORTED_ARCHITECTURE");
  }
  return { platform: currentPlatform, arch: currentArch };
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new DevTunnelError(
      options.errorCode ?? "COMMAND_FAILED",
      options.errorCode ?? "COMMAND_FAILED",
    );
  }
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}

export function runCli(args, options = {}) {
  const cli = resolveCli(options);
  return {
    ...runCommand(cli.path, args, options),
    cli,
  };
}

export function parsePublicUrl(text) {
  const matches = text.match(
    /https:\/\/[a-z0-9][a-z0-9.-]*\.devtunnels\.ms(?::\d+)?/giu,
  );
  if (!matches || matches.length === 0) {
    throw new DevTunnelError("PUBLIC_URL_NOT_FOUND");
  }
  return matches[0].replace(/\/$/u, "");
}

export function parseCliVersion(text) {
  const match = text.match(/Tunnel CLI version:\s*([0-9][^\s]*)/u);
  if (!match) throw new DevTunnelError("CLI_VERSION_INVALID");
  return match[1];
}

export function parseTunnelJson(text) {
  try {
    const parsed = JSON.parse(text);
    const tunnel = parsed?.tunnel;
    if (
      !tunnel ||
      !isValidTunnelId(tunnel.tunnelId) ||
      !Array.isArray(tunnel.ports) ||
      !Array.isArray(tunnel.accessControl)
    ) {
      throw new Error("invalid");
    }
    return tunnel;
  } catch {
    throw new DevTunnelError("TUNNEL_OUTPUT_INVALID");
  }
}

export function hasGatewayPort(tunnel) {
  return tunnel.ports.some(
    (port) => port?.portNumber === 8787 && port?.protocol === "http",
  );
}

export function hasAnonymousAccess(tunnel) {
  return tunnel.accessControl.some((entry) => {
    const type = String(entry?.type ?? "").toLowerCase();
    return type.includes("anonymous");
  });
}

export function planTunnelSetup(tunnel) {
  if (tunnel === null) {
    return {
      createTunnel: true,
      createPort: true,
      createAnonymousAccess: false,
    };
  }
  return {
    createTunnel: false,
    createPort: !hasGatewayPort(tunnel),
    createAnonymousAccess: !hasAnonymousAccess(tunnel),
  };
}

export function buildRefreshArgs(tunnelId) {
  if (!isValidTunnelId(tunnelId)) {
    throw new DevTunnelError("TUNNEL_ID_INVALID");
  }
  return ["update", tunnelId, "--expiration", "30d", "--json"];
}

export function assertPersistentHostArgs(args, tunnelId) {
  if (!isValidTunnelId(tunnelId) || !args.includes(tunnelId)) {
    throw new DevTunnelError("TEMPORARY_TUNNEL_FORBIDDEN");
  }
  return args;
}

export function isValidTunnelId(value) {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9.-]{2,79}$/u.test(value)
  );
}

export function readState(path = STATE_FILE) {
  if (!existsSync(path)) return null;
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid");
    }
    return value;
  } catch {
    throw new DevTunnelError("STATE_FILE_INVALID");
  }
}

export function writeState(state, path = STATE_FILE) {
  ensureRuntimeDirectories();
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

export function isProcessAlive(pid, kill = process.kill) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false;
  try {
    kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function processMatches(pid, signature, {
  spawnSyncImpl = spawnSync,
} = {}) {
  if (!isProcessAlive(pid) || typeof signature !== "string") return false;
  const result = spawnSyncImpl("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.includes(signature);
}

export function selectRunningManagedProcesses(
  state,
  { matches = processMatches } = {},
) {
  if (!state?.processes || typeof state.processes !== "object") return {};
  return Object.fromEntries(
    Object.entries(state.processes).filter(([, record]) =>
      Boolean(
        record &&
        Number.isSafeInteger(record.pid) &&
        typeof record.signature === "string" &&
        matches(record.pid, record.signature),
      ),
    ),
  );
}

export function hasRunningManagedState(state, dependencies = {}) {
  return Object.keys(selectRunningManagedProcesses(state, dependencies)).length > 0;
}

export async function stopManagedProcess(
  processRecord,
  {
    kill = process.kill,
    matches = processMatches,
    timeoutMs = 2_000,
  } = {},
) {
  if (!processRecord || !isProcessAlive(processRecord.pid, kill)) {
    return "already-stopped";
  }
  if (!matches(processRecord.pid, processRecord.signature)) {
    throw new DevTunnelError("PROCESS_SIGNATURE_MISMATCH");
  }
  kill(processRecord.pid, "SIGTERM");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(processRecord.pid, kill)) return "stopped";
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  if (isProcessAlive(processRecord.pid, kill)) {
    kill(processRecord.pid, "SIGKILL");
  }
  return "killed";
}

export async function stopRecordedState(state, dependencies = {}) {
  if (!state?.processes) return [];
  const results = [];
  for (const name of ["devtunnel", "gateway", "runtime"]) {
    if (state.processes[name]) {
      results.push([
        name,
        await stopManagedProcess(state.processes[name], dependencies),
      ]);
    }
  }
  return results;
}

export function removeState(path = STATE_FILE) {
  if (existsSync(path)) unlinkSync(path);
}

export function readLog(name) {
  const path = resolve(LOG_DIR, `${name}.log`);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

export function clearManagedLogs() {
  ensureRuntimeDirectories();
  for (const name of ["runtime", "gateway", "devtunnel"]) {
    writeFileSync(resolve(LOG_DIR, `${name}.log`), "", { mode: 0o600 });
  }
}

export async function waitForPublicUrl({
  timeoutMs = 60_000,
  read = () => readLog("devtunnel"),
  fallbackUrl,
  probeFallback = async () => false,
  isHostAlive = () => true,
  now = Date.now,
  sleep = (delayMs) =>
    new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs)),
  fallbackProbeIntervalMs = 500,
} = {}) {
  const deadline = now() + timeoutMs;
  let lastFallbackProbeAt = Number.NEGATIVE_INFINITY;
  while (now() < deadline) {
    if (!isHostAlive()) {
      throw new DevTunnelError("DEVTUNNEL_EXITED_DURING_STARTUP");
    }
    try {
      return parsePublicUrl(read());
    } catch (error) {
      if (error.code !== "PUBLIC_URL_NOT_FOUND") throw error;
    }

    const currentTime = now();
    if (
      typeof fallbackUrl === "string" &&
      fallbackUrl !== "" &&
      currentTime - lastFallbackProbeAt >= fallbackProbeIntervalMs
    ) {
      lastFallbackProbeAt = currentTime;
      try {
        if (await probeFallback(fallbackUrl)) {
          return fallbackUrl.replace(/\/$/u, "");
        }
      } catch {
        // A saved URL is only a hint. Keep waiting for current host evidence.
      }
    }

    const remainingMs = Math.max(0, deadline - now());
    await sleep(Math.min(100, remainingMs));
  }
  throw new DevTunnelError("PUBLIC_URL_DISCOVERY_TIMEOUT");
}

export async function probeHttp(
  url,
  {
    expectedStatus = 200,
    timeoutMs = 1_000,
    headers = { accept: "application/json" },
    fetchImpl = fetch,
  } = {},
) {
  try {
    const response = await fetchImpl(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.body?.cancel();
    return response.status === expectedStatus;
  } catch {
    return false;
  }
}

function selectEnvironment(parentEnvironment, names) {
  const selected = {};
  for (const name of names) {
    const value = parentEnvironment[name];
    if (typeof value === "string" && value !== "") {
      selected[name] = value;
    }
  }
  return selected;
}

export function buildServiceEnvironment(
  config,
  parentEnvironment = process.env,
) {
  if (
    !isValidApiKey(config.GATEWAY_CLIENT_API_KEY) ||
    !isValidApiKey(config.GATEWAY_RUNTIME_API_KEY)
  ) {
    throw new DevTunnelError("PRIVATE_CONFIG_INVALID");
  }
  assertIsolatedKeyDomains(
    config.GATEWAY_CLIENT_API_KEY,
    config.GATEWAY_RUNTIME_API_KEY,
  );
  return {
    ...selectEnvironment(parentEnvironment, SAFE_BASE_ENVIRONMENT_NAMES),
    ACTION_GATEWAY_HOST: "127.0.0.1",
    ACTION_GATEWAY_PORT: "8787",
    ACTION_GATEWAY_API_KEY: config.GATEWAY_CLIENT_API_KEY,
    ACTION_GATEWAY_RUNTIME_URL: RUNTIME_URL,
    ACTION_GATEWAY_RUNTIME_API_KEY: config.GATEWAY_RUNTIME_API_KEY,
    ...(typeof config.CONTROLLER_TARGET_GPT_REF === "string" && config.CONTROLLER_TARGET_GPT_REF.trim() !== ""
      ? { ACTION_GATEWAY_CONTROLLER_TARGET_GPT_REF: config.CONTROLLER_TARGET_GPT_REF.trim() }
      : {}),
    LOCAL_RUNTIME_HOST: "127.0.0.1",
    LOCAL_RUNTIME_PORT: "8790",
    LOCAL_RUNTIME_API_KEY: config.GATEWAY_RUNTIME_API_KEY,
  };
}

export function buildDevTunnelEnvironment(
  parentEnvironment = process.env,
) {
  const selected = selectEnvironment(parentEnvironment, [
    ...SAFE_BASE_ENVIRONMENT_NAMES,
    ...SAFE_NETWORK_ENVIRONMENT_NAMES,
  ]);
  return Object.fromEntries(
    Object.entries(selected).filter(
      ([name]) => !FORBIDDEN_CHILD_ENVIRONMENT_NAME.test(name),
    ),
  );
}

function openLog(name) {
  ensureRuntimeDirectories();
  return openSync(resolve(LOG_DIR, `${name}.log`), "a", 0o600);
}

export function spawnManaged(name, command, args, environment) {
  if (!environment || typeof environment !== "object") {
    throw new DevTunnelError("CHILD_ENVIRONMENT_REQUIRED");
  }
  const descriptor = openLog(name);
  try {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: environment,
      detached: true,
      stdio: ["ignore", descriptor, descriptor],
    });
    child.unref();
    return child.pid;
  } finally {
    closeSync(descriptor);
  }
}

export async function waitForHttp(
  url,
  {
    expectedStatus = 200,
    timeoutMs = 10_000,
    headers = { accept: "application/json" },
    fetchImpl = fetch,
    errorCode = "STARTUP_TIMEOUT",
  } = {},
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(Math.min(1_000, deadline - Date.now())),
      });
      await response.body?.cancel();
      if (response.status === expectedStatus) return response.status;
    } catch {
      // Bounded readiness polling intentionally ignores transient failures.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new DevTunnelError(errorCode);
}

function isJsonContentType(response) {
  const contentType = response.headers?.get?.("content-type");
  return (
    typeof contentType === "string" &&
    /^(?:application\/json|[^;]+\+json)(?:;|$)/iu.test(contentType.trim())
  );
}

async function readBoundedJson(
  response,
  {
    maximumBytes = MAX_VERIFY_RESPONSE_BYTES,
  } = {},
) {
  if (!isJsonContentType(response)) {
    throw new DevTunnelError("VERIFY_INVALID_CONTENT_TYPE");
  }
  const contentLength = response.headers?.get?.("content-length");
  if (
    typeof contentLength === "string" &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > maximumBytes
  ) {
    throw new DevTunnelError("VERIFY_RESPONSE_TOO_LARGE");
  }

  const chunks = [];
  let totalBytes = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maximumBytes) {
          await reader.cancel();
          throw new DevTunnelError("VERIFY_RESPONSE_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock?.();
    }
  } else {
    const bytes = new Uint8Array(await response.arrayBuffer());
    totalBytes = bytes.byteLength;
    if (totalBytes > maximumBytes) {
      throw new DevTunnelError("VERIFY_RESPONSE_TOO_LARGE");
    }
    chunks.push(bytes);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    throw new DevTunnelError("VERIFY_INVALID_JSON");
  }
}

function isRedirectFetchError(error) {
  let current = error;
  for (let depth = 0; depth < 3 && current; depth += 1) {
    if (
      current instanceof Error &&
      current.message.toLowerCase() === "unexpected redirect"
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null
        ? current.cause
        : undefined;
  }
  return false;
}

export function calculateVerifyRequestBudget(
  remainingMs,
  configuredTimeoutMs = DEFAULT_VERIFY_REQUEST_TIMEOUT_MS,
) {
  if (remainingMs <= 0) return 0;
  return Math.min(
    DEFAULT_VERIFY_REQUEST_TIMEOUT_MS,
    configuredTimeoutMs,
    remainingMs,
  );
}

function annotateVerifyError(error, { scope, step, attempts }) {
  const annotated =
    error instanceof DevTunnelError
      ? error
      : new DevTunnelError("VERIFY_FETCH_FAILED");
  annotated.verifyScope = scope;
  annotated.verifyStep = step;
  annotated.verifyAttempts = attempts;
  return annotated;
}

function isTransientVerifyError(error) {
  return (
    error?.code === "VERIFY_TIMEOUT" ||
    error?.code === "VERIFY_FETCH_FAILED" ||
    error?.code === "VERIFY_TRANSIENT_HTTP_STATUS"
  );
}

async function boundedJsonFetch(
  url,
  options,
  {
    deadline,
    fetchImpl,
    now,
    requestTimeoutMs,
  },
) {
  const remainingMs = deadline - now();
  if (remainingMs <= 0) {
    throw new DevTunnelError("VERIFY_TIMEOUT");
  }
  const budgetMs = calculateVerifyRequestBudget(
    remainingMs,
    requestTimeoutMs,
  );
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, budgetMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status <= 399) {
      throw new DevTunnelError("VERIFY_REDIRECT_NOT_ALLOWED");
    }
    if (TRANSIENT_VERIFY_HTTP_STATUSES.has(response.status)) {
      await response.body?.cancel?.();
      throw new DevTunnelError(
        "VERIFY_TRANSIENT_HTTP_STATUS",
        `HTTP ${response.status}`,
      );
    }
    const body = await readBoundedJson(response);
    return { response, body };
  } catch (error) {
    if (timedOut || error?.name === "AbortError") {
      throw new DevTunnelError("VERIFY_TIMEOUT");
    }
    if (error instanceof DevTunnelError) throw error;
    if (isRedirectFetchError(error)) {
      throw new DevTunnelError("VERIFY_REDIRECT_NOT_ALLOWED");
    }
    throw new DevTunnelError("VERIFY_FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

async function verifyFetchStep(
  step,
  url,
  options,
  {
    deadline,
    fetchImpl,
    now,
    requestTimeoutMs,
    maxAttempts,
    retryDelayMs,
    sleep,
    scope,
  },
) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return {
        ...(await boundedJsonFetch(
          url,
          options,
          { deadline, fetchImpl, now, requestTimeoutMs },
        )),
        attempts: attempt,
      };
    } catch (error) {
      const annotated = annotateVerifyError(error, {
        scope,
        step,
        attempts: attempt,
      });
      if (!isTransientVerifyError(annotated) || attempt >= maxAttempts) {
        throw annotated;
      }
      const remainingMs = deadline - now();
      if (remainingMs <= 0) {
        throw annotateVerifyError(new DevTunnelError("VERIFY_TIMEOUT"), {
          scope,
          step,
          attempts: attempt,
        });
      }
      const delayMs = Math.min(retryDelayMs, remainingMs);
      if (delayMs > 0) await sleep(delayMs);
    }
  }
  throw annotateVerifyError(new DevTunnelError("VERIFY_TIMEOUT"), {
    scope,
    step,
    attempts: attempt,
  });
}

function assertVerifyStep(condition, code, metadata) {
  if (!condition) {
    throw annotateVerifyError(new DevTunnelError(code), metadata);
  }
}

export async function verifyGateway(
  baseUrl,
  apiKey,
  {
    fetchImpl = fetch,
    now = Date.now,
    requestTimeoutMs = DEFAULT_VERIFY_REQUEST_TIMEOUT_MS,
    totalTimeoutMs = DEFAULT_VERIFY_TOTAL_TIMEOUT_MS,
    maxAttempts = DEFAULT_VERIFY_MAX_ATTEMPTS,
    retryDelayMs = DEFAULT_VERIFY_RETRY_DELAY_MS,
    sleep = (delayMs) =>
      new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs)),
    scope = "gateway",
  } = {},
) {
  const boundedMaxAttempts = Math.max(1, Math.min(3, maxAttempts));
  const boundedRetryDelayMs = Math.max(0, Math.min(1_000, retryDelayMs));
  const deadline =
    now() + Math.min(DEFAULT_VERIFY_TOTAL_TIMEOUT_MS, totalTimeoutMs);
  const commonHeaders = {
    accept: "application/json",
    "x-tunnel-skip-antiphishing-page": "true",
  };
  const dependencies = {
    deadline,
    fetchImpl,
    now,
    requestTimeoutMs,
    maxAttempts: boundedMaxAttempts,
    retryDelayMs: boundedRetryDelayMs,
    sleep,
    scope,
  };
  const healthResult = await verifyFetchStep(
    "health",
    `${baseUrl}/health`,
    { headers: commonHeaders },
    dependencies,
  );
  assertVerifyStep(healthResult.response.status === 200, "CHAIN_VERIFICATION_FAILED", {
    scope, step: "health", attempts: healthResult.attempts,
  });

  const unauthenticatedResult = await verifyFetchStep(
    "capabilities_unauthenticated",
    `${baseUrl}/v1/capabilities`,
    { headers: commonHeaders },
    dependencies,
  );
  assertVerifyStep(
    unauthenticatedResult.response.status === 401,
    "CHAIN_VERIFICATION_FAILED",
    { scope, step: "capabilities_unauthenticated", attempts: unauthenticatedResult.attempts },
  );

  const authenticatedResult = await verifyFetchStep(
    "capabilities_authenticated",
    `${baseUrl}/v1/capabilities`,
    {
      headers: {
        ...commonHeaders,
        authorization: `Bearer ${apiKey}`,
      },
    },
    dependencies,
  );
  assertVerifyStep(
    authenticatedResult.response.status === 200 &&
      authenticatedResult.body?.data?.capabilities?.includes("runtime.status"),
    "CHAIN_VERIFICATION_FAILED",
    { scope, step: "capabilities_authenticated", attempts: authenticatedResult.attempts },
  );

  const taskResult = await verifyFetchStep(
    "runtime_status",
    `${baseUrl}/v1/runtime/status`,
    {
      method: "POST",
      headers: {
        ...commonHeaders,
        authorization: `Bearer ${apiKey}`,
      },
    },
    dependencies,
  );
  const task = taskResult.response;
  const taskBody = taskResult.body;
  const taskId = taskBody?.taskId;
  if (
    typeof taskId !== "string" ||
    !taskId.startsWith("custom-gpt-runtime-status-") ||
    taskId.length === "custom-gpt-runtime-status-".length
  ) {
    throw annotateVerifyError(new DevTunnelError("VERIFY_TASK_ID_MISMATCH"), {
      scope, step: "runtime_status", attempts: taskResult.attempts,
    });
  }
  assertVerifyStep(
    task.status === 200 &&
      taskBody?.status === "succeeded" &&
      taskBody?.output?.runtime === "local-runtime" &&
      taskBody?.output?.status === "ready" &&
      Array.isArray(taskBody?.output?.capabilities) &&
      taskBody.output.capabilities.includes("runtime.status"),
    "CHAIN_VERIFICATION_FAILED",
    { scope, step: "runtime_status", attempts: taskResult.attempts },
  );
  return {
    healthStatus: healthResult.response.status,
    unauthenticatedStatus: unauthenticatedResult.response.status,
    authenticatedStatus: authenticatedResult.response.status,
    taskStatus: task.status,
    taskId,
  };
}

export function generateOpenApi(publicBaseUrl, {
  templatePath = OPENAPI_TEMPLATE,
  outputPath = OPENAPI_RESOLVED,
} = {}) {
  if (!/^https:\/\/[a-z0-9.-]+\.devtunnels\.ms$/iu.test(publicBaseUrl)) {
    throw new DevTunnelError("PUBLIC_URL_INVALID");
  }
  ensureRuntimeDirectories();
  const template = readFileSync(templatePath, "utf8");
  if (/Bearer\s+[A-Za-z0-9._~-]{20,}/u.test(template)) {
    throw new DevTunnelError("OPENAPI_CONTAINS_SECRET");
  }
  writeFileSync(
    outputPath,
    template.replaceAll("${DEV_TUNNEL_PUBLIC_BASE_URL}", publicBaseUrl),
    { mode: 0o600 },
  );
  chmodSync(outputPath, 0o600);
  return outputPath;
}

export function mode(path) {
  return statSync(path).mode & 0o777;
}

export function copyBackup(source, destination) {
  copyFileSync(source, destination);
  chmodSync(destination, 0o600);
}

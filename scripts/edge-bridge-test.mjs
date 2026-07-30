import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  BRIDGE_STARTUP_TIMEOUT_MS,
  BRIDGE_STATE_FILE,
  LOCAL_STACK_TERM_GRACE_MS,
  TUNNEL_HEALTH_TIMEOUT_MS,
  TUNNEL_POLL_DELAY_MS,
  TUNNEL_REQUEST_TIMEOUT_MS,
  BridgeError,
  MAX_NETWORK_RESPONSE_BYTES,
  MAX_TUNNEL_OUTPUT_BYTES,
  PROBE_RESULT_CLASSIFICATIONS,
  boundedFetch,
  calculateProbeTiming,
  checkBridge,
  classifyProbeResult,
  createStateRecord,
  ensureNoActiveState,
  extractTunnelUrl,
  formatProbeTelemetry,
  isValidApiKey,
  observeCloudflared,
  runBridge,
  resolveSafeRuntimeUrl,
  validateBridgeKeys,
  validateTunnelUrl,
  waitForExpectedStatus,
  waitForTunnelRegistration,
  waitForTunnelUrl,
} from "./edge-bridge.mjs";

const EXTERNAL_KEY = "e".repeat(32);
const INTERNAL_KEY = "i".repeat(32);
const TUNNEL_ORIGIN = "https://random-test.trycloudflare.com";
const LOCAL_CONTRACT = [
  'const DEFAULT_HOST = "127.0.0.1";',
  "ACTION_GATEWAY_API_KEY",
  "ACTION_GATEWAY_RUNTIME_API_KEY",
  "LOCAL_RUNTIME_API_KEY",
].join("\n");

function response(status = 200, body = { ok: true }, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function baseFiles() {
  return new Map([
    ["scripts/local-stack.mjs", LOCAL_CONTRACT],
    ["apps/action-gateway/src/server.ts", LOCAL_CONTRACT],
    ["apps/local-runtime/src/server.ts", LOCAL_CONTRACT],
  ]);
}

function checkDependencies(overrides = {}) {
  const files = overrides.files ?? baseFiles();
  const writes = [];
  const removals = [];
  const logs = [];
  return {
    platform: "darwin",
    environment: {},
    homeDirectory: "/test-home",
    files,
    writes,
    removals,
    logs,
    access: async (path) => {
      if (!files.has(path)) {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      }
    },
    readFile: async (path) => files.get(path),
    writeFile: async (...args) => {
      writes.push(args);
      files.set(args[0], args[1]);
    },
    chmod: async (...args) => writes.push(["chmod", ...args]),
    removeFile: async (path) => {
      removals.push(path);
      files.delete(path);
    },
    execFile: async () => ({
      stdout: "cloudflared version 2026.7.0\n",
      stderr: "",
    }),
    fetch: async () =>
      response(200, { service: "ai-agent-platform-edge" }),
    processAlive: () => false,
    processIsBridge: async () => false,
    log: (message) => logs.push(message),
    ...overrides,
  };
}

function assertBridgeCode(error, code) {
  return error instanceof BridgeError && error.code === code;
}

test("check passes with supported local prerequisites", async () => {
  const result = await checkBridge(checkDependencies());
  assert.equal(result.ok, true);
});

test("check rejects an unsupported platform", async () => {
  await assert.rejects(
    checkBridge(checkDependencies({ platform: "win32" })),
    (error) => assertBridgeCode(error, "UNSUPPORTED_PLATFORM"),
  );
});

test("check reports missing cloudflared", async () => {
  const error = new Error("missing");
  error.code = "ENOENT";
  await assert.rejects(
    checkBridge(checkDependencies({
      execFile: async () => { throw error; },
    })),
    (caught) => assertBridgeCode(caught, "CLOUDFLARED_NOT_FOUND"),
  );
});

test("check reports unreadable cloudflared version", async () => {
  await assert.rejects(
    checkBridge(checkDependencies({
      execFile: async () => ({ stdout: "", stderr: "" }),
    })),
    (error) => assertBridgeCode(error, "CLOUDFLARED_VERSION_UNAVAILABLE"),
  );
});

for (const name of ["config.yaml", "config.yml"]) {
  test(`check blocks existing ${name} without changing it`, async () => {
    const files = baseFiles();
    const path = `/test-home/.cloudflared/${name}`;
    files.set(path, "existing config");
    const dependencies = checkDependencies({ files });
    await assert.rejects(
      checkBridge(dependencies),
      (error) => assertBridgeCode(error, "CLOUDFLARED_CONFIG_PRESENT"),
    );
    assert.equal(files.get(path), "existing config");
    assert.equal(dependencies.writes.length, 0);
    assert.equal(dependencies.removals.length, 0);
  });
}

test("check fails safely when fixed Worker is unreachable", async () => {
  await assert.rejects(
    checkBridge(checkDependencies({
      fetch: async () => { throw new Error("network detail"); },
    })),
    (error) => assertBridgeCode(error, "FIXED_WORKER_UNREACHABLE"),
  );
});

test("check mode never spawns a process", async () => {
  let spawns = 0;
  await checkBridge(checkDependencies({
    spawn: () => { spawns += 1; },
  }));
  assert.equal(spawns, 0);
});

test("check mode performs no writes or removals", async () => {
  const dependencies = checkDependencies();
  await checkBridge(dependencies);
  assert.equal(dependencies.writes.length, 0);
  assert.equal(dependencies.removals.length, 0);
});

test("check mode reports an existing state file without modifying it", async () => {
  const files = baseFiles();
  files.set(BRIDGE_STATE_FILE, "{\"status\":\"stale\"}");
  const dependencies = checkDependencies({ files });
  await assert.rejects(
    checkBridge(dependencies),
    (error) => assertBridgeCode(error, "BRIDGE_STATE_PRESENT"),
  );
  assert.equal(files.get(BRIDGE_STATE_FILE), "{\"status\":\"stale\"}");
  assert.equal(dependencies.removals.length, 0);
  assert.equal(dependencies.writes.length, 0);
});

test("check rejects a missing Local Stack entry", async () => {
  const files = baseFiles();
  files.delete("scripts/local-stack.mjs");
  await assert.rejects(
    checkBridge(checkDependencies({ files })),
    (error) => assertBridgeCode(error, "LOCAL_STACK_ENTRY_MISSING"),
  );
});

for (const [label, environment, code] of [
  ["missing external key", {}, "INVALID_EXTERNAL_KEY"],
  [
    "short external key",
    {
      ACTION_GATEWAY_API_KEY: "short",
      ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
    },
    "INVALID_EXTERNAL_KEY",
  ],
  [
    "long external key",
    {
      ACTION_GATEWAY_API_KEY: "e".repeat(257),
      ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
    },
    "INVALID_EXTERNAL_KEY",
  ],
  [
    "whitespace external key",
    {
      ACTION_GATEWAY_API_KEY: `${EXTERNAL_KEY} `,
      ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
    },
    "INVALID_EXTERNAL_KEY",
  ],
  [
    "missing internal key",
    { ACTION_GATEWAY_API_KEY: EXTERNAL_KEY },
    "INVALID_INTERNAL_KEY",
  ],
  [
    "mismatched internal keys",
    {
      ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
      ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: "r".repeat(32),
    },
    "INTERNAL_KEY_MISMATCH",
  ],
  [
    "identical external and internal keys",
    {
      ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
      ACTION_GATEWAY_RUNTIME_API_KEY: EXTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: EXTERNAL_KEY,
    },
    "KEY_DOMAINS_NOT_ISOLATED",
  ],
]) {
  test(`key validation rejects ${label} without exposing values`, () => {
    assert.throws(
      () => validateBridgeKeys(environment),
      (error) => {
        assert.equal(assertBridgeCode(error, code), true);
        assert.equal(error.message.includes(EXTERNAL_KEY), false);
        assert.equal(error.message.includes(INTERNAL_KEY), false);
        return true;
      },
    );
  });
}

test("key validation accepts valid isolated security domains", () => {
  const result = validateBridgeKeys({
    ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
    ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
    LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
  });
  assert.deepEqual(result, {
    externalKey: EXTERNAL_KEY,
    internalKey: INTERNAL_KEY,
  });
});

test("API key boundary accepts 32 and 256 characters", () => {
  assert.equal(isValidApiKey("a".repeat(32)), true);
  assert.equal(isValidApiKey("a".repeat(256)), true);
});

test("missing Gateway Runtime URL resolves to the controlled Loopback URL", () => {
  assert.equal(
    resolveSafeRuntimeUrl({}, 8790),
    "http://127.0.0.1:8790",
  );
});

test("exact controlled Gateway Runtime URL is accepted", () => {
  assert.equal(
    resolveSafeRuntimeUrl(
      { ACTION_GATEWAY_RUNTIME_URL: "http://127.0.0.1:8790" },
      8790,
    ),
    "http://127.0.0.1:8790",
  );
});

for (const [label, value] of [
  ["HTTPS", "https://127.0.0.1:8790"],
  ["localhost", "http://localhost:8790"],
  ["IPv6 loopback", "http://[::1]:8790"],
  ["LAN address", "http://192.168.1.20:8790"],
  ["different port", "http://127.0.0.1:8791"],
  ["credentials", "http://user:pass@127.0.0.1:8790"],
  ["path", "http://127.0.0.1:8790/tasks"],
  ["query", "http://127.0.0.1:8790?value=test"],
  ["fragment", "http://127.0.0.1:8790#fragment"],
]) {
  test(`Gateway Runtime URL rejects ${label} safely`, () => {
    assert.throws(
      () =>
        resolveSafeRuntimeUrl(
          { ACTION_GATEWAY_RUNTIME_URL: value },
          8790,
        ),
      (error) => {
        assert.equal(assertBridgeCode(error, "UNSAFE_RUNTIME_URL"), true);
        assert.equal(error.message.includes(value), false);
        return true;
      },
    );
  });
}

for (const [label, value] of [
  ["valid random URL", TUNNEL_ORIGIN],
  ["explicit standard port", `${TUNNEL_ORIGIN}:443`],
]) {
  test(`Tunnel URL accepts ${label}`, () => {
    assert.equal(validateTunnelUrl(value), TUNNEL_ORIGIN);
  });
}

for (const [label, value] of [
  ["HTTP", "http://random-test.trycloudflare.com"],
  ["root domain", "https://trycloudflare.com"],
  ["other domain", "https://example.com"],
  ["nested subdomain", "https://one.two.trycloudflare.com"],
  ["credentials", "https://user:pass@random-test.trycloudflare.com"],
  ["non-default port", "https://random-test.trycloudflare.com:4443"],
  ["path", "https://random-test.trycloudflare.com/path"],
  ["query", "https://random-test.trycloudflare.com?value=test"],
  ["fragment", "https://random-test.trycloudflare.com#fragment"],
]) {
  test(`Tunnel URL rejects ${label}`, () => {
    assert.equal(validateTunnelUrl(value), undefined);
  });
}

test("Tunnel URL extraction ignores unsafe candidates", () => {
  assert.equal(
    extractTunnelUrl(`http://bad.example ${TUNNEL_ORIGIN} ready`),
    TUNNEL_ORIGIN,
  );
});

class MockChild extends EventEmitter {
  constructor(pid = 4001, behavior = {}) {
    super();
    this.pid = pid;
    this.exitCode = null;
    this.signalCode = null;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.kills = [];
    this.behavior = behavior;
  }

  kill(signal) {
    this.kills.push(signal);
    if (signal === "SIGTERM" && this.behavior.ignoreTerm) {
      if (this.behavior.exitAfterTermMs !== undefined) {
        setTimeout(
          () => {
            this.signalCode = signal;
            this.emit("exit", null, signal);
          },
          this.behavior.exitAfterTermMs,
        );
      }
      return true;
    }
    if (signal === "SIGKILL" && this.behavior.ignoreKill) {
      return true;
    }
    this.signalCode = signal;
    queueMicrotask(() => this.emit("exit", null, signal));
    return true;
  }

  complete(code = 0) {
    this.exitCode = code;
    this.emit("exit", code, null);
  }
}

test("Tunnel URL wait accepts a valid URL from stderr", async () => {
  const child = new MockChild();
  const result = waitForTunnelUrl(child, { tunnelUrlTimeoutMs: 50 });
  child.stderr.emit("data", `origin ${TUNNEL_ORIGIN}\n`);
  assert.equal(await result, TUNNEL_ORIGIN);
});

test("Tunnel URL wait rejects when no URL appears before timeout", async () => {
  const child = new MockChild();
  await assert.rejects(
    waitForTunnelUrl(child, { tunnelUrlTimeoutMs: 5 }),
    (error) => assertBridgeCode(error, "TUNNEL_URL_TIMEOUT"),
  );
});

test("Tunnel URL wait rejects oversized output", async () => {
  const child = new MockChild();
  const result = waitForTunnelUrl(child, { tunnelUrlTimeoutMs: 50 });
  child.stdout.emit("data", "x".repeat(MAX_TUNNEL_OUTPUT_BYTES + 1));
  await assert.rejects(
    result,
    (error) => assertBridgeCode(error, "TUNNEL_OUTPUT_TOO_LARGE"),
  );
});

test("Tunnel URL wait rejects an early cloudflared exit", async () => {
  const child = new MockChild();
  const result = waitForTunnelUrl(child, { tunnelUrlTimeoutMs: 50 });
  child.complete(1);
  await assert.rejects(
    result,
    (error) => assertBridgeCode(error, "CLOUDFLARED_EXITED"),
  );
});

test("cloudflared observer retains only bounded stage summaries", () => {
  const child = new MockChild();
  const observer = observeCloudflared(child);
  child.stderr.emit(
    "data",
    [
      `Quick Tunnel ${TUNNEL_ORIGIN}`,
      "Initial protocol quic",
      "Registered tunnel connection protocol=quic",
      "",
    ].join("\n"),
  );
  const summary = observer.snapshot();
  assert.deepEqual(summary, [
    "URL_GENERATED",
    "PROTOCOL_QUIC",
    "REGISTERED",
  ]);
  assert.equal(JSON.stringify(summary).includes(TUNNEL_ORIGIN), false);
  observer.dispose();
  assert.equal(child.stdout.listenerCount("data"), 0);
  assert.equal(child.stderr.listenerCount("data"), 0);
  assert.equal(child.listenerCount("exit"), 0);
});

test("cloudflared observer reports process exit without stderr content", () => {
  const child = new MockChild();
  const observer = observeCloudflared(child);
  child.stderr.emit("data", "QUIC handshake timeout secret-like-detail\n");
  child.complete(1);
  assert.deepEqual(observer.snapshot(), [
    "QUIC_TIMEOUT",
    "PROCESS_EXITED",
  ]);
  observer.dispose();
});

test("Tunnel registration recognizes an existing REGISTERED summary", async () => {
  const child = new MockChild();
  const observer = observeCloudflared(child);
  child.stderr.emit(
    "data",
    "Registered tunnel connection protocol=quic\n",
  );
  await waitForTunnelRegistration(child, observer, {
    tunnelRegisterTimeoutMs: 5,
  });
  observer.dispose();
});

test("Tunnel registration timeout is precise and bounded", async () => {
  const child = new MockChild();
  const observer = observeCloudflared(child);
  await assert.rejects(
    waitForTunnelRegistration(child, observer, {
      tunnelRegisterTimeoutMs: 5,
    }),
    (error) => assertBridgeCode(error, "TUNNEL_REGISTER_TIMEOUT"),
  );
  observer.dispose();
});

test("Tunnel registration reports cloudflared exit precisely", async () => {
  const child = new MockChild();
  const observer = observeCloudflared(child);
  const result = waitForTunnelRegistration(child, observer, {
    tunnelRegisterTimeoutMs: 50,
  });
  child.complete(1);
  await assert.rejects(
    result,
    (error) => assertBridgeCode(error, "CLOUDFLARED_EXITED"),
  );
  observer.dispose();
});

test("Tunnel registration Abort removes its observer subscription", async () => {
  const child = new MockChild();
  const observer = observeCloudflared(child);
  const controller = new AbortController();
  const result = waitForTunnelRegistration(child, observer, {
    lifecycleSignal: controller.signal,
    tunnelRegisterTimeoutMs: 50,
  });
  controller.abort(new BridgeError("TEST_ABORT", "test aborted"));
  await assert.rejects(
    result,
    (error) => assertBridgeCode(error, "TEST_ABORT"),
  );
  observer.dispose();
  assert.equal(child.stdout.listenerCount("data"), 0);
  assert.equal(child.stderr.listenerCount("data"), 0);
  assert.equal(child.listenerCount("exit"), 0);
});

test("bounded fetch enforces its timeout", async () => {
  await assert.rejects(
    boundedFetch(
      "https://unit.test",
      { timeoutMs: 5 },
      { fetch: async () => new Promise(() => {}) },
    ),
    (error) => assertBridgeCode(error, "NETWORK_TIMEOUT"),
  );
});

test("bounded fetch rejects oversized responses", async () => {
  await assert.rejects(
    boundedFetch(
      "https://unit.test",
      {},
      {
        fetch: async () =>
          new Response("x".repeat(MAX_NETWORK_RESPONSE_BYTES + 1)),
      },
    ),
    (error) => assertBridgeCode(error, "NETWORK_RESPONSE_TOO_LARGE"),
  );
});

test("bounded fetch does not forward Authorization unless explicitly supplied", async () => {
  let captured;
  await boundedFetch(
    "https://unit.test",
    {},
    {
      fetch: async (_url, init) => {
        captured = init;
        return response();
      },
    },
  );
  assert.equal(captured.headers, undefined);
});

test("state record contains only the approved fields and no keys", () => {
  const state = createStateRecord({
    pid: 10,
    cloudflaredPid: 11,
    gatewayOrigin: TUNNEL_ORIGIN,
    startedAt: new Date("2026-07-29T00:00:00.000Z"),
  });
  assert.deepEqual(Object.keys(state), [
    "version",
    "status",
    "startedAt",
    "pid",
    "cloudflaredPid",
    "gatewayOrigin",
  ]);
  const serialized = JSON.stringify(state);
  assert.equal(serialized.includes(EXTERNAL_KEY), false);
  assert.equal(serialized.includes(INTERNAL_KEY), false);
  assert.equal(serialized.includes("environment"), false);
});

test("active Bridge state rejects a duplicate without removing state", async () => {
  const files = baseFiles();
  files.set(
    BRIDGE_STATE_FILE,
    JSON.stringify({ version: 1, status: "running", pid: 42 }),
  );
  const dependencies = checkDependencies({
    files,
    processAlive: () => true,
    processIsBridge: async () => true,
  });
  await assert.rejects(
    ensureNoActiveState(dependencies),
    (error) => assertBridgeCode(error, "BRIDGE_ALREADY_RUNNING"),
  );
  assert.equal(dependencies.removals.length, 0);
});

test("stale Bridge state is removed without terminating its PID", async () => {
  const files = baseFiles();
  files.set(
    BRIDGE_STATE_FILE,
    JSON.stringify({ version: 1, status: "running", pid: 42 }),
  );
  let processChecks = 0;
  const dependencies = checkDependencies({
    files,
    processAlive: () => {
      processChecks += 1;
      return false;
    },
  });
  await ensureNoActiveState(dependencies);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
  assert.equal(processChecks, 1);
});

test("untrusted state PID is never treated as a process to terminate", async () => {
  const files = baseFiles();
  files.set(
    BRIDGE_STATE_FILE,
    JSON.stringify({ version: 1, status: "running", pid: "not-a-pid" }),
  );
  let checked = false;
  const dependencies = checkDependencies({
    files,
    processAlive: () => {
      checked = true;
      return true;
    },
  });
  await ensureNoActiveState(dependencies);
  assert.equal(checked, false);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

function runDependencies(options = {}) {
  const files = baseFiles();
  const signalSource = new EventEmitter();
  const spawns = [];
  const writes = [];
  const removals = [];
  const children = [];
  const fetchCalls = [];
  let cloudflared;

  const dependencies = checkDependencies({
    files,
    environment: {
      ACTION_GATEWAY_API_KEY: EXTERNAL_KEY,
      ACTION_GATEWAY_RUNTIME_API_KEY: INTERNAL_KEY,
      LOCAL_RUNTIME_API_KEY: INTERNAL_KEY,
      ACTION_GATEWAY_HOST: "127.0.0.1",
      LOCAL_RUNTIME_HOST: "127.0.0.1",
      ...options.environmentOverrides,
    },
    signalSource,
    pid: 3001,
    now: () => new Date("2026-07-29T00:00:00.000Z"),
    readyTimeoutMs: options.readyTimeoutMs ?? 100,
    tunnelHealthTimeoutMs: options.tunnelHealthTimeoutMs ?? 20,
    tunnelReadyTimeoutMs: options.tunnelReadyTimeoutMs ?? 20,
    tunnelRequestTimeoutMs: options.tunnelRequestTimeoutMs ?? 10,
    tunnelPollDelayMs: options.tunnelPollDelayMs ?? 1,
    tunnelRegisterTimeoutMs: options.tunnelRegisterTimeoutMs ?? 20,
    bridgeStartupTimeoutMs:
      options.bridgeStartupTimeoutMs ?? BRIDGE_STARTUP_TIMEOUT_MS,
    pollDelayMs: 1,
    childTermGraceMs: options.childTermGraceMs ?? 5,
    localStackTermGraceMs: options.localStackTermGraceMs ?? 10,
    killConfirmTimeoutMs: options.killConfirmTimeoutMs ?? 5,
    tunnelUrlTimeoutMs: options.tunnelUrlTimeoutMs ?? 20,
    portAvailable: async () => true,
    spawn: (command, args, spawnOptions) => {
      const behavior =
        command === "npm"
          ? options.buildBehavior
          : command === "cloudflared"
            ? options.cloudBehavior
            : options.localBehavior;
      const child = new MockChild(4000 + children.length, behavior);
      children.push(child);
      spawns.push({ command, args, options: spawnOptions, child });
      if (command === "npm") {
        if (options.interruptDuringBuild) {
          queueMicrotask(() =>
            signalSource.emit(options.signal ?? "SIGINT"),
          );
        } else {
          queueMicrotask(() => child.complete(options.buildExitCode ?? 0));
        }
      } else if (command === "cloudflared") {
        cloudflared = child;
        const publishTunnel = () => {
          if (options.registerBeforeUrl) {
            child.stderr.emit(
              "data",
              "Registered tunnel connection protocol=quic\n",
            );
          }
          child.stderr.emit("data", `origin ${TUNNEL_ORIGIN}\n`);
          if (options.exitBeforeRegistration) {
            queueMicrotask(() => child.complete(1));
          } else if (options.interruptDuringRegistration) {
            queueMicrotask(() =>
              signalSource.emit(options.signal ?? "SIGTERM"),
            );
          } else if (
            !options.neverRegister &&
            !options.registerBeforeUrl
          ) {
            const publishRegistration = () =>
              child.stderr.emit(
                "data",
                "Registered tunnel connection protocol=quic\n",
              );
            if (options.registrationDelayMs !== undefined) {
              setTimeout(
                publishRegistration,
                options.registrationDelayMs,
              );
            } else {
              publishRegistration();
            }
          }
        };
        if (options.tunnelStartFailure) {
          queueMicrotask(() => child.complete(1));
        } else if (options.interruptDuringTunnelUrl) {
          queueMicrotask(() =>
            signalSource.emit(options.signal ?? "SIGINT"),
          );
        } else if (options.neverPublishTunnelUrl) {
          // The absolute Bridge startup deadline must remain authoritative.
        } else if (options.tunnelUrlDelayMs !== undefined) {
          setTimeout(publishTunnel, options.tunnelUrlDelayMs);
        } else {
          queueMicrotask(publishTunnel);
        }
      }
      return child;
    },
    fetch: async (url, init) => {
      fetchCalls.push({ url: String(url), init });
      const tunnelRequest = String(url).startsWith(TUNNEL_ORIGIN);
      if (tunnelRequest && options.tunnelProbeDelayMs !== undefined) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, options.tunnelProbeDelayMs);
          init.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("cancelled delayed Tunnel probe"));
            },
            { once: true },
          );
        });
      }
      if (
        options.interruptDuringFixedWorker &&
        String(url).includes("workers.dev")
      ) {
        queueMicrotask(() =>
          signalSource.emit(options.signal ?? "SIGINT"),
        );
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("cancelled fixed worker request")),
            { once: true },
          );
        });
      }
      if (
        options.interruptDuringRuntimePoll &&
        String(url) === "http://127.0.0.1:8790/ready"
      ) {
        queueMicrotask(() =>
          signalSource.emit(options.signal ?? "SIGINT"),
        );
        return response(500);
      }
      if (
        options.interruptDuringTunnelVerification &&
        String(url) === `${TUNNEL_ORIGIN}/health`
      ) {
        queueMicrotask(() =>
          signalSource.emit(options.signal ?? "SIGTERM"),
        );
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(new Error("cancelled test request")),
            { once: true },
          );
        });
      }
      if (
        options.runtimeVerificationFailure &&
        String(url) === "http://127.0.0.1:8790/ready"
      ) {
        return response(500);
      }
      if (String(url).includes("workers.dev")) {
        return response(200, { service: "ai-agent-platform-edge" });
      }
      if (String(url) === `${TUNNEL_ORIGIN}/health`) {
        return response(options.tunnelHealthFailure ? 503 : 200);
      }
      if (
        String(url) === `${TUNNEL_ORIGIN}/v1/capabilities` &&
        init.headers?.authorization === undefined
      ) {
        return response(options.tunnelUnauthFailure ? 200 : 401);
      }
      if (
        String(url) === `${TUNNEL_ORIGIN}/v1/capabilities` &&
        init.headers?.authorization !== undefined
      ) {
        return response(options.tunnelAuthFailure ? 401 : 200);
      }
      if (
        options.gatewayVerificationFailure &&
        String(url).includes("/health")
      ) {
        return response(500);
      }
      if (String(url).includes("/v1/capabilities")) {
        return response(init.headers?.authorization ? 200 : 401);
      }
      return response(200);
    },
    writeFile: async (...args) => {
      writes.push(args);
      if (options.wxFailure) {
        files.set(
          args[0],
          options.existingStateContent ?? "other-process-state",
        );
        const error = new Error("exists");
        error.code = "EEXIST";
        throw error;
      }
      if (options.delayedStateWriteSignal) {
        signalSource.emit(options.signal ?? "SIGINT");
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      files.set(args[0], args[1]);
      if (options.chmodFailure || options.delayedStateWriteSignal) {
        return;
      }
      if (options.exitTunnelAfterState) {
        setTimeout(() => cloudflared.complete(1), 0);
      } else {
        setTimeout(() => {
          signalSource.emit(options.signal ?? "SIGINT");
          if (options.repeatSignal) {
            signalSource.emit(options.signal ?? "SIGINT");
          }
        }, 0);
      }
    },
    chmod: async (...args) => {
      writes.push(["chmod", ...args]);
      if (options.chmodFailure) {
        throw new Error("chmod failed");
      }
    },
    removeFile: async (path) => {
      removals.push(path);
      if (
        options.stateRemoveFailure &&
        path === BRIDGE_STATE_FILE
      ) {
        throw new Error("state removal failed");
      }
      files.delete(path);
    },
  });

  return {
    ...dependencies,
    files,
    spawns,
    writes,
    removals,
    children,
    fetchCalls,
    signalSource,
  };
}

test("normal Bridge run uses build, Local Stack, then cloudflared", async () => {
  const dependencies = runDependencies();
  const result = await runBridge(dependencies);
  assert.equal(result.ok, true);
  assert.deepEqual(
    dependencies.spawns.map(({ command }) => command),
    ["npm", process.execPath, "cloudflared"],
  );
});

test("unsafe Gateway Runtime URL fails before any child starts", async () => {
  const dependencies = runDependencies({
    environmentOverrides: {
      ACTION_GATEWAY_RUNTIME_URL: "https://runtime.example.com",
    },
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "UNSAFE_RUNTIME_URL"),
  );
  assert.equal(dependencies.spawns.length, 0);
});

test("Local Stack receives the exact controlled Gateway Runtime URL", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  assert.equal(
    dependencies.spawns[1].options.env.ACTION_GATEWAY_RUNTIME_URL,
    "http://127.0.0.1:8790",
  );
});

test("custom Runtime port produces the controlled Gateway Runtime URL", async () => {
  const dependencies = runDependencies({
    environmentOverrides: { LOCAL_RUNTIME_PORT: "18890" },
  });
  await runBridge(dependencies);
  assert.equal(
    dependencies.spawns[1].options.env.ACTION_GATEWAY_RUNTIME_URL,
    "http://127.0.0.1:18890",
  );
});

test("build environment excludes all runtime and Edge secrets", async () => {
  const dependencies = runDependencies({
    environmentOverrides: {
      EDGE_CLIENT_API_KEY: "c".repeat(32),
      EDGE_ORIGIN_API_KEY: "o".repeat(32),
      CLOUDFLARE_API_TOKEN: "cloudflare-token",
    },
  });
  await runBridge(dependencies);
  const buildEnvironment = dependencies.spawns[0].options.env;
  for (const name of [
    "ACTION_GATEWAY_API_KEY",
    "ACTION_GATEWAY_RUNTIME_API_KEY",
    "LOCAL_RUNTIME_API_KEY",
    "EDGE_CLIENT_API_KEY",
    "EDGE_ORIGIN_API_KEY",
    "CLOUDFLARE_API_TOKEN",
  ]) {
    assert.equal(buildEnvironment[name], undefined);
  }
});

test("Local Stack receives required keys but no Edge or Cloudflare secrets", async () => {
  const dependencies = runDependencies({
    environmentOverrides: {
      EDGE_CLIENT_API_KEY: "c".repeat(32),
      EDGE_ORIGIN_API_KEY: "o".repeat(32),
      EDGE_ORIGIN_BASE_URL: TUNNEL_ORIGIN,
      CF_API_TOKEN: "cloudflare-token",
    },
  });
  await runBridge(dependencies);
  const localEnvironment = dependencies.spawns[1].options.env;
  assert.equal(localEnvironment.ACTION_GATEWAY_API_KEY, EXTERNAL_KEY);
  assert.equal(localEnvironment.ACTION_GATEWAY_RUNTIME_API_KEY, INTERNAL_KEY);
  assert.equal(localEnvironment.LOCAL_RUNTIME_API_KEY, INTERNAL_KEY);
  for (const name of [
    "EDGE_CLIENT_API_KEY",
    "EDGE_ORIGIN_API_KEY",
    "EDGE_ORIGIN_BASE_URL",
    "CF_API_TOKEN",
  ]) {
    assert.equal(localEnvironment[name], undefined);
  }
});

test("cloudflared targets only the Gateway loopback port", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  const tunnel = dependencies.spawns[2];
  assert.deepEqual(tunnel.args, [
    "tunnel",
    "--url",
    "http://127.0.0.1:8787",
    "--no-autoupdate",
  ]);
  assert.equal(tunnel.options.detached, false);
});

test("Local Runtime is verified before Action Gateway", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  const urls = dependencies.fetchCalls.map(({ url }) => url);
  assert.ok(
    urls.indexOf("http://127.0.0.1:8790/ready") <
      urls.indexOf("http://127.0.0.1:8787/health"),
  );
});

test("Tunnel verification checks health then unauthenticated and authenticated capabilities", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  const tunnelCalls = dependencies.fetchCalls.filter(({ url }) =>
    url.startsWith(TUNNEL_ORIGIN));
  assert.deepEqual(
    tunnelCalls.map(({ url }) => url),
    [
      `${TUNNEL_ORIGIN}/health`,
      `${TUNNEL_ORIGIN}/v1/capabilities`,
      `${TUNNEL_ORIGIN}/v1/capabilities`,
    ],
  );
  assert.equal(tunnelCalls[1].init.headers, undefined);
  assert.equal(
    tunnelCalls[2].init.headers.authorization,
    `Bearer ${EXTERNAL_KEY}`,
  );
  const probeLogs = dependencies.logs.filter((message) =>
    message.startsWith("probe "));
  assert.equal(probeLogs.length, 3);
  assert.match(
    probeLogs[0],
    /^probe stage=TUNNEL_HEALTH attempts=1 duration=\d+ms first200=\d+ms last=HTTP_200$/u,
  );
  assert.match(
    probeLogs[1],
    /^probe stage=TUNNEL_UNAUTHENTICATED attempts=1 duration=\d+ms first200=NONE last=HTTP_4XX$/u,
  );
  assert.match(
    probeLogs[2],
    /^probe stage=TUNNEL_AUTHENTICATED attempts=1 duration=\d+ms first200=\d+ms last=HTTP_200$/u,
  );
});

test("Tunnel health never starts before REGISTERED", async () => {
  const dependencies = runDependencies({
    neverRegister: true,
    tunnelRegisterTimeoutMs: 5,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "TUNNEL_REGISTER_TIMEOUT"),
  );
  assert.equal(
    dependencies.fetchCalls.some(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)),
    false,
  );
});

test("REGISTERED starts Tunnel health and capability verification", async () => {
  const dependencies = runDependencies({
    registrationDelayMs: 5,
    tunnelRegisterTimeoutMs: 20,
  });
  await runBridge(dependencies);
  assert.deepEqual(
    dependencies.fetchCalls
      .filter(({ url }) => url.startsWith(TUNNEL_ORIGIN))
      .map(({ url }) => url),
    [
      `${TUNNEL_ORIGIN}/health`,
      `${TUNNEL_ORIGIN}/v1/capabilities`,
      `${TUNNEL_ORIGIN}/v1/capabilities`,
    ],
  );
});

test("REGISTERED observed before registration wait is recognized immediately", async () => {
  const dependencies = runDependencies({ registerBeforeUrl: true });
  await runBridge(dependencies);
  assert.equal(
    dependencies.fetchCalls.filter(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)).length,
    3,
  );
});

test("scaled 1.5-second URL-to-registration gap continues safely", async () => {
  const dependencies = runDependencies({
    registrationDelayMs: 15,
    tunnelRegisterTimeoutMs: 20,
  });
  await runBridge(dependencies);
  assert.equal(
    dependencies.fetchCalls.filter(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)).length,
    3,
  );
});

test("cloudflared exit before REGISTERED stops all Tunnel probes", async () => {
  const dependencies = runDependencies({ exitBeforeRegistration: true });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "CLOUDFLARED_EXITED"),
  );
  assert.equal(
    dependencies.fetchCalls.some(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)),
    false,
  );
});

test("registration Abort stops before all Tunnel probes", async () => {
  const dependencies = runDependencies({
    interruptDuringRegistration: true,
  });
  const result = await runBridge(dependencies);
  assert.equal(result.signal, "SIGTERM");
  assert.equal(
    dependencies.fetchCalls.some(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)),
    false,
  );
  const tunnel = dependencies.children[2];
  assert.equal(tunnel.stdout.listenerCount("data"), 0);
  assert.equal(tunnel.stderr.listenerCount("data"), 0);
  assert.equal(tunnel.listenerCount("exit"), 0);
});

test("absolute startup deadline also bounds registration", async () => {
  const dependencies = runDependencies({
    neverRegister: true,
    tunnelRegisterTimeoutMs: 100,
    bridgeStartupTimeoutMs: 5,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "BRIDGE_STARTUP_TIMEOUT"),
  );
  assert.equal(
    dependencies.fetchCalls.some(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)),
    false,
  );
});

test("registration failure is redacted and removes all listeners", async () => {
  const dependencies = runDependencies({
    neverRegister: true,
    tunnelRegisterTimeoutMs: 5,
  });
  let caught;
  try {
    await runBridge(dependencies);
  } catch (error) {
    caught = error;
  }
  assertBridgeCode(caught, "TUNNEL_REGISTER_TIMEOUT");
  const output = [caught.message, ...dependencies.logs].join("\n");
  assert.equal(output.includes(TUNNEL_ORIGIN), false);
  assert.equal(output.includes(EXTERNAL_KEY), false);
  assert.equal(output.includes(INTERNAL_KEY), false);
  const tunnel = dependencies.children[2];
  assert.equal(tunnel.stdout.listenerCount("data"), 0);
  assert.equal(tunnel.stderr.listenerCount("data"), 0);
  assert.equal(tunnel.listenerCount("exit"), 0);
});

test("scaled 7.5-second URL delay leaves full budgets for all Tunnel checks", async () => {
  const dependencies = runDependencies({
    tunnelUrlDelayMs: 15,
    tunnelUrlTimeoutMs: 20,
    tunnelProbeDelayMs: 8,
    tunnelRequestTimeoutMs: 15,
    tunnelReadyTimeoutMs: 50,
  });
  await runBridge(dependencies);
  const tunnelCalls = dependencies.fetchCalls.filter(({ url }) =>
    url.startsWith(TUNNEL_ORIGIN));
  assert.deepEqual(
    tunnelCalls.map(({ url }) => url),
    [
      `${TUNNEL_ORIGIN}/health`,
      `${TUNNEL_ORIGIN}/v1/capabilities`,
      `${TUNNEL_ORIGIN}/v1/capabilities`,
    ],
  );
});

test("URL near its stage limit does not consume Tunnel verification budgets", async () => {
  const dependencies = runDependencies({
    tunnelUrlDelayMs: 18,
    tunnelUrlTimeoutMs: 20,
    tunnelProbeDelayMs: 4,
    tunnelRequestTimeoutMs: 8,
    tunnelReadyTimeoutMs: 8,
  });
  await runBridge(dependencies);
  assert.equal(
    dependencies.fetchCalls.filter(({ url }) =>
      url.startsWith(TUNNEL_ORIGIN)).length,
    3,
  );
});

test("Tunnel health timeout has a precise stage error", async () => {
  const dependencies = runDependencies({
    tunnelHealthFailure: true,
    tunnelHealthTimeoutMs: 5,
  });
  let caught;
  try {
    await runBridge(dependencies);
  } catch (error) {
    caught = error;
  }
  assertBridgeCode(caught, "TUNNEL_HEALTH_NOT_READY");
  assert.equal(caught.diagnostics.stage, "TUNNEL_HEALTH");
  assert.ok(caught.diagnostics.attempts >= 1);
  assert.ok(caught.diagnostics.durationMs >= 5);
  assert.equal(caught.diagnostics.first200Ms, undefined);
  assert.equal(caught.diagnostics.lastResult, "ABORTED");
});

test("Tunnel unauthenticated verification has a precise stage error", async () => {
  const dependencies = runDependencies({
    tunnelUnauthFailure: true,
    tunnelReadyTimeoutMs: 5,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) =>
      assertBridgeCode(error, "TUNNEL_UNAUTHENTICATED_CHECK_FAILED"),
  );
});

test("Tunnel authenticated verification has a precise stage error", async () => {
  const dependencies = runDependencies({
    tunnelAuthFailure: true,
    tunnelReadyTimeoutMs: 5,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) =>
      assertBridgeCode(error, "TUNNEL_AUTHENTICATED_CHECK_FAILED"),
  );
});

test("absolute Bridge startup deadline bounds all startup stages", async () => {
  const dependencies = runDependencies({
    neverPublishTunnelUrl: true,
    tunnelUrlTimeoutMs: 100,
    bridgeStartupTimeoutMs: 5,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "BRIDGE_STARTUP_TIMEOUT"),
  );
  const tunnel = dependencies.children[2];
  assert.deepEqual(tunnel.kills, ["SIGTERM"]);
  assert.equal(tunnel.stdout.listenerCount("data"), 0);
  assert.equal(tunnel.stderr.listenerCount("data"), 0);
  assert.equal(tunnel.listenerCount("exit"), 0);
});

test("stage errors and summaries never expose Tunnel URL or keys", async () => {
  const dependencies = runDependencies({
    tunnelHealthFailure: true,
    tunnelHealthTimeoutMs: 5,
  });
  let caught;
  try {
    await runBridge(dependencies);
  } catch (error) {
    caught = error;
  }
  assertBridgeCode(caught, "TUNNEL_HEALTH_NOT_READY");
  const output = [caught.message, ...dependencies.logs].join("\n");
  assert.equal(output.includes(TUNNEL_ORIGIN), false);
  assert.equal(output.includes(EXTERNAL_KEY), false);
  assert.equal(output.includes(INTERNAL_KEY), false);
  assert.doesNotMatch(output, /authorization|bearer/iu);
});

test("Tunnel timing defaults match the post-registration contract", () => {
  assert.equal(TUNNEL_HEALTH_TIMEOUT_MS, 30_000);
  assert.equal(TUNNEL_REQUEST_TIMEOUT_MS, 5_000);
  assert.equal(TUNNEL_POLL_DELAY_MS, 500);
  assert.equal(BRIDGE_STARTUP_TIMEOUT_MS, 60_000);
});

test("Probe timing uses the post-registration Health budget and absolute deadline", () => {
  const fullHealthBudget = calculateProbeTiming({
    stageStartedAt: 20_000,
    stageTimeoutMs: TUNNEL_HEALTH_TIMEOUT_MS,
    bridgeStartupDeadline: 80_000,
    now: 20_000,
    configuredRequestTimeoutMs: TUNNEL_REQUEST_TIMEOUT_MS,
    configuredPollDelayMs: TUNNEL_POLL_DELAY_MS,
  });
  assert.equal(fullHealthBudget.stageDeadline, 50_000);
  assert.equal(fullHealthBudget.remainingMs, 30_000);
  assert.equal(fullHealthBudget.effectiveRequestTimeoutMs, 5_000);

  const boundedByBridge = calculateProbeTiming({
    stageStartedAt: 55_000,
    stageTimeoutMs: TUNNEL_HEALTH_TIMEOUT_MS,
    bridgeStartupDeadline: 60_000,
    now: 55_000,
    configuredRequestTimeoutMs: TUNNEL_REQUEST_TIMEOUT_MS,
    configuredPollDelayMs: TUNNEL_POLL_DELAY_MS,
  });
  assert.equal(boundedByBridge.stageDeadline, 60_000);
  assert.equal(boundedByBridge.remainingMs, 5_000);
});

test("Probe timing truncates request and poll budgets to remaining time", () => {
  const stageRemaining = calculateProbeTiming({
    stageStartedAt: 0,
    stageTimeoutMs: 30_000,
    bridgeStartupDeadline: 60_000,
    now: 28_800,
    configuredRequestTimeoutMs: 5_000,
    configuredPollDelayMs: 500,
  });
  assert.equal(stageRemaining.effectiveRequestTimeoutMs, 1_200);
  assert.equal(stageRemaining.effectivePollDelayMs, 500);

  const globalRemaining = calculateProbeTiming({
    stageStartedAt: 50_000,
    stageTimeoutMs: 30_000,
    bridgeStartupDeadline: 51_100,
    now: 50_000,
    configuredRequestTimeoutMs: 5_000,
    configuredPollDelayMs: 500,
  });
  assert.equal(globalRemaining.effectiveRequestTimeoutMs, 1_100);

  const shortPoll = calculateProbeTiming({
    stageStartedAt: 0,
    stageTimeoutMs: 30_000,
    bridgeStartupDeadline: 60_000,
    now: 29_880,
    configuredRequestTimeoutMs: 5_000,
    configuredPollDelayMs: 500,
  });
  assert.equal(shortPoll.effectivePollDelayMs, 120);
});

test("expired Probe deadline performs no fetch or sleep", async () => {
  let fetches = 0;
  let delays = 0;
  await assert.rejects(
    waitForExpectedStatus(
      "https://unit.test",
      200,
      undefined,
      {
        bridgeStartupDeadline: 1_000,
        nowMilliseconds: () => 1_000,
        fetch: async () => {
          fetches += 1;
          return response();
        },
        delay: async () => {
          delays += 1;
        },
      },
      {
        timeoutMs: 30_000,
        requestTimeoutMs: 5_000,
        pollDelayMs: 500,
        errorCode: "TEST_DEADLINE",
      },
    ),
    (error) => {
      assertBridgeCode(error, "TEST_DEADLINE");
      assert.equal(error.diagnostics.attempts, 0);
      assert.equal(error.diagnostics.lastResult, "ABORTED");
      return true;
    },
  );
  assert.equal(fetches, 0);
  assert.equal(delays, 0);
});

test("Probe deadline prevents an extra fetch after the final response", async () => {
  let now = 0;
  let fetches = 0;
  await assert.rejects(
    waitForExpectedStatus(
      "https://unit.test",
      200,
      undefined,
      {
        bridgeStartupDeadline: 10,
        nowMilliseconds: () => now,
        fetch: async () => {
          fetches += 1;
          now = 10;
          return response(503);
        },
      },
      {
        timeoutMs: 30_000,
        requestTimeoutMs: 5_000,
        pollDelayMs: 500,
        errorCode: "TEST_DEADLINE",
      },
    ),
    (error) => {
      assertBridgeCode(error, "TEST_DEADLINE");
      assert.equal(error.diagnostics.attempts, 1);
      assert.equal(error.diagnostics.lastResult, "ABORTED");
      return true;
    },
  );
  assert.equal(fetches, 1);
});

test("full request timeout and deadline-truncated timeout classify differently", async () => {
  let fullTimeout;
  try {
    await boundedFetch(
      "https://unit.test",
      { timeoutMs: 5, timeoutCode: "NETWORK_TIMEOUT" },
      { fetch: async () => new Promise(() => {}) },
    );
  } catch (error) {
    fullTimeout = error;
  }
  assert.equal(classifyProbeResult({ error: fullTimeout }), "FETCH_TIMEOUT");

  let deadlineTimeout;
  try {
    await boundedFetch(
      "https://unit.test",
      { timeoutMs: 5, timeoutCode: "NETWORK_ABORTED" },
      { fetch: async () => new Promise(() => {}) },
    );
  } catch (error) {
    deadlineTimeout = error;
  }
  assert.equal(classifyProbeResult({ error: deadlineTimeout }), "ABORTED");
});

test("fake fetch failures cover stable network cause classifications", async () => {
  async function classifyFetchFailure(error, options = {}) {
    try {
      await boundedFetch(
        "https://unit.test",
        options,
        { fetch: async () => { throw error; } },
      );
    } catch (caught) {
      return classifyProbeResult({ error: caught });
    }
    assert.fail("fake fetch unexpectedly succeeded");
  }

  const dnsCause = new Error("redacted");
  dnsCause.code = "ENOTFOUND";
  assert.equal(
    await classifyFetchFailure(new Error("redacted", { cause: dnsCause })),
    "DNS_ERROR",
  );

  const connectCause = new Error("redacted");
  connectCause.code = "UND_ERR_CONNECT_TIMEOUT";
  assert.equal(
    await classifyFetchFailure(
      new Error("redacted", {
        cause: new Error("redacted", { cause: connectCause }),
      }),
    ),
    "CONNECT_ERROR",
  );

  const tlsCause = new Error("redacted");
  tlsCause.code = "ERR_TLS_CERT_ALTNAME_INVALID";
  assert.equal(
    await classifyFetchFailure(new Error("redacted", { cause: tlsCause })),
    "TLS_ERROR",
  );
  assert.equal(
    await classifyFetchFailure(new Error("redacted")),
    "UNKNOWN_NETWORK_ERROR",
  );

  let oversized;
  try {
    await boundedFetch(
      "https://unit.test",
      {},
      {
        fetch: async () =>
          new Response("x".repeat(MAX_NETWORK_RESPONSE_BYTES + 1)),
      },
    );
  } catch (error) {
    oversized = error;
  }
  assert.equal(
    classifyProbeResult({ error: oversized }),
    "RESPONSE_TOO_LARGE",
  );
});

test("Probe results are exactly the ten approved stable classifications", () => {
  const cases = [
    classifyProbeResult({ status: 200 }),
    classifyProbeResult({ status: 401 }),
    classifyProbeResult({ status: 503 }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_TIMEOUT", "redacted"),
    }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_DNS_ERROR", "redacted"),
    }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_CONNECT_ERROR", "redacted"),
    }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_TLS_ERROR", "redacted"),
    }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_ABORTED", "redacted"),
    }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_RESPONSE_TOO_LARGE", "redacted"),
    }),
    classifyProbeResult({ status: 302 }),
  ];
  assert.deepEqual(cases, PROBE_RESULT_CLASSIFICATIONS);

  const observed = new Set([
    ...cases,
    classifyProbeResult({ status: 101 }),
    classifyProbeResult({ status: 204 }),
    classifyProbeResult({ status: 600 }),
    classifyProbeResult({
      error: new BridgeError("NETWORK_READ_FAILED", "redacted"),
    }),
    classifyProbeResult({ error: new Error("redacted") }),
  ]);
  assert.deepEqual(
    [...observed].sort(),
    [...PROBE_RESULT_CLASSIFICATIONS].sort(),
  );
});

test("Probe telemetry formatting cannot include errors, URLs, or keys", () => {
  const formatted = formatProbeTelemetry({
    stage: "TUNNEL_HEALTH",
    attempts: 7,
    durationMs: 3_250,
    first200Ms: 2_501,
    lastResult: "HTTP_200",
  });
  assert.equal(
    formatted,
    "probe stage=TUNNEL_HEALTH attempts=7 duration=3250ms first200=2501ms last=HTTP_200",
  );
  assert.equal(formatted.includes(TUNNEL_ORIGIN), false);
  assert.equal(formatted.includes(EXTERNAL_KEY), false);
  assert.equal(formatted.includes(INTERNAL_KEY), false);
});

test("30-second health behavior is simulated without a real 30-second wait", async () => {
  const dependencies = runDependencies({
    tunnelHealthFailure: true,
    tunnelHealthTimeoutMs: 8,
    tunnelRequestTimeoutMs: 2,
    tunnelPollDelayMs: 1,
  });
  const startedAt = Date.now();
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "TUNNEL_HEALTH_NOT_READY"),
  );
  assert.ok(Date.now() - startedAt < 1_000);
});

test("Bridge logs do not contain keys or Authorization headers", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  const serialized = dependencies.logs.join("\n");
  assert.equal(serialized.includes(EXTERNAL_KEY), false);
  assert.equal(serialized.includes(INTERNAL_KEY), false);
  assert.equal(serialized.includes(TUNNEL_ORIGIN), false);
  assert.doesNotMatch(serialized, /[a-z0-9-]+\.trycloudflare\.com/iu);
  assert.doesNotMatch(serialized, /authorization|bearer/i);
  assert.equal(
    dependencies.logs.includes("Quick Tunnel ready."),
    true,
  );
});

test("Gateway verification failure prevents Tunnel startup", async () => {
  const dependencies = runDependencies({ gatewayVerificationFailure: true });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "GATEWAY_NOT_READY"),
  );
  assert.deepEqual(
    dependencies.spawns.map(({ command }) => command),
    ["npm", process.execPath],
  );
});

test("Runtime readiness failure has a precise stage error", async () => {
  const dependencies = runDependencies({
    runtimeVerificationFailure: true,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "RUNTIME_NOT_READY"),
  );
  assert.deepEqual(
    dependencies.spawns.map(({ command }) => command),
    ["npm", process.execPath],
  );
});

test("Tunnel startup failure cleans the Local Stack", async () => {
  const dependencies = runDependencies({ tunnelStartFailure: true });
  await assert.rejects(runBridge(dependencies), BridgeError);
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
});

test("unexpected Tunnel exit triggers cleanup without restart", async () => {
  const dependencies = runDependencies({ exitTunnelAfterState: true });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "MANAGED_PROCESS_EXITED"),
  );
  assert.equal(
    dependencies.spawns.filter(({ command }) => command === "cloudflared").length,
    1,
  );
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`${signal} cleans owned children and state`, async () => {
    const dependencies = runDependencies({ signal });
    await runBridge(dependencies);
    assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
    assert.deepEqual(dependencies.children[2].kills, ["SIGTERM"]);
    assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
  });
}

test("cleanup does not terminate an unrelated process", async () => {
  const unrelated = new MockChild(9999);
  const dependencies = runDependencies();
  await runBridge(dependencies);
  assert.deepEqual(unrelated.kills, []);
});

test("repeated shutdown signal does not repeat cleanup", async () => {
  const dependencies = runDependencies({ repeatSignal: true });
  await runBridge(dependencies);
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
  assert.deepEqual(dependencies.children[2].kills, ["SIGTERM"]);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

test("Bridge state is written with mode 0600 and no Secret", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  const write = dependencies.writes.find(([path]) => path === BRIDGE_STATE_FILE);
  assert.equal(write[2].mode, 0o600);
  assert.equal(write[2].flag, "wx");
  assert.equal(write[1].includes(EXTERNAL_KEY), false);
  assert.equal(write[1].includes(INTERNAL_KEY), false);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`${signal} during state write removes the eventually owned state`, async () => {
    const dependencies = runDependencies({
      delayedStateWriteSignal: true,
      signal,
    });
    const result = await runBridge(dependencies);
    assert.equal(result.signal, signal);
    assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
    assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
  });
}

test("chmod failure rolls back the newly created state", async () => {
  const dependencies = runDependencies({ chmodFailure: true });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "STATE_WRITE_FAILED"),
  );
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

test("exclusive state write failure preserves another owner's file", async () => {
  const existingStateContent = "state-created-by-another-process";
  const dependencies = runDependencies({
    wxFailure: true,
    existingStateContent,
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "STATE_WRITE_FAILED"),
  );
  assert.equal(
    dependencies.files.get(BRIDGE_STATE_FILE),
    existingStateContent,
  );
  assert.equal(dependencies.removals.includes(BRIDGE_STATE_FILE), false);
});

test("Bridge passes no detached option and does not auto-restart", async () => {
  const dependencies = runDependencies();
  await runBridge(dependencies);
  assert.equal(
    dependencies.spawns.every(({ options }) => options.detached === false),
    true,
  );
  assert.equal(dependencies.spawns.length, 3);
});

test("occupied Gateway port fails before any child starts", async () => {
  const dependencies = runDependencies();
  dependencies.portAvailable = async (port) => port !== 8787;
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "PORT_IN_USE"),
  );
  assert.equal(dependencies.spawns.length, 0);
});

test("Bridge never gives cloudflared the internal Runtime key", async () => {
  const dependencies = runDependencies({
    environmentOverrides: {
      EDGE_CLIENT_API_KEY: "c".repeat(32),
      EDGE_ORIGIN_API_KEY: "o".repeat(32),
      CLOUDFLARE_API_TOKEN: "cloudflare-token",
    },
  });
  await runBridge(dependencies);
  const tunnel = dependencies.spawns[2];
  assert.equal(JSON.stringify(tunnel.args).includes(INTERNAL_KEY), false);
  assert.equal(JSON.stringify(tunnel.args).includes(EXTERNAL_KEY), false);
  assert.equal(tunnel.options.env.ACTION_GATEWAY_API_KEY, undefined);
  assert.equal(
    tunnel.options.env.ACTION_GATEWAY_RUNTIME_API_KEY,
    undefined,
  );
  assert.equal(tunnel.options.env.LOCAL_RUNTIME_API_KEY, undefined);
  assert.equal(tunnel.options.env.EDGE_CLIENT_API_KEY, undefined);
  assert.equal(tunnel.options.env.EDGE_ORIGIN_API_KEY, undefined);
  assert.equal(tunnel.options.env.CLOUDFLARE_API_TOKEN, undefined);
});

test("SIGINT cancels the fixed Worker check before any child starts", async () => {
  const dependencies = runDependencies({
    interruptDuringFixedWorker: true,
  });
  const result = await runBridge(dependencies);
  assert.equal(result.signal, "SIGINT");
  assert.equal(dependencies.spawns.length, 0);
  const callsAtReturn = dependencies.fetchCalls.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(dependencies.fetchCalls.length, callsAtReturn);
});

test("SIGTERM during build cleans the in-flight Build child", async () => {
  const dependencies = runDependencies({
    interruptDuringBuild: true,
    signal: "SIGTERM",
  });
  const result = await runBridge(dependencies);
  assert.equal(result.signal, "SIGTERM");
  assert.deepEqual(dependencies.children[0].kills, ["SIGTERM"]);
  assert.equal(dependencies.spawns.length, 1);
});

test("SIGINT cancels Runtime readiness polling without later network growth", async () => {
  const dependencies = runDependencies({
    interruptDuringRuntimePoll: true,
  });
  const result = await runBridge(dependencies);
  assert.equal(result.signal, "SIGINT");
  const callsAtReturn = dependencies.fetchCalls.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(dependencies.fetchCalls.length, callsAtReturn);
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
});

test("SIGTERM cancels Tunnel verification without later network growth", async () => {
  const dependencies = runDependencies({
    interruptDuringTunnelVerification: true,
  });
  const result = await runBridge(dependencies);
  assert.equal(result.signal, "SIGTERM");
  const callsAtReturn = dependencies.fetchCalls.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(dependencies.fetchCalls.length, callsAtReturn);
  assert.equal(
    dependencies.fetchCalls.some(({ url }) =>
      url === `${TUNNEL_ORIGIN}/v1/capabilities`),
    false,
  );
  assert.deepEqual(dependencies.children[2].kills, ["SIGTERM"]);
});

test("interrupt while waiting for Tunnel URL removes all child listeners", async () => {
  const dependencies = runDependencies({
    interruptDuringTunnelUrl: true,
  });
  const result = await runBridge(dependencies);
  assert.equal(result.signal, "SIGINT");
  const tunnel = dependencies.children[2];
  assert.equal(tunnel.stdout.listenerCount("data"), 0);
  assert.equal(tunnel.stderr.listenerCount("data"), 0);
  assert.equal(tunnel.listenerCount("exit"), 0);
  assert.equal(tunnel.listenerCount("error"), 0);
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
});

test("lifecycle interruption produces no unhandled rejection", async () => {
  const unhandled = [];
  const listener = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", listener);
  try {
    const dependencies = runDependencies({
      interruptDuringTunnelVerification: true,
    });
    await runBridge(dependencies);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", listener);
  }
});

test("cleanup escalates from SIGTERM to SIGKILL after its deadline", async () => {
  const dependencies = runDependencies({
    cloudBehavior: { ignoreTerm: true },
  });
  await runBridge(dependencies);
  assert.deepEqual(
    dependencies.children[2].kills,
    ["SIGTERM", "SIGKILL"],
  );
});

test("a stuck child cannot block other cleanup or owned state removal", async () => {
  const dependencies = runDependencies({
    cloudBehavior: { ignoreTerm: true, ignoreKill: true },
  });
  const startedAt = Date.now();
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "CLEANUP_FAILED"),
  );
  assert.ok(Date.now() - startedAt < 500);
  assert.deepEqual(
    dependencies.children[2].kills,
    ["SIGTERM", "SIGKILL"],
  );
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

test("Local Stack cleanup failure still removes owned state", async () => {
  const dependencies = runDependencies({
    localBehavior: { ignoreTerm: true, ignoreKill: true },
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "CLEANUP_FAILED"),
  );
  assert.deepEqual(
    dependencies.children[1].kills,
    ["SIGTERM", "SIGKILL"],
  );
  assert.deepEqual(dependencies.children[2].kills, ["SIGTERM"]);
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

test("multiple child cleanup failures still remove owned state", async () => {
  const dependencies = runDependencies({
    localBehavior: { ignoreTerm: true, ignoreKill: true },
    cloudBehavior: { ignoreTerm: true, ignoreKill: true },
  });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "CLEANUP_FAILED"),
  );
  assert.deepEqual(
    dependencies.children[1].kills,
    ["SIGTERM", "SIGKILL"],
  );
  assert.deepEqual(
    dependencies.children[2].kills,
    ["SIGTERM", "SIGKILL"],
  );
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), false);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

test("owned state removal failure does not block child cleanup", async () => {
  const dependencies = runDependencies({ stateRemoveFailure: true });
  await assert.rejects(
    runBridge(dependencies),
    (error) => assertBridgeCode(error, "CLEANUP_FAILED"),
  );
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
  assert.deepEqual(dependencies.children[2].kills, ["SIGTERM"]);
  assert.equal(dependencies.files.has(BRIDGE_STATE_FILE), true);
  assert.deepEqual(dependencies.removals, [BRIDGE_STATE_FILE]);
});

test("Local Stack has a grace period longer than two seconds", () => {
  assert.ok(LOCAL_STACK_TERM_GRACE_MS > 2_000);
});

test("Local Stack may exit during its dedicated grace period without SIGKILL", async () => {
  const dependencies = runDependencies({
    localBehavior: { ignoreTerm: true, exitAfterTermMs: 8 },
    localStackTermGraceMs: 20,
  });
  await runBridge(dependencies);
  assert.deepEqual(dependencies.children[1].kills, ["SIGTERM"]);
});

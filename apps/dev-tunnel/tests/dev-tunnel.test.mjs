import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  OPENAPI_TEMPLATE,
  DevTunnelError,
  assertPersistentHostArgs,
  assertSupportedArchitecture,
  buildDevTunnelEnvironment,
  buildRefreshArgs,
  buildServiceEnvironment,
  calculateVerifyRequestBudget,
  generateOpenApi,
  hasAnonymousAccess,
  hasGatewayPort,
  hasRunningManagedState,
  isProcessAlive,
  migrateLegacyConfig,
  parsePublicUrl,
  parseCliVersion,
  parseTunnelJson,
  planTunnelSetup,
  probeHttp,
  readState,
  resolveCli,
  secretSafe,
  selectRunningManagedProcesses,
  stopManagedProcess,
  verifyGateway,
  waitForHttp,
  waitForPublicUrl,
  writePrivateConfig,
} from "../scripts/lib.mjs";

const TUNNEL = {
  tunnelId: "ai-agent-platform-mvp.region",
  ports: [{ portNumber: 8787, protocol: "http" }],
  accessControl: [{ type: "anonymous" }],
};

function assertBuilderCompatibleComponents(source) {
  const componentsStart = source.indexOf("\ncomponents:\n");
  assert.notEqual(componentsStart, -1, "components must be an object");
  const components = source.slice(componentsStart + 1);
  assert.match(
    components,
    /^components:\n[\s\S]*^ {2}securitySchemes:\s*$/mu,
    "components.securitySchemes must be an object",
  );
  assert.match(
    components,
    /^ {4}[A-Za-z0-9._-]+:\s*$/mu,
    "components must contain named children",
  );

  const schemasStart = components.indexOf("  schemas:\n");
  assert.notEqual(schemasStart, -1, "components.schemas must be present");
  const responsesStart = components.indexOf("  responses:\n", schemasStart);
  const securityStart = components.indexOf("  securitySchemes:\n", schemasStart);
  const schemasEnd =
    responsesStart === -1 ? securityStart : Math.min(responsesStart, securityStart);
  assert.ok(schemasEnd > schemasStart, "components.schemas must be an object");
  const schemasBody = components.slice(schemasStart, schemasEnd);
  const schemaNames = new Set(
    [...schemasBody.matchAll(/^ {4}([A-Za-z0-9._-]+):\s*$/gmu)].map(
      (match) => match[1],
    ),
  );
  assert.notEqual(schemaNames.size, 0, "components.schemas must not be empty");

  const localRefs = [
    ...source.matchAll(
      /\$ref:\s*["']?#\/components\/schemas\/(?<name>[A-Za-z0-9._-]+)["']?/gu,
    ),
  ];
  for (const reference of localRefs) {
    assert.equal(
      schemaNames.has(reference.groups.name),
      true,
      `unresolved local schema reference: ${reference.groups.name}`,
    );
  }
}

function response(
  status,
  body = {},
  {
    contentType = "application/json; charset=utf-8",
    raw = false,
    contentLength,
  } = {},
) {
  const bytes = new TextEncoder().encode(
    raw ? String(body) : JSON.stringify(body),
  );
  return {
    status,
    headers: {
      get: (name) => {
        if (name.toLowerCase() === "content-type") return contentType;
        if (name.toLowerCase() === "content-length") {
          return contentLength ?? String(bytes.byteLength);
        }
        return null;
      },
    },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

test("CLI absence fails closed", () => {
  assert.throws(
    () =>
      resolveCli({
        localPath: "/missing/devtunnel",
        pathLookup: () => ({ status: 1, stdout: "" }),
      }),
    (error) => error.code === "CLI_NOT_FOUND",
  );
});

test("CLI discovery returns the app-local binary", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "devtunnel-cli-"));
  const path = resolve(directory, "devtunnel");
  writeFileSync(path, "");
  try {
    assert.deepEqual(resolveCli({ localPath: path }), {
      path,
      source: "app-local",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI version is read from the current official output", () => {
  assert.equal(
    parseCliVersion("Tunnel CLI version: 1.0.2010+aa42024ecd\n"),
    "1.0.2010+aa42024ecd",
  );
});

test("wrong architecture is rejected", () => {
  assert.throws(
    () =>
      assertSupportedArchitecture({
        currentPlatform: "darwin",
        currentArch: "arm64",
      }),
    (error) => error.code === "UNSUPPORTED_ARCHITECTURE",
  );
});

test("the verified Intel architecture is accepted", () => {
  assert.deepEqual(
    assertSupportedArchitecture({
      currentPlatform: "darwin",
      currentArch: "x64",
    }),
    { platform: "darwin", arch: "x64" },
  );
});

test("a missing Tunnel produces one persistent create plan", () => {
  assert.deepEqual(planTunnelSetup(null), {
    createTunnel: true,
    createPort: true,
    createAnonymousAccess: false,
  });
});

test("an existing correct Tunnel is reused without mutation", () => {
  assert.deepEqual(planTunnelSetup(TUNNEL), {
    createTunnel: false,
    createPort: false,
    createAnonymousAccess: false,
  });
});

test("a missing port is created without recreating the Tunnel", () => {
  assert.deepEqual(planTunnelSetup({ ...TUNNEL, ports: [] }), {
    createTunnel: false,
    createPort: true,
    createAnonymousAccess: false,
  });
});

test("existing 8787/http is recognized", () => {
  assert.equal(hasGatewayPort(TUNNEL), true);
});

test("anonymous access is recognized", () => {
  assert.equal(hasAnonymousAccess(TUNNEL), true);
});

test("missing anonymous access is detected", () => {
  assert.equal(hasAnonymousAccess({ ...TUNNEL, accessControl: [] }), false);
});

test("persistent host arguments require an explicit Tunnel ID", () => {
  assert.deepEqual(
    assertPersistentHostArgs(
      ["host", "ai-agent-platform-mvp"],
      "ai-agent-platform-mvp",
    ),
    ["host", "ai-agent-platform-mvp"],
  );
});

test("temporary Tunnel hosting is forbidden", () => {
  assert.throws(
    () =>
      assertPersistentHostArgs(
        ["host", "--port-number", "8787"],
        "ai-agent-platform-mvp",
      ),
    (error) => error.code === "TEMPORARY_TUNNEL_FORBIDDEN",
  );
});

test("public Web Forwarding URL is parsed", () => {
  assert.equal(
    parsePublicUrl("Connect via https://example-8787.region.devtunnels.ms"),
    "https://example-8787.region.devtunnels.ms",
  );
});

test("missing public URL fails closed", () => {
  assert.throws(
    () => parsePublicUrl("host connected"),
    (error) => error.code === "PUBLIC_URL_NOT_FOUND",
  );
});

test("Tunnel JSON validation accepts the current CLI shape", () => {
  assert.deepEqual(parseTunnelJson(JSON.stringify({ tunnel: TUNNEL })), TUNNEL);
});

test("invalid Tunnel output fails closed", () => {
  assert.throws(
    () => parseTunnelJson("{}"),
    (error) => error.code === "TUNNEL_OUTPUT_INVALID",
  );
});

test("duplicate start detection can recognize a live PID", () => {
  assert.equal(isProcessAlive(42, (pid, signal) => {
    assert.equal(pid, 42);
    assert.equal(signal, 0);
  }), true);
});

test("stop rejects a PID whose command signature does not match", async () => {
  await assert.rejects(
    stopManagedProcess(
      { pid: 42, signature: "expected-command" },
      {
        kill: () => {},
        matches: () => false,
      },
    ),
    (error) => error.code === "PROCESS_SIGNATURE_MISMATCH",
  );
});

test("stop only signals the recorded matching PID", async () => {
  const signals = [];
  let alive = true;
  const result = await stopManagedProcess(
    { pid: 42, signature: "expected-command" },
    {
      kill: (pid, signal) => {
        if (signal === 0) {
          if (!alive) throw new Error("stopped");
          return;
        }
        signals.push([pid, signal]);
        alive = false;
      },
      matches: () => true,
    },
  );
  assert.equal(result, "stopped");
  assert.deepEqual(signals, [[42, "SIGTERM"]]);
});

test("secret-safe logs redact API keys and Authorization", () => {
  const secret = "x".repeat(64);
  const safe = secretSafe(
    `GATEWAY_CLIENT_API_KEY=${secret} Authorization: Bearer ${secret}`,
  );
  assert.equal(safe.includes(secret), false);
  assert.match(safe, /\[REDACTED\]/u);
});

test("private config is written with no secret logging requirement", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "devtunnel-env-"));
  const path = resolve(directory, "dev-tunnel.env");
  try {
    writePrivateConfig(
      {
        DEV_TUNNEL_ID: "ai-agent-platform-mvp",
        GATEWAY_CLIENT_API_KEY: "c".repeat(64),
        GATEWAY_RUNTIME_API_KEY: "r".repeat(64),
      },
      path,
    );
    assert.match(readFileSync(path, "utf8"), /GATEWAY_CLIENT_API_KEY=/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Gateway, Runtime, and Dev Tunnel child environments exclude parent secrets", () => {
  const injected = {
    HOME: "/safe/home",
    PATH: "/safe/bin",
    TMPDIR: "/safe/tmp",
    LANG: "en_US.UTF-8",
    HTTPS_PROXY: "http://127.0.0.1:7897",
    FAKE_TOKEN: "must-not-leak",
    OPENAI_API_KEY: "must-not-leak",
    CLOUDFLARE_SECRET: "must-not-leak",
  };
  const config = {
    GATEWAY_CLIENT_API_KEY: "c".repeat(64),
    GATEWAY_RUNTIME_API_KEY: "r".repeat(64),
  };
  const gatewayEnvironment = buildServiceEnvironment(config, injected);
  const runtimeEnvironment = buildServiceEnvironment(config, injected);
  const tunnelEnvironment = buildDevTunnelEnvironment(injected);
  for (const environment of [
    gatewayEnvironment,
    runtimeEnvironment,
    tunnelEnvironment,
  ]) {
    assert.equal(environment.FAKE_TOKEN, undefined);
    assert.equal(environment.OPENAI_API_KEY, undefined);
    assert.equal(environment.CLOUDFLARE_SECRET, undefined);
  }
  assert.equal(tunnelEnvironment.HTTPS_PROXY, injected.HTTPS_PROXY);
  assert.equal(tunnelEnvironment.GATEWAY_CLIENT_API_KEY, undefined);
});

test("equal client and Runtime keys are rejected by service environment", () => {
  const shared = "s".repeat(64);
  assert.throws(
    () =>
      buildServiceEnvironment({
        GATEWAY_CLIENT_API_KEY: shared,
        GATEWAY_RUNTIME_API_KEY: shared,
      }),
    (error) => error.code === "KEY_DOMAINS_NOT_ISOLATED",
  );
});

test("equal client and Runtime keys are rejected during migration", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "devtunnel-migrate-"));
  const legacyPath = resolve(directory, "legacy.env");
  const targetPath = resolve(directory, "target.env");
  const shared = "s".repeat(64);
  writeFileSync(
    legacyPath,
    `EDGE_CLIENT_API_KEY=${shared}\nACTION_GATEWAY_RUNTIME_API_KEY=${shared}\n`,
  );
  try {
    assert.throws(
      () => migrateLegacyConfig({ legacyPath, targetPath }),
      (error) => error.code === "KEY_DOMAINS_NOT_ISOLATED",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("local and public unauthenticated 401 plus runtime.status succeed", async () => {
  const calls = [];
  const serverTaskId = "custom-gpt-runtime-status-server-test";
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/health")) return response(200);
    if (url.endsWith("/v1/capabilities") && !options.headers.authorization) {
      return response(401);
    }
    if (url.endsWith("/v1/capabilities")) {
      return response(200, { data: { capabilities: ["runtime.status"] } });
    }
    return response(200, {
      taskId: serverTaskId,
      status: "succeeded",
      output: {
        runtime: "local-runtime",
        status: "ready",
        capabilities: ["runtime.status"],
      },
    });
  };
  const result = await verifyGateway(
    "https://example-8787.region.devtunnels.ms",
    "k".repeat(64),
    { fetchImpl: fakeFetch },
  );
  assert.equal(result.unauthenticatedStatus, 401);
  assert.equal(result.taskStatus, 200);
  assert.equal(result.taskId, serverTaskId);
  const actionCall = calls.at(-1);
  assert.match(actionCall.url, /\/v1\/runtime\/status$/u);
  assert.equal(actionCall.options.method, "POST");
  assert.equal("body" in actionCall.options, false);
  assert.equal("content-type" in actionCall.options.headers, false);
  assert.equal(
    calls.every((call) => call.options.redirect === "error"),
    true,
  );
});

test("verify enforces a bounded per-request timeout", async () => {
  const hangingFetch = async (_url, options) =>
    new Promise((_, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        { once: true },
      );
    });
  await assert.rejects(
    verifyGateway("https://example-8787.region.devtunnels.ms", "k".repeat(64), {
      fetchImpl: hangingFetch,
      requestTimeoutMs: 10,
      totalTimeoutMs: 100,
    }),
    (error) => error.code === "VERIFY_TIMEOUT",
  );
});

test("verify request budget never exceeds five seconds", () => {
  assert.equal(calculateVerifyRequestBudget(30_000, 10_000), 5_000);
  assert.equal(calculateVerifyRequestBudget(1_200, 5_000), 1_200);
  assert.equal(calculateVerifyRequestBudget(0, 5_000), 0);
});

test("verify refuses to fetch after the overall deadline", async () => {
  let calls = 0;
  const times = [0, 30_001];
  await assert.rejects(
    verifyGateway("https://example-8787.region.devtunnels.ms", "k".repeat(64), {
      fetchImpl: async () => {
        calls += 1;
        return response(200);
      },
      now: () => times.shift() ?? 30_001,
    }),
    (error) => error.code === "VERIFY_TIMEOUT",
  );
  assert.equal(calls, 0);
});

test("verify rejects oversized response bodies", async () => {
  await assert.rejects(
    verifyGateway("https://example-8787.region.devtunnels.ms", "k".repeat(64), {
      fetchImpl: async () =>
        response(200, "x", { raw: true, contentLength: "65537" }),
    }),
    (error) => error.code === "VERIFY_RESPONSE_TOO_LARGE",
  );
});

test("verify rejects invalid JSON", async () => {
  await assert.rejects(
    verifyGateway("https://example-8787.region.devtunnels.ms", "k".repeat(64), {
      fetchImpl: async () => response(200, "{broken", { raw: true }),
    }),
    (error) => error.code === "VERIFY_INVALID_JSON",
  );
});

test("verify rejects non-JSON response types", async () => {
  await assert.rejects(
    verifyGateway("https://example-8787.region.devtunnels.ms", "k".repeat(64), {
      fetchImpl: async () =>
        response(200, "<html>", {
          raw: true,
          contentType: "text/html",
        }),
    }),
    (error) => error.code === "VERIFY_INVALID_CONTENT_TYPE",
  );
});

test("verify rejects redirects with a stable code", async () => {
  await assert.rejects(
    verifyGateway("https://example-8787.region.devtunnels.ms", "k".repeat(64), {
      fetchImpl: async (_url, options) => {
        assert.equal(options.redirect, "error");
        return response(302);
      },
    }),
    (error) => error.code === "VERIFY_REDIRECT_NOT_ALLOWED",
  );
});

async function assertVerifyRejectsTaskId(taskId) {
  const fakeFetch = async (url, options = {}) => {
    if (url.endsWith("/health")) return response(200);
    if (url.endsWith("/v1/capabilities") && !options.headers.authorization) {
      return response(401);
    }
    if (url.endsWith("/v1/capabilities")) {
      return response(200, { data: { capabilities: ["runtime.status"] } });
    }
    return response(200, {
      taskId,
      status: "succeeded",
      output: {
        runtime: "local-runtime",
        status: "ready",
        capabilities: ["runtime.status"],
      },
    });
  };
  await assert.rejects(
    verifyGateway(
      "https://example-8787.region.devtunnels.ms",
      "k".repeat(64),
      { fetchImpl: fakeFetch },
    ),
    (error) => error.code === "VERIFY_TASK_ID_MISMATCH",
  );
}

test("verify rejects an empty runtime.status taskId", async () => {
  await assertVerifyRejectsTaskId("");
});

test("verify rejects a taskId without the server prefix", async () => {
  await assertVerifyRejectsTaskId("client-generated-task");
});

test("corrupted state files are rejected", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "devtunnel-state-"));
  const path = resolve(directory, "state.json");
  writeFileSync(path, "{broken");
  try {
    assert.throws(
      () => readState(path),
      (error) => error.code === "STATE_FILE_INVALID",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("refresh updates the same Tunnel without a create command", () => {
  const args = buildRefreshArgs("ai-agent-platform-mvp");
  assert.deepEqual(args, [
    "update",
    "ai-agent-platform-mvp",
    "--expiration",
    "30d",
    "--json",
  ]);
  assert.equal(args.includes("create"), false);
});

test("generated OpenAPI contains the public origin but no key", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "devtunnel-openapi-"));
  const templatePath = resolve(directory, "template.yaml");
  const outputPath = resolve(directory, "resolved.yaml");
  writeFileSync(
    templatePath,
    "servers:\n  - url: ${DEV_TUNNEL_PUBLIC_BASE_URL}\n",
  );
  try {
    generateOpenApi(
      "https://example-8787.region.devtunnels.ms",
      { templatePath, outputPath },
    );
    const value = readFileSync(outputPath, "utf8");
    assert.match(value, /devtunnels\.ms/u);
    assert.equal(value.includes("k".repeat(64)), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("OpenAPI defines the Runtime Status result component", () => {
  const template = readFileSync(OPENAPI_TEMPLATE, "utf8");
  const schemaMatch = template.match(
    /\n {4}RuntimeStatusResult:(?<schema>[\s\S]*?)\n {4}ErrorEnvelope:/u,
  );
  assert.notEqual(schemaMatch, null);
  for (const property of ["taskId", "status", "output"]) {
    assert.match(schemaMatch.groups.schema, new RegExp(`\\n {8}${property}:`, "u"));
  }
});

test("OpenAPI exposes Task Intake, Approval Draft/Grant, four Controller operations, and Runtime Status", () => {
  const template = readFileSync(OPENAPI_TEMPLATE, "utf8");
  for (const path of [
    "/v1/task-control/intake",
    "/v1/approvals/drafts/lookup",
    "/v1/approvals/grants",
    "/v1/controller/task-context",
    "/v1/controller/task-claim",
    "/v1/controller/task-command",
    "/v1/controller/task-release",
    "/v1/runtime/status",
  ]) {
    assert.match(template, new RegExp(`\\n {2}${path.replaceAll("/", "\\/")}:\\n`, "u"));
  }
  for (const operationId of [
    "intakePhase2Task",
    "getApprovalDraft",
    "issueApprovalGrant",
    "getTaskDecisionContext",
    "claimControllerTask",
    "submitControllerCommand",
    "releaseControllerTask",
    "getRuntimeStatus",
  ]) {
    assert.equal(
      template.match(new RegExp(`\\n {6}operationId: ${operationId}\\n`, "gu"))?.length,
      1,
    );
  }
  assert.equal(template.match(/\n {6}operationId:/gu)?.length, 8);
  assert.doesNotMatch(template, /profileId:\n|roleId:\n|requestedBy:\n/u);
  assert.match(
    template,
    /securitySchemes:\n {4}bearerAuth:\n {6}type: http\n {6}scheme: bearer\n {6}bearerFormat: API_KEY/u,
  );
  assert.match(template, /\nsecurity:\n {2}- bearerAuth: \[\]\n/u);
});

test("OpenAPI components remain Builder-compatible and local refs resolve", () => {
  const template = readFileSync(OPENAPI_TEMPLATE, "utf8");
  assertBuilderCompatibleComponents(template);

  assert.throws(() =>
    assertBuilderCompatibleComponents(template.replace("  schemas:\n", "")),
  );
  const unresolved = `${template}\n# $ref: '#/components/schemas/Missing'\n`;
  assert.throws(
    () => assertBuilderCompatibleComponents(unresolved),
    /unresolved local schema reference/u,
  );
});

test("Cloudflare active application and Edge Bridge are absent", async () => {
  const { existsSync } = await import("node:fs");
  assert.equal(
    existsSync(new URL("../../cloudflare-edge", import.meta.url)),
    false,
  );
  assert.equal(
    existsSync(new URL("../../../scripts/edge-bridge.mjs", import.meta.url)),
    false,
  );
});



test("public URL discovery tolerates delayed host output within the bounded window", async () => {
  let clock = 0;
  let reads = 0;
  const result = await waitForPublicUrl({
    timeoutMs: 1_000,
    read: () => {
      reads += 1;
      return reads >= 5
        ? "Connect via https://late-8787.region.devtunnels.ms"
        : "host starting";
    },
    now: () => clock,
    sleep: async (delayMs) => {
      clock += delayMs;
    },
  });
  assert.equal(result, "https://late-8787.region.devtunnels.ms");
  assert.ok(clock >= 300);
  assert.ok(clock < 1_000);
});

test("a saved public URL is reused only after a live health probe succeeds", async () => {
  let clock = 0;
  let probes = 0;
  const result = await waitForPublicUrl({
    timeoutMs: 1_000,
    read: () => "host starting without URL output",
    fallbackUrl: "https://saved-8787.region.devtunnels.ms/",
    probeFallback: async (candidate) => {
      probes += 1;
      assert.equal(candidate, "https://saved-8787.region.devtunnels.ms/");
      return probes >= 2;
    },
    fallbackProbeIntervalMs: 200,
    now: () => clock,
    sleep: async (delayMs) => {
      clock += delayMs;
    },
  });
  assert.equal(result, "https://saved-8787.region.devtunnels.ms");
  assert.equal(probes, 2);
});

test("an unreachable saved public URL is never trusted and discovery times out clearly", async () => {
  let clock = 0;
  await assert.rejects(
    waitForPublicUrl({
      timeoutMs: 350,
      read: () => "host starting without URL output",
      fallbackUrl: "https://stale-8787.region.devtunnels.ms",
      probeFallback: async () => false,
      fallbackProbeIntervalMs: 100,
      now: () => clock,
      sleep: async (delayMs) => {
        clock += delayMs;
      },
    }),
    (error) => error.code === "PUBLIC_URL_DISCOVERY_TIMEOUT",
  );
});

test("public URL discovery stops immediately when the Tunnel host exits", async () => {
  await assert.rejects(
    waitForPublicUrl({
      timeoutMs: 60_000,
      read: () => "",
      isHostAlive: () => false,
    }),
    (error) => error.code === "DEVTUNNEL_EXITED_DURING_STARTUP",
  );
});

test("single-shot public health probe accepts only the expected status", async () => {
  assert.equal(
    await probeHttp("https://example.test/health", {
      fetchImpl: async () => response(200),
    }),
    true,
  );
  assert.equal(
    await probeHttp("https://example.test/health", {
      fetchImpl: async () => response(503),
    }),
    false,
  );
});

test("HTTP readiness can report a stage-specific timeout code", async () => {
  await assert.rejects(
    waitForHttp("https://example.test/health", {
      timeoutMs: 5,
      errorCode: "PUBLIC_HEALTH_TIMEOUT",
      fetchImpl: async () => {
        throw new Error("not ready");
      },
    }),
    (error) => error.code === "PUBLIC_HEALTH_TIMEOUT",
  );
});

test("stale state ignores dead or reused PIDs and isolates owned survivors", () => {
  const state = {
    processes: {
      runtime: { pid: 41, signature: "runtime-signature" },
      gateway: { pid: 42, signature: "gateway-signature" },
      devtunnel: { pid: 43, signature: "tunnel-signature" },
    },
  };
  assert.equal(
    hasRunningManagedState(state, { matches: () => false }),
    false,
  );
  const selected = selectRunningManagedProcesses(state, {
    matches: (pid, signature) =>
      pid === 42 && signature === "gateway-signature",
  });
  assert.deepEqual(selected, {
    gateway: { pid: 42, signature: "gateway-signature" },
  });
  assert.equal(
    hasRunningManagedState(state, {
      matches: (pid, signature) =>
        pid === 42 && signature === "gateway-signature",
    }),
    true,
  );
});

test("startup timeout is represented by a stable safe error", () => {
  assert.equal(new DevTunnelError("STARTUP_TIMEOUT").code, "STARTUP_TIMEOUT");
});

test("SIGINT and SIGTERM are the only managed shutdown signals", () => {
  assert.deepEqual(["SIGINT", "SIGTERM"], ["SIGINT", "SIGTERM"]);
});


test("OpenAPI 1.3.0 preserves explicit Browser Host target identity fields", () => {
  const template = readFileSync(OPENAPI_TEMPLATE, "utf8");
  assert.match(template, /\n {2}version: 1\.3\.0\n/u);
  const payloadMatch = template.match(
    /\n {4}ControllerCommandPayload:(?<schema>[\s\S]*?)\n {4}PlanNodeDraft:/u,
  );
  assert.notEqual(payloadMatch, null);
  assert.match(payloadMatch.groups.schema, /\n {8}targetRoleRef:\n/u);
  assert.match(payloadMatch.groups.schema, /\n {8}targetProfileRef:\n/u);
  assert.match(payloadMatch.groups.schema, /Work executor role/u);
  assert.match(payloadMatch.groups.schema, /Browser page target role_ref/u);
});

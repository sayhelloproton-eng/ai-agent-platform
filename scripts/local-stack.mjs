import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_GATEWAY_PORT = 8787;
const DEFAULT_RUNTIME_PORT = 8790;
const READY_TIMEOUT_MS = 10_000;
const SHUTDOWN_TIMEOUT_MS = 2_000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

let runtimeProcess;
let gatewayProcess;
let cleanupPromise;
let stopping = false;

function isValidApiKey(value) {
  return (
    typeof value === "string" &&
    value.length >= 32 &&
    value.length <= 256 &&
    !/\s/.test(value)
  );
}

function resolveHost(value) {
  const host = value ?? DEFAULT_HOST;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("Local stack hosts must use Loopback addresses.");
  }
  return host;
}

function resolvePort(value, defaultPort) {
  if (value === undefined) {
    return defaultPort;
  }
  if (!/^\d+$/.test(value)) {
    throw new Error("Local stack ports must be integers from 1 to 65535.");
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Local stack ports must be integers from 1 to 65535.");
  }
  return port;
}

function formatHost(host) {
  return host === "::1" ? "[::1]" : host;
}

function validateEnvironment(environment) {
  if (!isValidApiKey(environment.ACTION_GATEWAY_API_KEY)) {
    throw new Error("A valid external Gateway API key is required.");
  }
  if (
    !isValidApiKey(environment.ACTION_GATEWAY_RUNTIME_API_KEY) ||
    !isValidApiKey(environment.LOCAL_RUNTIME_API_KEY)
  ) {
    throw new Error("Valid internal Runtime API keys are required.");
  }
  if (
    environment.ACTION_GATEWAY_RUNTIME_API_KEY !==
    environment.LOCAL_RUNTIME_API_KEY
  ) {
    throw new Error("The two internal Runtime API keys must match.");
  }

  const runtimeHost = resolveHost(environment.LOCAL_RUNTIME_HOST);
  const runtimePort = resolvePort(
    environment.LOCAL_RUNTIME_PORT,
    DEFAULT_RUNTIME_PORT,
  );
  const gatewayHost = resolveHost(environment.ACTION_GATEWAY_HOST);
  const gatewayPort = resolvePort(
    environment.ACTION_GATEWAY_PORT,
    DEFAULT_GATEWAY_PORT,
  );

  return {
    runtimeHost,
    runtimePort,
    runtimeUrl: `http://${formatHost(runtimeHost)}:${runtimePort}`,
    gatewayHost,
    gatewayPort,
    gatewayUrl: `http://${formatHost(gatewayHost)}:${gatewayPort}`,
  };
}

function startService(name, entrypoint, environment) {
  const child = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: environment,
    stdio: ["ignore", "ignore", "ignore"],
  });
  child.once("error", () => {
    if (!stopping) {
      process.exitCode = 1;
    }
  });
  console.log(`${name} started pid=${child.pid ?? "unknown"}`);
  return child;
}

async function waitForReady(name, url, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`${name} exited before becoming ready.`);
    }

    try {
      const response = await fetch(`${url}/ready`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) {
        await response.body?.cancel();
        console.log(`${name} ready at ${url}`);
        return;
      }
      await response.body?.cancel();
    } catch {
      // Startup polling is bounded by READY_TIMEOUT_MS.
    }

    await delay(50);
  }

  throw new Error(`${name} did not become ready in time.`);
}

async function waitForExit(child, timeoutMs) {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exitedInTime = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

  if (!exitedInTime && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function cleanup() {
  if (cleanupPromise !== undefined) {
    return cleanupPromise;
  }

  stopping = true;
  cleanupPromise = (async () => {
    for (const child of [gatewayProcess, runtimeProcess]) {
      if (
        child !== undefined &&
        child.exitCode === null &&
        child.signalCode === null
      ) {
        child.kill("SIGTERM");
      }
    }
    await Promise.all([
      waitForExit(gatewayProcess, SHUTDOWN_TIMEOUT_MS),
      waitForExit(runtimeProcess, SHUTDOWN_TIMEOUT_MS),
    ]);
    console.log("Local stack shutdown complete.");
  })();

  return cleanupPromise;
}

function waitForUnexpectedExit(children) {
  return new Promise((_, reject) => {
    for (const [name, child] of children) {
      if (child.exitCode !== null || child.signalCode !== null) {
        reject(new Error(`${name} exited unexpectedly.`));
        return;
      }
      child.once("exit", () => {
        if (!stopping) {
          reject(new Error(`${name} exited unexpectedly.`));
        }
      });
    }
  });
}

async function main() {
  let stage = "configuration";
  try {
    const configuration = validateEnvironment(process.env);
    const childEnvironment = {
      ...process.env,
      ACTION_GATEWAY_RUNTIME_URL:
        process.env.ACTION_GATEWAY_RUNTIME_URL ?? configuration.runtimeUrl,
    };

    stage = "runtime-start";
    runtimeProcess = startService(
      "Local Runtime",
      "apps/local-runtime/dist/server.js",
      childEnvironment,
    );
    stage = "runtime-ready";
    await waitForReady(
      "Local Runtime",
      configuration.runtimeUrl,
      runtimeProcess,
    );

    stage = "gateway-start";
    gatewayProcess = startService(
      "Action Gateway",
      "apps/action-gateway/dist/server.js",
      childEnvironment,
    );
    stage = "gateway-ready";
    await waitForReady(
      "Action Gateway",
      configuration.gatewayUrl,
      gatewayProcess,
    );

    console.log(
      `Local stack ready: Gateway ${configuration.gatewayUrl}; Runtime ${configuration.runtimeUrl}`,
    );
    await waitForUnexpectedExit([
      ["Local Runtime", runtimeProcess],
      ["Action Gateway", gatewayProcess],
    ]);
  } catch {
    console.error(`Local stack failed during ${stage}.`);
    process.exitCode = 1;
    await cleanup();
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void cleanup().then(() => {
      process.exit(0);
    });
  });
}

await main();

import {
  GATEWAY_URL,
  REPO_ROOT,
  RUNTIME_URL,
  assertPersistentHostArgs,
  buildDevTunnelEnvironment,
  buildServiceEnvironment,
  clearManagedLogs,
  generateOpenApi,
  isProcessAlive,
  readPrivateConfig,
  readState,
  removeState,
  resolveCli,
  runCommand,
  spawnManaged,
  stopRecordedState,
  waitForHttp,
  waitForPublicUrl,
  writePrivateConfig,
  writeState,
} from "./lib.mjs";

let partialState = null;
let stopping = false;

async function stopFromSignal() {
  if (stopping) return;
  stopping = true;
  if (partialState) {
    await stopRecordedState(partialState);
  }
  removeState();
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void stopFromSignal();
  });
}

try {
  const existing = readState();
  if (
    existing?.processes &&
    Object.values(existing.processes).some((record) =>
      isProcessAlive(record?.pid),
    )
  ) {
    throw new Error("ALREADY_RUNNING");
  }
  removeState();
  const config = readPrivateConfig();
  const previousPublicBaseUrl = config.DEV_TUNNEL_PUBLIC_BASE_URL;
  const tunnelId = config.DEV_TUNNEL_ID;
  const serviceEnvironment = buildServiceEnvironment(config);
  const devTunnelEnvironment = buildDevTunnelEnvironment();
  runCommand("npm", ["run", "local:build"], {
    cwd: REPO_ROOT,
    errorCode: "LOCAL_BUILD_FAILED",
  });
  clearManagedLogs();
  const runtimePid = spawnManaged(
    "runtime",
    process.execPath,
    ["apps/local-runtime/dist/server.js"],
    serviceEnvironment,
  );
  partialState = {
    version: 1,
    tunnelId,
    processes: {
      runtime: {
        pid: runtimePid,
        signature: "apps/local-runtime/dist/server.js",
      },
    },
  };
  writeState(partialState);
  await waitForHttp(`${RUNTIME_URL}/ready`);

  const gatewayPid = spawnManaged(
    "gateway",
    process.execPath,
    ["apps/action-gateway/dist/server.js"],
    serviceEnvironment,
  );
  partialState.processes.gateway = {
    pid: gatewayPid,
    signature: "apps/action-gateway/dist/server.js",
  };
  writeState(partialState);
  await waitForHttp(`${GATEWAY_URL}/ready`);

  const cli = resolveCli();
  const hostArgs = assertPersistentHostArgs(
    ["host", tunnelId],
    tunnelId,
  );
  const devtunnelPid = spawnManaged(
    "devtunnel",
    cli.path,
    hostArgs,
    devTunnelEnvironment,
  );
  partialState.processes.devtunnel = {
    pid: devtunnelPid,
    signature: `devtunnel host ${tunnelId}`,
  };
  writeState(partialState);
  const publicBaseUrl = await waitForPublicUrl();
  await waitForHttp(`${publicBaseUrl}/health`, {
    headers: {
      accept: "application/json",
      "x-tunnel-skip-antiphishing-page": "true",
    },
  });
  const readyState = {
    ...partialState,
    status: "running",
    publicUrlState: "available",
    urlStableFromPreviousRun:
      previousPublicBaseUrl === undefined
        ? null
        : previousPublicBaseUrl === publicBaseUrl,
    startedAt: new Date().toISOString(),
  };
  writeState(readyState);
  writePrivateConfig({ ...config, DEV_TUNNEL_PUBLIC_BASE_URL: publicBaseUrl });
  generateOpenApi(publicBaseUrl);
  console.log("start: PASS");
  console.log(`runtime_pid: ${runtimePid}`);
  console.log(`gateway_pid: ${gatewayPid}`);
  console.log(`devtunnel_pid: ${devtunnelPid}`);
  console.log("public_url_state: AVAILABLE");
  await new Promise((_, reject) => {
    const timer = setInterval(() => {
      if (stopping) {
        clearInterval(timer);
        return;
      }
      if (readState() === null) {
        stopping = true;
        clearInterval(timer);
        process.exit(0);
      }
      const stopped = Object.entries(readyState.processes).find(
        ([, record]) => !isProcessAlive(record.pid),
      );
      if (stopped) {
        clearInterval(timer);
        reject(new Error(`${stopped[0].toUpperCase()}_EXITED_UNEXPECTEDLY`));
      }
    }, 500);
  });
} catch (error) {
  if (partialState) {
    try {
      await stopRecordedState(partialState);
    } catch {
      // A failed cleanup is reported by the state retained below.
    }
  }
  console.error(`start: FAIL (${error.code ?? error.message ?? "UNKNOWN"})`);
  process.exitCode = 1;
}

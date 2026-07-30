import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { arch, platform } from "node:os";

import {
  LEGACY_CONFIG,
  LOCAL_CLI,
  PRIVATE_CONFIG,
  isValidApiKey,
  isProcessAlive,
  assertIsolatedKeyDomains,
  hasAnonymousAccess,
  hasGatewayPort,
  mode,
  parseCliVersion,
  parseTunnelJson,
  readPrivateConfig,
  readState,
  resolveCli,
  runCommand,
} from "./lib.mjs";

let failed = false;
function report(name, passed, detail = "") {
  if (!passed) failed = true;
  console.log(`${name}: ${passed ? "PASS" : "FAIL"}${detail ? ` (${detail})` : ""}`);
}

report("platform", platform() === "darwin" && arch() === "x64", `${platform()} ${arch()}`);
report("node", process.versions.node.startsWith("20."), process.versions.node);
try {
  const cli = resolveCli();
  const version = parseCliVersion(
    runCommand(cli.path, ["--version"], {
      errorCode: "CLI_VERSION_FAILED",
    }).stdout,
  );
  const binary = runCommand("file", [cli.path], { errorCode: "CLI_ARCHITECTURE_CHECK_FAILED" }).stdout;
  report("devtunnel_cli", binary.includes("x86_64"), `${cli.source}; ${version}`);
  const user = JSON.parse(
    runCommand(cli.path, ["user", "show", "--json"], {
      errorCode: "LOGIN_CHECK_FAILED",
    }).stdout,
  );
  report(
    "login",
    typeof user.status === "string" &&
      !user.status.toLowerCase().includes("not logged"),
    "credential state only",
  );
} catch (error) {
  report("devtunnel_cli", false, error.code ?? "CLI_NOT_FOUND");
}
const config = readPrivateConfig();
report(
  "private_config",
  existsSync(PRIVATE_CONFIG) &&
    mode(PRIVATE_CONFIG) === 0o600 &&
    isValidApiKey(config.GATEWAY_CLIENT_API_KEY) &&
    isValidApiKey(config.GATEWAY_RUNTIME_API_KEY),
  existsSync(PRIVATE_CONFIG) ? "present" : "missing",
);
try {
  assertIsolatedKeyDomains(
    config.GATEWAY_CLIENT_API_KEY,
    config.GATEWAY_RUNTIME_API_KEY,
  );
  report("key_domains_isolated", true);
} catch (error) {
  report("key_domains_isolated", false, error.code);
}
report("legacy_config", true, existsSync(LEGACY_CONFIG) ? "migration source present" : "absent");
try {
  const tunnel = parseTunnelJson(
    runCommand(resolveCli().path, [
      "show",
      config.DEV_TUNNEL_ID,
      "--json",
    ], { errorCode: "TUNNEL_NOT_FOUND" }).stdout,
  );
  report("persistent_tunnel", true, "reused");
  report("gateway_port", hasGatewayPort(tunnel), "8787/http");
  report("anonymous_access", hasAnonymousAccess(tunnel), "Gateway Bearer remains required");
  const relativeDays = /^(\d+)\s+days?$/u.exec(tunnel.tunnelExpiration);
  const expiresAt = Date.parse(tunnel.tunnelExpiration);
  const remainingDays = relativeDays
    ? Number(relativeDays[1])
    : Number.isFinite(expiresAt)
      ? Math.floor((expiresAt - Date.now()) / 86_400_000)
      : -1;
  report("inactivity_expiration", remainingDays >= 7, remainingDays >= 0 ? `${remainingDays}d remaining` : "unknown");
} catch (error) {
  report("persistent_tunnel", false, error.code ?? "UNKNOWN");
}
try {
  const state = readState();
  report("runtime_state", true, state ? "present" : "not started");
  if (state?.processes) {
    for (const name of ["runtime", "gateway", "devtunnel"]) {
      report(
        `${name}_process`,
        isProcessAlive(state.processes[name]?.pid),
        "single recorded instance",
      );
    }
  }
} catch (error) {
  report("runtime_state", false, error.code);
}
report("cloudflare_active_app", !existsSync(new URL("../../cloudflare-edge", import.meta.url)), "must be absent");
report("local_cli_path", existsSync(LOCAL_CLI), existsSync(LOCAL_CLI) ? "app-local" : "not installed");
for (const port of [8787, 8790]) {
  const listeners = spawnSync(
    "lsof",
    ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
    { encoding: "utf8" },
  ).stdout
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  report(`port_${port}`, listeners.length <= 1, `${listeners.length} listener`);
}
report(
  "public_url_state",
  typeof config.DEV_TUNNEL_PUBLIC_BASE_URL === "string",
  config.DEV_TUNNEL_PUBLIC_BASE_URL ? "available" : "not hosted",
);
process.exitCode = failed ? 1 : 0;

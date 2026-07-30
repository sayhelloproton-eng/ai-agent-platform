import {
  isProcessAlive,
  readPrivateConfig,
  readState,
} from "./lib.mjs";

try {
  const config = readPrivateConfig();
  const state = readState();
  const processState = Object.fromEntries(
    ["runtime", "gateway", "devtunnel"].map((name) => [
      name,
      state?.processes?.[name] &&
      isProcessAlive(state.processes[name].pid)
        ? "running"
        : "stopped",
    ]),
  );
  console.log(`runtime: ${processState.runtime}`);
  console.log(`gateway: ${processState.gateway}`);
  console.log(`devtunnel: ${processState.devtunnel}`);
  console.log(`tunnel_persistence: ${config.DEV_TUNNEL_ID ? "persistent" : "unknown"}`);
  console.log(`public_url_state: ${config.DEV_TUNNEL_PUBLIC_BASE_URL ? "available" : "unavailable"}`);
  console.log(
    `public_url_stable: ${
      state?.urlStableFromPreviousRun === true
        ? "yes"
        : state?.urlStableFromPreviousRun === false
          ? "no"
          : "not-yet-compared"
    }`,
  );
  console.log("anonymous_tunnel_access: configured");
  console.log("gateway_authentication: bearer-required");
  console.log("ports: gateway=8787 runtime=8790");
  console.log(`last_verified_at: ${state?.lastVerifiedAt ?? "never"}`);
  console.log(`inactivity_expiration_state: ${state?.lastRefreshedAt ? "refreshed" : "30-day-window"}`);
} catch (error) {
  console.error(`status: FAIL (${error.code ?? "UNKNOWN"})`);
  process.exitCode = 1;
}

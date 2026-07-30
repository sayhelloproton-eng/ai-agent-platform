import {
  DEFAULT_TUNNEL_ID,
  hasAnonymousAccess,
  hasGatewayPort,
  migrateLegacyConfig,
  parseTunnelJson,
  readPrivateConfig,
  runCli,
  writePrivateConfig,
} from "./lib.mjs";

try {
  const migration = migrateLegacyConfig();
  let config = readPrivateConfig();
  const tunnelId = config.DEV_TUNNEL_ID ?? DEFAULT_TUNNEL_ID;
  let tunnel;
  try {
    tunnel = parseTunnelJson(
      runCli(["show", tunnelId, "--json"], {
        errorCode: "TUNNEL_NOT_FOUND",
      }).stdout,
    );
  } catch (error) {
    if (error.code !== "TUNNEL_NOT_FOUND") throw error;
    runCli([
      "create",
      tunnelId,
      "--allow-anonymous",
      "--expiration",
      "30d",
      "--description",
      "AI Agent Platform MVP Gateway",
      "--json",
    ], { errorCode: "TUNNEL_CREATE_FAILED" });
    tunnel = parseTunnelJson(
      runCli(["show", tunnelId, "--json"], {
        errorCode: "TUNNEL_SHOW_FAILED",
      }).stdout,
    );
  }

  if (!hasGatewayPort(tunnel)) {
    runCli([
      "port",
      "create",
      tunnelId,
      "--port-number",
      "8787",
      "--protocol",
      "http",
      "--description",
      "Action Gateway loopback port",
      "--json",
    ], { errorCode: "PORT_CREATE_FAILED" });
  }
  if (!hasAnonymousAccess(tunnel)) {
    runCli([
      "access",
      "create",
      tunnelId,
      "--anonymous",
      "--scopes",
      "connect",
      "--json",
    ], { errorCode: "ANONYMOUS_ACCESS_FAILED" });
  }

  tunnel = parseTunnelJson(
    runCli(["show", tunnelId, "--json"], {
      errorCode: "TUNNEL_SHOW_FAILED",
    }).stdout,
  );
  if (!hasGatewayPort(tunnel) || !hasAnonymousAccess(tunnel)) {
    throw new Error("TUNNEL_CONFIGURATION_INCOMPLETE");
  }
  config = { ...config, DEV_TUNNEL_ID: tunnelId };
  writePrivateConfig(config);
  console.log("setup: PASS");
  console.log(`persistent_tunnel: PASS`);
  console.log("gateway_port_8787_http: PASS");
  console.log("anonymous_tunnel_access: PASS");
  console.log(`legacy_config_source: ${migration.legacyExists ? "PRESENT" : "ABSENT"}`);
  console.log("client_key_rotated: NO");
} catch (error) {
  console.error(`setup: FAIL (${error.code ?? error.message ?? "UNKNOWN"})`);
  process.exitCode = 1;
}

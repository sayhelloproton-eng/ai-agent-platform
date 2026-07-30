import {
  readPrivateConfig,
  readState,
  runCli,
  writeState,
} from "./lib.mjs";

try {
  const config = readPrivateConfig();
  const tunnelId = config.DEV_TUNNEL_ID;
  runCli(["show", tunnelId, "--json"], {
    errorCode: "TUNNEL_OWNERSHIP_NOT_VERIFIED",
  });
  runCli(["update", tunnelId, "--expiration", "30d", "--json"], {
    errorCode: "TUNNEL_REFRESH_FAILED",
  });
  runCli(["show", tunnelId, "--json"], {
    errorCode: "TUNNEL_REFRESH_NOT_VERIFIED",
  });
  const state = readState() ?? { version: 1, tunnelId };
  writeState({ ...state, lastRefreshedAt: new Date().toISOString() });
  console.log("refresh: PASS");
  console.log("tunnel_recreated: NO");
  console.log("expiration_window: 30d");
} catch (error) {
  console.error(`refresh: FAIL (${error.code ?? "UNKNOWN"})`);
  process.exitCode = 1;
}

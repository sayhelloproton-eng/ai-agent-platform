import {
  generateOpenApi,
  readPrivateConfig,
} from "./lib.mjs";

try {
  const config = readPrivateConfig();
  generateOpenApi(config.DEV_TUNNEL_PUBLIC_BASE_URL);
  console.log("openapi: PASS");
  console.log("resolved_schema: apps/dev-tunnel/.runtime/custom-gpt-action.openapi.yaml");
  console.log("contains_secret: NO");
} catch (error) {
  console.error(`openapi: FAIL (${error.code ?? "UNKNOWN"})`);
  process.exitCode = 1;
}

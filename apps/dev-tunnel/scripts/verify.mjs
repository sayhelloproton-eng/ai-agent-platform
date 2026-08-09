import {
  GATEWAY_URL,
  readPrivateConfig,
  readState,
  verifyGateway,
  writeState,
} from "./lib.mjs";

try {
  const config = readPrivateConfig();
  const state = readState();
  const local = await verifyGateway(
    GATEWAY_URL,
    config.GATEWAY_CLIENT_API_KEY,
    { scope: "local", maxAttempts: 1 },
  );
  const publicResult = await verifyGateway(
    config.DEV_TUNNEL_PUBLIC_BASE_URL,
    config.GATEWAY_CLIENT_API_KEY,
    { scope: "public", maxAttempts: 3, retryDelayMs: 250 },
  );
  writeState({
    ...state,
    lastVerifiedAt: new Date().toISOString(),
    lastPublicTaskId: publicResult.taskId,
  });
  console.log("verify: PASS");
  console.log(`local_health_http: ${local.healthStatus}`);
  console.log(`local_unauthenticated_http: ${local.unauthenticatedStatus}`);
  console.log(`local_runtime_status_http: ${local.taskStatus}`);
  console.log(`public_health_http: ${publicResult.healthStatus}`);
  console.log(`public_unauthenticated_http: ${publicResult.unauthenticatedStatus}`);
  console.log(`public_capabilities_http: ${publicResult.authenticatedStatus}`);
  console.log(`public_runtime_status_http: ${publicResult.taskStatus}`);
  console.log(`public_task_id: ${publicResult.taskId}`);
} catch (error) {
  console.error(`verify: FAIL (${error.code ?? "UNKNOWN"})`);
  if (error.verifyScope || error.verifyStep) {
    console.error(
      `step: ${[error.verifyScope, error.verifyStep].filter(Boolean).join(".")}`,
    );
  }
  if (Number.isSafeInteger(error.verifyAttempts)) {
    console.error(`attempts: ${error.verifyAttempts}`);
  }
  process.exitCode = 1;
}

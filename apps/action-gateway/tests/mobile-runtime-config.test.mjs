import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveActionGatewayConfiguration } from "../dist/server.js";

test("MOB base URL defaults to null when not set", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
  });
  assert.equal(config.mobBaseUrl, null);
});

test("MOB base URL accepts valid http URL", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_MOB_BASE_URL: "http://192.168.1.100:8080",
  });
  assert.equal(config.mobBaseUrl, "http://192.168.1.100:8080");
});

test("MOB base URL accepts valid https URL", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_MOB_BASE_URL: "https://mlx.local:443",
  });
  assert.equal(config.mobBaseUrl, "https://mlx.local:443");
});

test("MOB base URL rejects empty string (returns null)", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_MOB_BASE_URL: "  ",
  });
  assert.equal(config.mobBaseUrl, null);
});

test("MOB base URL rejects ftp protocol", () => {
  assert.throws(() => {
    resolveActionGatewayConfiguration({
      ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_MOB_BASE_URL: "ftp://invalid",
    });
  });
});

test("MOB base URL rejects invalid URL", () => {
  assert.throws(() => {
    resolveActionGatewayConfiguration({
      ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_MOB_BASE_URL: "not-a-url",
    });
  });
});

test("MOB worker poll defaults to 2000ms", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
  });
  assert.equal(config.mobWorkerPollMs, 2000);
});

test("MOB worker poll accepts valid value", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_MOB_WORKER_POLL_MS: "5000",
  });
  assert.equal(config.mobWorkerPollMs, 5000);
});

test("MOB worker poll rejects value below 100ms", () => {
  assert.throws(() => {
    resolveActionGatewayConfiguration({
      ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_MOB_WORKER_POLL_MS: "50",
    });
  });
});

test("MOB REASON max tokens defaults to 2048", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
  });
  assert.equal(config.mobReasonMaxTokens, 2048);
});

test("MOB REASON max tokens accepts valid value", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_MOB_REASON_MAX_TOKENS: "4096",
  });
  assert.equal(config.mobReasonMaxTokens, 4096);
});

test("MOB REASON max tokens rejects zero", () => {
  assert.throws(() => {
    resolveActionGatewayConfiguration({
      ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
      ACTION_GATEWAY_MOB_REASON_MAX_TOKENS: "0",
    });
  });
});

test("existing Gateway config fields remain unchanged with MOB settings", () => {
  const config = resolveActionGatewayConfiguration({
    ACTION_GATEWAY_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_RUNTIME_API_KEY: "test-api-key-0123456789abcdef-xyz",
    ACTION_GATEWAY_HOST: "127.0.0.1",
    ACTION_GATEWAY_PORT: "8787",
  });
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 8787);
  assert.equal(config.mobBaseUrl, null);
  assert.equal(config.mobReasonMaxTokens, 2048);
});

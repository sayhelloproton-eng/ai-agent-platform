import test from "node:test";
import assert from "node:assert/strict";
import { readConfig, writeConfig } from "../src/background/config.js";

function yieldingArea() {
  const values = new Map();
  return {
    async get(key) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { [key]: values.get(key) };
    },
    async set(object) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      for (const [key, value] of Object.entries(object)) values.set(key, structuredClone(value));
    },
    values
  };
}

test("concurrent config writes cannot accidentally clear an emergency stop", async () => {
  const local = yieldingArea();
  globalThis.chrome = { storage: { local, session: yieldingArea() } };
  await Promise.all([
    writeConfig({ paused: true, emergency_stopped: true }),
    writeConfig({ gateway_endpoint: "http://127.0.0.1:9999/v1/browser-host/invoke" })
  ]);
  const config = await readConfig();
  assert.equal(config.paused, true);
  assert.equal(config.emergency_stopped, true);
  assert.equal(config.gateway_endpoint, "http://127.0.0.1:9999/v1/browser-host/invoke");
});

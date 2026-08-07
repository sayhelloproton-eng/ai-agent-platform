import test from "node:test";
import assert from "node:assert/strict";
import { HostRegistry } from "../src/background/host-registry.js";
import { MemoryStorageArea } from "../src/background/storage.js";

class YieldingStorage extends MemoryStorageArea {
  async get(key) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.get(key); }
  async set(key, value) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.set(key, value); }
}

test("concurrent runtime construction cannot create multiple Browser Host identities", async () => {
  const storage = new YieldingStorage();
  const gateway = { invoke: async () => ({ status: "OK" }) };
  const first = new HostRegistry(storage, gateway);
  const second = new HostRegistry(storage, gateway);
  const [left, right] = await Promise.all([first.getOrCreate(), second.getOrCreate()]);
  assert.equal(left.host_id, right.host_id);
  assert.equal((await storage.get("bhr.host")).host_id, left.host_id);
});

test("register and heartbeat are serialized across HostRegistry instances", async () => {
  const storage = new YieldingStorage();
  const calls = [];
  let releaseRegister;
  const registerGate = new Promise((resolve) => { releaseRegister = resolve; });
  const gateway = {
    invoke: async (operation) => {
      calls.push(`${operation}:start`);
      if (operation === "browser.host.register") await registerGate;
      calls.push(`${operation}:end`);
      return { status: "OK" };
    }
  };
  const first = new HostRegistry(storage, gateway);
  const second = new HostRegistry(storage, gateway);
  const registering = first.register();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const heartbeating = second.heartbeat({ state: "ONLINE" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(calls, ["browser.host.register:start"]);
  releaseRegister();
  await Promise.all([registering, heartbeating]);
  assert.deepEqual(calls, [
    "browser.host.register:start",
    "browser.host.register:end",
    "browser.host.heartbeat:start",
    "browser.host.heartbeat:end"
  ]);
  assert.equal((await storage.get("bhr.host")).state, "ONLINE");
});

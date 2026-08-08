import test from "node:test";
import assert from "node:assert/strict";
import { HostRegistry, PRODUCTION_ROUTABLE_CAPABILITIES } from "../src/background/host-registry.js";
import { BhrError } from "../src/shared/errors.js";
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


test("production Host advertises only the safe Level 2 browser action", async () => {
  const storage = new MemoryStorageArea();
  const registrations = [];
  const gateway = {
    invoke: async (operation, payload) => {
      if (operation === "browser.host.register") registrations.push(payload);
      return { status: "OK" };
    }
  };
  const registry = new HostRegistry(storage, gateway);
  await registry.register();
  assert.ok(PRODUCTION_ROUTABLE_CAPABILITIES.includes("OBSERVE_PAGE"));
  assert.equal(PRODUCTION_ROUTABLE_CAPABILITIES.includes("SUBMIT_MESSAGE"), true);
  assert.equal(PRODUCTION_ROUTABLE_CAPABILITIES.includes("CONTINUE_ROLE_SESSION"), false);
  assert.deepEqual(registrations[0].capabilities, [...PRODUCTION_ROUTABLE_CAPABILITIES]);
});

test("heartbeat re-registers safely after HOST_NOT_REGISTERED and records freshness", async () => {
  const storage = new MemoryStorageArea();
  const calls = [];
  let firstHeartbeat = true;
  const gateway = {
    invoke: async (operation) => {
      calls.push(operation);
      if (operation === "browser.host.heartbeat" && firstHeartbeat) {
        firstHeartbeat = false;
        throw new BhrError("HOST_NOT_REGISTERED", "registration expired");
      }
      return { status: "OK" };
    }
  };
  const registry = new HostRegistry(storage, gateway);
  await registry.heartbeat({ state: "ONLINE" });
  assert.deepEqual(calls, ["browser.host.heartbeat", "browser.host.register", "browser.host.heartbeat"]);
  const host = await storage.get("bhr.host");
  assert.equal(host.state, "ONLINE");
  assert.ok(host.last_heartbeat_success_at);
  assert.ok(host.last_gateway_ack_at);
});

import test from "node:test";
import assert from "node:assert/strict";
import { RoleSessionManager } from "../src/background/role-session-manager.js";
import { BindingRegistry } from "../src/background/binding-registry.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { hostCommand } from "./test-helpers.mjs";

function installChromeMock() {
  const tabs = new Map();
  let nextId = 20;
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      create: async ({ url, active }) => {
        const tab = { id: nextId++, windowId: 1, url, active };
        tabs.set(tab.id, tab);
        return tab;
      },
      get: async (id) => tabs.get(id),
      update: async (id, patch) => {
        const tab = { ...tabs.get(id), ...patch };
        tabs.set(id, tab);
        return tab;
      },
      sendMessage: (id, message, callback) => {
        const tab = tabs.get(id);
        if (message.type === "BHR_PING") callback({ ok: true, data: { provider: "chatgpt-web", gpt_ref: "g-test", conversation_ref: null, url: tab.url, title: "GPT" } });
        else callback({ ok: true, data: { follow_latest: true } });
      }
    }
  };
  return tabs;
}

test("OPEN_OR_RESUME_SESSION creates and confirms a new role binding when none exists", async () => {
  installChromeMock();
  const registry = new BindingRegistry(new MemoryStorageArea());
  const manager = new RoleSessionManager({ host_id: "host", bindingRegistry: registry, contentReadyTimeoutMs: 100, pollMs: 1 });
  const command = hostCommand({
    action: { type: "OPEN_OR_RESUME_SESSION", payload_ref: "open" },
    target: { role_ref: "reviewer", gpt_ref: "g-test", conversation_ref: null },
    approval_ref: null
  });
  const result = await manager.openOrResume({ command, resolved_payload: { url: "https://chatgpt.com/g/g-test" } });
  assert.equal(result.details.session_created, true);
  assert.equal(result.binding.state, "READY");
  assert.equal(result.binding.role_ref, "reviewer");
  assert.equal(result.binding.gpt_ref, "g-test");
});

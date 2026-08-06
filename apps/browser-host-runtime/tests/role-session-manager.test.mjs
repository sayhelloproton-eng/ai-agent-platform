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

test("specified Conversation is revalidated after Wake and mismatch invalidates the Binding", async () => {
  const tabs = new Map([[30, { id: 30, windowId: 1, url: "https://chatgpt.com/g/g-test/example/c/conv-target", active: true }]]);
  let pingCount = 0;
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      get: async (id) => tabs.get(id),
      update: async (id, patch) => {
        const next = { ...tabs.get(id), ...patch };
        tabs.set(id, next);
        return next;
      },
      create: async () => { throw new Error("must reuse existing Binding"); },
      sendMessage: (id, message, callback) => {
        const tab = tabs.get(id);
        if (message.type === "BHR_PING") {
          pingCount += 1;
          const conversation_ref = pingCount === 1 ? "conv-target" : "conv-other";
          callback({ ok: true, data: { provider: "chatgpt-web", gpt_ref: "g-test", conversation_ref, url: `https://chatgpt.com/g/g-test/example/c/${conversation_ref}`, title: "GPT" } });
        } else if (message.type === "BHR_EXECUTE_ACTION") {
          callback({ ok: true, data: { status: "ACTION_SUCCEEDED", details: { submitted_at: new Date().toISOString(), response_baseline: {} } } });
        } else callback({ ok: true, data: { follow_latest: true, url: tab.url } });
      }
    }
  };
  const registry = new BindingRegistry(new MemoryStorageArea());
  const existing = await registry.bind({
    host_id: "host",
    chrome_tab_id: 30,
    window_id: 1,
    role_ref: "controller",
    gpt_ref: "g-test",
    conversation_ref: "conv-target",
    page_fingerprint: null,
    url: tabs.get(30).url
  });
  const manager = new RoleSessionManager({ host_id: "host", bindingRegistry: registry, contentReadyTimeoutMs: 100, pollMs: 1 });
  const command = hostCommand({
    action: { type: "OPEN_OR_RESUME_SESSION", payload_ref: "open" },
    target: { role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv-target" },
    approval_ref: null
  });
  await assert.rejects(
    () => manager.openOrResume({ command, resolved_payload: { url: tabs.get(30).url, wake_text: "wake" } }),
    (error) => error.code === "ROLE_SESSION_TARGET_MISMATCH"
  );
  const updated = await registry.get(existing.binding_id);
  assert.equal(updated.state, "STALE");
  assert.equal(updated.stale_reason, "POST_WAKE_CONVERSATION_CHANGED");
});

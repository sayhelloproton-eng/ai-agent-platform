import test from "node:test";
import assert from "node:assert/strict";
import { BindingRegistry } from "../src/background/binding-registry.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { binding, observation } from "./test-helpers.mjs";

test("conversation switch invalidates a ready binding", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const stored = await registry.bind({ ...binding(), chrome_tab_id: 10, window_id: 1, url: "https://chatgpt.com/c/conv" });
  await assert.rejects(
    () => registry.validateObservation(stored, observation({ conversation_ref: "other", page_url: "https://chatgpt.com/c/other", page_fingerprint: "sha256:other" })),
    /no longer matches/i
  );
  assert.equal((await registry.findByTabId(10)).state, "STALE");
  assert.equal((await registry.findByTabId(10)).stale_reason, "PAGE_IDENTITY_CHANGED");
});

test("tabs navigation inside ChatGPT invalidates old conversation binding", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  await registry.bind({ ...binding(), chrome_tab_id: 10, window_id: 1, url: "https://chatgpt.com/c/conv" });
  await registry.reconcileNavigation(10, { provider: "chatgpt-web", gpt_ref: "g-test", conversation_ref: "other", url: "https://chatgpt.com/c/other" });
  const current = await registry.findByTabId(10);
  assert.equal(current.state, "STALE");
  assert.equal(current.stale_reason, "CHATGPT_SESSION_CHANGED");
});

test("new-chat binding can promote to the conversation created by the controlled send", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const stored = await registry.bind({
    host_id: "host", chrome_tab_id: 11, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: null, page_fingerprint: "sha256:new-chat", url: "https://chatgpt.com/g/g-test"
  });
  const updated = await registry.validateObservation(stored, observation({
    binding_id: stored.binding_id,
    conversation_ref: "created-conv",
    page_url: "https://chatgpt.com/g/g-test/example/c/created-conv",
    page_fingerprint: "sha256:created"
  }), { role_ref: "controller", gpt_ref: "g-test", conversation_ref: null });
  assert.equal(updated.state, "READY");
  assert.equal(updated.conversation_ref, "created-conv");
  assert.equal(updated.page_fingerprint, "sha256:created");
});

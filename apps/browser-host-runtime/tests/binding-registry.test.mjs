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

test("new-chat binding promotes only when a controlled action explicitly authorizes the transition", async () => {
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
  }), { role_ref: "controller", gpt_ref: "g-test", conversation_ref: null }, { allowConversationPromotion: true });
  assert.equal(updated.state, "READY");
  assert.equal(updated.conversation_ref, "created-conv");
  assert.equal(updated.page_fingerprint, "sha256:created");
});

test("passive observation cannot adopt an arbitrary conversation for a new-chat Binding", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const stored = await registry.bind({
    host_id: "host", chrome_tab_id: 12, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: null, page_fingerprint: "sha256:new-chat", url: "https://chatgpt.com/g/g-test"
  });
  await assert.rejects(
    () => registry.validateObservation(stored, observation({
      binding_id: stored.binding_id,
      conversation_ref: "user-selected-conv",
      page_url: "https://chatgpt.com/g/g-test/example/c/user-selected-conv",
      page_fingerprint: "sha256:user-selected"
    })),
    (error) => error?.code === "BINDING_PAGE_IDENTITY_MISMATCH"
  );
  const updated = await registry.get(stored.binding_id);
  assert.equal(updated.state, "STALE");
  assert.equal(updated.stale_reason, "PAGE_IDENTITY_CHANGED");
});

test("rebinding the same role automatically stales the previous ready binding", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const first = await registry.bind({
    host_id: "host", chrome_tab_id: 10, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: "conv-a", page_fingerprint: "sha256:a", url: "https://chatgpt.com/c/conv-a"
  });
  const second = await registry.bind({
    host_id: "host", chrome_tab_id: 11, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: "conv-b", page_fingerprint: "sha256:b", url: "https://chatgpt.com/c/conv-b"
  });
  const bindings = await registry.list();
  const old = bindings.find((item) => item.binding_id === first.binding_id);
  const current = bindings.find((item) => item.binding_id === second.binding_id);
  assert.equal(old.state, "STALE");
  assert.equal(old.stale_reason, "ROLE_REBOUND");
  assert.equal(old.superseded_by_binding_id, second.binding_id);
  assert.equal(current.state, "READY");
  assert.equal(bindings.filter((item) => item.role_ref === "controller" && item.state === "READY").length, 1);
});

test("startup reconciliation removes legacy duplicate READY bindings deterministically", async () => {
  const storage = new MemoryStorageArea({
    "bhr.bindings": [
      { ...binding({ binding_id: "older", chrome_tab_id: 10 }), confirmed_at: "2026-08-07T01:00:00.000Z", last_seen_at: "2026-08-07T01:00:00.000Z" },
      { ...binding({ binding_id: "newer", chrome_tab_id: 11 }), confirmed_at: "2026-08-07T02:00:00.000Z", last_seen_at: "2026-08-07T02:00:00.000Z" }
    ]
  });
  const registry = new BindingRegistry(storage);
  const result = await registry.reconcileReadyUniqueness();
  assert.equal(result.changed, true);
  const bindings = await registry.list();
  assert.equal(bindings.find((item) => item.binding_id === "older").state, "STALE");
  assert.equal(bindings.find((item) => item.binding_id === "older").stale_reason, "DUPLICATE_ROLE_BINDING");
  assert.equal(bindings.find((item) => item.binding_id === "newer").state, "READY");
});

test("target lookup refuses ambiguous legacy READY bindings instead of choosing one arbitrarily", async () => {
  const storage = new MemoryStorageArea({
    "bhr.bindings": [
      { ...binding({ binding_id: "one", chrome_tab_id: 10 }) },
      { ...binding({ binding_id: "two", chrome_tab_id: 11 }) }
    ]
  });
  const registry = new BindingRegistry(storage);
  await assert.rejects(
    () => registry.findForTarget({ role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv" }),
    (error) => error?.code === "BINDING_AMBIGUOUS"
  );
});

test("concurrent same-role binds across registry instances preserve history and leave one READY binding", async () => {
  const storage = new MemoryStorageArea();
  const firstRegistry = new BindingRegistry(storage);
  const secondRegistry = new BindingRegistry(storage);
  await Promise.all([
    firstRegistry.bind({ host_id: "host", chrome_tab_id: 21, window_id: 1, role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv-a", page_fingerprint: "sha256:a", url: "https://chatgpt.com/c/conv-a" }),
    secondRegistry.bind({ host_id: "host", chrome_tab_id: 22, window_id: 1, role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv-b", page_fingerprint: "sha256:b", url: "https://chatgpt.com/c/conv-b" })
  ]);
  const bindings = await firstRegistry.list();
  assert.equal(bindings.length, 2);
  assert.equal(bindings.filter((item) => item.state === "READY").length, 1);
  assert.equal(bindings.filter((item) => item.state === "STALE" && item.stale_reason === "ROLE_REBOUND").length, 1);
});

test("a superseded binding cannot be resurrected by a late observation", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const first = await registry.bind({ host_id: "host", chrome_tab_id: 31, window_id: 1, role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv-a", page_fingerprint: "sha256:a", url: "https://chatgpt.com/c/conv-a" });
  await registry.bind({ host_id: "host", chrome_tab_id: 32, window_id: 1, role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv-b", page_fingerprint: "sha256:b", url: "https://chatgpt.com/c/conv-b" });
  await assert.rejects(
    () => registry.validateObservation(first, observation({ binding_id: first.binding_id, conversation_ref: "conv-a", page_url: "https://chatgpt.com/c/conv-a", page_fingerprint: "sha256:a" })),
    (error) => error?.code === "BINDING_NOT_READY"
  );
  const stored = await registry.get(first.binding_id);
  assert.equal(stored.state, "STALE");
  assert.equal(stored.stale_reason, "ROLE_REBOUND");
});

test("target role drift invalidates observation before browser execution can continue", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const stored = await registry.bind({ host_id: "host", chrome_tab_id: 51, window_id: 1, role_ref: "reviewer", gpt_ref: "g-test", conversation_ref: "conv", page_fingerprint: "sha256:page", url: "https://chatgpt.com/c/conv" });
  await assert.rejects(
    () => registry.validateObservation(stored, observation({ binding_id: stored.binding_id, conversation_ref: "conv", page_url: "https://chatgpt.com/c/conv", page_fingerprint: "sha256:page" }), { role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv" }),
    (error) => error?.code === "BINDING_PAGE_IDENTITY_MISMATCH"
  );
  assert.equal((await registry.get(stored.binding_id)).state, "STALE");
});

test("startup host ownership reconciliation stales active bindings from an obsolete Browser Host identity", async () => {
  const storage = new MemoryStorageArea();
  const registry = new BindingRegistry(storage);
  const old = await registry.bind({
    host_id: "host-old",
    chrome_tab_id: 41,
    window_id: 1,
    role_ref: "controller",
    gpt_ref: "g-test",
    conversation_ref: "conv-old",
    url: "https://chatgpt.com/g/g-test/c/conv-old"
  });
  const result = await registry.reconcileHostOwnership("host-current");
  assert.equal(result.changed, true);
  const stale = await registry.get(old.binding_id);
  assert.equal(stale.state, "STALE");
  assert.equal(stale.stale_reason, "HOST_ID_CHANGED");
});

test("rebinding the same physical tab creates a fresh Binding epoch and preserves the old Binding as STALE", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const first = await registry.bind({
    host_id: "host", chrome_tab_id: 61, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: "conv-a", page_fingerprint: "sha256:a", url: "https://chatgpt.com/c/conv-a"
  });
  const second = await registry.bind({
    host_id: "host", chrome_tab_id: 61, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: "conv-b", page_fingerprint: "sha256:b", url: "https://chatgpt.com/c/conv-b"
  });
  assert.notEqual(second.binding_id, first.binding_id);
  assert.equal(second.tab_ref, first.tab_ref, "physical tab identity is stable while Binding epoch changes");
  const storedFirst = await registry.get(first.binding_id);
  const storedSecond = await registry.get(second.binding_id);
  assert.equal(storedFirst.state, "STALE");
  assert.equal(storedFirst.stale_reason, "ROLE_REBOUND");
  assert.equal(storedFirst.superseded_by_binding_id, second.binding_id);
  assert.equal(storedSecond.state, "READY");
  assert.equal((await registry.findByTabId(61)).binding_id, second.binding_id);
});

test("rebinding one physical tab to a different role stales the old epoch as TAB_REBOUND", async () => {
  const registry = new BindingRegistry(new MemoryStorageArea());
  const first = await registry.bind({
    host_id: "host", chrome_tab_id: 62, window_id: 1, role_ref: "controller", gpt_ref: "g-test",
    conversation_ref: "conv", page_fingerprint: "sha256:a", url: "https://chatgpt.com/c/conv"
  });
  const second = await registry.bind({
    host_id: "host", chrome_tab_id: 62, window_id: 1, role_ref: "reviewer", gpt_ref: "g-test",
    conversation_ref: "conv", page_fingerprint: "sha256:a", url: "https://chatgpt.com/c/conv"
  });
  assert.equal((await registry.get(first.binding_id)).stale_reason, "TAB_REBOUND");
  assert.equal((await registry.findByTabId(62)).binding_id, second.binding_id);
});


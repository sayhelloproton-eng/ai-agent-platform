import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/content/content-script.js", import.meta.url), "utf8");

function createHarness({ legacyMarker = false } = {}) {
  const runtimeListeners = new Set();
  const documentListeners = new Map();
  const observers = [];

  const document = {
    documentElement: {},
    readyState: "complete",
    addEventListener(type, listener) {
      const values = documentListeners.get(type) ?? new Set();
      values.add(listener);
      documentListeners.set(type, values);
    },
    removeEventListener(type, listener) {
      documentListeners.get(type)?.delete(listener);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };

  class MutationObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() { this.disconnected = true; }
  }

  const context = vm.createContext({
    console,
    document,
    location: { pathname: "/g/g-test", hostname: "chatgpt.com", href: "https://chatgpt.com/g/g-test" },
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) { runtimeListeners.add(listener); },
          removeListener(listener) { runtimeListeners.delete(listener); }
        },
        sendMessage() { return Promise.resolve({ ok: true }); }
      }
    },
    MutationObserver: MutationObserverMock,
    Element: class {},
    HTMLTextAreaElement: class {},
    HTMLInputElement: class {},
    InputEvent: class {},
    Event: class {},
    setTimeout,
    clearTimeout,
    Date,
    URL,
    JSON,
    Math,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Promise,
    Map,
    Set
  });
  if (legacyMarker) context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__ = "ready";
  return { context, runtimeListeners, documentListeners, observers };
}

function activeDocumentListenerCount(harness) {
  return [...harness.documentListeners.values()].reduce((sum, values) => sum + values.size, 0);
}

test("legacy ready marker cannot block recovery injection after extension reload", () => {
  const harness = createHarness({ legacyMarker: true });
  vm.runInContext(source, harness.context);
  assert.equal(harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__.state, "ready");
  assert.equal(harness.runtimeListeners.size, 1);
  assert.equal(activeDocumentListenerCount(harness), 3);
});

test("reinjection disposes the previous live content-script instance before registering the replacement", () => {
  const harness = createHarness();
  vm.runInContext(source, harness.context);
  const firstMarker = harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__;
  const firstObserver = harness.observers[0];
  assert.equal(harness.runtimeListeners.size, 1);
  assert.equal(activeDocumentListenerCount(harness), 3);

  vm.runInContext(source, harness.context);
  const secondMarker = harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__;
  assert.notEqual(firstMarker, secondMarker);
  assert.equal(firstMarker.state, "disposed");
  assert.equal(firstMarker.reason, "REINJECTED");
  assert.equal(firstObserver.disconnected, true);
  assert.equal(harness.runtimeListeners.size, 1);
  assert.equal(activeDocumentListenerCount(harness), 3);
  assert.equal(secondMarker.state, "ready");
});

function createComposerHarness({ transform = (value) => value, bodyText = "", extraButtons = [], messageRoles = [], hidden = false } = {}) {
  const runtimeListeners = new Set();
  const documentListeners = new Map();
  let sendClicks = 0;
  const extraButtonClicks = new Map();

  class ElementMock {
    constructor(tagName = "BUTTON") { this.tagName = tagName; }
    getBoundingClientRect() { return { width: 100, height: 30, x: 0, y: 0 }; }
    getAttribute(name) { return this.attributes?.[name] ?? null; }
    dispatchEvent() { return true; }
    focus() {}
  }
  class TextareaMock extends ElementMock {
    constructor() { super("TEXTAREA"); this._value = ""; this.attributes = {}; }
    get value() { return this._value; }
    set value(value) { this._value = transform(String(value)); }
  }
  class InputMock extends ElementMock {}
  const composer = new TextareaMock();
  const builtExtraButtons = extraButtons.map((item) => {
    if (typeof item !== "string") return item;
    const button = new ElementMock();
    button.attributes = { "aria-label": item };
    button.disabled = false;
    button.innerText = item;
    button.textContent = item;
    button.click = () => extraButtonClicks.set(item, (extraButtonClicks.get(item) ?? 0) + 1);
    return button;
  });
  const messageNodes = messageRoles.map((role, index) => {
    const node = new ElementMock("ARTICLE");
    node.attributes = { "data-message-author-role": role };
    node.innerText = `${role} message ${index}`;
    node.textContent = node.innerText;
    return node;
  });
  const send = new ElementMock();
  send.attributes = { "aria-label": "Send" };
  send.disabled = false;
  send.click = () => { sendClicks += 1; };

  const document = {
    documentElement: { scrollHeight: 0, scrollTop: 0, clientHeight: 0, scrollTo() {} },
    readyState: "complete",
    hidden,
    visibilityState: hidden ? "hidden" : "visible",
    body: { innerText: bodyText },
    title: "GPT",
    scrollingElement: null,
    addEventListener(type, listener) {
      const values = documentListeners.get(type) ?? new Set();
      values.add(listener);
      documentListeners.set(type, values);
    },
    removeEventListener(type, listener) {
      documentListeners.get(type)?.delete(listener);
    },
    querySelector(selector) {
      if (["#prompt-textarea", 'textarea[data-id="root"]', "textarea[placeholder]", '[contenteditable="true"][role="textbox"]', '[contenteditable="true"]'].includes(selector)) return composer;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-message-author-role]') return messageNodes;
      if (selector === 'article') return [];
      if (selector === '[data-message-author-role],article') return messageNodes;
      if (selector === 'button,[role="button"]') return [send, ...builtExtraButtons];
      if (selector.includes("button") && selector.includes("a")) return [send, ...builtExtraButtons];
      return [];
    }
  };
  class MutationObserverMock { observe() {} disconnect() {} }
  const context = vm.createContext({
    console,
    document,
    location: { pathname: "/g/g-test/c/conv", hostname: "chatgpt.com", href: "https://chatgpt.com/g/g-test/c/conv" },
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) { runtimeListeners.add(listener); },
          removeListener(listener) { runtimeListeners.delete(listener); }
        },
        sendMessage() { return Promise.resolve({ ok: true }); }
      }
    },
    MutationObserver: MutationObserverMock,
    Element: ElementMock,
    HTMLTextAreaElement: TextareaMock,
    HTMLInputElement: InputMock,
    InputEvent: class { constructor(type, init) { this.type = type; this.init = init; } },
    Event: class { constructor(type, init) { this.type = type; this.init = init; } },
    getComputedStyle: () => ({ visibility: "visible", display: "block", overflowY: "visible" }),
    setTimeout,
    clearTimeout,
    Date,
    URL,
    JSON,
    Math,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Promise,
    Map,
    Set,
    BhrResponseLifecycle: {
      waitForSubmissionConfirmation: async ({ snapshot }) => ({
        status: "ACTION_SUCCEEDED",
        details: { submission_confirmed: true, confirmed_snapshot: snapshot() }
      }),
      waitForCompleteResponse: async () => ({ status: "ACTION_SUCCEEDED", details: { response_completed: true } })
    }
  });
  vm.runInContext(source, context);
  return {
    context,
    runtimeListeners,
    composer,
    getSendClicks: () => sendClicks,
    getExtraButtonClicks: (name) => extraButtonClicks.get(name) ?? 0,
    dispatchDocumentEvent: (type, event) => {
      for (const listener of documentListeners.get(type) ?? []) listener(event);
    }
  };
}

test("trusted user activity blocks SUBMIT_MESSAGE before composer mutation or send click", async () => {
  const harness = createComposerHarness();
  harness.dispatchDocumentEvent("pointerdown", { isTrusted: true });
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "SUBMIT_MESSAGE",
      payload: { text: "continue task", expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" } }
    }, {}, resolve);
  });
  assert.equal(response.ok, false);
  assert.equal(response.error.code, "USER_CONTROL_ACTIVE");
  assert.equal(harness.composer.value, "");
  assert.equal(harness.getSendClicks(), 0);
});

test("message submission stops before click when the composer does not contain the requested text exactly enough", async () => {
  const harness = createComposerHarness({ transform: (value) => value.slice(0, Math.max(0, value.length - 1)) });
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "SUBMIT_MESSAGE",
      payload: { text: "continue task", expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" } }
    }, {}, resolve);
  });
  assert.equal(response.ok, false);
  assert.equal(response.error.code, "COMPOSER_TEXT_MISMATCH");
  assert.equal(response.error.details.expected_chars, "continue task".length);
  assert.equal(response.error.details.actual_chars, "continue tas".length);
  assert.equal(harness.getSendClicks(), 0);
});

test("successful message execution reports only message length, not the submitted text", async () => {
  const harness = createComposerHarness();
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "SUBMIT_MESSAGE",
      payload: {
        text: "continue task",
        wait_for_response: false,
        expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" }
      }
    }, {}, resolve);
  });
  assert.equal(response.ok, true);
  assert.equal(response.data.details.submitted_chars, "continue task".length);
  assert.equal("submitted_text" in response.data.details, false);
  assert.equal(harness.getSendClicks(), 1);
});

test("conversation text mentioning login or network errors is not misclassified as blocking UI", async () => {
  const harness = createComposerHarness({ bodyText: "We should handle network error and log in flows in our code." });
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({ type: "BHR_OBSERVE", observation_id: "obs-safe-text" }, {}, resolve);
  });
  assert.equal(response.ok, true);
  assert.equal(response.data.blocking_ui.length, 0);
  assert.equal(response.data.page_state, "READY");
});

test("response lifecycle counters are not capped by the 12-message evidence summary window", async () => {
  const harness = createComposerHarness({
    messageRoles: Array.from({ length: 15 }, (_, index) => index % 2 === 0 ? "user" : "assistant")
  });
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "SUBMIT_MESSAGE",
      payload: {
        text: "continue task",
        wait_for_response: false,
        expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" }
      }
    }, {}, resolve);
  });
  assert.equal(response.ok, true);
  assert.equal(response.data.details.response_baseline.message_count, 15);
});

test("a fresh pre-observation does not invalidate a still-live registered UI reference from the previous bounded catalog", async () => {
  const harness = createComposerHarness({ extraButtons: ["Approve"] });
  const listener = [...harness.runtimeListeners][0];
  const first = await new Promise((resolve) => listener({ type: "BHR_OBSERVE", observation_id: "obs-first" }, {}, resolve));
  const registered = first.data.interactive_elements.find((item) => item.accessible_name === "Approve");
  assert.ok(registered);
  await new Promise((resolve) => listener({ type: "BHR_OBSERVE", observation_id: "obs-precheck" }, {}, resolve));
  const clicked = await new Promise((resolve) => listener({
    type: "BHR_EXECUTE_ACTION",
    action_type: "CLICK_REGISTERED_UI",
    payload: {
      observation_id: "obs-first",
      element_ref: registered.element_ref,
      expected_accessible_name: "Approve",
      expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" }
    }
  }, {}, resolve));
  assert.equal(clicked.ok, true);
  assert.equal(harness.getExtraButtonClicks("Approve"), 1);
});


test("inactive ChatGPT tab remains content-addressable and does not self-invalidate merely because it is hidden", async () => {
  const harness = createComposerHarness({ hidden: true });
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "SUBMIT_MESSAGE",
      payload: {
        text: "continue task",
        wait_for_response: false,
        expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" }
      }
    }, {}, resolve);
  });
  assert.equal(response.ok, true);
  assert.equal(harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__.state, "ready");
  assert.equal(harness.getSendClicks(), 1);
});

test("late response delivery after extension reload is contained and disposes the stale content-script context", async () => {
  const harness = createComposerHarness({ hidden: true });
  const listener = [...harness.runtimeListeners][0];
  const marker = harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__;
  const accepted = listener({
    type: "BHR_EXECUTE_ACTION",
    action_type: "SUBMIT_MESSAGE",
    payload: {
      text: "continue task",
      wait_for_response: false,
      expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" }
    }
  }, {}, () => {
    throw new Error("Extension context invalidated.");
  });
  assert.equal(accepted, true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(harness.getSendClicks(), 1);
  assert.equal(marker.state, "disposed");
  assert.equal(marker.reason, "EXTENSION_CONTEXT_INVALIDATED");
  assert.equal(harness.runtimeListeners.size, 0);
});


test("ChatGPT Action allow/deny controls surface ACTION_CONFIRMATION_PENDING", async () => {
  const harness = createComposerHarness({ extraButtons: ["允许", "拒绝"] });
  const listener = [...harness.runtimeListeners][0];
  const response = await new Promise((resolve) => {
    listener({ type: "BHR_OBSERVE", observation_id: "action-confirmation" }, {}, resolve);
  });
  assert.equal(response.ok, true);
  assert.equal(response.data.page_state, "ACTION_CONFIRMATION_PENDING");
  assert.ok(response.data.blocking_ui.some((item) => item.type === "ACTION_CONFIRMATION_PENDING"));
});

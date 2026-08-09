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
  assert.equal(activeDocumentListenerCount(harness), 5);
});

test("reinjection disposes the previous live content-script instance before registering the replacement", () => {
  const harness = createHarness();
  vm.runInContext(source, harness.context);
  const firstMarker = harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__;
  const firstObserver = harness.observers[0];
  assert.equal(harness.runtimeListeners.size, 1);
  assert.equal(activeDocumentListenerCount(harness), 5);

  vm.runInContext(source, harness.context);
  const secondMarker = harness.context.__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__;
  assert.notEqual(firstMarker, secondMarker);
  assert.equal(firstMarker.state, "disposed");
  assert.equal(firstMarker.reason, "REINJECTED");
  assert.equal(firstObserver.disconnected, true);
  assert.equal(harness.runtimeListeners.size, 1);
  assert.equal(activeDocumentListenerCount(harness), 5);
  assert.equal(secondMarker.state, "ready");
});

function createComposerHarness({ transform = (value) => value, bodyText = "", extraButtons = [], messageRoles = [], hidden = false, responseLifecycle = null } = {}) {
  const runtimeListeners = new Set();
  const documentListeners = new Map();
  let sendClicks = 0;
  const extraButtonClicks = new Map();

  class ElementMock {
    constructor(tagName = "BUTTON") { this.tagName = tagName; }
    getBoundingClientRect() { return { width: 100, height: 30, x: 0, y: 0 }; }
    getAttribute(name) { return this.attributes?.[name] ?? null; }
    closest(selector) {
      if ((this.tagName === "BUTTON" && selector.includes("button")) || (this.getAttribute("role") === "button" && selector.includes('[role="button"]'))) return this;
      return null;
    }
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
    BhrResponseLifecycle: responseLifecycle ?? {
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
    getExtraButtonElement: (name) => builtExtraButtons.find((button) => button.attributes?.["aria-label"] === name) ?? null,
    dispatchDocumentEvent: (type, event) => {
      for (const listener of documentListeners.get(type) ?? []) listener(event);
    }
  };
}


function createReviewScrollHarness() {
  const runtimeListeners = new Set();
  const documentListeners = new Map();

  class ElementMock {
    constructor(tagName = "DIV", { overflowY = "visible" } = {}) {
      this.tagName = tagName;
      this.overflowY = overflowY;
      this.attributes = {};
      this.parentElement = null;
      this.scrollHeight = 0;
      this.scrollTop = 0;
      this.clientHeight = 0;
    }
    getBoundingClientRect() { return { width: 100, height: 30, x: 0, y: 0, top: 0, left: 0, bottom: 30, right: 100 }; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    dispatchEvent() { return true; }
    focus() {}
  }
  class TextareaMock extends ElementMock {
    constructor() { super("TEXTAREA"); this._value = ""; }
    get value() { return this._value; }
    set value(value) { this._value = String(value); }
  }
  class InputMock extends ElementMock {}

  const main = new ElementMock("MAIN");
  const conversationScroller = new ElementMock("DIV", { overflowY: "auto" });
  conversationScroller.parentElement = main;
  conversationScroller.scrollHeight = 2000;
  conversationScroller.clientHeight = 600;
  conversationScroller.scrollTop = 1400;
  conversationScroller.scrollTo = ({ top }) => {
    conversationScroller.scrollTop = Math.max(0, Math.min(Number(top) || 0, conversationScroller.scrollHeight - conversationScroller.clientHeight));
  };

  const sidebarScroller = new ElementMock("DIV", { overflowY: "auto" });
  sidebarScroller.scrollHeight = 8000;
  sidebarScroller.clientHeight = 600;
  sidebarScroller.scrollTop = 0;

  const message = new ElementMock("ARTICLE");
  message.attributes = { "data-message-author-role": "assistant" };
  message.parentElement = conversationScroller;
  message.innerText = "latest";
  message.textContent = "latest";
  message.scrollIntoView = () => {};

  const composer = new TextareaMock();
  composer.parentElement = main;

  const documentElement = new ElementMock("HTML");
  const body = new ElementMock("BODY");
  const document = {
    documentElement,
    body,
    scrollingElement: documentElement,
    readyState: "complete",
    title: "GPT",
    addEventListener(type, listener) {
      const values = documentListeners.get(type) ?? new Set();
      values.add(listener);
      documentListeners.set(type, values);
    },
    removeEventListener(type, listener) { documentListeners.get(type)?.delete(listener); },
    querySelector(selector) {
      if (selector === "main" || selector === '[role="main"]') return main;
      if (["#prompt-textarea", 'textarea[data-id="root"]', "textarea[placeholder]", '[contenteditable="true"][role="textbox"]', '[contenteditable="true"]'].includes(selector)) return composer;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-message-author-role],article' || selector === '[data-message-author-role]') return [message];
      if (selector === 'article') return [];
      if (selector === 'button,[role="button"]') return [];
      if (selector.includes("button") || selector.includes("[role")) return [];
      return [];
    }
  };
  class MutationObserverMock { observe() {} disconnect() {} }
  const context = vm.createContext({
    console,
    document,
    location: { pathname: "/g/g-test/c/conv", hostname: "chatgpt.com", href: "https://chatgpt.com/g/g-test/c/conv" },
    chrome: { runtime: { onMessage: { addListener(listener) { runtimeListeners.add(listener); }, removeListener(listener) { runtimeListeners.delete(listener); } }, sendMessage() { return Promise.resolve({ ok: true }); } } },
    MutationObserver: MutationObserverMock,
    Element: ElementMock,
    HTMLTextAreaElement: TextareaMock,
    HTMLInputElement: InputMock,
    InputEvent: class {},
    Event: class {},
    getComputedStyle: (element) => ({ visibility: "visible", display: "block", overflowY: element?.overflowY ?? "visible" }),
    setTimeout, clearTimeout, Date, URL, JSON, Math, Object, String, Number, Boolean, RegExp, Promise, Map, Set
  });
  vm.runInContext(source, context);
  return {
    context,
    runtimeListeners,
    conversationScroller,
    sidebarScroller,
    dispatchDocumentEvent(type, event) {
      for (const listener of documentListeners.get(type) ?? []) listener(event);
    }
  };
}

async function observeReviewState(harness, id) {
  const listener = [...harness.runtimeListeners][0];
  return new Promise((resolve) => listener({ type: "BHR_OBSERVE", observation_id: id }, {}, resolve));
}

test("conversation review state ignores unrelated or automatic scrolls but tracks explicit user scroll intent", async () => {
  const harness = createReviewScrollHarness();

  const initial = await observeReviewState(harness, "review-initial");
  assert.equal(initial.ok, true);
  assert.equal(initial.data.user_reviewing, false);

  harness.dispatchDocumentEvent("scroll", { isTrusted: true, target: harness.sidebarScroller });
  const afterSidebar = await observeReviewState(harness, "review-sidebar");
  assert.equal(afterSidebar.data.user_reviewing, false, "sidebar history position must not gate the bound conversation");

  harness.conversationScroller.scrollTop = 700;
  harness.dispatchDocumentEvent("scroll", { isTrusted: true, target: harness.conversationScroller });
  const afterAutomaticConversationScroll = await observeReviewState(harness, "review-auto-scroll");
  assert.equal(afterAutomaticConversationScroll.data.user_reviewing, false, "layout/automatic scroll must not create sticky human-review state");
  assert.equal(harness.conversationScroller.scrollTop, 1400, "follow-latest should recover the conversation to bottom");

  await new Promise((resolve) => setTimeout(resolve, 320));
  harness.dispatchDocumentEvent("wheel", { isTrusted: true, target: harness.conversationScroller });
  harness.conversationScroller.scrollTop = 700;
  harness.dispatchDocumentEvent("scroll", { isTrusted: true, target: harness.conversationScroller });
  const duringHumanReview = await observeReviewState(harness, "review-human-up");
  assert.equal(duringHumanReview.data.user_reviewing, true, "explicit user scrolling up must keep browser mutation gated");

  harness.dispatchDocumentEvent("wheel", { isTrusted: true, target: harness.conversationScroller });
  harness.conversationScroller.scrollTop = 1400;
  harness.dispatchDocumentEvent("scroll", { isTrusted: true, target: harness.conversationScroller });
  const afterHumanReturn = await observeReviewState(harness, "review-human-bottom");
  assert.equal(afterHumanReturn.data.user_reviewing, false, "returning to the conversation bottom must release review mode");
});

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


test("post-delivery response wait tolerates the explicit ChatGPT Action choice but not later unrelated user activity", async () => {
  const interruptions = [];
  const harness = createComposerHarness({
    extraButtons: ["允许", "拒绝"],
    responseLifecycle: {
      waitForSubmissionConfirmation: async ({ snapshot }) => ({
        status: "ACTION_SUCCEEDED",
        details: { submission_confirmed: true, confirmed_snapshot: snapshot() }
      }),
      waitForCompleteResponse: async ({ isInterrupted }) => {
        interruptions.push(isInterrupted());
        return { status: "ACTION_SUCCEEDED", details: { response_completed: true } };
      }
    }
  });
  const listener = [...harness.runtimeListeners][0];
  const allow = harness.getExtraButtonElement("允许");
  assert.ok(allow);

  harness.dispatchDocumentEvent("pointerdown", { isTrusted: true, target: allow });
  const observed = await new Promise((resolve) => {
    listener({ type: "BHR_OBSERVE", observation_id: "after-action-choice" }, {}, resolve);
  });
  assert.equal(observed.ok, true);
  assert.equal(observed.data.user_active, true, "pre-execution user-control safety window must remain active");

  const waited = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "WAIT_FOR_RESPONSE",
      payload: { expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" } }
    }, {}, resolve);
  });
  assert.equal(waited.ok, true);
  assert.deepEqual(interruptions, [false], "the explicit Allow/Deny choice is expected during post-delivery response wait");

  harness.dispatchDocumentEvent("keydown", { isTrusted: true, target: harness.composer });
  const waitedAfterKey = await new Promise((resolve) => {
    listener({
      type: "BHR_EXECUTE_ACTION",
      action_type: "WAIT_FOR_RESPONSE",
      payload: { expected_identity: { gpt_ref: "g-test", conversation_ref: "conv" } }
    }, {}, resolve);
  });
  assert.equal(waitedAfterKey.ok, true);
  assert.deepEqual(interruptions, [false, true], "later unrelated user activity must restore the interruption guard");
});

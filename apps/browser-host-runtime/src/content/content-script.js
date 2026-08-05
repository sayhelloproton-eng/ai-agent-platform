(() => {
  "use strict";

  const state = {
    followLatest: true,
    userReviewing: false,
    userActiveUntil: 0,
    currentObservationId: null,
    elementCatalog: new Map(),
    lastProgrammaticScrollAt: 0,
    lastPageSignal: "",
    signalTimer: null
  };

  const ACTIONS = new Set([
    "OBSERVE_PAGE", "FOLLOW_LATEST", "SET_COMPOSER_TEXT", "SUBMIT_MESSAGE",
    "STOP_GENERATION", "CLICK_REGISTERED_UI", "WAIT_FOR_RESPONSE"
  ]);

  function safeError(code, message) { return { ok: false, error: { code, message } }; }
  function normalizeText(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function visible(element) {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }
  function accessibleName(element) {
    return normalizeText(element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.textContent).slice(0, 200);
  }
  function roleOf(element) {
    return element.getAttribute("role") || (element.tagName === "BUTTON" ? "button" : element.tagName === "A" ? "link" : element.tagName === "TEXTAREA" ? "textbox" : element.tagName.toLowerCase());
  }
  function identifyPage() {
    const path = location.pathname;
    const gptMatch = path.match(/\/g\/(g-[^/]+)/);
    const conversationMatch = path.match(/\/c\/([^/?#]+)/) || path.match(/\/g\/g-[^/]+\/[^/]+\/c\/([^/?#]+)/);
    return {
      provider: location.hostname === "chatgpt.com" ? "chatgpt-web" : "unknown",
      gpt_ref: gptMatch?.[1] ?? "chatgpt-default",
      conversation_ref: conversationMatch?.[1] ?? null,
      url: location.href,
      title: document.title
    };
  }
  function ensureExpectedIdentity(expected) {
    if (!expected) return;
    const current = identifyPage();
    if (expected.gpt_ref && expected.gpt_ref !== current.gpt_ref) {
      throw Object.assign(new Error("The page switched to a different GPT before the action completed."), { code: "PAGE_IDENTITY_CHANGED" });
    }
    if (expected.conversation_ref && expected.conversation_ref !== current.conversation_ref) {
      throw Object.assign(new Error("The page switched to a different conversation before the action completed."), { code: "PAGE_IDENTITY_CHANGED" });
    }
  }
  function composer() {
    const candidates = [
      document.querySelector("#prompt-textarea"),
      document.querySelector('textarea[data-id="root"]'),
      document.querySelector("textarea[placeholder]"),
      document.querySelector('[contenteditable="true"][role="textbox"]'),
      document.querySelector('[contenteditable="true"]')
    ];
    return candidates.find((item) => item && visible(item)) ?? null;
  }
  function buttons() { return [...document.querySelectorAll('button,[role="button"]')].filter(visible); }
  function findButton(patterns) {
    return buttons().find((button) => patterns.some((pattern) => pattern.test(accessibleName(button))));
  }
  function generationState() {
    const stop = findButton([/stop generating/i, /停止生成/, /停止回答/, /停止/]);
    return stop ? "RUNNING" : "IDLE";
  }
  function blockingUi() {
    const result = [];
    const candidates = [...document.querySelectorAll('[role="dialog"],[role="alert"],dialog')].filter(visible);
    for (const element of candidates.slice(0, 20)) {
      result.push({ type: roleOf(element).toUpperCase(), text: normalizeText(element.innerText || element.textContent).slice(0, 500) });
    }
    const bodyText = normalizeText(document.body?.innerText).toLowerCase();
    const patterns = [
      ["LOGIN_REQUIRED", ["log in", "sign up", "登录", "注册"]],
      ["RATE_LIMIT", ["too many requests", "rate limit", "达到上限", "请求过多"]],
      ["NETWORK_ERROR", ["network error", "网络错误", "连接错误"]]
    ];
    for (const [type, terms] of patterns) {
      if (terms.some((term) => bodyText.includes(term.toLowerCase()))) result.push({ type, text: terms.find((term) => bodyText.includes(term.toLowerCase())) });
    }
    return result.slice(0, 20);
  }
  function pageState() {
    const blocking = blockingUi();
    if (blocking.some((item) => item.type === "LOGIN_REQUIRED")) return "LOGIN_REQUIRED";
    if (blocking.some((item) => item.type === "NETWORK_ERROR")) return "ERROR";
    if (composer()) return "READY";
    return document.readyState === "complete" ? "UNKNOWN" : "LOADING";
  }
  function findScroller() {
    const candidates = [document.querySelector("main"), document.querySelector('[role="main"]'), document.scrollingElement, document.documentElement]
      .filter(Boolean);
    const all = [...document.querySelectorAll("main,section,div")].filter((element) => {
      const style = getComputedStyle(element);
      return visible(element) && /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 200;
    });
    return [...candidates, ...all].sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] ?? document.scrollingElement;
  }
  function distanceFromBottom(scroller) { return Math.max(0, scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight); }
  function scrollToBottom() {
    const scroller = findScroller();
    if (!scroller) return false;
    state.lastProgrammaticScrollAt = Date.now();
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "auto" });
    const latest = [...document.querySelectorAll('[data-message-author-role],article')].at(-1);
    latest?.scrollIntoView({ block: "end", behavior: "auto" });
    return true;
  }
  function collectInteractive(observationId) {
    state.elementCatalog.clear();
    const selectors = 'button,a[href],input,textarea,select,[role="button"],[role="link"],[contenteditable="true"]';
    const elements = [...document.querySelectorAll(selectors)].filter(visible).slice(0, 150);
    return elements.map((element, index) => {
      const ref = `${observationId}:el:${index}`;
      state.elementCatalog.set(ref, element);
      const rect = element.getBoundingClientRect();
      return {
        element_ref: ref,
        role: roleOf(element),
        accessible_name: accessibleName(element),
        enabled: !element.disabled && element.getAttribute("aria-disabled") !== "true",
        visible: true,
        bounds: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
      };
    });
  }
  function collectDomSummary() {
    const landmarks = [...document.querySelectorAll('main,nav,header,footer,[role="main"],[role="navigation"]')].filter(visible).slice(0, 30);
    return {
      document_state: document.readyState,
      heading_count: document.querySelectorAll("h1,h2,h3").length,
      button_count: buttons().length,
      dialog_count: document.querySelectorAll('[role="dialog"],dialog').length,
      landmarks: landmarks.map((element) => ({ role: roleOf(element), name: accessibleName(element) })).slice(0, 20)
    };
  }
  function collectAccessibilitySummary() {
    return [...document.querySelectorAll('[aria-label],[role],button,a,input,textarea')]
      .filter(visible)
      .slice(0, 120)
      .map((element) => ({ role: roleOf(element), name: accessibleName(element), disabled: element.disabled === true || element.getAttribute("aria-disabled") === "true" }));
  }
  function collectMessageSummary() {
    const nodes = [...document.querySelectorAll('[data-message-author-role],article')].filter(visible).slice(-12);
    return nodes.map((node, index) => ({
      index,
      role: node.getAttribute("data-message-author-role") || "unknown",
      text: normalizeText(node.innerText || node.textContent).slice(0, 4000)
    }));
  }
  function responseSnapshot() {
    const messages = collectMessageSummary();
    const assistant = messages.filter((item) => item.role === "assistant" || item.role === "unknown");
    return {
      message_count: messages.length,
      assistant_count: assistant.length,
      last_assistant_text: assistant.at(-1)?.text ?? "",
      generation_state: generationState(),
      identity: identifyPage()
    };
  }
  function observe(observationId) {
    if (state.followLatest && !state.userReviewing) scrollToBottom();
    state.currentObservationId = observationId;
    const page = identifyPage();
    return {
      ...page,
      page_state: pageState(),
      generation_state: generationState(),
      follow_latest: state.followLatest,
      user_reviewing: state.userReviewing,
      user_active: Date.now() < state.userActiveUntil,
      visible_text: String(document.body?.innerText ?? "").slice(0, 20000),
      dom_summary: collectDomSummary(),
      accessibility_summary: collectAccessibilitySummary(),
      message_summary: collectMessageSummary(),
      interactive_elements: collectInteractive(observationId),
      blocking_ui: blockingUi(),
      observed_at: new Date().toISOString()
    };
  }
  function ensureNoUserConflict() {
    if (Date.now() < state.userActiveUntil || state.userReviewing) throw Object.assign(new Error("User is currently controlling or reviewing the page."), { code: "USER_CONTROL_ACTIVE" });
  }
  function setComposerText(text, expectedIdentity = null) {
    ensureNoUserConflict();
    ensureExpectedIdentity(expectedIdentity);
    const target = composer();
    if (!target) throw Object.assign(new Error("ChatGPT composer was not found."), { code: "COMPOSER_NOT_FOUND" });
    target.focus();
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value");
      descriptor?.set?.call(target, text);
      if (!descriptor?.set) target.value = text;
    } else {
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("insertText", false, text);
      if (normalizeText(target.innerText) !== normalizeText(text)) target.textContent = text;
    }
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    ensureExpectedIdentity(expectedIdentity);
    return { composer_text: normalizeText(target.value ?? target.innerText ?? target.textContent) };
  }

  async function waitForCompleteResponse(payload, baseline) {
    return globalThis.BhrResponseLifecycle.waitForCompleteResponse({
      payload,
      baseline,
      snapshot: responseSnapshot,
      ensureIdentity: ensureExpectedIdentity,
      isInterrupted: () => state.userReviewing || Date.now() < state.userActiveUntil
    });
  }

  async function submitMessage(payload) {
    const baseline = responseSnapshot();
    const set = setComposerText(payload.text, payload.expected_identity);
    ensureExpectedIdentity(payload.expected_identity);
    const send = findButton([/send message/i, /^send$/i, /发送消息/, /^发送$/]);
    if (!send || send.disabled || send.getAttribute("aria-disabled") === "true") {
      throw Object.assign(new Error("Enabled ChatGPT send button was not found."), { code: "SEND_BUTTON_NOT_READY" });
    }
    send.click();
    const submittedAt = new Date().toISOString();
    if (payload.wait_for_response === false) {
      return { status: "ACTION_SUCCEEDED", details: { message_submitted: true, submitted_at: submittedAt, submitted_text: set.composer_text } };
    }
    const completed = await waitForCompleteResponse(payload, baseline);
    return {
      ...completed,
      details: { ...completed.details, submitted_at: submittedAt, submitted_text: set.composer_text, message_count_before: baseline.message_count }
    };
  }

  function clickRegistered(payload) {
    ensureNoUserConflict();
    ensureExpectedIdentity(payload.expected_identity);
    if (payload.observation_id !== state.currentObservationId) throw Object.assign(new Error("Element reference belongs to a stale observation."), { code: "ELEMENT_REFERENCE_STALE" });
    const element = state.elementCatalog.get(payload.element_ref);
    if (!element || !visible(element)) throw Object.assign(new Error("Registered element is no longer available."), { code: "ELEMENT_NOT_AVAILABLE" });
    if (payload.expected_accessible_name && accessibleName(element) !== payload.expected_accessible_name) {
      throw Object.assign(new Error("Element accessible name changed."), { code: "ELEMENT_PRECONDITION_CHANGED" });
    }
    element.click();
    return { status: "ACTION_SUCCEEDED", details: { element_ref: payload.element_ref, accessible_name: accessibleName(element) } };
  }

  async function waitForResponse(payload) {
    return waitForCompleteResponse(payload, responseSnapshot());
  }

  async function execute(actionType, payload) {
    if (!ACTIONS.has(actionType)) throw Object.assign(new Error(`Unsupported action: ${actionType}`), { code: "ACTION_NOT_REGISTERED" });
    switch (actionType) {
      case "OBSERVE_PAGE": return { status: "ACTION_SUCCEEDED", details: {} };
      case "FOLLOW_LATEST": state.followLatest = payload.enabled !== false; state.userReviewing = false; if (state.followLatest) scrollToBottom(); return { status: "ACTION_SUCCEEDED", details: { follow_latest: state.followLatest } };
      case "SET_COMPOSER_TEXT": return { status: "ACTION_SUCCEEDED", details: setComposerText(payload.text, payload.expected_identity) };
      case "SUBMIT_MESSAGE": return submitMessage(payload);
      case "STOP_GENERATION": {
        ensureNoUserConflict();
        ensureExpectedIdentity(payload.expected_identity);
        const stop = findButton([/stop generating/i, /停止生成/, /停止回答/, /^停止$/]);
        if (!stop) throw Object.assign(new Error("Stop generation button was not found."), { code: "STOP_BUTTON_NOT_FOUND" });
        stop.click();
        return { status: "ACTION_SUCCEEDED", details: { stop_clicked: true } };
      }
      case "CLICK_REGISTERED_UI": return clickRegistered(payload);
      case "WAIT_FOR_RESPONSE": return waitForResponse(payload);
      default: throw Object.assign(new Error(`Unsupported action: ${actionType}`), { code: "ACTION_NOT_REGISTERED" });
    }
  }

  document.addEventListener("pointerdown", (event) => { if (event.isTrusted) state.userActiveUntil = Date.now() + 10000; }, true);
  document.addEventListener("keydown", (event) => { if (event.isTrusted) state.userActiveUntil = Date.now() + 10000; }, true);
  document.addEventListener("scroll", (event) => {
    if (!event.isTrusted || Date.now() - state.lastProgrammaticScrollAt < 300) return;
    const scroller = findScroller();
    if (scroller) state.userReviewing = distanceFromBottom(scroller) > 180;
  }, true);

  function schedulePageSignal() {
    clearTimeout(state.signalTimer);
    state.signalTimer = setTimeout(() => {
      const identity = identifyPage();
      const signal = JSON.stringify({ page_state: pageState(), generation_state: generationState(), blocking_types: blockingUi().map((item) => item.type), gpt_ref: identity.gpt_ref, conversation_ref: identity.conversation_ref, url: identity.url });
      if (signal === state.lastPageSignal) return;
      state.lastPageSignal = signal;
      chrome.runtime.sendMessage({ type: "BHR_PAGE_SIGNAL", signal: JSON.parse(signal) }).catch(() => {});
    }, 1500);
  }

  const mutationObserver = new MutationObserver(() => {
    if (state.followLatest && !state.userReviewing && Date.now() >= state.userActiveUntil) scrollToBottom();
    schedulePageSignal();
  });
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      try {
        if (message.type === "BHR_PING") return { ok: true, data: identifyPage() };
        if (message.type === "BHR_OBSERVE") return { ok: true, data: observe(message.observation_id) };
        if (message.type === "BHR_SET_FOLLOW_LATEST") {
          state.followLatest = Boolean(message.enabled);
          if (state.followLatest) { state.userReviewing = false; scrollToBottom(); }
          return { ok: true, data: { follow_latest: state.followLatest } };
        }
        if (message.type === "BHR_EXECUTE_ACTION") return { ok: true, data: await execute(message.action_type, message.payload ?? {}) };
        return safeError("MESSAGE_TYPE_UNSUPPORTED", `Unsupported content message: ${message.type}`);
      } catch (error) {
        return safeError(error.code ?? "CONTENT_ACTION_FAILED", error.message ?? "Content action failed.");
      }
    })().then(sendResponse);
    return true;
  });
})();

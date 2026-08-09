(() => {
  "use strict";

  const CONTENT_SCRIPT_SLOT = "__AI_AGENT_PLATFORM_BHR_CONTENT_SCRIPT__";
  const previousRuntime = globalThis[CONTENT_SCRIPT_SLOT];
  if (previousRuntime && typeof previousRuntime.dispose === "function") {
    try { previousRuntime.dispose("REINJECTED"); } catch { /* stale contexts are best-effort only */ }
  }
  // Never short-circuit on the legacy string marker. After an extension reload,
  // the old content-script JavaScript may still exist in the page while its
  // extension context is invalid. A fresh programmatic injection must therefore
  // replace the marker and install a new live message listener.
  const runtimeMarker = { state: "loading", dispose: null, reason: null };
  globalThis[CONTENT_SCRIPT_SLOT] = runtimeMarker;

  const state = {
    followLatest: true,
    userReviewing: false,
    reviewInitialized: false,
    userActiveUntil: 0,
    userScrollIntentUntil: 0,
    userActivityEpoch: 0,
    actionConfirmationChoiceEpoch: -1,
    currentObservationId: null,
    elementCatalogs: new Map(),
    lastProgrammaticScrollAt: 0,
    lastPageSignal: "",
    signalTimer: null,
    runtimeInvalidated: false,
    disposed: false
  };

  const ACTIONS = new Set([
    "OBSERVE_PAGE", "FOLLOW_LATEST", "SET_COMPOSER_TEXT", "SUBMIT_MESSAGE", "CONTINUE_ROLE_SESSION",
    "STOP_GENERATION", "CLICK_REGISTERED_UI", "WAIT_FOR_RESPONSE"
  ]);
  const USER_ACTIVITY_WINDOW_MS = 10000;
  const USER_SCROLL_INTENT_WINDOW_MS = 1500;
  const REVIEW_DISTANCE_PX = 180;

  function safeError(code, message, details = null) { return { ok: false, error: { code, message, details } }; }
  function normalizeText(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function visible(element) {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const domVisible = style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    if (!domVisible) return false;
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, globalThis.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, globalThis.innerHeight || 0);
    // Synthetic/unit-test DOMs and backgrounded documents may not expose viewport
    // dimensions. Preserve DOM visibility in that case; when real dimensions are
    // available, visible means actual viewport intersection.
    if (viewportWidth <= 0 || viewportHeight <= 0) return domVisible;
    const top = Number.isFinite(rect.top) ? rect.top : (Number.isFinite(rect.y) ? rect.y : 0);
    const left = Number.isFinite(rect.left) ? rect.left : (Number.isFinite(rect.x) ? rect.x : 0);
    const bottom = Number.isFinite(rect.bottom) ? rect.bottom : top + rect.height;
    const right = Number.isFinite(rect.right) ? rect.right : left + rect.width;
    return bottom > 0 && right > 0 && top < viewportHeight && left < viewportWidth;
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
      const text = normalizeText(element.innerText || element.textContent).slice(0, 500);
      // ChatGPT currently keeps empty role=alert surfaces in the DOM. They are
      // accessibility plumbing, not blocking UI, and must not trigger review.
      if (!text && roleOf(element).toLowerCase() === "alert") continue;
      result.push({ type: roleOf(element).toUpperCase(), text });
    }

    const confirmationButtons = buttons()
      .map((button) => ({ name: accessibleName(button), role: roleOf(button) }))
      .filter((item) => /^(allow|deny|允许|拒绝)$/iu.test(item.name));
    const hasAllow = confirmationButtons.some((item) => /^(allow|允许)$/iu.test(item.name));
    const hasDeny = confirmationButtons.some((item) => /^(deny|拒绝)$/iu.test(item.name));
    if (hasAllow && hasDeny) {
      const confirmationSurface = candidates.find((element) => {
        const text = normalizeText(element.innerText || element.textContent);
        return /希望与|wants to (talk|communicate|connect)|allow|允许/iu.test(text);
      });
      result.push({
        type: "ACTION_CONFIRMATION_PENDING",
        text: normalizeText(confirmationSurface?.innerText || confirmationSurface?.textContent || "ChatGPT Action confirmation requires user choice.").slice(0, 500)
      });
    }

    // Never classify ordinary conversation text as blocking UI. A transcript may
    // legitimately discuss phrases such as "network error", "log in" or
    // "rate limit". Only visible UI controls or dialog/alert surfaces count as
    // deterministic blocking evidence.
    const interactiveNames = [...document.querySelectorAll('button,a,[role="button"],[role="link"]')]
      .filter(visible)
      .map(accessibleName);
    const loginName = interactiveNames.find((name) => /^(log in|sign up|登录|注册)$/iu.test(name));
    if (loginName) result.push({ type: "LOGIN_REQUIRED", text: loginName });

    const surfaceText = candidates
      .map((element) => normalizeText(element.innerText || element.textContent).toLowerCase())
      .join(" ");
    const patterns = [
      ["RATE_LIMIT", ["too many requests", "rate limit", "达到上限", "请求过多"]],
      ["NETWORK_ERROR", ["network error", "网络错误", "连接错误"]]
    ];
    for (const [type, terms] of patterns) {
      const matched = terms.find((term) => surfaceText.includes(term.toLowerCase()));
      if (matched) result.push({ type, text: matched });
    }
    return result.slice(0, 20);
  }
  function pageState() {
    const blocking = blockingUi();
    if (blocking.some((item) => item.type === "LOGIN_REQUIRED")) return "LOGIN_REQUIRED";
    if (blocking.some((item) => item.type === "ACTION_CONFIRMATION_PENDING")) return "ACTION_CONFIRMATION_PENDING";
    if (blocking.some((item) => item.type === "NETWORK_ERROR")) return "ERROR";
    if (composer()) return "READY";
    return document.readyState === "complete" ? "UNKNOWN" : "LOADING";
  }
  function isScrollable(element) {
    if (!element) return false;
    const range = Number(element.scrollHeight ?? 0) - Number(element.clientHeight ?? 0);
    if (range <= 20) return false;
    if (element === document.scrollingElement || element === document.documentElement) return true;
    const style = getComputedStyle(element);
    return /(auto|scroll|overlay)/.test(String(style?.overflowY ?? ""));
  }
  function closestScrollable(element) {
    let current = element ?? null;
    while (current) {
      if (isScrollable(current)) return current;
      if (current === document.documentElement) break;
      current = current.parentElement ?? null;
    }
    return null;
  }
  function findScroller() {
    // Scope review/follow-latest state to the conversation surface. The previous
    // global "largest scroll range" heuristic could select the ChatGPT sidebar,
    // making an unrelated history-list position look like the user was reviewing
    // the bound conversation forever. Prefer the latest message's scrollable
    // ancestor, then the composer/main surface, and only then the document scroller.
    const latestMessage = [...document.querySelectorAll('[data-message-author-role],article')].at(-1) ?? null;
    const anchors = [
      latestMessage,
      composer(),
      document.querySelector("main"),
      document.querySelector('[role="main"]')
    ];
    for (const anchor of anchors) {
      const scroller = closestScrollable(anchor);
      if (scroller) return scroller;
    }
    if (document.scrollingElement) return document.scrollingElement;
    return document.documentElement ?? null;
  }
  function distanceFromBottom(scroller) {
    if (!scroller) return 0;
    return Math.max(0, Number(scroller.scrollHeight ?? 0) - Number(scroller.scrollTop ?? 0) - Number(scroller.clientHeight ?? 0));
  }
  function syncReviewStateFromPosition({ allowEnter = false } = {}) {
    const scroller = findScroller();
    if (!scroller) return;
    const reviewing = distanceFromBottom(scroller) > REVIEW_DISTANCE_PX;
    if (!reviewing) state.userReviewing = false;
    else if (allowEnter) state.userReviewing = true;
  }
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
    const catalog = new Map();
    state.elementCatalogs.set(observationId, catalog);
    while (state.elementCatalogs.size > 4) {
      const oldest = state.elementCatalogs.keys().next().value;
      state.elementCatalogs.delete(oldest);
    }
    const selectors = 'button,a[href],input,textarea,select,[role="button"],[role="link"],[contenteditable="true"]';
    const elements = [...document.querySelectorAll(selectors)].filter(visible).slice(0, 150);
    return elements.map((element, index) => {
      const ref = `${observationId}:el:${index}`;
      catalog.set(ref, element);
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
  function messageNodes() {
    const authored = [...document.querySelectorAll('[data-message-author-role]')].filter(visible);
    if (authored.length > 0) return authored;
    return [...document.querySelectorAll('article')].filter(visible);
  }
  function collectMessageSummary() {
    const nodes = messageNodes().slice(-12);
    return nodes.map((node, index) => ({
      index,
      role: node.getAttribute("data-message-author-role") || "unknown",
      text: normalizeText(node.innerText || node.textContent).slice(0, 4000)
    }));
  }
  function responseSnapshot() {
    // Response lifecycle counters must not use the 12-message evidence window.
    // Long conversations would otherwise stay pinned at 12 and a newly submitted
    // message could be misclassified as unconfirmed.
    const nodes = messageNodes();
    const assistantNodes = nodes.filter((node) => {
      const role = node.getAttribute("data-message-author-role") || "unknown";
      return role === "assistant" || role === "unknown";
    });
    return {
      message_count: nodes.length,
      assistant_count: assistantNodes.length,
      last_assistant_text: normalizeText(assistantNodes.at(-1)?.innerText || assistantNodes.at(-1)?.textContent).slice(0, 4000),
      generation_state: generationState(),
      page_state: pageState(),
      identity: identifyPage()
    };
  }
  function observe(observationId) {
    // On first contact (including content-script reinjection), preserve a real
    // human review position instead of blindly snapping to latest. Afterwards,
    // entering review mode is driven only by explicit user scroll intent; this
    // prevents ChatGPT/layout-driven scroll events from creating a sticky false
    // USER_CONTROL_ACTIVE gate.
    syncReviewStateFromPosition({ allowEnter: !state.reviewInitialized });
    state.reviewInitialized = true;
    if (state.followLatest && !state.userReviewing && Date.now() >= state.userActiveUntil) {
      scrollToBottom();
      syncReviewStateFromPosition({ allowEnter: false });
    }
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
  function isActionConfirmationChoiceTarget(target) {
    if (!(target instanceof Element)) return false;
    const button = typeof target.closest === "function"
      ? target.closest('button,[role="button"]')
      : target;
    if (!(button instanceof Element) || !visible(button)) return false;
    if (!/^(allow|deny|允许|拒绝)$/iu.test(accessibleName(button))) return false;
    return blockingUi().some((item) => item.type === "ACTION_CONFIRMATION_PENDING");
  }
  function responseWaitInterrupted() {
    if (state.userReviewing) return true;
    if (Date.now() >= state.userActiveUntil) return false;
    // Clicking ChatGPT's explicit Allow/Deny control is an expected part of the
    // post-delivery response lifecycle. It must not be mistaken for unrelated
    // user takeover. Any later pointer/key activity advances userActivityEpoch
    // and immediately restores the normal interruption guard.
    return state.userActivityEpoch !== state.actionConfirmationChoiceEpoch;
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
    const expectedText = normalizeText(text);
    const actualText = normalizeText(target.value ?? target.innerText ?? target.textContent);
    if (actualText !== expectedText) {
      throw Object.assign(new Error("ChatGPT composer content did not match the requested message after input."), {
        code: "COMPOSER_TEXT_MISMATCH",
        details: { expected_chars: expectedText.length, actual_chars: actualText.length }
      });
    }
    return { composer_text: actualText };
  }

  async function waitForCompleteResponse(payload, baseline) {
    return globalThis.BhrResponseLifecycle.waitForCompleteResponse({
      payload,
      baseline,
      snapshot: responseSnapshot,
      ensureIdentity: ensureExpectedIdentity,
      isInterrupted: responseWaitInterrupted
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
    const confirmation = await globalThis.BhrResponseLifecycle.waitForSubmissionConfirmation({
      payload,
      baseline,
      snapshot: responseSnapshot,
      composerText: () => {
        const current = composer();
        return current ? normalizeText(current.value ?? current.innerText ?? current.textContent) : null;
      },
      ensureIdentity: ensureExpectedIdentity,
      isInterrupted: () => state.userReviewing || Date.now() < state.userActiveUntil
    });
    if (payload.wait_for_response === false) {
      return {
        status: "ACTION_SUCCEEDED",
        details: {
          message_submitted: true,
          submitted_at: submittedAt,
          submitted_chars: set.composer_text.length,
          response_baseline: baseline,
          submission_confirmation: confirmation.details
        }
      };
    }
    const completed = await waitForCompleteResponse(payload, baseline);
    return {
      ...completed,
      details: {
        ...completed.details,
        submitted_at: submittedAt,
        submitted_chars: set.composer_text.length,
        message_count_before: baseline.message_count,
        submission_confirmation: confirmation.details
      }
    };
  }

  function clickRegistered(payload) {
    ensureNoUserConflict();
    ensureExpectedIdentity(payload.expected_identity);
    const catalog = state.elementCatalogs.get(payload.observation_id);
    if (!catalog) throw Object.assign(new Error("Element reference belongs to an expired observation catalog."), { code: "ELEMENT_REFERENCE_STALE" });
    const element = catalog.get(payload.element_ref);
    if (!element || !visible(element)) throw Object.assign(new Error("Registered element is no longer available."), { code: "ELEMENT_NOT_AVAILABLE" });
    if (payload.expected_accessible_name && accessibleName(element) !== payload.expected_accessible_name) {
      throw Object.assign(new Error("Element accessible name changed."), { code: "ELEMENT_PRECONDITION_CHANGED" });
    }
    element.click();
    return { status: "ACTION_SUCCEEDED", details: { element_ref: payload.element_ref, accessible_name: accessibleName(element) } };
  }

  async function waitForResponse(payload) {
    return waitForCompleteResponse(payload, payload.response_baseline ?? responseSnapshot());
  }

  async function execute(actionType, payload) {
    if (!ACTIONS.has(actionType)) throw Object.assign(new Error(`Unsupported action: ${actionType}`), { code: "ACTION_NOT_REGISTERED" });
    switch (actionType) {
      case "OBSERVE_PAGE": return { status: "ACTION_SUCCEEDED", details: {} };
      case "FOLLOW_LATEST": state.followLatest = payload.enabled !== false; state.userReviewing = false; if (state.followLatest) scrollToBottom(); return { status: "ACTION_SUCCEEDED", details: { follow_latest: state.followLatest } };
      case "SET_COMPOSER_TEXT": return { status: "ACTION_SUCCEEDED", details: setComposerText(payload.text, payload.expected_identity) };
      case "SUBMIT_MESSAGE":
      case "CONTINUE_ROLE_SESSION": return submitMessage(payload);
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

  function markUserActivity() {
    state.userActivityEpoch += 1;
    state.userActiveUntil = Date.now() + USER_ACTIVITY_WINDOW_MS;
  }
  function markUserScrollIntent() {
    state.userScrollIntentUntil = Date.now() + USER_SCROLL_INTENT_WINDOW_MS;
  }
  function isEditableTarget(target) {
    const tagName = String(target?.tagName ?? "").toUpperCase();
    return tagName === "INPUT" || tagName === "TEXTAREA" || target?.getAttribute?.("contenteditable") === "true";
  }
  function isScrollNavigationKey(event) {
    if (isEditableTarget(event.target)) return false;
    return new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]).has(event.key);
  }
  function onPointerDown(event) {
    if (!event.isTrusted) return;
    markUserActivity();
    const scroller = findScroller();
    if (scroller && event.target === scroller) markUserScrollIntent();
    if (isActionConfirmationChoiceTarget(event.target)) {
      state.actionConfirmationChoiceEpoch = state.userActivityEpoch;
    }
  }
  function onKeyDown(event) {
    if (!event.isTrusted) return;
    markUserActivity();
    if (isScrollNavigationKey(event)) markUserScrollIntent();
  }
  function onWheel(event) {
    if (!event.isTrusted) return;
    markUserActivity();
    markUserScrollIntent();
  }
  function onTouchMove(event) {
    if (!event.isTrusted) return;
    markUserActivity();
    markUserScrollIntent();
  }
  function onScroll(event) {
    if (!event.isTrusted || Date.now() - state.lastProgrammaticScrollAt < 300) return;
    const scroller = findScroller();
    if (!scroller) return;
    const target = event.target ?? null;
    const isConversationScroll = target === scroller ||
      (scroller === document.scrollingElement && (target === document || target === document.documentElement));
    if (!isConversationScroll) return;
    const reviewing = distanceFromBottom(scroller) > REVIEW_DISTANCE_PX;
    if (!reviewing) {
      state.userReviewing = false;
      return;
    }
    if (Date.now() < state.userScrollIntentUntil) state.userReviewing = true;
  }

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("wheel", onWheel, true);
  document.addEventListener("touchmove", onTouchMove, true);
  document.addEventListener("scroll", onScroll, true);

  let mutationObserver = null;
  let runtimeMessageListener = null;

  function disposeContentScript(reason = "DISPOSED") {
    if (state.disposed) return;
    state.disposed = true;
    state.runtimeInvalidated = true;
    clearTimeout(state.signalTimer);
    mutationObserver?.disconnect();
    state.elementCatalogs.clear();
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("wheel", onWheel, true);
    document.removeEventListener("touchmove", onTouchMove, true);
    document.removeEventListener("scroll", onScroll, true);
    if (runtimeMessageListener) {
      try { chrome.runtime.onMessage.removeListener(runtimeMessageListener); } catch { /* invalidated extension context */ }
    }
    runtimeMarker.state = "disposed";
    runtimeMarker.reason = reason;
  }

  function invalidateOldRuntimeContext() {
    disposeContentScript("EXTENSION_CONTEXT_INVALIDATED");
  }

  function isExtensionContextInvalidated(error) {
    return /Extension context invalidated/i.test(String(error?.message ?? error));
  }

  function handleRuntimeDeliveryError(error) {
    if (!isExtensionContextInvalidated(error)) return false;
    invalidateOldRuntimeContext();
    return true;
  }

  function sendRuntimeMessageSafely(message) {
    if (state.runtimeInvalidated || state.disposed) return;
    try {
      const pending = chrome.runtime.sendMessage(message);
      if (pending?.catch) pending.catch((error) => {
        handleRuntimeDeliveryError(error);
      });
    } catch (error) {
      handleRuntimeDeliveryError(error);
    }
  }

  function sendResponseSafely(sendResponse, response) {
    if (state.runtimeInvalidated || state.disposed) return false;
    try {
      sendResponse(response);
      return true;
    } catch (error) {
      if (handleRuntimeDeliveryError(error)) return false;
      // Never let a late response-port failure escape as an uncaught content-script
      // exception. The background caller owns transport retry policy; browser side
      // effects must not be re-executed merely because the response channel closed.
      return false;
    }
  }

  function schedulePageSignal() {
    if (state.runtimeInvalidated) return;
    clearTimeout(state.signalTimer);
    state.signalTimer = setTimeout(() => {
      if (state.runtimeInvalidated) return;
      const identity = identifyPage();
      const signal = JSON.stringify({ page_state: pageState(), generation_state: generationState(), blocking_types: blockingUi().map((item) => item.type), gpt_ref: identity.gpt_ref, conversation_ref: identity.conversation_ref, url: identity.url });
      if (signal === state.lastPageSignal) return;
      state.lastPageSignal = signal;
      sendRuntimeMessageSafely({ type: "BHR_PAGE_SIGNAL", signal: JSON.parse(signal) });
    }, 1500);
  }

  mutationObserver = new MutationObserver(() => {
    if (state.followLatest && !state.userReviewing && Date.now() >= state.userActiveUntil) scrollToBottom();
    schedulePageSignal();
  });
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

  runtimeMessageListener = (message, _sender, sendResponse) => {
    void (async () => {
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
        return safeError(error.code ?? "CONTENT_ACTION_FAILED", error.message ?? "Content action failed.", error.details ?? null);
      }
    })().then((response) => {
      sendResponseSafely(sendResponse, response);
    }, (error) => {
      sendResponseSafely(sendResponse, safeError(error?.code ?? "CONTENT_ACTION_FAILED", error?.message ?? "Content action failed.", error?.details ?? null));
    });
    return true;
  };
  chrome.runtime.onMessage.addListener(runtimeMessageListener);

  runtimeMarker.dispose = disposeContentScript;
  runtimeMarker.state = "ready";
})();

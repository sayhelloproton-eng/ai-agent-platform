import { CONTRACT_VERSION } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { assertObservation } from "../shared/contracts.js";
import { BhrError } from "../shared/errors.js";
import { computePageIdentityFingerprint } from "../shared/page-identity.js";

const CONTENT_SCRIPT_FILES = [
  "src/content/response-lifecycle.js",
  "src/content/content-script.js"
];
const contentScriptRecovery = new Map();
const sharedScreenshotState = {
  queue: Promise.resolve(),
  lastCaptureAt: 0,
  cooldownUntil: 0,
  inFlightByTab: new Map()
};
const SCREENSHOT_MIN_INTERVAL_MS = 1100;
const SCREENSHOT_QUOTA_COOLDOWN_MS = 3000;

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function sendTabMessageOnce(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (!error) return resolve(response);
      const messageText = String(error.message ?? "Content-script message failed.");
      if (/Could not establish connection|Receiving end does not exist/i.test(messageText)) {
        return reject(new BhrError("CONTENT_SCRIPT_UNAVAILABLE", messageText));
      }
      // A port can close after the receiver already accepted a message. Retrying a
      // browser action in that case could duplicate a real side effect, so this is
      // intentionally distinct from a definitely-missing receiver.
      return reject(new BhrError("CONTENT_SCRIPT_MESSAGE_FAILED", messageText));
    });
  });
}

async function assertChatGptTab(tabId) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (error) {
    throw new BhrError("TAB_NOT_FOUND", "The bound browser tab no longer exists.", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }
  if (!tab?.id) throw new BhrError("TAB_NOT_FOUND", "The bound browser tab no longer exists.");
  if (!tab.url?.startsWith("https://chatgpt.com/")) {
    throw new BhrError("CONTENT_SCRIPT_UNAVAILABLE", "The bound tab is not an allowed ChatGPT page; automatic content-script recovery was not attempted.");
  }
  return tab;
}

async function ensureContentScriptUnlocked(tabId) {
  try {
    const response = await sendTabMessageOnce(tabId, { type: "BHR_PING" });
    if (response?.ok && response.data?.provider === "chatgpt-web") {
      return { ready: true, injected: false, page: response.data };
    }
  } catch (error) {
    if (!(error instanceof BhrError) || error.code !== "CONTENT_SCRIPT_UNAVAILABLE") throw error;
  }

  await assertChatGptTab(tabId);
  if (!chrome.scripting?.executeScript) {
    throw new BhrError(
      "CONTENT_SCRIPT_UNAVAILABLE",
      "The ChatGPT content script is unavailable and automatic reinjection is not permitted. Reload the ChatGPT tab, then retry."
    );
  }

  try {
    for (const file of CONTENT_SCRIPT_FILES) {
      await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
    }
  } catch (error) {
    throw new BhrError(
      "CONTENT_SCRIPT_UNAVAILABLE",
      "The ChatGPT content script is unavailable and automatic reinjection failed. Reload the ChatGPT tab, then retry.",
      { cause: error instanceof Error ? error.message : String(error) }
    );
  }

  await delay(20);
  try {
    const response = await sendTabMessageOnce(tabId, { type: "BHR_PING" });
    if (response?.ok && response.data?.provider === "chatgpt-web") {
      return { ready: true, injected: true, page: response.data };
    }
    throw new BhrError("CONTENT_SCRIPT_UNAVAILABLE", "The ChatGPT content script did not become ready after automatic reinjection. Reload the ChatGPT tab, then retry.");
  } catch (error) {
    if (error instanceof BhrError && error.code === "CONTENT_SCRIPT_UNAVAILABLE") {
      throw new BhrError(
        "CONTENT_SCRIPT_UNAVAILABLE",
        "The ChatGPT content script did not become ready after automatic reinjection. Reload the ChatGPT tab, then retry.",
        error.details
      );
    }
    throw error;
  }
}

export async function ensureContentScript(tabId) {
  const existing = contentScriptRecovery.get(tabId);
  if (existing) return existing;
  const pending = ensureContentScriptUnlocked(tabId).finally(() => {
    if (contentScriptRecovery.get(tabId) === pending) contentScriptRecovery.delete(tabId);
  });
  contentScriptRecovery.set(tabId, pending);
  return pending;
}

export async function sendTabMessage(tabId, message, { recoverContentScript = true } = {}) {
  try {
    return await sendTabMessageOnce(tabId, message);
  } catch (error) {
    if (!recoverContentScript || !(error instanceof BhrError) || error.code !== "CONTENT_SCRIPT_UNAVAILABLE") throw error;
    await ensureContentScript(tabId);
    return sendTabMessageOnce(tabId, message);
  }
}

export class ObservationCoordinator {
  constructor({ host_id, evidenceStore, screenshotQuality = 75, focusDelayMs = 120 }) {
    this.host_id = host_id;
    this.evidenceStore = evidenceStore;
    this.screenshotQuality = screenshotQuality;
    this.focusDelayMs = focusDelayMs;
  }

  async captureScreenshot(binding) {
    const existing = sharedScreenshotState.inFlightByTab.get(binding.chrome_tab_id);
    if (existing) return existing;
    const run = async () => {
      const now = Date.now();
      if (now < sharedScreenshotState.cooldownUntil) {
        return { ref: null, unavailable_reason: "SCREENSHOT_RATE_LIMITED", temporarily_activated: false };
      }
      const waitMs = Math.max(0, sharedScreenshotState.lastCaptureAt + SCREENSHOT_MIN_INTERVAL_MS - now);
      if (waitMs > 0) await delay(waitMs);
      const tab = await chrome.tabs.get(binding.chrome_tab_id);
      if (!tab?.id || tab.windowId === undefined) throw new BhrError("TAB_NOT_FOUND", "The bound browser tab no longer exists.");
      const [active] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
      // Screenshot evidence is auxiliary. Passive observation must never steal the
      // user's active tab merely to satisfy captureVisibleTab. DOM/text evidence
      // remains available for an inactive Binding.
      if (!tab.active || active?.id !== tab.id) {
        return {
          ref: null,
          unavailable_reason: "SCREENSHOT_TAB_NOT_ACTIVE",
          temporarily_activated: false
        };
      }
      let dataUrl;
      try {
        dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: this.screenshotQuality });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/Either the '<all_urls>' or 'activeTab' permission is required/u.test(message)) {
          return {
            ref: null,
            unavailable_reason: "SCREENSHOT_PERMISSION_UNAVAILABLE",
            temporarily_activated: false
          };
        }
        if (/MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND|exceeds the.*captureVisibleTab.*quota/i.test(message)) {
          sharedScreenshotState.cooldownUntil = Date.now() + SCREENSHOT_QUOTA_COOLDOWN_MS;
          return {
            ref: null,
            unavailable_reason: "SCREENSHOT_RATE_LIMITED",
            temporarily_activated: false
          };
        }
        throw error;
      }
      sharedScreenshotState.lastCaptureAt = Date.now();
      const ref = `local-screenshot-${randomId("evidence")}`;
      await this.evidenceStore.put(ref, {
        data_url: dataUrl,
        captured_at: new Date().toISOString(),
        binding_id: binding.binding_id,
        chrome_tab_id: binding.chrome_tab_id,
        temporarily_activated: false
      });
      return { ref, unavailable_reason: null, temporarily_activated: false };
    };
    const pending = sharedScreenshotState.queue.then(run, run).finally(() => {
      if (sharedScreenshotState.inFlightByTab.get(binding.chrome_tab_id) === pending) {
        sharedScreenshotState.inFlightByTab.delete(binding.chrome_tab_id);
      }
    });
    sharedScreenshotState.inFlightByTab.set(binding.chrome_tab_id, pending);
    sharedScreenshotState.queue = pending.catch(() => {});
    return pending;
  }

  async observe(binding, { includeScreenshot = true } = {}) {
    const observationId = randomId("observation");
    const page = await sendTabMessage(binding.chrome_tab_id, { type: "BHR_OBSERVE", observation_id: observationId });
    if (!page?.ok) throw new BhrError(page?.error?.code ?? "OBSERVATION_FAILED", page?.error?.message ?? "Page observation failed.", page?.error?.details);

    const identity = {
      provider: page.data.provider,
      gpt_ref: page.data.gpt_ref,
      conversation_ref: page.data.conversation_ref ?? null,
      url: page.data.url
    };
    const pageFingerprint = await computePageIdentityFingerprint(identity);
    const visibleTextRef = `local-visible-text-${randomId("evidence")}`;
    const domRef = `local-dom-${randomId("evidence")}`;
    await this.evidenceStore.put(visibleTextRef, { text: page.data.visible_text, observed_at: page.data.observed_at, identity });
    await this.evidenceStore.put(domRef, {
      dom_summary: page.data.dom_summary,
      accessibility_summary: page.data.accessibility_summary,
      message_summary: page.data.message_summary,
      observed_at: page.data.observed_at,
      identity
    });
    const screenshot = includeScreenshot ? await this.captureScreenshot(binding) : { ref: null, unavailable_reason: "NOT_REQUESTED", temporarily_activated: false };

    const observation = assertObservation({
      observation_version: CONTRACT_VERSION,
      observation_id: observationId,
      host_id: this.host_id,
      binding_id: binding.binding_id,
      provider: identity.provider,
      gpt_ref: identity.gpt_ref,
      conversation_ref: identity.conversation_ref,
      page_url: identity.url,
      page_fingerprint: pageFingerprint,
      page_state: page.data.page_state,
      generation_state: page.data.generation_state,
      follow_latest: page.data.follow_latest,
      screenshot_ref: screenshot.ref,
      screenshot_unavailable_reason: screenshot.unavailable_reason,
      visible_text_ref: visibleTextRef,
      dom_summary_ref: domRef,
      interactive_elements: page.data.interactive_elements,
      blocking_ui: page.data.blocking_ui,
      observed_at: page.data.observed_at
    });
    return {
      observation,
      local: {
        ...page.data,
        page_fingerprint: pageFingerprint,
        screenshot_unavailable_reason: screenshot.unavailable_reason,
        screenshot_temporarily_activated: screenshot.temporarily_activated
      }
    };
  }
}

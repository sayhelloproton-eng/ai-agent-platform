import { CONTRACT_VERSION } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { assertObservation } from "../shared/contracts.js";
import { BhrError } from "../shared/errors.js";
import { computePageIdentityFingerprint } from "../shared/page-identity.js";

export function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new BhrError("CONTENT_SCRIPT_UNAVAILABLE", error.message));
      else resolve(response);
    });
  });
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export class ObservationCoordinator {
  constructor({ host_id, evidenceStore, screenshotQuality = 75, focusDelayMs = 120 }) {
    this.host_id = host_id;
    this.evidenceStore = evidenceStore;
    this.screenshotQuality = screenshotQuality;
    this.focusDelayMs = focusDelayMs;
    this.captureQueue = Promise.resolve();
  }

  async captureScreenshot(binding) {
    const run = async () => {
      const tab = await chrome.tabs.get(binding.chrome_tab_id);
      if (!tab?.id || tab.windowId === undefined) throw new BhrError("TAB_NOT_FOUND", "The bound browser tab no longer exists.");
      const [previous] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
      const switched = !tab.active;
      try {
        if (switched) {
          await chrome.tabs.update(tab.id, { active: true });
          await delay(this.focusDelayMs);
        }
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: this.screenshotQuality });
        const ref = `local-screenshot-${randomId("evidence")}`;
        await this.evidenceStore.put(ref, {
          data_url: dataUrl,
          captured_at: new Date().toISOString(),
          binding_id: binding.binding_id,
          chrome_tab_id: binding.chrome_tab_id,
          temporarily_activated: switched
        });
        return { ref, unavailable_reason: null, temporarily_activated: switched };
      } finally {
        if (switched && previous?.id && previous.id !== tab.id) {
          try { await chrome.tabs.update(previous.id, { active: true }); } catch { /* best-effort restoration */ }
        }
      }
    };
    const pending = this.captureQueue.then(run, run);
    this.captureQueue = pending.catch(() => {});
    return pending;
  }

  async observe(binding, { includeScreenshot = true } = {}) {
    const observationId = randomId("observation");
    const page = await sendTabMessage(binding.chrome_tab_id, { type: "BHR_OBSERVE", observation_id: observationId });
    if (!page?.ok) throw new BhrError(page?.error?.code ?? "OBSERVATION_FAILED", page?.error?.message ?? "Page observation failed.");

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

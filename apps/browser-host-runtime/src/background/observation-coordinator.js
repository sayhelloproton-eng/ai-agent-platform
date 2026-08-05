import { CONTRACT_VERSION } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { assertObservation } from "../shared/contracts.js";
import { BhrError } from "../shared/errors.js";

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new BhrError("CONTENT_SCRIPT_UNAVAILABLE", error.message));
      else resolve(response);
    });
  });
}

export class ObservationCoordinator {
  constructor({ host_id, evidenceStore, screenshotQuality = 75 }) {
    this.host_id = host_id;
    this.evidenceStore = evidenceStore;
    this.screenshotQuality = screenshotQuality;
  }

  async captureScreenshot(binding) {
    const tab = await chrome.tabs.get(binding.chrome_tab_id);
    if (!tab.active) return { ref: null, unavailable_reason: "TAB_NOT_ACTIVE" };
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: this.screenshotQuality });
    const ref = `local-screenshot-${randomId("evidence")}`;
    await this.evidenceStore.put(ref, { data_url: dataUrl, captured_at: new Date().toISOString(), binding_id: binding.binding_id });
    return { ref, unavailable_reason: null };
  }

  async observe(binding, { includeScreenshot = true } = {}) {
    const observationId = randomId("observation");
    const page = await sendTabMessage(binding.chrome_tab_id, { type: "BHR_OBSERVE", observation_id: observationId });
    if (!page?.ok) throw new BhrError(page?.error?.code ?? "OBSERVATION_FAILED", page?.error?.message ?? "Page observation failed.");

    const visibleTextRef = `local-visible-text-${randomId("evidence")}`;
    const domRef = `local-dom-${randomId("evidence")}`;
    await this.evidenceStore.put(visibleTextRef, { text: page.data.visible_text, observed_at: page.data.observed_at });
    await this.evidenceStore.put(domRef, { dom_summary: page.data.dom_summary, message_summary: page.data.message_summary, observed_at: page.data.observed_at });
    const screenshot = includeScreenshot ? await this.captureScreenshot(binding) : { ref: null, unavailable_reason: "NOT_REQUESTED" };

    const observation = assertObservation({
      observation_version: CONTRACT_VERSION,
      observation_id: observationId,
      host_id: this.host_id,
      binding_id: binding.binding_id,
      provider: "chatgpt-web",
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
    return { observation, local: { ...page.data, screenshot_unavailable_reason: screenshot.unavailable_reason } };
  }
}

export { sendTabMessage };

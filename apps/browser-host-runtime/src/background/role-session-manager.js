import { BINDING_STATE } from "../shared/constants.js";
import { BhrError } from "../shared/errors.js";
import { computePageIdentityFingerprint, targetMatchesIdentity } from "../shared/page-identity.js";
import { sendTabMessage } from "./observation-coordinator.js";

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export class RoleSessionManager {
  constructor({ host_id, bindingRegistry, contentReadyTimeoutMs = 20000, pollMs = 250 }) {
    this.host_id = host_id;
    this.bindingRegistry = bindingRegistry;
    this.contentReadyTimeoutMs = contentReadyTimeoutMs;
    this.pollMs = pollMs;
  }

  async waitForPageIdentity(tabId) {
    const started = Date.now();
    let lastError = null;
    while (Date.now() - started < this.contentReadyTimeoutMs) {
      try {
        const response = await sendTabMessage(tabId, { type: "BHR_PING" });
        if (response?.ok && response.data?.provider === "chatgpt-web") return response.data;
      } catch (error) { lastError = error; }
      await delay(this.pollMs);
    }
    throw new BhrError("ROLE_SESSION_PAGE_TIMEOUT", lastError?.message ?? "Timed out waiting for the ChatGPT page adapter.");
  }

  async navigateAndConfirm(binding, url, target) {
    const tab = await chrome.tabs.get(binding.chrome_tab_id);
    if (tab.url !== url) await chrome.tabs.update(tab.id, { url, active: true });
    else if (!tab.active) await chrome.tabs.update(tab.id, { active: true });
    const page = await this.waitForPageIdentity(tab.id);
    const identity = { ...page, page_fingerprint: await computePageIdentityFingerprint(page) };
    if (!targetMatchesIdentity(target, identity)) {
      await this.bindingRegistry.update(binding.binding_id, { state: BINDING_STATE.STALE, stale_reason: "OPENED_PAGE_TARGET_MISMATCH", observed_identity: identity });
      throw new BhrError("ROLE_SESSION_TARGET_MISMATCH", "The opened ChatGPT page does not match the requested role/GPT/conversation target.");
    }
    return this.bindingRegistry.confirmPageIdentity(binding.binding_id, identity);
  }

  async openOrResume({ command, resolved_payload }) {
    let binding = await this.bindingRegistry.findForTarget(command.target);
    let created = false;
    if (!binding) {
      const tab = await chrome.tabs.create({ url: resolved_payload.url, active: true });
      if (!tab?.id || tab.windowId === undefined) throw new BhrError("ROLE_SESSION_TAB_CREATE_FAILED", "Chrome did not return a created tab.");
      binding = await this.bindingRegistry.createProvisioning({
        host_id: this.host_id,
        chrome_tab_id: tab.id,
        window_id: tab.windowId,
        role_ref: command.target.role_ref,
        gpt_ref: command.target.gpt_ref,
        conversation_ref: command.target.conversation_ref ?? null,
        url: resolved_payload.url
      });
      created = true;
    }

    binding = await this.navigateAndConfirm(binding, resolved_payload.url, command.target);
    await sendTabMessage(binding.chrome_tab_id, { type: "BHR_SET_FOLLOW_LATEST", enabled: true });

    let wake_execution = null;
    if (resolved_payload.wake_text) {
      const response = await sendTabMessage(binding.chrome_tab_id, {
        type: "BHR_EXECUTE_ACTION",
        command_id: command.command_id,
        action_type: "SUBMIT_MESSAGE",
        payload: {
          text: resolved_payload.wake_text,
          wait_for_response: false,
          timeout_ms: resolved_payload.timeout_ms,
          expected_identity: {
            gpt_ref: binding.gpt_ref,
            conversation_ref: binding.conversation_ref ?? null
          }
        }
      });
      if (!response?.ok) throw new BhrError(response?.error?.code ?? "PAGE_ACTION_FAILED", response?.error?.message ?? "Wake message failed.");
      wake_execution = response.data;
      const refreshed = await this.waitForPageIdentity(binding.chrome_tab_id);
      const refreshedIdentity = { ...refreshed, page_fingerprint: await computePageIdentityFingerprint(refreshed) };
      if (command.target.gpt_ref !== refreshedIdentity.gpt_ref) {
        await this.bindingRegistry.update(binding.binding_id, { state: BINDING_STATE.STALE, stale_reason: "POST_WAKE_GPT_CHANGED", observed_identity: refreshedIdentity });
        throw new BhrError("ROLE_SESSION_TARGET_MISMATCH", "The role session changed to a different GPT after wake submission.");
      }
      binding = await this.bindingRegistry.confirmPageIdentity(binding.binding_id, refreshedIdentity);
    }

    return {
      status: wake_execution?.status ?? "ACTION_SUCCEEDED",
      binding,
      response_pending: Boolean(wake_execution),
      delivery: wake_execution ? {
        delivery_id: `${command.command_id}:delivery`,
        submitted_at: wake_execution.details?.submitted_at ?? new Date().toISOString(),
        response_baseline: wake_execution.details?.response_baseline ?? null,
        details: wake_execution.details ?? {}
      } : {
        delivery_id: `${command.command_id}:delivery`,
        submitted_at: new Date().toISOString(),
        response_baseline: null,
        details: { session_opened: true }
      },
      details: {
        session_created: created,
        tab_id: binding.chrome_tab_id,
        role_ref: binding.role_ref,
        gpt_ref: binding.gpt_ref,
        conversation_ref: binding.conversation_ref,
        wake_execution
      }
    };
  }
}

import { BINDING_STATE } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { BhrError } from "../shared/errors.js";
import { targetMatchesIdentity } from "../shared/page-identity.js";

const KEY = "bhr.bindings";

export class BindingRegistry {
  constructor(storage) { this.storage = storage; }
  async list() { return (await this.storage.get(KEY)) ?? []; }
  async save(bindings) { await this.storage.set(KEY, bindings); }

  async bind({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref, url, page_fingerprint = null, state = BINDING_STATE.READY }) {
    const bindings = await this.list();
    const now = new Date().toISOString();
    const existing = bindings.find((item) => item.chrome_tab_id === chrome_tab_id);
    const next = {
      binding_id: existing?.binding_id ?? randomId("binding"),
      host_id,
      provider: "chatgpt-web",
      browser_profile_ref: "chrome-current-profile",
      window_ref: `chrome-window-${window_id}`,
      tab_ref: existing?.tab_ref ?? randomId("tab"),
      chrome_tab_id,
      role_ref,
      gpt_ref,
      conversation_ref: conversation_ref ?? null,
      page_fingerprint,
      mode: existing?.mode ?? "FOLLOW_LATEST",
      state,
      url,
      last_seen_at: now,
      confirmed_at: state === BINDING_STATE.READY ? now : existing?.confirmed_at ?? null
    };
    const filtered = bindings.filter((item) => item.binding_id !== next.binding_id && item.chrome_tab_id !== chrome_tab_id);
    filtered.push(next);
    await this.save(filtered);
    return next;
  }

  async createProvisioning({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref = null, url }) {
    return this.bind({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref, url, page_fingerprint: null, state: BINDING_STATE.PROVISIONING });
  }

  async update(binding_id, patch) {
    const bindings = await this.list();
    const index = bindings.findIndex((item) => item.binding_id === binding_id);
    if (index < 0) throw new BhrError("BINDING_NOT_FOUND", `Binding not found: ${binding_id}`);
    bindings[index] = { ...bindings[index], ...patch, last_seen_at: new Date().toISOString() };
    await this.save(bindings);
    return bindings[index];
  }

  async confirmPageIdentity(binding_id, identity) {
    const binding = await this.update(binding_id, {
      state: BINDING_STATE.READY,
      gpt_ref: identity.gpt_ref,
      conversation_ref: identity.conversation_ref ?? null,
      page_fingerprint: identity.page_fingerprint,
      url: identity.url,
      stale_reason: null,
      confirmed_at: new Date().toISOString()
    });
    return binding;
  }

  async findForTarget(target) {
    const bindings = await this.list();
    return bindings.find((item) =>
      item.state === BINDING_STATE.READY &&
      item.role_ref === target.role_ref &&
      item.gpt_ref === target.gpt_ref &&
      (!target.conversation_ref || item.conversation_ref === target.conversation_ref)
    ) ?? null;
  }

  async findByTabId(chrome_tab_id) {
    return (await this.list()).find((item) => item.chrome_tab_id === chrome_tab_id) ?? null;
  }

  async validateObservation(binding, observation, target = null) {
    const identity = {
      provider: observation.provider,
      gpt_ref: observation.gpt_ref,
      conversation_ref: observation.conversation_ref,
      url: observation.page_url,
      page_fingerprint: observation.page_fingerprint
    };
    const canPromoteConversation = binding.provider === identity.provider &&
      binding.gpt_ref === identity.gpt_ref &&
      !binding.conversation_ref &&
      Boolean(identity.conversation_ref) &&
      !target?.conversation_ref;
    const conversationMatches = (binding.conversation_ref ?? null) === (identity.conversation_ref ?? null) || canPromoteConversation;
    const fingerprintMatches = !binding.page_fingerprint || binding.page_fingerprint === identity.page_fingerprint || canPromoteConversation;
    const bindingMatches = binding.provider === identity.provider &&
      binding.gpt_ref === identity.gpt_ref &&
      conversationMatches &&
      fingerprintMatches;
    const targetMatches = !target || targetMatchesIdentity(target, identity);
    if (!bindingMatches || !targetMatches) {
      await this.update(binding.binding_id, {
        state: BINDING_STATE.STALE,
        stale_reason: "PAGE_IDENTITY_CHANGED",
        observed_identity: identity
      });
      throw new BhrError("BINDING_PAGE_IDENTITY_MISMATCH", "The current ChatGPT page no longer matches the Browser Session Binding or Host Command target.");
    }
    return this.update(binding.binding_id, {
      state: BINDING_STATE.READY,
      conversation_ref: canPromoteConversation ? identity.conversation_ref : binding.conversation_ref,
      page_fingerprint: identity.page_fingerprint,
      last_observed_identity: identity,
      url: identity.url,
      stale_reason: null
    });
  }

  async reconcileNavigation(chrome_tab_id, identity) {
    const binding = await this.findByTabId(chrome_tab_id);
    if (!binding) return null;
    if (!identity || identity.provider !== "chatgpt-web") return this.markTabStale(chrome_tab_id, "NAVIGATED_OUTSIDE_PROVIDER");
    if (binding.gpt_ref !== identity.gpt_ref || (binding.conversation_ref ?? null) !== (identity.conversation_ref ?? null)) {
      return this.update(binding.binding_id, {
        state: BINDING_STATE.STALE,
        stale_reason: "CHATGPT_SESSION_CHANGED",
        observed_identity: identity,
        url: identity.url
      });
    }
    return this.update(binding.binding_id, { url: identity.url });
  }

  async markTabStale(chrome_tab_id, reason) {
    const binding = await this.findByTabId(chrome_tab_id);
    if (!binding) return null;
    return this.update(binding.binding_id, { state: BINDING_STATE.STALE, stale_reason: reason });
  }

  async remove(binding_id) {
    const bindings = await this.list();
    await this.save(bindings.filter((item) => item.binding_id !== binding_id));
  }
}

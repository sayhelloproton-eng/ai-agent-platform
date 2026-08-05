import { BINDING_STATE } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { BhrError } from "../shared/errors.js";

const KEY = "bhr.bindings";

export class BindingRegistry {
  constructor(storage) { this.storage = storage; }
  async list() { return (await this.storage.get(KEY)) ?? []; }
  async save(bindings) { await this.storage.set(KEY, bindings); }

  async bind({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref, url }) {
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
      mode: existing?.mode ?? "FOLLOW_LATEST",
      state: BINDING_STATE.READY,
      url,
      last_seen_at: now
    };
    const filtered = bindings.filter((item) => item.binding_id !== next.binding_id && item.chrome_tab_id !== chrome_tab_id);
    filtered.push(next);
    await this.save(filtered);
    return next;
  }

  async update(binding_id, patch) {
    const bindings = await this.list();
    const index = bindings.findIndex((item) => item.binding_id === binding_id);
    if (index < 0) throw new BhrError("BINDING_NOT_FOUND", `Binding not found: ${binding_id}`);
    bindings[index] = { ...bindings[index], ...patch, last_seen_at: new Date().toISOString() };
    await this.save(bindings);
    return bindings[index];
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

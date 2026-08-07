import { BINDING_STATE } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { BhrError } from "../shared/errors.js";
import { targetMatchesIdentity } from "../shared/page-identity.js";

const KEY = "bhr.bindings";
const ACTIVE_BINDING_STATES = new Set([BINDING_STATE.READY, BINDING_STATE.PROVISIONING]);
const sharedQueues = new WeakMap();

function lockTarget(storage) {
  return storage?.area && typeof storage.area === "object" ? storage.area : storage;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function bindingRecency(binding, index) {
  const stamp = Date.parse(binding.confirmed_at ?? binding.last_seen_at ?? "") || 0;
  return { stamp, index };
}

function newerThan(left, right) {
  if (left.stamp !== right.stamp) return left.stamp > right.stamp;
  return left.index > right.index;
}

function selectCurrentBinding(bindings, predicate) {
  let selected = null;
  bindings.forEach((item, index) => {
    if (!predicate(item)) return;
    const candidate = {
      item,
      active: ACTIVE_BINDING_STATES.has(item.state) ? 1 : 0,
      recency: bindingRecency(item, index)
    };
    if (!selected || candidate.active > selected.active || (candidate.active === selected.active && newerThan(candidate.recency, selected.recency))) {
      selected = candidate;
    }
  });
  return selected?.item ?? null;
}

export class BindingRegistry {
  constructor(storage) { this.storage = storage; }

  _exclusive(work) {
    const target = lockTarget(this.storage);
    const previous = sharedQueues.get(target) ?? Promise.resolve();
    const run = previous.then(work, work);
    sharedQueues.set(target, run.catch(() => undefined));
    return run;
  }

  async _load() { return clone((await this.storage.get(KEY)) ?? []); }
  async _save(bindings) { await this.storage.set(KEY, bindings); }

  async list() { return this._exclusive(() => this._load()); }
  async save(bindings) { return this._exclusive(() => this._save(clone(bindings))); }

  async reconcileHostOwnership(host_id) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const now = new Date().toISOString();
      let changed = false;
      const next = bindings.map((item) => {
        if (!ACTIVE_BINDING_STATES.has(item.state) || item.host_id === host_id) return item;
        changed = true;
        return {
          ...item,
          state: BINDING_STATE.STALE,
          stale_reason: "HOST_ID_CHANGED",
          last_seen_at: now
        };
      });
      if (changed) await this._save(next);
      return { changed, bindings: clone(changed ? next : bindings) };
    });
  }

  async reconcileReadyUniqueness() {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const winners = new Map();
      bindings.forEach((item, index) => {
        if (item.state !== BINDING_STATE.READY) return;
        const key = `${item.host_id ?? "unknown"}:${item.role_ref}`;
        const current = winners.get(key);
        const candidate = bindingRecency(item, index);
        if (!current || newerThan(candidate, current.recency)) winners.set(key, { binding_id: item.binding_id, recency: candidate });
      });
      const now = new Date().toISOString();
      let changed = false;
      const next = bindings.map((item) => {
        if (item.state !== BINDING_STATE.READY) return item;
        const winner = winners.get(`${item.host_id ?? "unknown"}:${item.role_ref}`);
        if (!winner || winner.binding_id === item.binding_id) return item;
        changed = true;
        return {
          ...item,
          state: BINDING_STATE.STALE,
          stale_reason: "DUPLICATE_ROLE_BINDING",
          superseded_by_binding_id: winner.binding_id,
          last_seen_at: now
        };
      });
      if (changed) await this._save(next);
      return { changed, bindings: changed ? clone(next) : clone(bindings) };
    });
  }

  async bind({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref, url, page_fingerprint = null, state = BINDING_STATE.READY }) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const now = new Date().toISOString();
      const currentTabBinding = selectCurrentBinding(bindings, (item) => item.chrome_tab_id === chrome_tab_id);
      // A Binding ID is an execution epoch, not a mutable alias for a physical tab.
      // Rebinding must create a fresh ID so old Approval Grants and recovery records
      // can never start referring to a different role/conversation after a rebind.
      const next = {
        binding_id: randomId("binding"),
        host_id,
        provider: "chatgpt-web",
        browser_profile_ref: "chrome-current-profile",
        window_ref: `chrome-window-${window_id}`,
        tab_ref: currentTabBinding?.tab_ref ?? randomId("tab"),
        chrome_tab_id,
        role_ref,
        gpt_ref,
        conversation_ref: conversation_ref ?? null,
        page_fingerprint,
        mode: currentTabBinding?.mode ?? "FOLLOW_LATEST",
        state,
        url,
        stale_reason: null,
        superseded_by_binding_id: null,
        last_seen_at: now,
        confirmed_at: state === BINDING_STATE.READY ? now : null
      };
      const updated = bindings.map((item) => {
        if (!ACTIVE_BINDING_STATES.has(item.state)) return item;
        const sameRole = item.host_id === host_id && item.role_ref === role_ref;
        const sameTab = item.chrome_tab_id === chrome_tab_id;
        if (!sameRole && !sameTab) return item;
        return {
          ...item,
          state: BINDING_STATE.STALE,
          stale_reason: sameRole ? "ROLE_REBOUND" : "TAB_REBOUND",
          superseded_by_binding_id: next.binding_id,
          last_seen_at: now
        };
      });
      updated.push(next);
      await this._save(updated);
      return clone(next);
    });
  }

  async createProvisioning({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref = null, url }) {
    return this.bind({ host_id, chrome_tab_id, window_id, role_ref, gpt_ref, conversation_ref, url, page_fingerprint: null, state: BINDING_STATE.PROVISIONING });
  }

  async update(binding_id, patch) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const index = bindings.findIndex((item) => item.binding_id === binding_id);
      if (index < 0) throw new BhrError("BINDING_NOT_FOUND", `Binding not found: ${binding_id}`);
      bindings[index] = { ...bindings[index], ...patch, last_seen_at: new Date().toISOString() };
      await this._save(bindings);
      return clone(bindings[index]);
    });
  }

  async confirmPageIdentity(binding_id, identity) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const index = bindings.findIndex((item) => item.binding_id === binding_id);
      if (index < 0) throw new BhrError("BINDING_NOT_FOUND", `Binding not found: ${binding_id}`);
      if (bindings[index].superseded_by_binding_id) {
        throw new BhrError("BINDING_NOT_READY", `Binding ${binding_id} was superseded and cannot be promoted back to READY.`);
      }
      const now = new Date().toISOString();
      const current = {
        ...bindings[index],
        state: BINDING_STATE.READY,
        gpt_ref: identity.gpt_ref,
        conversation_ref: identity.conversation_ref ?? null,
        page_fingerprint: identity.page_fingerprint,
        url: identity.url,
        stale_reason: null,
        superseded_by_binding_id: null,
        confirmed_at: now,
        last_seen_at: now
      };
      const next = bindings.map((item, itemIndex) => {
        if (itemIndex === index) return current;
        if (item.host_id === current.host_id && item.role_ref === current.role_ref && ACTIVE_BINDING_STATES.has(item.state)) {
          return {
            ...item,
            state: BINDING_STATE.STALE,
            stale_reason: "ROLE_REBOUND",
            superseded_by_binding_id: current.binding_id,
            last_seen_at: now
          };
        }
        return item;
      });
      await this._save(next);
      return clone(current);
    });
  }

  async findForTarget(target) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const matches = bindings.filter((item) =>
        item.state === BINDING_STATE.READY &&
        item.role_ref === target.role_ref &&
        item.gpt_ref === target.gpt_ref &&
        (!target.conversation_ref || item.conversation_ref === target.conversation_ref)
      );
      if (matches.length > 1) {
        throw new BhrError("BINDING_AMBIGUOUS", `Multiple READY Bindings match role ${target.role_ref}; rebind the role before browser execution.`);
      }
      return clone(matches[0] ?? null);
    });
  }

  async get(binding_id) {
    return this._exclusive(async () => clone((await this._load()).find((item) => item.binding_id === binding_id) ?? null));
  }

  async findByTabId(chrome_tab_id) {
    return this._exclusive(async () => clone(selectCurrentBinding(await this._load(), (item) => item.chrome_tab_id === chrome_tab_id)));
  }

  async validateObservation(binding, observation, target = null, { allowConversationPromotion = false } = {}) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const index = bindings.findIndex((item) => item.binding_id === binding.binding_id);
      if (index < 0) throw new BhrError("BINDING_NOT_FOUND", `Binding not found: ${binding.binding_id}`);
      const current = bindings[index];
      if (current.state !== BINDING_STATE.READY || current.superseded_by_binding_id) {
        throw new BhrError("BINDING_NOT_READY", `Binding ${current.binding_id} is ${current.state}, not READY.`);
      }

      const identity = {
        provider: observation.provider,
        gpt_ref: observation.gpt_ref,
        conversation_ref: observation.conversation_ref,
        url: observation.page_url,
        page_fingerprint: observation.page_fingerprint
      };
      const canPromoteConversation = allowConversationPromotion &&
        current.provider === identity.provider &&
        current.gpt_ref === identity.gpt_ref &&
        !current.conversation_ref &&
        Boolean(identity.conversation_ref) &&
        !target?.conversation_ref;
      const conversationMatches = (current.conversation_ref ?? null) === (identity.conversation_ref ?? null) || canPromoteConversation;
      const fingerprintMatches = !current.page_fingerprint || current.page_fingerprint === identity.page_fingerprint || canPromoteConversation;
      const bindingMatches = current.provider === identity.provider &&
        current.gpt_ref === identity.gpt_ref &&
        conversationMatches &&
        fingerprintMatches;
      const targetMatches = !target || (
        current.role_ref === target.role_ref &&
        targetMatchesIdentity(target, identity)
      );
      if (!bindingMatches || !targetMatches) {
        const stale = {
          ...current,
          state: BINDING_STATE.STALE,
          stale_reason: "PAGE_IDENTITY_CHANGED",
          observed_identity: identity,
          last_seen_at: new Date().toISOString()
        };
        bindings[index] = stale;
        await this._save(bindings);
        throw new BhrError("BINDING_PAGE_IDENTITY_MISMATCH", "The current ChatGPT page no longer matches the Browser Session Binding or Host Command target.");
      }
      const updated = {
        ...current,
        state: BINDING_STATE.READY,
        conversation_ref: canPromoteConversation ? identity.conversation_ref : current.conversation_ref,
        page_fingerprint: identity.page_fingerprint,
        last_observed_identity: identity,
        url: identity.url,
        stale_reason: null,
        last_seen_at: new Date().toISOString()
      };
      bindings[index] = updated;
      await this._save(bindings);
      return clone(updated);
    });
  }

  async reconcileNavigation(chrome_tab_id, identity) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const current = selectCurrentBinding(bindings, (item) => item.chrome_tab_id === chrome_tab_id);
      if (!current) return null;
      const index = bindings.findIndex((item) => item.binding_id === current.binding_id);
      const now = new Date().toISOString();
      let updated;
      if (!identity || identity.provider !== "chatgpt-web") {
        updated = { ...current, state: BINDING_STATE.STALE, stale_reason: "NAVIGATED_OUTSIDE_PROVIDER", last_seen_at: now };
      } else if (current.gpt_ref !== identity.gpt_ref || (current.conversation_ref ?? null) !== (identity.conversation_ref ?? null)) {
        updated = {
          ...current,
          state: BINDING_STATE.STALE,
          stale_reason: "CHATGPT_SESSION_CHANGED",
          observed_identity: identity,
          url: identity.url,
          last_seen_at: now
        };
      } else {
        updated = { ...current, url: identity.url, last_seen_at: now };
      }
      bindings[index] = updated;
      await this._save(bindings);
      return clone(updated);
    });
  }

  async markTabStale(chrome_tab_id, reason) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      const now = new Date().toISOString();
      let latest = null;
      let changed = false;
      const next = bindings.map((item) => {
        if (item.chrome_tab_id !== chrome_tab_id || !ACTIVE_BINDING_STATES.has(item.state)) return item;
        changed = true;
        const stale = { ...item, state: BINDING_STATE.STALE, stale_reason: reason, last_seen_at: now };
        latest = stale;
        return stale;
      });
      if (!changed) return null;
      await this._save(next);
      return clone(latest);
    });
  }

  async remove(binding_id) {
    return this._exclusive(async () => {
      const bindings = await this._load();
      await this._save(bindings.filter((item) => item.binding_id !== binding_id));
    });
  }
}

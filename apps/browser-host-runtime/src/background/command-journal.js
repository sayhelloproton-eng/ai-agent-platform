import { JOURNAL_STATE } from "../shared/constants.js";
import { sha256Ref } from "../shared/crypto.js";
import { BhrError } from "../shared/errors.js";

const KEY = "bhr.command_journal";
const terminal = new Set([JOURNAL_STATE.REPORTED, JOURNAL_STATE.FAILED, JOURNAL_STATE.UNCERTAIN]);

async function commandFingerprint(command) {
  return sha256Ref({
    command_id: command.command_id,
    dispatch_ref: command.dispatch_ref,
    task_id: command.task_id,
    target: command.target,
    action: command.action,
    preconditions: command.preconditions,
    approval_ref: command.approval_ref ?? null,
    expires_at: command.expires_at,
    idempotency_key: command.idempotency_key
  });
}

export class CommandJournal {
  constructor(storage, { maxEntries = 100 } = {}) {
    this.storage = storage;
    this.maxEntries = maxEntries;
  }
  async entries() { return (await this.storage.get(KEY)) ?? {}; }
  async get(command_id) { return (await this.entries())[command_id] ?? null; }

  async begin(command) {
    const entries = await this.entries();
    const existing = entries[command.command_id];
    const fingerprint = await commandFingerprint(command);
    if (existing) {
      if (existing.idempotency_key !== command.idempotency_key || existing.command_fingerprint !== fingerprint) {
        throw new BhrError("COMMAND_ID_REUSED", "Command ID or idempotency key was reused with a different request fingerprint.");
      }
      return { entry: existing, duplicate: true, terminal: terminal.has(existing.state) };
    }
    const now = new Date().toISOString();
    const entry = {
      command_id: command.command_id,
      dispatch_ref: command.dispatch_ref,
      idempotency_key: command.idempotency_key,
      command_fingerprint: fingerprint,
      command,
      state: JOURNAL_STATE.RECEIVED,
      result: null,
      delivery: null,
      delivery_ack: null,
      report_token: null,
      history: [{ state: JOURNAL_STATE.RECEIVED, at: now }],
      created_at: now,
      updated_at: now
    };
    entries[command.command_id] = entry;
    await this.pruneAndSave(entries);
    return { entry, duplicate: false, terminal: false };
  }

  async mark(command_id, state, details = null) {
    if (!Object.values(JOURNAL_STATE).includes(state)) throw new BhrError("JOURNAL_STATE_INVALID", `Unknown journal state: ${state}`);
    const entries = await this.entries();
    const entry = entries[command_id];
    if (!entry) throw new BhrError("JOURNAL_ENTRY_NOT_FOUND", `No journal entry for ${command_id}`);
    entry.state = state;
    entry.details = { ...(entry.details ?? {}), ...(details ?? {}) };
    if (details?.result) entry.result = details.result;
    if (details?.claim_token) entry.claim_token = details.claim_token;
    if (details?.binding_id) entry.binding_id = details.binding_id;
    if (details?.delivery) entry.delivery = details.delivery;
    if (details?.delivery_ack) entry.delivery_ack = details.delivery_ack;
    if (details?.report_token) entry.report_token = details.report_token;
    entry.updated_at = new Date().toISOString();
    entry.history.push({ state, at: entry.updated_at, details });
    await this.pruneAndSave(entries);
    return entry;
  }

  async markDeliveryConfirmed(command_id, { delivery, binding_id, execution = null }) {
    return this.mark(command_id, JOURNAL_STATE.DELIVERY_CONFIRMED, { delivery, binding_id, execution });
  }

  async markDeliveryAcked(command_id, { delivery_ack, report_token, binding_id }) {
    return this.mark(command_id, JOURNAL_STATE.DELIVERY_ACKED, { delivery_ack, report_token, binding_id });
  }

  async markExecuted(command_id, { result, binding_id, execution = null }) {
    return this.mark(command_id, JOURNAL_STATE.EXECUTED, { result, binding_id, execution });
  }

  async recoverAfterRestart() {
    const entries = await this.entries();
    const recovered = { uncertain: [], delivery_ack_pending: [], observation_pending: [], reportable: [] };
    for (const entry of Object.values(entries)) {
      if (entry.state === JOURNAL_STATE.EXECUTING || entry.state === JOURNAL_STATE.SIDE_EFFECT_STARTED) {
        entry.state = JOURNAL_STATE.UNCERTAIN;
        entry.updated_at = new Date().toISOString();
        entry.history.push({ state: JOURNAL_STATE.UNCERTAIN, at: entry.updated_at, details: { reason: "SERVICE_WORKER_RESTART_DURING_EXECUTION" } });
        recovered.uncertain.push(entry.command_id);
      } else if (entry.state === JOURNAL_STATE.DELIVERY_CONFIRMED && entry.delivery) {
        recovered.delivery_ack_pending.push(entry.command_id);
      } else if (entry.state === JOURNAL_STATE.DELIVERY_ACKED && entry.delivery && entry.report_token) {
        recovered.observation_pending.push(entry.command_id);
      } else if (entry.state === JOURNAL_STATE.SIDE_EFFECT_CONFIRMED) {
        if (entry.result || entry.details?.result) {
          entry.state = JOURNAL_STATE.EXECUTED;
          entry.result = entry.result ?? entry.details.result;
          entry.updated_at = new Date().toISOString();
          entry.history.push({ state: JOURNAL_STATE.EXECUTED, at: entry.updated_at, details: { reason: "MIGRATED_CONFIRMED_SIDE_EFFECT" } });
          recovered.reportable.push(entry.command_id);
        } else {
          entry.state = JOURNAL_STATE.UNCERTAIN;
          entry.updated_at = new Date().toISOString();
          entry.history.push({ state: JOURNAL_STATE.UNCERTAIN, at: entry.updated_at, details: { reason: "CONFIRMED_WITHOUT_PERSISTED_RESULT" } });
          recovered.uncertain.push(entry.command_id);
        }
      } else if (entry.state === JOURNAL_STATE.EXECUTED && entry.result) {
        recovered.reportable.push(entry.command_id);
      }
    }
    await this.pruneAndSave(entries);
    return recovered;
  }

  async recoverableEntries() {
    const entries = await this.entries();
    return Object.values(entries)
      .filter((entry) => [JOURNAL_STATE.DELIVERY_CONFIRMED, JOURNAL_STATE.DELIVERY_ACKED, JOURNAL_STATE.EXECUTED].includes(entry.state))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  }

  async recoverUncertain() { return this.recoverAfterRestart(); }

  async pruneAndSave(entries) {
    const sorted = Object.values(entries).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const limited = Object.fromEntries(sorted.slice(0, this.maxEntries).map((entry) => [entry.command_id, entry]));
    await this.storage.set(KEY, limited);
  }
}

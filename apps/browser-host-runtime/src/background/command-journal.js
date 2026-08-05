import { JOURNAL_STATE } from "../shared/constants.js";
import { BhrError } from "../shared/errors.js";

const KEY = "bhr.command_journal";
const terminal = new Set([JOURNAL_STATE.REPORTED, JOURNAL_STATE.FAILED, JOURNAL_STATE.UNCERTAIN]);

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
    if (existing) {
      if (existing.idempotency_key !== command.idempotency_key) throw new BhrError("COMMAND_ID_REUSED", "Command ID was reused with a different idempotency key.");
      return { entry: existing, duplicate: true, terminal: terminal.has(existing.state) };
    }
    const entry = {
      command_id: command.command_id,
      dispatch_ref: command.dispatch_ref,
      idempotency_key: command.idempotency_key,
      state: JOURNAL_STATE.RECEIVED,
      history: [{ state: JOURNAL_STATE.RECEIVED, at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
    entry.details = details;
    entry.updated_at = new Date().toISOString();
    entry.history.push({ state, at: entry.updated_at, details });
    await this.pruneAndSave(entries);
    return entry;
  }

  async recoverUncertain() {
    const entries = await this.entries();
    const recovered = [];
    for (const entry of Object.values(entries)) {
      if (entry.state === JOURNAL_STATE.SIDE_EFFECT_STARTED) {
        entry.state = JOURNAL_STATE.UNCERTAIN;
        entry.updated_at = new Date().toISOString();
        entry.history.push({ state: JOURNAL_STATE.UNCERTAIN, at: entry.updated_at, details: { reason: "SERVICE_WORKER_RESTART_AFTER_SIDE_EFFECT_START" } });
        recovered.push(entry.command_id);
      }
    }
    await this.pruneAndSave(entries);
    return recovered;
  }

  async pruneAndSave(entries) {
    const sorted = Object.values(entries).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const limited = Object.fromEntries(sorted.slice(0, this.maxEntries).map((entry) => [entry.command_id, entry]));
    await this.storage.set(KEY, limited);
  }
}

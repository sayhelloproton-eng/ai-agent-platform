import { HOST_RESULT_STATUS, JOURNAL_STATE } from "../shared/constants.js";
import { sha256Ref } from "../shared/crypto.js";
import { BhrError } from "../shared/errors.js";
import { buildHostResult } from "../shared/contracts.js";

const KEY = "bhr.command_journal";
const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_TERMINAL_LOW_WATER_MARK = 80;
const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_RECOVERY_ATTEMPTS = 5;
const sharedQueues = new WeakMap();

const terminalStates = new Set([
  JOURNAL_STATE.REPORTED,
  JOURNAL_STATE.FAILED
]);

const recoverableStates = new Set([
  JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING,
  JOURNAL_STATE.DELIVERY_ACK_PENDING,
  JOURNAL_STATE.DELIVERY_CONFIRMED,
  JOURNAL_STATE.DELIVERY_ACKED,
  JOURNAL_STATE.HOST_RESULT_PENDING,
  JOURNAL_STATE.EXECUTED,
  JOURNAL_STATE.UNCERTAIN
]);

function lockTarget(storage) {
  return storage?.area && typeof storage.area === "object" ? storage.area : storage;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function iso(nowMs) {
  return new Date(nowMs).toISOString();
}

function pendingUncertainReport(entry, reason, nowMs) {
  const identity = entry.details?.page_identity ?? entry.details?.observed_identity ?? null;
  const evidenceRefs = [
    entry.details?.pre_observation_ref,
    entry.details?.post_observation_ref,
    ...(entry.details?.evidence_refs ?? [])
  ].filter(Boolean);
  return {
    uncertain_version: "0.1.0",
    uncertain_id: `${entry.command_id}:uncertain`,
    command_id: entry.command_id,
    dispatch_ref: entry.dispatch_ref,
    task_id: entry.command?.task_id ?? null,
    idempotency_key: entry.idempotency_key,
    command_fingerprint: entry.command_fingerprint,
    binding_id: entry.binding_id ?? null,
    page_identity: identity,
    last_stage: entry.state,
    reason,
    evidence_refs: [...new Set(evidenceRefs)],
    observed_at: iso(nowMs)
  };
}

export async function commandFingerprint(command) {
  // command_id and dispatch_ref are transport identities. They are intentionally
  // excluded so a server-side rematerialization cannot execute the same logical
  // idempotent command twice.
  return sha256Ref({
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
  constructor(storage, {
    maxEntries = DEFAULT_MAX_ENTRIES,
    terminalLowWaterMark = DEFAULT_TERMINAL_LOW_WATER_MARK,
    terminalRetentionMs = DEFAULT_RETENTION_MS,
    maxRecoveryAttempts = DEFAULT_RECOVERY_ATTEMPTS,
    recoveryBaseDelayMs = 1000,
    now = () => Date.now()
  } = {}) {
    this.storage = storage;
    this.maxEntries = maxEntries;
    this.terminalLowWaterMark = Math.min(
      Math.max(0, Math.floor(terminalLowWaterMark)),
      Math.max(0, maxEntries - 1)
    );
    this.terminalRetentionMs = terminalRetentionMs;
    this.maxRecoveryAttempts = maxRecoveryAttempts;
    this.recoveryBaseDelayMs = recoveryBaseDelayMs;
    this.now = now;
  }

  _exclusive(work) {
    const target = lockTarget(this.storage);
    const previous = sharedQueues.get(target) ?? Promise.resolve();
    const run = previous.then(work, work);
    sharedQueues.set(target, run.catch(() => undefined));
    return run;
  }

  async _load() {
    return clone((await this.storage.get(KEY)) ?? {});
  }

  async _save(entries) {
    await this.storage.set(KEY, entries);
  }

  _isTerminal(entry) {
    return terminalStates.has(entry.state);
  }

  _pruneExpiredTerminal(entries, nowMs) {
    let changed = false;
    for (const [commandId, entry] of Object.entries(entries)) {
      if (!this._isTerminal(entry)) continue;
      const terminalAt = Date.parse(entry.updated_at ?? entry.created_at ?? 0);
      if (Number.isFinite(terminalAt) && nowMs - terminalAt >= this.terminalRetentionMs) {
        delete entries[commandId];
        changed = true;
      }
    }
    return changed;
  }

  _pruneOldestTerminalForCapacity(entries) {
    const totalEntries = Object.keys(entries).length;
    if (totalEntries < this.maxEntries) return false;

    const terminalEntries = Object.entries(entries)
      .filter(([, entry]) => this._isTerminal(entry))
      .sort(([leftId, left], [rightId, right]) => {
        const leftAt = Date.parse(left.updated_at ?? left.created_at ?? 0);
        const rightAt = Date.parse(right.updated_at ?? right.created_at ?? 0);
        const timestampOrder = (Number.isFinite(leftAt) ? leftAt : 0) - (Number.isFinite(rightAt) ? rightAt : 0);
        return timestampOrder || leftId.localeCompare(rightId);
      });
    const removeCount = Math.min(
      terminalEntries.length,
      Math.max(0, totalEntries - this.terminalLowWaterMark)
    );
    for (const [commandId] of terminalEntries.slice(0, removeCount)) delete entries[commandId];
    return removeCount > 0;
  }

  _maintainCapacity(entries, nowMs) {
    const expiredChanged = this._pruneExpiredTerminal(entries, nowMs);
    const pressureChanged = this._pruneOldestTerminalForCapacity(entries);
    return expiredChanged || pressureChanged;
  }

  _capacity(entries) {
    const values = Object.values(entries);
    const nonTerminalCount = values.filter((entry) => !this._isTerminal(entry)).length;
    return {
      max_entries: this.maxEntries,
      total_entries: values.length,
      non_terminal_entries: nonTerminalCount,
      terminal_entries: values.length - nonTerminalCount,
      accepting_new_commands: values.length < this.maxEntries
    };
  }

  async entries() {
    return this._exclusive(async () => this._load());
  }

  async get(command_id) {
    return this._exclusive(async () => (await this._load())[command_id] ?? null);
  }

  async capacityStatus() {
    return this._exclusive(async () => {
      const entries = await this._load();
      const changed = this._maintainCapacity(entries, this.now());
      if (changed) await this._save(entries);
      return this._capacity(entries);
    });
  }

  async begin(command, { claim_token = null } = {}) {
    return this._exclusive(async () => {
      const entries = await this._load();
      const nowMs = this.now();
      this._pruneExpiredTerminal(entries, nowMs);
      const fingerprint = await commandFingerprint(command);
      const existingById = entries[command.command_id];
      if (existingById) {
        if (existingById.idempotency_key !== command.idempotency_key || existingById.command_fingerprint !== fingerprint) {
          throw new BhrError("COMMAND_ID_REUSED", "Command ID was reused with a different idempotency key or request fingerprint.");
        }
        await this._save(entries);
        return { entry: existingById, duplicate: true, terminal: this._isTerminal(existingById), duplicate_by: "COMMAND_ID" };
      }

      const existingByIdempotency = Object.values(entries).find((entry) =>
        !entry.rejection_only && entry.idempotency_key === command.idempotency_key
      );
      if (existingByIdempotency) {
        if (existingByIdempotency.command_fingerprint !== fingerprint) {
          throw new BhrError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was reused with a different logical request fingerprint.", {
            canonical_command_id: existingByIdempotency.command_id,
            received_command_id: command.command_id
          });
        }
        await this._save(entries);
        return {
          entry: existingByIdempotency,
          duplicate: true,
          terminal: this._isTerminal(existingByIdempotency),
          duplicate_by: "IDEMPOTENCY_KEY",
          received_command_id: command.command_id
        };
      }

      this._pruneOldestTerminalForCapacity(entries);
      const capacity = this._capacity(entries);
      if (!capacity.accepting_new_commands) {
        await this._save(entries);
        throw new BhrError("JOURNAL_CAPACITY_EXHAUSTED", "Command Journal is at capacity. New Browser Dispatch claims are disabled until retained terminal records expire or an operator resolves non-terminal records.", capacity);
      }

      const nowIso = iso(nowMs);
      const entry = {
        command_id: command.command_id,
        dispatch_ref: command.dispatch_ref,
        idempotency_key: command.idempotency_key,
        command_fingerprint: fingerprint,
        command: clone(command),
        state: JOURNAL_STATE.RECEIVED,
        result: null,
        delivery: null,
        delivery_ack: null,
        report_token: null,
        pending_report: null,
        claim_token,
        recovery: { attempts: 0, last_error: null, next_retry_at: null, quarantined_at: null },
        history: [{ state: JOURNAL_STATE.RECEIVED, at: nowIso }],
        created_at: nowIso,
        updated_at: nowIso
      };
      entries[command.command_id] = entry;
      await this._save(entries);
      return { entry: clone(entry), duplicate: false, terminal: false, duplicate_by: null };
    });
  }

  async mark(command_id, state, details = null) {
    if (!Object.values(JOURNAL_STATE).includes(state)) throw new BhrError("JOURNAL_STATE_INVALID", `Unknown journal state: ${state}`);
    return this._exclusive(async () => {
      const entries = await this._load();
      const entry = entries[command_id];
      if (!entry) throw new BhrError("JOURNAL_ENTRY_NOT_FOUND", `No journal entry for ${command_id}`);
      const nowIso = iso(this.now());
      entry.state = state;
      entry.details = { ...(entry.details ?? {}), ...(details ?? {}) };
      if (details?.result) entry.result = clone(details.result);
      if (details?.claim_token) entry.claim_token = details.claim_token;
      if (details?.binding_id !== undefined) entry.binding_id = details.binding_id;
      if (details?.delivery) entry.delivery = clone(details.delivery);
      if (details?.delivery_ack) entry.delivery_ack = clone(details.delivery_ack);
      if (details?.report_token) entry.report_token = details.report_token;
      if (details?.pending_report !== undefined) entry.pending_report = clone(details.pending_report);
      entry.updated_at = nowIso;
      entry.history ??= [];
      entry.history.push({ state, at: nowIso, details: clone(details) });
      this._pruneExpiredTerminal(entries, this.now());
      await this._save(entries);
      return clone(entry);
    });
  }

  async markDeliveryAckPending(command_id, { delivery, binding_id, execution = null, claim_token }) {
    return this.mark(command_id, JOURNAL_STATE.DELIVERY_ACK_PENDING, {
      delivery,
      binding_id,
      execution,
      claim_token,
      pending_report: {
        kind: "DELIVERY_ACK",
        operation: "browser.dispatch.deliveryAck",
        credential_type: "CLAIM_TOKEN",
        credential: claim_token,
        payload: { delivery }
      }
    });
  }

  // Compatibility alias for journals written by v0.2.x.
  async markDeliveryConfirmed(command_id, value) {
    return this.markDeliveryAckPending(command_id, { ...value, claim_token: value.claim_token ?? null });
  }

  async markDeliveryAcked(command_id, { delivery_ack, report_token, binding_id }) {
    return this.mark(command_id, JOURNAL_STATE.DELIVERY_ACKED, {
      delivery_ack,
      report_token,
      binding_id,
      pending_report: null
    });
  }

  async markHostResultPending(command_id, { result, report_token = null, binding_id, execution = null }) {
    return this._exclusive(async () => {
      const entries = await this._load();
      const entry = entries[command_id];
      if (!entry) throw new BhrError("JOURNAL_ENTRY_NOT_FOUND", `No journal entry for ${command_id}`);
      const credential = report_token ?? entry.report_token ?? entry.pending_report?.credential ?? null;
      const nowIso = iso(this.now());
      entry.state = JOURNAL_STATE.HOST_RESULT_PENDING;
      entry.result = clone(result);
      entry.binding_id = binding_id ?? entry.binding_id ?? null;
      entry.report_token = credential;
      entry.details = { ...(entry.details ?? {}), result: clone(result), binding_id: entry.binding_id, execution };
      entry.pending_report = {
        kind: "HOST_RESULT",
        operation: "browser.dispatch.hostResult",
        credential_type: "REPORT_TOKEN",
        credential,
        payload: { result: clone(result) }
      };
      entry.updated_at = nowIso;
      entry.history ??= [];
      entry.history.push({ state: JOURNAL_STATE.HOST_RESULT_PENDING, at: nowIso, details: { result: clone(result), binding_id: entry.binding_id, execution } });
      await this._save(entries);
      return clone(entry);
    });
  }

  async markExecuted(command_id, { result, binding_id, execution = null, report_token = null }) {
    return this.markHostResultPending(command_id, { result, binding_id, execution, report_token });
  }

  async markPreDeliveryFailurePending(command_id, { result, claim_token, binding_id = null, execution = null }) {
    return this.mark(command_id, JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING, {
      result,
      claim_token,
      binding_id,
      execution,
      pending_report: {
        kind: "FAIL",
        operation: "browser.dispatch.fail",
        credential_type: "CLAIM_TOKEN",
        credential: claim_token,
        payload: { result }
      }
    });
  }

  async markUncertain(command_id, { uncertain, claim_token = null, report_token = null, result = null, binding_id = null, execution = null }) {
    const credentialType = report_token ? "REPORT_TOKEN" : "CLAIM_TOKEN";
    const credential = report_token ?? claim_token;
    return this.mark(command_id, JOURNAL_STATE.UNCERTAIN, {
      result,
      binding_id,
      execution,
      claim_token,
      report_token,
      uncertain,
      pending_report: {
        kind: "UNCERTAIN",
        operation: "browser.dispatch.uncertain",
        credential_type: credentialType,
        credential,
        payload: { uncertain }
      }
    });
  }

  async markReported(command_id, details = {}) {
    return this.mark(command_id, JOURNAL_STATE.REPORTED, { ...details, pending_report: null });
  }

  async clearRecoveryFailure(command_id) {
    return this._exclusive(async () => {
      const entries = await this._load();
      const entry = entries[command_id];
      if (!entry) throw new BhrError("JOURNAL_ENTRY_NOT_FOUND", `No journal entry for ${command_id}`);
      entry.recovery = { attempts: 0, last_error: null, next_retry_at: null, quarantined_at: null };
      entry.updated_at = iso(this.now());
      await this._save(entries);
      return clone(entry);
    });
  }

  async recordRecoveryFailure(command_id, error, { retryable = true } = {}) {
    return this._exclusive(async () => {
      const entries = await this._load();
      const entry = entries[command_id];
      if (!entry) throw new BhrError("JOURNAL_ENTRY_NOT_FOUND", `No journal entry for ${command_id}`);
      const attempts = Number(entry.recovery?.attempts ?? 0) + 1;
      const nowMs = this.now();
      const safeError = {
        code: error?.code ?? "RECOVERY_FAILED",
        message: error?.message ?? String(error),
        details: error?.details ?? null
      };
      const shouldQuarantine = !retryable || attempts >= this.maxRecoveryAttempts;
      entry.recovery = {
        attempts,
        last_error: safeError,
        next_retry_at: shouldQuarantine ? null : iso(nowMs + this.recoveryBaseDelayMs * Math.max(1, 2 ** (attempts - 1))),
        quarantined_at: shouldQuarantine ? iso(nowMs) : null
      };
      if (shouldQuarantine) entry.state = JOURNAL_STATE.QUARANTINED;
      entry.updated_at = iso(nowMs);
      entry.history ??= [];
      entry.history.push({
        state: entry.state,
        event: shouldQuarantine ? "RECOVERY_QUARANTINED" : "RECOVERY_RETRY_SCHEDULED",
        at: entry.updated_at,
        details: { attempts, error: safeError, next_retry_at: entry.recovery.next_retry_at }
      });
      await this._save(entries);
      return clone(entry);
    });
  }

  async recoverAfterRestart() {
    return this._exclusive(async () => {
      const entries = await this._load();
      const recovered = { uncertain: [], delivery_ack_pending: [], observation_pending: [], reportable: [], quarantined: [] };
      const nowMs = this.now();
      for (const entry of Object.values(entries)) {
        if ([JOURNAL_STATE.RECEIVED, JOURNAL_STATE.CLAIMED, JOURNAL_STATE.PREPARED].includes(entry.state)) {
          const previousState = entry.state;
          if (entry.claim_token) {
            const result = buildHostResult({
              command: entry.command,
              status: HOST_RESULT_STATUS.BLOCKED,
              binding_id: entry.binding_id ?? "unbound",
              error: {
                code: "SERVICE_WORKER_RESTART_BEFORE_EXECUTION",
                message: "The Browser Host service worker restarted before browser execution began. The command was not retried automatically."
              },
              details: { recovery_stage: previousState }
            });
            entry.state = JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING;
            entry.result = result;
            entry.pending_report = {
              kind: "FAIL",
              operation: "browser.dispatch.fail",
              credential_type: "CLAIM_TOKEN",
              credential: entry.claim_token,
              payload: { result }
            };
            entry.details = { ...(entry.details ?? {}), result, recovery_stage: previousState };
            entry.updated_at = iso(nowMs);
            entry.history ??= [];
            entry.history.push({
              state: JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING,
              at: entry.updated_at,
              details: { reason: "SERVICE_WORKER_RESTART_BEFORE_EXECUTION", last_stage: previousState }
            });
            recovered.reportable.push(entry.command_id);
          } else {
            entry.state = JOURNAL_STATE.QUARANTINED;
            entry.recovery = {
              attempts: Number(entry.recovery?.attempts ?? 0),
              last_error: {
                code: "RECOVERY_REPORT_CREDENTIAL_MISSING",
                message: "A pre-execution Journal record has no persisted claim token, so it cannot be retried or failed automatically."
              },
              next_retry_at: null,
              quarantined_at: iso(nowMs)
            };
            entry.updated_at = iso(nowMs);
            entry.history ??= [];
            entry.history.push({
              state: JOURNAL_STATE.QUARANTINED,
              event: "PRE_EXECUTION_RECOVERY_QUARANTINED",
              at: entry.updated_at,
              details: { last_stage: previousState }
            });
            recovered.quarantined.push(entry.command_id);
          }
        } else if (entry.state === JOURNAL_STATE.EXECUTING || entry.state === JOURNAL_STATE.SIDE_EFFECT_STARTED) {
          const previousState = entry.state;
          const uncertain = pendingUncertainReport(entry, "SERVICE_WORKER_RESTART_DURING_EXECUTION", nowMs);
          uncertain.last_stage = previousState;
          entry.state = JOURNAL_STATE.UNCERTAIN;
          entry.pending_report = {
            kind: "UNCERTAIN",
            operation: "browser.dispatch.uncertain",
            credential_type: entry.report_token ? "REPORT_TOKEN" : "CLAIM_TOKEN",
            credential: entry.report_token ?? entry.claim_token ?? null,
            payload: { uncertain }
          };
          entry.details = { ...(entry.details ?? {}), uncertain };
          entry.updated_at = iso(nowMs);
          entry.history ??= [];
          entry.history.push({ state: JOURNAL_STATE.UNCERTAIN, at: entry.updated_at, details: { reason: uncertain.reason, last_stage: previousState } });
          recovered.uncertain.push(entry.command_id);
        } else if (entry.state === JOURNAL_STATE.DELIVERY_CONFIRMED) {
          entry.state = JOURNAL_STATE.DELIVERY_ACK_PENDING;
          entry.pending_report ??= {
            kind: "DELIVERY_ACK",
            operation: "browser.dispatch.deliveryAck",
            credential_type: "CLAIM_TOKEN",
            credential: entry.claim_token ?? null,
            payload: { delivery: entry.delivery }
          };
          recovered.delivery_ack_pending.push(entry.command_id);
        } else if (entry.state === JOURNAL_STATE.DELIVERY_ACK_PENDING) {
          recovered.delivery_ack_pending.push(entry.command_id);
        } else if (entry.state === JOURNAL_STATE.DELIVERY_ACKED && entry.delivery && entry.report_token) {
          recovered.observation_pending.push(entry.command_id);
        } else if (entry.state === JOURNAL_STATE.HOST_RESULT_PENDING && entry.result) {
          recovered.reportable.push(entry.command_id);
        } else if (entry.state === JOURNAL_STATE.SIDE_EFFECT_CONFIRMED) {
          if (entry.result && entry.report_token) {
            entry.state = JOURNAL_STATE.HOST_RESULT_PENDING;
            entry.pending_report = {
              kind: "HOST_RESULT",
              operation: "browser.dispatch.hostResult",
              credential_type: "REPORT_TOKEN",
              credential: entry.report_token,
              payload: { result: entry.result }
            };
            recovered.reportable.push(entry.command_id);
          } else {
            const uncertain = pendingUncertainReport(entry, "CONFIRMED_WITHOUT_PERSISTED_REPORT_CREDENTIAL", nowMs);
            entry.state = JOURNAL_STATE.UNCERTAIN;
            entry.pending_report = {
              kind: "UNCERTAIN",
              operation: "browser.dispatch.uncertain",
              credential_type: entry.report_token ? "REPORT_TOKEN" : "CLAIM_TOKEN",
              credential: entry.report_token ?? entry.claim_token ?? null,
              payload: { uncertain }
            };
            recovered.uncertain.push(entry.command_id);
          }
          entry.updated_at = iso(nowMs);
        } else if (entry.state === JOURNAL_STATE.EXECUTED && entry.result) {
          if (entry.report_token) {
            entry.state = JOURNAL_STATE.HOST_RESULT_PENDING;
            entry.pending_report ??= {
              kind: "HOST_RESULT",
              operation: "browser.dispatch.hostResult",
              credential_type: "REPORT_TOKEN",
              credential: entry.report_token,
              payload: { result: entry.result }
            };
            recovered.reportable.push(entry.command_id);
          } else if (entry.pending_report?.kind === "FAIL") {
            entry.state = JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING;
            recovered.reportable.push(entry.command_id);
          } else {
            entry.state = JOURNAL_STATE.QUARANTINED;
            entry.recovery = {
              attempts: Number(entry.recovery?.attempts ?? 0),
              last_error: { code: "RECOVERY_REPORT_CREDENTIAL_MISSING", message: "Executed Journal entry has no report credential or typed pending report." },
              next_retry_at: null,
              quarantined_at: iso(nowMs)
            };
            recovered.quarantined.push(entry.command_id);
          }
          entry.updated_at = iso(nowMs);
        }
      }
      this._pruneExpiredTerminal(entries, nowMs);
      await this._save(entries);
      return recovered;
    });
  }

  async recoverableEntries() {
    return this._exclusive(async () => {
      const entries = await this._load();
      const nowMs = this.now();
      return Object.values(entries)
        .filter((entry) => recoverableStates.has(entry.state))
        .filter((entry) => !entry.recovery?.next_retry_at || Date.parse(entry.recovery.next_retry_at) <= nowMs)
        .sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? ""))
        .map(clone);
    });
  }

  async recoverUncertain() {
    return this.recoverAfterRestart();
  }

  async prune() {
    return this._exclusive(async () => {
      const entries = await this._load();
      const changed = this._pruneExpiredTerminal(entries, this.now());
      if (changed) await this._save(entries);
      return this._capacity(entries);
    });
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import { CommandJournal } from "../src/background/command-journal.js";
import { RuntimeCoordinator } from "../src/background/runtime-coordinator.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { JOURNAL_STATE } from "../src/shared/constants.js";
import { binding, hostCommand } from "./test-helpers.mjs";

class YieldingStorage extends MemoryStorageArea {
  async get(key) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.get(key); }
  async set(key, value) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.set(key, value); }
}

function command(index, overrides = {}) {
  return hostCommand({
    command_id: `cmd-${index}`,
    dispatch_ref: `dispatch-${index}`,
    idempotency_key: `idem-${index}`,
    ...overrides
  });
}

function coordinatorBase({ journal, dispatchClient, actionExecutor = { execute: async () => { throw new Error("must not execute"); } }, bindingRegistry = {}, config = {} }) {
  return new RuntimeCoordinator({
    host_id: "host",
    dispatchClient,
    approvalClient: {},
    bindingRegistry,
    journal,
    observationCoordinator: {},
    actionExecutor,
    modelProvider: {},
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict", ...config })
  });
}

test("concurrent Journal begin and mark operations do not lose records", async () => {
  const journal = new CommandJournal(new YieldingStorage(), { maxEntries: 50 });
  const commands = Array.from({ length: 20 }, (_, index) => command(index));
  await Promise.all(commands.map((item) => journal.begin(item)));
  await Promise.all(commands.map((item, index) => journal.mark(item.command_id, index % 2 ? JOURNAL_STATE.CLAIMED : JOURNAL_STATE.PREPARED, { index })));
  const entries = await journal.entries();
  assert.equal(Object.keys(entries).length, 20);
  for (const [index, item] of commands.entries()) {
    assert.equal(entries[item.command_id].details.index, index);
  }
});

test("idempotency key plus logical fingerprint is unique across Command IDs", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  const first = command("canonical", { idempotency_key: "same-idem" });
  const rematerialized = { ...first, command_id: "cmd-rematerialized", dispatch_ref: "dispatch-rematerialized" };
  await journal.begin(first);
  const duplicate = await journal.begin(rematerialized);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.duplicate_by, "IDEMPOTENCY_KEY");
  assert.equal(duplicate.entry.command_id, first.command_id);
  await assert.rejects(
    () => journal.begin({ ...rematerialized, command_id: "cmd-conflict", dispatch_ref: "dispatch-conflict", target: { ...rematerialized.target, conversation_ref: "other" } }),
    (error) => error.code === "IDEMPOTENCY_KEY_REUSED"
  );
});

test("non-terminal records are never capacity-pruned and new claims stop at capacity", async () => {
  let now = Date.parse("2026-08-06T00:00:00.000Z");
  const journal = new CommandJournal(new MemoryStorageArea(), {
    maxEntries: 2,
    terminalRetentionMs: 1000,
    now: () => now
  });
  await journal.begin(command(1));
  await journal.begin(command(2));
  assert.equal((await journal.capacityStatus()).accepting_new_commands, false);
  await assert.rejects(() => journal.begin(command(3)), (error) => error.code === "JOURNAL_CAPACITY_EXHAUSTED");
  await journal.markReported("cmd-1", { receipt: "done" });
  assert.equal((await journal.capacityStatus()).accepting_new_commands, false, "retained terminal receipt still consumes capacity");
  now += 1001;
  assert.equal((await journal.capacityStatus()).accepting_new_commands, true);
  await journal.begin(command(3));
  const entries = await journal.entries();
  assert.equal(entries["cmd-2"].state, JOURNAL_STATE.RECEIVED);
  assert.equal(entries["cmd-3"].state, JOURNAL_STATE.RECEIVED);
});

test("restart uncertainty uses independent Uncertain report and never ordinary dispatch fail", async () => {
  const journal = new CommandJournal(new MemoryStorageArea(), { recoveryBaseDelayMs: 0 });
  const item = command("uncertain");
  await journal.begin(item);
  await journal.mark(item.command_id, JOURNAL_STATE.CLAIMED, { claim_token: "claim-token" });
  await journal.mark(item.command_id, JOURNAL_STATE.PREPARED, {
    binding_id: "binding",
    page_identity: { gpt_ref: "g-test", conversation_ref: "conv", page_fingerprint: "sha256:page" }
  });
  await journal.mark(item.command_id, JOURNAL_STATE.EXECUTING, { binding_id: "binding" });
  await journal.recoverAfterRestart();
  let uncertainCalls = 0;
  let failCalls = 0;
  let executeCalls = 0;
  const coordinator = coordinatorBase({
    journal,
    dispatchClient: {
      uncertain: async (_ref, credential, report) => {
        uncertainCalls += 1;
        assert.equal(credential.claim_token, "claim-token");
        assert.equal(report.last_stage, JOURNAL_STATE.EXECUTING);
        return { status: "RECORDED", uncertain_id: report.uncertain_id };
      },
      fail: async () => { failCalls += 1; }
    },
    actionExecutor: { execute: async () => { executeCalls += 1; } }
  });
  const response = await coordinator.processOne();
  assert.equal(response.recovered_report_only, true);
  assert.equal(response.report_kind, "UNCERTAIN");
  assert.equal(uncertainCalls, 1);
  assert.equal(failCalls, 0);
  assert.equal(executeCalls, 0);
  assert.equal((await journal.get(item.command_id)).state, JOURNAL_STATE.REPORTED);
});

test("one malformed recovery record is quarantined without blocking a later safe report", async () => {
  let now = Date.parse("2026-08-06T00:00:00.000Z");
  const journal = new CommandJournal(new MemoryStorageArea(), { recoveryBaseDelayMs: 0, now: () => now });
  const bad = command("bad");
  const good = command("good");
  await journal.begin(bad);
  await journal.markHostResultPending(bad.command_id, {
    result: { result_id: "bad-result", binding_id: "binding", status: "ACTION_SUCCEEDED" },
    report_token: null,
    binding_id: "binding"
  });
  now += 1;
  await journal.begin(good);
  await journal.markHostResultPending(good.command_id, {
    result: { result_id: "good-result", binding_id: "binding", status: "ACTION_SUCCEEDED" },
    report_token: "report-token",
    binding_id: "binding"
  });
  const reports = [];
  const coordinator = coordinatorBase({
    journal,
    dispatchClient: { hostResult: async (_ref, token, result) => { reports.push({ token, result }); return { status: "RECORDED" }; } }
  });
  const response = await coordinator.processOne();
  assert.equal(response.recovered_report_only, true);
  assert.equal(response.result.result_id, "good-result");
  assert.equal(reports.length, 1);
  assert.equal((await journal.get(bad.command_id)).state, JOURNAL_STATE.QUARANTINED);
  assert.equal((await journal.get(good.command_id)).state, JOURNAL_STATE.REPORTED);
});

test("pre-delivery failure network interruption is retried as fail after restart, never as Host Result", async () => {
  const item = command("expired", { expires_at: "2020-01-01T00:00:00.000Z" });
  const journal = new CommandJournal(new MemoryStorageArea(), { recoveryBaseDelayMs: 0 });
  let failAttempts = 0;
  let hostResultCalls = 0;
  const dispatchClient = {
    listPending: async () => [{ dispatch_ref: item.dispatch_ref }],
    claim: async () => ({ claim_token: "claim-token" }),
    get: async () => item,
    fail: async () => {
      failAttempts += 1;
      if (failAttempts === 1) throw Object.assign(new Error("offline"), { code: "GATEWAY_UNAVAILABLE" });
      return { status: "RECORDED" };
    },
    hostResult: async () => { hostResultCalls += 1; return { status: "RECORDED" }; }
  };
  const coordinator = coordinatorBase({ journal, dispatchClient });
  const first = await coordinator.processOne();
  assert.equal(first.report.reported, false);
  assert.equal((await journal.get(item.command_id)).state, JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING);
  const second = await coordinator.processOne();
  assert.equal(second.recovered_report_only, true);
  assert.equal(second.report_kind, "FAIL");
  assert.equal(failAttempts, 2);
  assert.equal(hostResultCalls, 0);
});

test("Journal capacity is checked before claiming a new Browser Dispatch", async () => {
  const journal = new CommandJournal(new MemoryStorageArea(), { maxEntries: 1 });
  await journal.begin(command("held"));
  let claimCalls = 0;
  const coordinator = coordinatorBase({
    journal,
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: "new" }],
      claim: async () => { claimCalls += 1; return { claim_token: "claim" }; }
    }
  });
  const response = await coordinator.processOne();
  assert.equal(response.reason, "JOURNAL_CAPACITY_EXHAUSTED");
  assert.equal(claimCalls, 0);
});

test("server rematerialization with a new Command ID cannot execute the same idempotent action twice", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  const canonical = command("canonical", { idempotency_key: "stable-idem" });
  await journal.begin(canonical);
  const rematerialized = { ...canonical, command_id: "cmd-new", dispatch_ref: "dispatch-new" };
  let executeCalls = 0;
  const coordinator = coordinatorBase({
    journal,
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: rematerialized.dispatch_ref }],
      claim: async () => ({ claim_token: "claim" }),
      get: async () => rematerialized
    },
    actionExecutor: { execute: async () => { executeCalls += 1; } }
  });
  const response = await coordinator.processOne();
  assert.equal(response.reason, "LOGICAL_COMMAND_DUPLICATE_SUPPRESSED");
  assert.equal(response.canonical_command_id, canonical.command_id);
  assert.equal(executeCalls, 0);
});

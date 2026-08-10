import test from "node:test";
import assert from "node:assert/strict";
import { CommandJournal } from "../src/background/command-journal.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { JOURNAL_STATE } from "../src/shared/constants.js";
import { hostCommand } from "./test-helpers.mjs";

const command = hostCommand({ command_id: "cmd-1", dispatch_ref: "dispatch-1", idempotency_key: "idem-1" });

test("journal makes duplicate command observable", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  assert.equal((await journal.begin(command)).duplicate, false);
  assert.equal((await journal.begin(command)).duplicate, true);
});

test("same command id with changed request fingerprint is rejected", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  await assert.rejects(() => journal.begin({ ...command, target: { ...command.target, conversation_ref: "other" } }), /reused/i);
});

test("service worker recovery marks in-flight execution uncertain", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  await journal.mark(command.command_id, JOURNAL_STATE.EXECUTING);
  const recovered = await journal.recoverAfterRestart();
  assert.deepEqual(recovered.uncertain, ["cmd-1"]);
  assert.equal((await journal.get("cmd-1")).state, JOURNAL_STATE.UNCERTAIN);
});

test("executed result remains reportable after restart", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  const result = { result_id: "result-1", binding_id: "binding", status: "ACTION_SUCCEEDED" };
  await journal.markExecuted(command.command_id, { result, binding_id: "binding" });
  const recovered = await journal.recoverAfterRestart();
  assert.deepEqual(recovered.reportable, ["cmd-1"]);
  assert.deepEqual((await journal.get("cmd-1")).result, result);
});

test("pre-side-effect busy deferral may discard only RECEIVED/CLAIMED journal entries", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  await journal.mark(command.command_id, JOURNAL_STATE.CLAIMED, { claim_token: "claim" });
  assert.equal(await journal.discardPreSideEffect(command.command_id), true);
  assert.equal(await journal.get(command.command_id), null);

  await journal.begin(command);
  await journal.mark(command.command_id, JOURNAL_STATE.EXECUTING);
  await assert.rejects(
    () => journal.discardPreSideEffect(command.command_id),
    (error) => error.code === "JOURNAL_DISCARD_UNSAFE"
  );
});

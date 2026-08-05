import test from "node:test";
import assert from "node:assert/strict";
import { CommandJournal } from "../src/background/command-journal.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { JOURNAL_STATE } from "../src/shared/constants.js";

const command = { command_id: "cmd-1", dispatch_ref: "dispatch-1", idempotency_key: "idem-1" };

test("journal makes duplicate command observable", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  assert.equal((await journal.begin(command)).duplicate, false);
  assert.equal((await journal.begin(command)).duplicate, true);
});

test("service worker recovery marks possible side effect uncertain", async () => {
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  await journal.mark(command.command_id, JOURNAL_STATE.SIDE_EFFECT_STARTED);
  assert.deepEqual(await journal.recoverUncertain(), ["cmd-1"]);
  assert.equal((await journal.get("cmd-1")).state, JOURNAL_STATE.UNCERTAIN);
});

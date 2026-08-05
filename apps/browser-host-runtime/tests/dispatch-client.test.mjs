import test from "node:test";
import assert from "node:assert/strict";
import { DispatchClient } from "../src/background/dispatch-client.js";

test("Host Result is routed to ack or fail operations", async () => {
  const calls = [];
  const client = new DispatchClient({ invoke: async (operation, payload) => { calls.push({ operation, payload }); return { ok: true }; } });
  await client.report("d1", "c1", { status: "ACTION_SUCCEEDED", result_id: "r1" });
  await client.report("d2", "c2", { status: "BLOCKED", result_id: "r2" });
  assert.equal(calls[0].operation, "browser.dispatch.ack");
  assert.equal(calls[1].operation, "browser.dispatch.fail");
});

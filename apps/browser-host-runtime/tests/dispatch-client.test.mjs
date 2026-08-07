import test from "node:test";
import assert from "node:assert/strict";
import { DispatchClient } from "../src/background/dispatch-client.js";
import { hostCommand } from "./test-helpers.mjs";

test("Dispatch client uses delivery Ack and Host Result as separate operations", async () => {
  const calls = [];
  const command = hostCommand();
  const gateway = {
    invoke: async (operation, payload) => {
      calls.push({ operation, payload });
      if (operation === "browser.dispatch.listPending") return [{ dispatch_ref: "d1" }];
      if (operation === "browser.dispatch.claim") return { claim_token: "claim" };
      if (operation === "browser.dispatch.get") return command;
      if (operation === "browser.dispatch.deliveryAck") return { delivery_receipt: "delivery-receipt", report_token: "report-token" };
      if (operation === "browser.dispatch.hostResult") return { status: "RECORDED", result_id: "r1" };
      return {};
    }
  };
  const client = new DispatchClient(gateway);
  assert.equal((await client.listPending("host")).length, 1);
  assert.equal((await client.claim("d1", "host")).claim_token, "claim");
  assert.equal((await client.get("d1", "claim")).command_id, command.command_id);
  const ack = await client.deliveryAck("d1", "claim", { delivery_id: "delivery-1" });
  await client.hostResult("d1", ack.report_token, { result_id: "r1" });
  assert.deepEqual(calls.map((entry) => entry.operation), [
    "browser.dispatch.listPending",
    "browser.dispatch.claim",
    "browser.dispatch.get",
    "browser.dispatch.deliveryAck",
    "browser.dispatch.hostResult"
  ]);
});

test("Dispatch client rejects a delivery Ack without report token", async () => {
  const client = new DispatchClient({ invoke: async () => ({ delivery_receipt: "receipt" }) });
  await assert.rejects(() => client.deliveryAck("d1", "claim", { delivery_id: "delivery" }), (error) => error.code === "REPORT_TOKEN_MISSING");
});

test("Dispatch client exposes independent Uncertain Side Effect operation", async () => {
  const calls = [];
  const client = new DispatchClient({
    invoke: async (operation, payload) => {
      calls.push({ operation, payload });
      return { status: "RECORDED", uncertain_id: payload.uncertain.uncertain_id };
    }
  });
  const uncertain = {
    uncertain_version: "0.1.0",
    uncertain_id: "cmd:uncertain",
    command_id: "cmd",
    dispatch_ref: "dispatch",
    task_id: "task",
    idempotency_key: "idem",
    command_fingerprint: "sha256:fingerprint",
    binding_id: "binding",
    page_identity: { gpt_ref: "g-test", conversation_ref: "conv" },
    last_stage: "EXECUTING",
    reason: "SERVICE_WORKER_RESTART_DURING_EXECUTION",
    evidence_refs: ["obs-1"],
    error: null,
    observed_at: new Date().toISOString()
  };
  const receipt = await client.uncertain("dispatch", { claim_token: "claim" }, uncertain);
  assert.equal(receipt.status, "RECORDED");
  assert.equal(calls[0].operation, "browser.dispatch.uncertain");
  assert.equal(calls[0].payload.credential.claim_token, "claim");
});

test("Approval client refuses an unconfirmed one-time consume receipt", async () => {
  const { ApprovalClient } = await import("../src/background/dispatch-client.js");
  const client = new ApprovalClient({ invoke: async () => ({ status: "PENDING" }) });
  await assert.rejects(
    () => client.consume("approval", "grant", "cmd"),
    (error) => error.code === "APPROVAL_CONSUME_NOT_CONFIRMED"
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { FixtureGatewayClient } from "../src/background/gateway-client.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { hostCommand } from "./test-helpers.mjs";

const command = hostCommand();

test("fixture gateway enforces claim, dual-stage idempotency and single-use approval", async () => {
  const gateway = new FixtureGatewayClient(new MemoryStorageArea());
  await gateway.enqueue({ dispatch_ref: "dispatch", command, payload: { text: "wake" }, grant: { approval_ref: "approval", grant_id: "grant", consumed_at: null } });
  assert.equal((await gateway.invoke("browser.dispatch.listPending", {})).length, 1);
  const claim = await gateway.invoke("browser.dispatch.claim", { dispatch_ref: "dispatch", host_id: "host" });
  assert.equal((await gateway.invoke("browser.dispatch.get", { dispatch_ref: "dispatch", claim_token: claim.claim_token })).command_id, "cmd");

  const delivery = { delivery_id: "delivery-1" };
  const firstAck = await gateway.invoke("browser.dispatch.deliveryAck", { dispatch_ref: "dispatch", claim_token: claim.claim_token, delivery });
  const duplicateAck = await gateway.invoke("browser.dispatch.deliveryAck", { dispatch_ref: "dispatch", claim_token: "stale-token", delivery });
  assert.equal(duplicateAck.report_token, firstAck.report_token);

  const result = { result_id: "result-1" };
  assert.equal((await gateway.invoke("browser.dispatch.hostResult", { dispatch_ref: "dispatch", report_token: firstAck.report_token, result })).status, "RECORDED");
  assert.equal((await gateway.invoke("browser.dispatch.hostResult", { dispatch_ref: "dispatch", report_token: firstAck.report_token, result })).status, "ALREADY_RECORDED");

  await gateway.invoke("approval.grant.consume", { approval_ref: "approval", command_id: "cmd" });
  await assert.rejects(() => gateway.invoke("approval.grant.consume", { approval_ref: "approval", command_id: "cmd" }), /already consumed/);
});

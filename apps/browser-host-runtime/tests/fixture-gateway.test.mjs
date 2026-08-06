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

test("fixture uncertain report is idempotent and removes the dispatch from automatic pending delivery", async () => {
  const gateway = new FixtureGatewayClient(new MemoryStorageArea());
  const item = hostCommand({ command_id: "uncertain-command", dispatch_ref: "uncertain-dispatch", idempotency_key: "uncertain-idem" });
  await gateway.enqueue({ dispatch_ref: item.dispatch_ref, command: item, payload: { text: "wake" } });
  const claim = await gateway.invoke("browser.dispatch.claim", { dispatch_ref: item.dispatch_ref, host_id: "host" });
  const uncertain = {
    uncertain_version: "0.1.0",
    uncertain_id: "uncertain-command:uncertain",
    command_id: item.command_id,
    dispatch_ref: item.dispatch_ref,
    task_id: item.task_id,
    idempotency_key: item.idempotency_key,
    command_fingerprint: "sha256:fingerprint",
    binding_id: "binding",
    page_identity: { gpt_ref: "g-test", conversation_ref: "conv" },
    last_stage: "EXECUTING",
    reason: "RESTART",
    evidence_refs: [],
    error: null,
    observed_at: new Date().toISOString()
  };
  const first = await gateway.invoke("browser.dispatch.uncertain", { dispatch_ref: item.dispatch_ref, credential: { claim_token: claim.claim_token }, uncertain });
  const second = await gateway.invoke("browser.dispatch.uncertain", { dispatch_ref: item.dispatch_ref, credential: { claim_token: claim.claim_token }, uncertain });
  assert.equal(first.status, "RECORDED");
  assert.equal(second.status, "ALREADY_RECORDED");
  assert.equal((await gateway.invoke("browser.dispatch.listPending", { host_id: "host" })).length, 0);
  assert.equal((await gateway.state()).dispatches[0].status, "UNCERTAIN_REVIEW");
});

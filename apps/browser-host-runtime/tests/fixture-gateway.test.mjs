import test from "node:test";
import assert from "node:assert/strict";
import { FixtureGatewayClient } from "../src/background/gateway-client.js";
import { MemoryStorageArea } from "../src/background/storage.js";

const command = { command_id: "cmd", expires_at: "2030-01-01T00:00:00.000Z", action: { payload_ref: "payload" }, approval_ref: "approval" };

test("fixture gateway enforces dispatch claim and single-use approval", async () => {
  const gateway = new FixtureGatewayClient(new MemoryStorageArea());
  await gateway.enqueue({ dispatch_ref: "dispatch", command, payload: { text: "wake" }, grant: { approval_ref: "approval", grant_id: "grant", consumed_at: null } });
  assert.equal((await gateway.invoke("browser.dispatch.listPending", {})).length, 1);
  const claim = await gateway.invoke("browser.dispatch.claim", { dispatch_ref: "dispatch", host_id: "host" });
  assert.equal((await gateway.invoke("browser.dispatch.get", { dispatch_ref: "dispatch", claim_token: claim.claim_token })).command_id, "cmd");
  await gateway.invoke("approval.grant.consume", { approval_ref: "approval", command_id: "cmd" });
  await assert.rejects(() => gateway.invoke("approval.grant.consume", { approval_ref: "approval", command_id: "cmd" }), /already consumed/);
});

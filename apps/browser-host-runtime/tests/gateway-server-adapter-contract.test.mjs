import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { HttpGatewayClient } from "../src/background/gateway-client.js";
import { ApprovalClient, DispatchClient } from "../src/background/dispatch-client.js";
import { buildUncertainSideEffect } from "../src/shared/contracts.js";
import { hostCommand } from "./test-helpers.mjs";

async function withContractServer(run) {
  const operations = [];
  const command = hostCommand();
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      const request = JSON.parse(raw);
      operations.push(request);
      let data;
      switch (request.operation) {
        case "browser.dispatch.listPending": data = [{ dispatch_ref: command.dispatch_ref }]; break;
        case "browser.dispatch.claim": data = { claim_token: "claim-token", expires_at: command.expires_at }; break;
        case "browser.dispatch.get": data = command; break;
        case "browser.payload.resolve": data = { text: "wake" }; break;
        case "browser.dispatch.deliveryAck": data = { delivery_receipt: "delivery-receipt", report_token: "report-token" }; break;
        case "browser.dispatch.hostResult": data = { status: "RECORDED", result_id: request.payload.result.result_id }; break;
        case "browser.dispatch.uncertain": data = { status: "RECORDED", uncertain_id: request.payload.uncertain.uncertain_id }; break;
        case "browser.dispatch.fail": data = { status: "RECORDED", result_id: request.payload.result.result_id }; break;
        case "approval.draft.put": data = { status: "PENDING_APPROVAL", approval_ref: "approval", draft_id: "draft" }; break;
        case "approval.grant.get": data = { approval_ref: "approval", grant_id: "grant" }; break;
        case "approval.grant.consume": data = { status: "CONSUMED" }; break;
        default: data = { status: "IGNORED" };
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, requestId: request.requestId, data }));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address();
    await run({ endpoint: `http://127.0.0.1:${port}/v1/browser-host/invoke`, operations, command });
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("real HTTP fixture freezes the final Browser Host Server Adapter operation shapes", async () => {
  await withContractServer(async ({ endpoint, operations, command }) => {
    const gateway = new HttpGatewayClient({ endpoint, timeoutMs: 1000 });
    const dispatch = new DispatchClient(gateway);
    const approval = new ApprovalClient(gateway);
    const pending = await dispatch.listPending("host");
    const claim = await dispatch.claim(pending[0].dispatch_ref, "host");
    await dispatch.get(command.dispatch_ref, claim.claim_token);
    await dispatch.resolvePayload(command.action.payload_ref);
    const ack = await dispatch.deliveryAck(command.dispatch_ref, claim.claim_token, { delivery_id: "delivery" });
    await dispatch.hostResult(command.dispatch_ref, ack.report_token, { result_id: "result" });
    const uncertain = buildUncertainSideEffect({
      command,
      command_fingerprint: "sha256:fingerprint",
      binding_id: "binding",
      page_identity: { gpt_ref: "g-test", conversation_ref: "conv" },
      last_stage: "EXECUTING",
      reason: "RESTART"
    });
    await dispatch.uncertain(command.dispatch_ref, { claim_token: claim.claim_token }, uncertain);
    await dispatch.fail(command.dispatch_ref, claim.claim_token, { result_id: "failure" });
    await approval.putDraft({ approval_ref: "approval", dispatch_ref: command.dispatch_ref }, claim.claim_token);
    await approval.getGrant("approval");
    await approval.consume("approval", "grant", command.command_id);
    assert.deepEqual(operations.map((item) => item.operation), [
      "browser.dispatch.listPending",
      "browser.dispatch.claim",
      "browser.dispatch.get",
      "browser.payload.resolve",
      "browser.dispatch.deliveryAck",
      "browser.dispatch.hostResult",
      "browser.dispatch.uncertain",
      "browser.dispatch.fail",
      "approval.draft.put",
      "approval.grant.get",
      "approval.grant.consume"
    ]);
    assert.deepEqual(Object.keys(operations[1].payload).sort(), ["dispatch_ref", "host_id"]);
    assert.deepEqual(Object.keys(operations[4].payload).sort(), ["claim_token", "delivery", "dispatch_ref"]);
    assert.deepEqual(Object.keys(operations[5].payload).sort(), ["dispatch_ref", "report_token", "result"]);
    assert.deepEqual(Object.keys(operations[6].payload).sort(), ["credential", "dispatch_ref", "uncertain"]);
    assert.deepEqual(Object.keys(operations[8].payload).sort(), ["claim_token", "draft"]);
  });
});

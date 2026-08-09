import test from "node:test";
import assert from "node:assert/strict";
import { BrowserActionExecutor } from "../src/background/action-executor.js";
import { binding, hostCommand } from "./test-helpers.mjs";

test("content action error details survive the service-worker boundary", async () => {
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      sendMessage: (_tabId, _message, callback) => callback({
        ok: false,
        error: {
          code: "PAGE_ACTION_UNCERTAIN",
          message: "delivery uncertain",
          details: { reason: "SUBMISSION_CONFIRMATION_TIMEOUT" }
        }
      })
    }
  };
  const executor = new BrowserActionExecutor();
  await assert.rejects(
    () => executor.execute({
      binding: binding(),
      command: hostCommand(),
      resolved_payload: { text: "continue" }
    }),
    (error) => error?.code === "PAGE_ACTION_UNCERTAIN" && error?.details?.reason === "SUBMISSION_CONFIRMATION_TIMEOUT"
  );
});


test("CONTINUE_ROLE_SESSION marks only the required Action-confirmation activity as safe for the authorized platform wake", async () => {
  const sent = [];
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      sendMessage: (_tabId, message, callback) => {
        sent.push(message);
        callback({ ok: true, data: { status: "ACTION_SUCCEEDED", details: { submitted_at: "2026-08-10T00:00:00.000Z", response_baseline: {} } } });
      }
    }
  };
  const executor = new BrowserActionExecutor();
  await executor.execute({
    binding: binding(),
    command: hostCommand({ action: { type: "CONTINUE_ROLE_SESSION", payload_ref: "wake-payload" }, approval_ref: null }),
    resolved_payload: { text: "continue" }
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].action_type, "SUBMIT_MESSAGE");
  assert.equal(sent[0].payload.allow_action_confirmation_activity, true);
  assert.equal(sent[0].payload.wait_for_response, false);

  sent.length = 0;
  await executor.execute({
    binding: binding(),
    command: hostCommand(),
    resolved_payload: { text: "ordinary" }
  });
  assert.equal(sent.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(sent[0].payload, "allow_action_confirmation_activity"), false);
});

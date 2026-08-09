import test from "node:test";
import assert from "node:assert/strict";
import { classifyAction, requiresApproval, validatePlatformWakeAuthorization, validateResolvedPayload } from "../src/shared/action-policy.js";
import { platformWake } from "./test-helpers.mjs";

test("observation is low risk and message submission is high risk without platform authorization", () => {
  assert.equal(classifyAction("OBSERVE_PAGE"), "LOW");
  assert.equal(requiresApproval("SUBMIT_MESSAGE"), true);
});

test("message payload is bounded", () => {
  assert.equal(validateResolvedPayload("SUBMIT_MESSAGE", { text: "hello" }).text, "hello");
  assert.throws(() => validateResolvedPayload("SUBMIT_MESSAGE", { text: "" }), /1\.\.8000/);
});

test("navigation is limited to ChatGPT", () => {
  assert.throws(() => validateResolvedPayload("OPEN_OR_RESUME_SESSION", { url: "https://example.com" }), /chatgpt/i);
});

test("default platform Wake candidate allows only a fully verified allowlisted Wake", () => {
  const { command, payload } = platformWake();
  assert.equal(requiresApproval(command, { mode: "platform_wake_candidate", resolvedPayload: payload }), false);
  assert.equal(validatePlatformWakeAuthorization(command, payload).wake.task_id, command.task_id);
});

test("default platform Wake candidate keeps ordinary SUBMIT_MESSAGE on the human Approval path", () => {
  const command = {
    host_command_version: "0.1.0",
    command_id: "approved-submit",
    dispatch_ref: "dispatch-approved-submit",
    task_id: "task-approved-submit",
    target: { role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv" },
    action: { type: "SUBMIT_MESSAGE", payload_ref: "payload" },
    preconditions: { provider: "chatgpt", pageState: "READY" },
    approval_ref: "approval:task-approved-submit",
    idempotency_key: "idem-approved-submit",
    expires_at: "2030-01-01T00:00:00.000Z"
  };
  assert.equal(
    requiresApproval(command, { mode: "platform_wake_candidate", resolvedPayload: { text: "approved message" } }),
    true
  );
});

test("strict mode still requires Approval for platform Wake", () => {
  const { command, payload } = platformWake();
  assert.equal(requiresApproval(command, { mode: "strict", resolvedPayload: payload }), true);
});

test("sensitive UI action always requires Approval", () => {
  const { command } = platformWake({ action_type: "CLICK_REGISTERED_UI" });
  assert.equal(requiresApproval(command, { mode: "platform_wake_candidate", resolvedPayload: { observation_id: "obs", element_ref: "el" } }), true);
});

test("invalid platform Wake signature is rejected deterministically", () => {
  const { command, payload } = platformWake();
  command.preconditions.platform_wake_authorization.signature_verified = false;
  assert.throws(
    () => requiresApproval(command, { mode: "platform_wake_candidate", resolvedPayload: payload }),
    (error) => error.code === "PLATFORM_WAKE_SIGNATURE_INVALID"
  );
});

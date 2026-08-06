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

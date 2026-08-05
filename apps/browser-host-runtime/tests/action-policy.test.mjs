import test from "node:test";
import assert from "node:assert/strict";
import { classifyAction, requiresApproval, validateResolvedPayload } from "../src/shared/action-policy.js";

test("observation is low risk and message submission is high risk", () => {
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

test("platform wake approval proposal is opt-in and strict remains default", () => {
  const command = {
    action: { type: "SUBMIT_MESSAGE" },
    preconditions: { authorization_class: "PLATFORM_WAKE", authorization_ref: "dispatch-auth-1" }
  };
  assert.equal(requiresApproval(command), true);
  assert.equal(requiresApproval(command, { mode: "platform_wake_proposal" }), false);
  assert.equal(requiresApproval({ ...command, action: { type: "CLICK_REGISTERED_UI" } }, { mode: "platform_wake_proposal" }), true);
});

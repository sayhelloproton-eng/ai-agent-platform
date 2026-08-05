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

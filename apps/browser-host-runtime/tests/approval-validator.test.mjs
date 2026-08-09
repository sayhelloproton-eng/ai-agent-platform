import test from "node:test";
import assert from "node:assert/strict";
import { computeActionFingerprint, computePagePreconditionHash } from "../src/shared/fingerprints.js";
import { validateApprovalGrant } from "../src/background/approval-validator.js";

const command = {
  host_command_version: "0.1.0", command_id: "cmd", dispatch_ref: "dispatch", task_id: "task",
  target: { role_ref: "controller", gpt_ref: "gpt", conversation_ref: "conv" },
  action: { type: "SUBMIT_MESSAGE", payload_ref: "payload" }, preconditions: {}, approval_ref: "approval",
  idempotency_key: "idem", expires_at: "2030-01-01T00:00:00.000Z"
};
const binding = { binding_id: "binding", role_ref: "controller", gpt_ref: "gpt", conversation_ref: "conv" };
const observation = {
  observation_version: "0.1.0", observation_id: "obs", host_id: "host", binding_id: "binding",
  provider: "chatgpt-web", gpt_ref: "gpt", conversation_ref: "conv", page_url: "https://chatgpt.com/g/gpt/c/conv", page_fingerprint: "sha256:page",
  page_state: "READY", generation_state: "IDLE", follow_latest: true,
  screenshot_ref: null, visible_text_ref: "text", dom_summary_ref: "dom", interactive_elements: [], blocking_ui: [],
  observed_at: "2026-08-05T00:00:00.000Z"
};

test("approval binds action and page precondition", async () => {
  const payload = { text: "wake" };
  const pageHash = await computePagePreconditionHash(observation);
  const fingerprint = await computeActionFingerprint({ command, binding_id: "binding", resolved_payload: payload, page_precondition_hash: pageHash });
  const grant = {
    approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding",
    task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: pageHash,
    single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null
  };
  const result = await validateApprovalGrant({ grant, command, binding, resolved_payload: payload, observation, now: new Date("2026-08-05T00:00:00.000Z") });
  assert.equal(result.action_fingerprint, fingerprint);
});


test("incidental interactive UI changes do not invalidate an otherwise identical approval target", async () => {
  const payload = { text: "wake" };
  const originalHash = await computePagePreconditionHash(observation);
  const fingerprint = await computeActionFingerprint({ command, binding_id: "binding", resolved_payload: payload, page_precondition_hash: originalHash });
  const grant = { approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding", task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: originalHash, single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null };
  const changedChrome = {
    ...observation,
    interactive_elements: [
      { element_ref: "button:copy", role: "button", accessible_name: "Copy", enabled: true, visible: true },
      { element_ref: "button:menu", role: "button", accessible_name: "More", enabled: true, visible: true }
    ]
  };
  const result = await validateApprovalGrant({ grant, command, binding, resolved_payload: payload, observation: changedChrome, now: new Date("2026-08-05T00:00:00.000Z") });
  assert.equal(result.page_precondition_hash, originalHash);
});

test("changed page invalidates approval", async () => {
  const payload = { text: "wake" };
  const originalHash = await computePagePreconditionHash(observation);
  const fingerprint = await computeActionFingerprint({ command, binding_id: "binding", resolved_payload: payload, page_precondition_hash: originalHash });
  const grant = { approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding", task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: originalHash, single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null };
  await assert.rejects(() => validateApprovalGrant({ grant, command, binding, resolved_payload: payload, observation: { ...observation, blocking_ui: [{ type: "DIALOG" }] }, now: new Date("2026-08-05T00:00:00.000Z") }), /precondition changed/i);
});


test("conversation identity change invalidates approval even when UI structure is unchanged", async () => {
  const payload = { text: "wake" };
  const originalHash = await computePagePreconditionHash(observation);
  const fingerprint = await computeActionFingerprint({ command, binding_id: "binding", resolved_payload: payload, page_precondition_hash: originalHash });
  const grant = { approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding", task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: originalHash, single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null };
  const changed = { ...observation, conversation_ref: "other", page_url: "https://chatgpt.com/g/gpt/c/other", page_fingerprint: "sha256:other" };
  await assert.rejects(
    () => validateApprovalGrant({ grant, command, binding, resolved_payload: payload, observation: changed, now: new Date("2026-08-05T00:00:00.000Z") }),
    (error) => error?.code === "APPROVAL_PRECONDITION_CHANGED"
  );
});

test("approval refuses a binding whose role or page target drifted", async () => {
  const payload = { text: "wake" };
  const pageHash = await computePagePreconditionHash(observation);
  const fingerprint = await computeActionFingerprint({ command, binding_id: "binding", resolved_payload: payload, page_precondition_hash: pageHash });
  const grant = { approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding", task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: pageHash, single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null };
  await assert.rejects(
    () => validateApprovalGrant({ grant, command, binding: { ...binding, role_ref: "reviewer" }, resolved_payload: payload, observation, now: new Date("2026-08-05T00:00:00.000Z") }),
    (error) => error?.code === "APPROVAL_TARGET_MISMATCH"
  );
});

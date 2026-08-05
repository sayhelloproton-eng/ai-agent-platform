import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeCoordinator } from "../src/background/runtime-coordinator.js";
import { CommandJournal } from "../src/background/command-journal.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { computeActionFingerprint, computePagePreconditionHash } from "../src/shared/fingerprints.js";

function fixture() {
  const command = {
    host_command_version: "0.1.0", command_id: "cmd", dispatch_ref: "dispatch", task_id: "task",
    target: { role_ref: "controller", gpt_ref: "gpt", conversation_ref: "conv" },
    action: { type: "SUBMIT_MESSAGE", payload_ref: "payload" }, preconditions: {}, approval_ref: "approval",
    idempotency_key: "idem", expires_at: "2030-01-01T00:00:00.000Z"
  };
  const binding = { binding_id: "binding", role_ref: "controller", gpt_ref: "gpt", conversation_ref: "conv" };
  const observation = { observation_version: "0.1.0", observation_id: "obs", host_id: "host", binding_id: "binding", provider: "chatgpt-web", page_state: "READY", generation_state: "IDLE", follow_latest: true, screenshot_ref: null, visible_text_ref: "text", dom_summary_ref: "dom", interactive_elements: [], blocking_ui: [], observed_at: "2026-08-05T00:00:00.000Z" };
  return { command, binding, observation };
}

test("coordinator executes approved command once and reports browser fact", async () => {
  const { command, binding, observation } = fixture();
  const payload = { text: "wake" };
  const pageHash = await computePagePreconditionHash(observation);
  const fingerprint = await computeActionFingerprint({ command, binding_id: binding.binding_id, resolved_payload: payload, page_precondition_hash: pageHash });
  const grant = { approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding", task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: pageHash, single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null };
  const reports = [];
  let pending = true;
  const dispatchClient = {
    listPending: async () => pending ? [{ dispatch_ref: "dispatch" }] : [],
    claim: async () => ({ claim_token: "token" }), get: async () => command,
    resolvePayload: async () => payload,
    report: async (_ref, _token, result) => { reports.push(result); pending = false; }
  };
  let consumed = 0, executions = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host", dispatchClient,
    approvalClient: { getGrant: async () => grant, consume: async () => { consumed += 1; } },
    bindingRegistry: { findForTarget: async () => binding },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: { observe: async () => ({ observation, local: {} }) },
    actionExecutor: { execute: async () => { executions += 1; return { status: "ACTION_SUCCEEDED" }; } },
    modelProvider: { analyze: async () => ({ assessment_version: "0.1.0", assessment_id: "a", observation_id: "obs", decision: "NO_ACTION", confidence: 1, evidence_refs: [], warnings: [], candidate_action: null, assessed_at: new Date().toISOString() }) },
    evidenceStore: {}, configProvider: async () => ({ paused: false, emergency_stopped: false })
  });
  const first = await coordinator.processOne();
  const second = await coordinator.processOne();
  assert.equal(first.result.status, "ACTION_SUCCEEDED");
  assert.equal(second.processed, false);
  assert.equal(executions, 1);
  assert.equal(consumed, 1);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].task_status, undefined);
});

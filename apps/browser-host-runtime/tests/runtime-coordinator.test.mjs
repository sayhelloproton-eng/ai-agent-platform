import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeCoordinator } from "../src/background/runtime-coordinator.js";
import { CommandJournal } from "../src/background/command-journal.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { computeActionFingerprint, computePagePreconditionHash } from "../src/shared/fingerprints.js";
import { binding, hostCommand, observation } from "./test-helpers.mjs";

function assessment() {
  return { assessment_version: "0.1.0", assessment_id: "a", observation_id: "obs", decision: "NO_ACTION", confidence: 1, evidence_refs: [], warnings: [], candidate_action: null, assessed_at: new Date().toISOString() };
}

test("coordinator executes approved command once and reports browser fact", async () => {
  const command = hostCommand();
  const bound = binding();
  const observed = observation();
  const payload = { text: "wake" };
  const pageHash = await computePagePreconditionHash(observed);
  const fingerprint = await computeActionFingerprint({ command, binding_id: bound.binding_id, resolved_payload: payload, page_precondition_hash: pageHash });
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
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: { observe: async () => ({ observation: observed, local: {} }) },
    actionExecutor: { execute: async () => { executions += 1; return { status: "ACTION_SUCCEEDED" }; } },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {}, configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });
  const first = await coordinator.processOne();
  const second = await coordinator.processOne();
  assert.equal(first.result.status, "ACTION_SUCCEEDED");
  assert.equal(first.report.reported, true);
  assert.equal(second.processed, false);
  assert.equal(executions, 1);
  assert.equal(consumed, 1);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].task_status, undefined);
});

test("executed command after restart is only reported and never re-executed", async () => {
  const command = hostCommand();
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  const persisted = { host_result_version: "0.1.0", result_id: "result-persisted", command_id: "cmd", dispatch_ref: "dispatch", task_id: "task", binding_id: "binding", status: "ACTION_SUCCEEDED", pre_observation_ref: null, post_observation_ref: "obs", error: null, details: {}, completed_at: new Date().toISOString() };
  await journal.markExecuted(command.command_id, { result: persisted, binding_id: "binding" });
  let executions = 0;
  const reports = [];
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: "dispatch" }],
      claim: async () => ({ claim_token: "new-token" }),
      get: async () => command,
      report: async (_ref, _token, result) => reports.push(result)
    },
    approvalClient: {}, bindingRegistry: {}, journal,
    observationCoordinator: {},
    actionExecutor: { execute: async () => { executions += 1; } },
    modelProvider: {}, evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.recovered_report_only, true);
  assert.equal(executions, 0);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].result_id, "result-persisted");
});

test("proposal mode can open a role session without an existing binding", async () => {
  const command = hostCommand({
    command_id: "open-cmd",
    dispatch_ref: "open-dispatch",
    idempotency_key: "open-idem",
    target: { role_ref: "reviewer", gpt_ref: "g-test", conversation_ref: null },
    action: { type: "OPEN_OR_RESUME_SESSION", payload_ref: "open-payload" },
    preconditions: { authorization_class: "PLATFORM_WAKE", authorization_ref: "auth-1" },
    approval_ref: null
  });
  const openedBinding = binding({ binding_id: "opened", role_ref: "reviewer", conversation_ref: null, page_fingerprint: "sha256:new" });
  const openedObservation = observation({ binding_id: "opened", conversation_ref: null, page_url: "https://chatgpt.com/g/g-test", page_fingerprint: "sha256:new" });
  let executed = 0;
  const reports = [];
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: "open-dispatch" }],
      claim: async () => ({ claim_token: "claim" }),
      get: async () => command,
      resolvePayload: async () => ({ url: "https://chatgpt.com/g/g-test" }),
      report: async (_ref, _claim, result) => reports.push(result)
    },
    approvalClient: {},
    bindingRegistry: {
      findForTarget: async () => null,
      validateObservation: async (value) => value
    },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: { observe: async () => ({ observation: openedObservation, local: {} }) },
    actionExecutor: { execute: async () => { executed += 1; return { status: "ACTION_SUCCEEDED", binding: openedBinding, details: { session_created: true } }; } },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "platform_wake_proposal" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.result.status, "ACTION_SUCCEEDED");
  assert.equal(executed, 1);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].binding_id, "opened");
});

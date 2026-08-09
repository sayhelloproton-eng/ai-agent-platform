import test from "node:test";
import assert from "node:assert/strict";
import { RuntimeCoordinator } from "../src/background/runtime-coordinator.js";
import { CommandJournal } from "../src/background/command-journal.js";
import { MemoryStorageArea } from "../src/background/storage.js";
import { computeActionFingerprint, computePagePreconditionHash } from "../src/shared/fingerprints.js";
import { binding, hostCommand, observation, platformWake } from "./test-helpers.mjs";

function assessment() {
  return { assessment_version: "0.1.0", assessment_id: "a", observation_id: "obs", decision: "NO_ACTION", confidence: 1, evidence_refs: [], warnings: [], candidate_action: null, assessed_at: new Date().toISOString() };
}

function deliveryExecution(bound) {
  return {
    status: "ACTION_SUCCEEDED",
    binding: bound,
    response_pending: true,
    delivery: {
      delivery_id: "cmd:delivery",
      submitted_at: "2026-08-06T00:00:00.000Z",
      response_baseline: { generation_state: "IDLE", assistant_count: 1, last_assistant_text: "before" },
      details: { message_submitted: true }
    }
  };
}

function observationService(observed) {
  return { observe: async () => ({ observation: observed, local: {} }) };
}

function dispatchHarness(command) {
  const calls = [];
  let pending = true;
  return {
    calls,
    client: {
      listPending: async () => pending ? [{ dispatch_ref: command.dispatch_ref }] : [],
      claim: async () => ({ claim_token: "claim-token" }),
      get: async () => command,
      resolvePayload: async () => ({ text: "wake" }),
      deliveryAck: async (_ref, claim, delivery) => {
        calls.push({ type: "deliveryAck", claim, delivery });
        return { delivery_receipt: "delivery-receipt", report_token: "report-token" };
      },
      hostResult: async (_ref, reportToken, result) => {
        calls.push({ type: "hostResult", reportToken, result });
        pending = false;
        return { status: "RECORDED", result_id: result.result_id };
      },
      fail: async (_ref, claim, result) => {
        calls.push({ type: "fail", claim, result });
        pending = false;
        return { status: "RECORDED" };
      }
    }
  };
}

test("sensitive message uses one-time Approval, Delivery Ack, response observation and Host Result", async () => {
  const command = hostCommand();
  const bound = binding();
  const observed = observation();
  const payload = { text: "wake" };
  const pageHash = await computePagePreconditionHash(observed);
  const fingerprint = await computeActionFingerprint({ command, binding_id: bound.binding_id, resolved_payload: payload, page_precondition_hash: pageHash });
  const grant = { approval_ref: "approval", grant_id: "grant", action_fingerprint: fingerprint, binding_id: "binding", task_id: "task", command_id: "cmd", allowed_action_type: "SUBMIT_MESSAGE", page_precondition_hash: pageHash, single_use: true, expires_at: "2030-01-01T00:00:00.000Z", consumed_at: null };
  const harness = dispatchHarness(command);
  harness.client.resolvePayload = async () => payload;
  let consumed = 0, executions = 0, waits = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: harness.client,
    approvalClient: { putDraft: async () => ({ status: "PENDING_APPROVAL" }), getGrant: async () => grant, consume: async () => { consumed += 1; } },
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value, get: async () => bound },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: observationService(observed),
    actionExecutor: {
      execute: async () => { executions += 1; return deliveryExecution(bound); },
      waitForResponse: async () => { waits += 1; return { status: "ACTION_SUCCEEDED", details: { response_started: true, response_completed: true } }; }
    },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });
  const first = await coordinator.processOne();
  const second = await coordinator.processOne();
  assert.equal(first.result.status, "ACTION_SUCCEEDED");
  assert.equal(first.report.reported, true);
  assert.equal(second.processed, false);
  assert.equal(executions, 1);
  assert.equal(waits, 1);
  assert.equal(consumed, 1);
  assert.deepEqual(harness.calls.map((entry) => entry.type), ["deliveryAck", "hostResult"]);
});

test("default candidate policy opens first role session without an existing Binding", async () => {
  const { command, payload } = platformWake();
  const opened = binding({ binding_id: "opened", conversation_ref: null });
  const observed = observation({ binding_id: "opened", conversation_ref: null, page_url: "https://chatgpt.com/g/g-test" });
  const harness = dispatchHarness(command);
  harness.client.resolvePayload = async () => payload;
  let approvals = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: harness.client,
    approvalClient: { getGrant: async () => { approvals += 1; }, consume: async () => { approvals += 1; } },
    bindingRegistry: { findForTarget: async () => null, validateObservation: async (value) => value, get: async () => opened },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: observationService(observed),
    actionExecutor: {
      execute: async () => ({ ...deliveryExecution(opened), delivery: { ...deliveryExecution(opened).delivery, delivery_id: `${command.command_id}:delivery` } }),
      waitForResponse: async () => ({ status: "ACTION_SUCCEEDED", details: { response_started: true, response_completed: true } })
    },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "platform_wake_candidate" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.result.status, "ACTION_SUCCEEDED");
  assert.equal(response.result.binding_id, "opened");
  assert.equal(approvals, 0);
});

test("Host Result remains legal after delivery Ack even when the original claim is no longer used", async () => {
  const { command, payload } = platformWake({ action_type: "CONTINUE_ROLE_SESSION", conversation_ref: "conv" });
  const bound = binding();
  const observed = observation();
  let originalClaimInvalidated = false;
  const calls = [];
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: command.dispatch_ref }],
      claim: async () => ({ claim_token: "delivery-claim" }),
      get: async () => command,
      resolvePayload: async () => payload,
      deliveryAck: async () => { originalClaimInvalidated = true; calls.push("ack"); return { delivery_receipt: "receipt", report_token: "report-token" }; },
      hostResult: async (_ref, token) => { assert.equal(originalClaimInvalidated, true); assert.equal(token, "report-token"); calls.push("result"); return { status: "RECORDED" }; },
      fail: async () => { throw new Error("unexpected fail"); }
    },
    approvalClient: {},
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value, get: async () => bound },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: observationService(observed),
    actionExecutor: { execute: async () => deliveryExecution(bound), waitForResponse: async () => ({ status: "ACTION_SUCCEEDED", details: { response_completed: true } }) },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "platform_wake_candidate" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.report.reported, true);
  assert.deepEqual(calls, ["ack", "result"]);
});

test("executed command after restart is only reported and never re-executed", async () => {
  const command = hostCommand();
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  await journal.mark(command.command_id, "DELIVERY_ACKED", { binding_id: "binding", delivery: { delivery_id: "delivery", response_expected: false }, report_token: "report-token" });
  const persisted = { host_result_version: "0.1.0", result_id: "result-persisted", command_id: "cmd", dispatch_ref: "dispatch", task_id: "task", binding_id: "binding", status: "ACTION_SUCCEEDED", pre_observation_ref: null, post_observation_ref: "obs", error: null, details: {}, completed_at: new Date().toISOString() };
  await journal.markExecuted(command.command_id, { result: persisted, binding_id: "binding" });
  let executions = 0;
  const reports = [];
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: { hostResult: async (_ref, token, result) => { reports.push({ token, result }); return { status: "RECORDED" }; } },
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
  assert.equal(reports[0].token, "report-token");
  assert.equal(reports[0].result.result_id, "result-persisted");
});

test("delivery-acked restart resumes response observation and never submits the message again", async () => {
  const { command } = platformWake({ action_type: "CONTINUE_ROLE_SESSION", conversation_ref: "conv" });
  const bound = binding();
  const journal = new CommandJournal(new MemoryStorageArea());
  await journal.begin(command);
  await journal.mark(command.command_id, "CLAIMED", { claim_token: "old-claim" });
  await journal.markDeliveryConfirmed(command.command_id, {
    binding_id: bound.binding_id,
    execution: { response_pending: true },
    delivery: { delivery_id: "delivery", response_expected: true, response_baseline: { generation_state: "IDLE", assistant_count: 1, last_assistant_text: "before" }, response_wait: {} }
  });
  await journal.markDeliveryAcked(command.command_id, { binding_id: bound.binding_id, delivery_ack: { delivery_receipt: "receipt", report_token: "report-token" }, report_token: "report-token" });
  let executions = 0, waits = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: { hostResult: async () => ({ status: "RECORDED" }) },
    approvalClient: {},
    bindingRegistry: { get: async () => bound, validateObservation: async (value) => value },
    journal,
    observationCoordinator: observationService(observation()),
    actionExecutor: { execute: async () => { executions += 1; }, waitForResponse: async () => { waits += 1; return { status: "ACTION_SUCCEEDED", details: { response_completed: true } }; } },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "platform_wake_candidate" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.recovered_observation, true);
  assert.equal(executions, 0);
  assert.equal(waits, 1);
  assert.equal(response.report.reported, true);
});

test("expired command stops before browser execution", async () => {
  const command = hostCommand({ expires_at: "2020-01-01T00:00:00.000Z" });
  let executions = 0, failures = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: "dispatch" }],
      claim: async () => ({ claim_token: "claim" }),
      get: async () => command,
      fail: async () => { failures += 1; return { status: "RECORDED" }; }
    },
    approvalClient: {}, bindingRegistry: {}, journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: {}, actionExecutor: { execute: async () => { executions += 1; } }, modelProvider: {}, evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.result.status, "EXPIRED");
  assert.equal(executions, 0);
  assert.equal(failures, 1);
});

test("page identity mismatch stops before browser execution", async () => {
  const command = hostCommand();
  const bound = binding();
  let executions = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: "dispatch" }],
      claim: async () => ({ claim_token: "claim" }),
      get: async () => command,
      resolvePayload: async () => ({ text: "wake" }),
      fail: async () => ({ status: "RECORDED" })
    },
    approvalClient: {},
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async () => { throw Object.assign(new Error("wrong chat"), { code: "BINDING_PAGE_IDENTITY_MISMATCH" }); } },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: observationService(observation({ conversation_ref: "other" })),
    actionExecutor: { execute: async () => { executions += 1; } },
    modelProvider: {}, evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.result.status, "BLOCKED");
  assert.equal(executions, 0);
});

test("delivery Ack failure is retried without resubmitting the browser action", async () => {
  const { command, payload } = platformWake({ action_type: "CONTINUE_ROLE_SESSION", conversation_ref: "conv" });
  const bound = binding();
  const journal = new CommandJournal(new MemoryStorageArea());
  let executions = 0, ackAttempts = 0, reports = 0;
  const dispatchClient = {
    listPending: async () => [{ dispatch_ref: command.dispatch_ref }],
    claim: async () => ({ claim_token: "claim" }),
    get: async () => command,
    resolvePayload: async () => payload,
    deliveryAck: async () => {
      ackAttempts += 1;
      if (ackAttempts === 1) throw Object.assign(new Error("temporary"), { code: "GATEWAY_UNAVAILABLE" });
      return { delivery_receipt: "receipt", report_token: "report-token" };
    },
    hostResult: async () => { reports += 1; return { status: "RECORDED" }; },
    fail: async () => { throw new Error("must not fail an already delivered command"); }
  };
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient,
    approvalClient: {},
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value, get: async () => bound },
    journal,
    observationCoordinator: observationService(observation()),
    actionExecutor: {
      execute: async () => { executions += 1; return deliveryExecution(bound); },
      waitForResponse: async () => ({ status: "ACTION_SUCCEEDED", details: { response_completed: true } })
    },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "platform_wake_candidate" })
  });
  const first = await coordinator.processOne();
  assert.equal(first.delivery_ack_pending, true);
  assert.equal(executions, 1);
  const second = await coordinator.processOne();
  assert.equal(second.recovered_observation, true);
  assert.equal(executions, 1);
  assert.equal(ackAttempts, 2);
  assert.equal(reports, 1);
});

test("approval precondition failure before browser execution is BLOCKED, never UNCERTAIN", async () => {
  const command = hostCommand();
  const bound = binding();
  const observed = observation();
  let executions = 0, consumes = 0, failures = 0, uncertainReports = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: command.dispatch_ref }],
      claim: async () => ({ claim_token: "claim" }),
      get: async () => command,
      resolvePayload: async () => ({ text: "wake" }),
      fail: async (_ref, _claim, result) => { failures += 1; assert.equal(result.status, "BLOCKED"); return { status: "RECORDED" }; },
      uncertain: async () => { uncertainReports += 1; return { status: "RECORDED" }; }
    },
    approvalClient: {
      putDraft: async () => ({ status: "PENDING_APPROVAL" }),
      getGrant: async () => ({
        approval_ref: command.approval_ref,
        grant_id: "grant",
        action_fingerprint: "wrong-action-fingerprint",
        binding_id: bound.binding_id,
        task_id: command.task_id,
        command_id: command.command_id,
        allowed_action_type: command.action.type,
        page_precondition_hash: "wrong-page-hash",
        single_use: true,
        expires_at: "2030-01-01T00:00:00.000Z",
        consumed_at: null
      }),
      consume: async () => { consumes += 1; }
    },
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: observationService(observed),
    actionExecutor: { execute: async () => { executions += 1; } },
    modelProvider: {}, evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });

  const response = await coordinator.processOne();
  assert.equal(response.result.status, "BLOCKED");
  assert.equal(response.result.error.code, "APPROVAL_PRECONDITION_CHANGED");
  assert.equal(executions, 0);
  assert.equal(consumes, 0);
  assert.equal(failures, 1);
  assert.equal(uncertainReports, 0);
});

test("approval consume failure stays pre-delivery BLOCKED and never becomes UNCERTAIN", async () => {
  const command = hostCommand();
  const bound = binding();
  const observed = observation();
  const payload = { text: "wake" };
  const pageHash = await computePagePreconditionHash(observed);
  const fingerprint = await computeActionFingerprint({ command, binding_id: bound.binding_id, resolved_payload: payload, page_precondition_hash: pageHash });
  const grant = {
    approval_ref: command.approval_ref,
    grant_id: "grant",
    action_fingerprint: fingerprint,
    binding_id: bound.binding_id,
    task_id: command.task_id,
    command_id: command.command_id,
    allowed_action_type: command.action.type,
    page_precondition_hash: pageHash,
    single_use: true,
    expires_at: "2030-01-01T00:00:00.000Z",
    consumed_at: null
  };
  let executions = 0, failures = 0, uncertainReports = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {
      listPending: async () => [{ dispatch_ref: command.dispatch_ref }],
      claim: async () => ({ claim_token: "claim" }),
      get: async () => command,
      resolvePayload: async () => payload,
      fail: async (_ref, _claim, result) => {
        failures += 1;
        assert.equal(result.status, "BLOCKED");
        assert.equal(result.error.code, "APPROVAL_ALREADY_CONSUMED");
        return { status: "RECORDED" };
      },
      uncertain: async () => { uncertainReports += 1; return { status: "RECORDED" }; }
    },
    approvalClient: {
      putDraft: async () => ({ status: "PENDING_APPROVAL" }),
      getGrant: async () => grant,
      consume: async () => { throw Object.assign(new Error("already consumed"), { code: "APPROVAL_ALREADY_CONSUMED" }); }
    },
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value },
    journal: new CommandJournal(new MemoryStorageArea()),
    observationCoordinator: observationService(observed),
    actionExecutor: { execute: async () => { executions += 1; } },
    modelProvider: {}, evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "strict" })
  });

  const response = await coordinator.processOne();
  assert.equal(response.result.status, "BLOCKED");
  assert.equal(executions, 0);
  assert.equal(failures, 1);
  assert.equal(uncertainReports, 0);
});

test("high-risk command prepares Approval Draft and resumes the same command after Grant is issued", async () => {
  const command = hostCommand();
  const bound = binding();
  const observed = observation();
  const payload = { text: "approved wake" };
  const journal = new CommandJournal(new MemoryStorageArea());
  let grant = null;
  const drafts = [];
  let claimEpoch = 0;
  let executions = 0;
  let consumed = 0;
  const harness = dispatchHarness(command);
  harness.client.claim = async () => ({ claim_token: `claim-${++claimEpoch}`, expires_at: "2030-01-01T00:00:00.000Z" });
  harness.client.resolvePayload = async () => payload;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: harness.client,
    approvalClient: {
      putDraft: async (draft) => { drafts.push(structuredClone(draft)); return { status: "PENDING_APPROVAL" }; },
      getGrantOrNull: async () => grant,
      getGrant: async () => grant,
      consume: async () => { consumed += 1; }
    },
    bindingRegistry: { findForTarget: async () => bound, validateObservation: async (value) => value, get: async () => bound },
    journal,
    observationCoordinator: {
      observe: async () => ({
        observation: claimEpoch <= 1
          ? observed
          : {
              ...observed,
              interactive_elements: [
                ...(observed.interactive_elements ?? []),
                { element_ref: "button:approval-result", role: "button", accessible_name: "Copy", enabled: true, visible: true }
              ]
            },
        local: {}
      })
    },
    actionExecutor: {
      execute: async () => { executions += 1; return deliveryExecution(bound); },
      waitForResponse: async () => ({ status: "ACTION_SUCCEEDED", details: { response_completed: true } })
    },
    modelProvider: { analyze: async () => assessment() },
    evidenceStore: {},
    configProvider: async () => ({ paused: false, emergency_stopped: false, approval_policy_mode: "platform_wake_candidate" })
  });

  const pending = await coordinator.processOne();
  assert.equal(pending.reason, "APPROVAL_PENDING");
  assert.equal(pending.approval_pending, true);
  assert.equal(executions, 0);
  assert.equal((await journal.get(command.command_id)).state, "APPROVAL_PENDING");
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].command_id, command.command_id);
  assert.equal(drafts[0].binding_id, bound.binding_id);
  assert.equal(drafts[0].payload_preview.text, payload.text);

  const pageHash = await computePagePreconditionHash(observed);
  const fingerprint = await computeActionFingerprint({ command, binding_id: bound.binding_id, resolved_payload: payload, page_precondition_hash: pageHash });
  grant = {
    approval_ref: command.approval_ref,
    grant_id: "grant-after-draft",
    action_fingerprint: fingerprint,
    binding_id: bound.binding_id,
    task_id: command.task_id,
    command_id: command.command_id,
    allowed_action_type: command.action.type,
    page_precondition_hash: pageHash,
    single_use: true,
    expires_at: "2030-01-01T00:00:00.000Z",
    consumed_at: null
  };

  const completed = await coordinator.processOne();
  assert.equal(completed.result.status, "ACTION_SUCCEEDED");
  assert.equal(executions, 1);
  assert.equal(consumed, 1);
  assert.equal(drafts.length, 2);
  assert.equal(drafts[1].draft_id, drafts[0].draft_id);
  assert.equal(drafts[1].prepared_at, drafts[0].prepared_at);
  assert.equal((await journal.get(command.command_id)).state, "REPORTED");
});

test("emergency stop flushes report-only recovery but never resumes browser observation", async () => {
  const command = hostCommand();
  const bound = binding();
  const journal = new CommandJournal(new MemoryStorageArea(), { recoveryBaseDelayMs: 0 });
  await journal.begin(command, { claim_token: "claim" });
  await journal.mark(command.command_id, "DELIVERY_ACKED", {
    binding_id: bound.binding_id,
    delivery: { delivery_id: "delivery", response_expected: true, response_baseline: { generation_state: "IDLE", assistant_count: 0, last_assistant_text: "" } },
    report_token: "report-token"
  });
  let waits = 0, observations = 0;
  const coordinator = new RuntimeCoordinator({
    host_id: "host",
    dispatchClient: {},
    approvalClient: {},
    bindingRegistry: { get: async () => bound },
    journal,
    observationCoordinator: { observe: async () => { observations += 1; return { observation: observation(), local: {} }; } },
    actionExecutor: { waitForResponse: async () => { waits += 1; return { status: "ACTION_SUCCEEDED" }; } },
    modelProvider: {}, evidenceStore: {},
    configProvider: async () => ({ paused: true, emergency_stopped: true, approval_policy_mode: "strict" })
  });
  const response = await coordinator.processOne();
  assert.equal(response.reason, "EMERGENCY_STOPPED");
  assert.equal(response.recovery.reason, "RECOVERY_BROWSER_OBSERVATION_DEFERRED");
  assert.equal(waits, 0);
  assert.equal(observations, 0);
  assert.equal((await journal.get(command.command_id)).state, "DELIVERY_ACKED");
});

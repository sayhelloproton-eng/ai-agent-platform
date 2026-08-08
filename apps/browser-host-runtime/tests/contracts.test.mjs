import test from "node:test";
import assert from "node:assert/strict";
import { assertHostCommand, assertWakeEnvelope, buildHostResult, buildWakeEnvelope } from "../src/shared/contracts.js";

const command = {
  host_command_version: "0.1.0",
  command_id: "host-command-001",
  dispatch_ref: "browser-dispatch-001",
  task_id: "task-001",
  target: { role_ref: "controller", gpt_ref: "gpt-controller", conversation_ref: "conversation-001" },
  action: { type: "SUBMIT_MESSAGE", payload_ref: "wake-001" },
  preconditions: {},
  approval_ref: "approval-001",
  idempotency_key: "idem-001",
  expires_at: "2030-01-01T00:00:00.000Z"
};

test("Host Command accepts semantic action without DOM details", () => {
  assert.equal(assertHostCommand(command).command_id, "host-command-001");
});

test("Host Command rejects arbitrary action", () => {
  assert.throws(() => assertHostCommand({ ...command, action: { type: "EXECUTE_JAVASCRIPT" } }), /not registered|Unsupported/i);
});

test("Wake Envelope is minimal and rejects extra task body", () => {
  const wake = buildWakeEnvelope({ task_id: "task-1", required_role: "controller", event_id: "event-1", dispatch_ref: "dispatch-1" });
  assert.equal(wake.required_role, "controller");
  assert.throws(() => assertWakeEnvelope({ ...wake, plan: { nodes: [] } }), /forbidden field/);
});


test("Host Result promotes observation references into durable evidence_refs", () => {
  const result = buildHostResult({
    command,
    status: "ACTION_SUCCEEDED",
    binding_id: "binding-001",
    pre_observation_ref: "observation:pre",
    post_observation_ref: "observation:post",
  });
  assert.deepEqual(result.evidence_refs, ["observation:pre", "observation:post"]);
});

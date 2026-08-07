import test from "node:test";
import assert from "node:assert/strict";
await import("../src/content/response-lifecycle.js");

const baseline = { assistant_count: 0, last_assistant_text: "", generation_state: "IDLE" };

test("response lifecycle waits for start and completion, not only one phase", async () => {
  const snapshots = [
    { assistant_count: 0, last_assistant_text: "", generation_state: "RUNNING" },
    { assistant_count: 1, last_assistant_text: "done", generation_state: "IDLE" },
    { assistant_count: 1, last_assistant_text: "done", generation_state: "IDLE" }
  ];
  let index = 0;
  let now = 0;
  const result = await globalThis.BhrResponseLifecycle.waitForCompleteResponse({
    payload: { timeout_ms: 1000, start_timeout_ms: 500, stable_ms: 10, poll_ms: 0 },
    baseline,
    snapshot: () => snapshots[Math.min(index++, snapshots.length - 1)],
    ensureIdentity: () => {},
    isInterrupted: () => false,
    sleepImpl: async () => { now += 20; },
    nowImpl: () => now
  });
  assert.equal(result.details.response_started, true);
  assert.equal(result.details.response_completed, true);
  assert.equal(result.details.final_response_chars, 4);
});

test("page identity change stops response execution", async () => {
  let now = 0;
  await assert.rejects(
    () => globalThis.BhrResponseLifecycle.waitForCompleteResponse({
      payload: { timeout_ms: 1000, start_timeout_ms: 500, poll_ms: 0, expected_identity: { conversation_ref: "conv" } },
      baseline,
      snapshot: () => baseline,
      ensureIdentity: () => { throw Object.assign(new Error("changed"), { code: "PAGE_IDENTITY_CHANGED" }); },
      isInterrupted: () => false,
      sleepImpl: async () => { now += 20; },
      nowImpl: () => now
    }),
    (error) => error.code === "PAGE_IDENTITY_CHANGED"
  );
});

test("response lifecycle reports start timeout when no response begins", async () => {
  let now = 0;
  await assert.rejects(
    () => globalThis.BhrResponseLifecycle.waitForCompleteResponse({
      payload: { timeout_ms: 1000, start_timeout_ms: 100, poll_ms: 0 },
      baseline,
      snapshot: () => baseline,
      ensureIdentity: () => {},
      isInterrupted: () => false,
      sleepImpl: async () => { now += 50; },
      nowImpl: () => now
    }),
    (error) => error.code === "RESPONSE_START_TIMEOUT"
  );
});

test("response lifecycle reports user interruption", async () => {
  let now = 0;
  await assert.rejects(
    () => globalThis.BhrResponseLifecycle.waitForCompleteResponse({
      payload: { timeout_ms: 1000, start_timeout_ms: 500, poll_ms: 0 },
      baseline,
      snapshot: () => ({ ...baseline, generation_state: "RUNNING" }),
      ensureIdentity: () => {},
      isInterrupted: () => true,
      sleepImpl: async () => { now += 20; },
      nowImpl: () => now
    }),
    (error) => error.code === "RESPONSE_INTERRUPTED_BY_USER"
  );
});

test("send click is not considered delivered until page state confirms submission", async () => {
  let now = 0;
  let index = 0;
  const before = { message_count: 1, assistant_count: 0, last_assistant_text: "", generation_state: "IDLE", identity: { conversation_ref: "conv" } };
  const snapshots = [before, { ...before, message_count: 2, generation_state: "RUNNING" }];
  const result = await globalThis.BhrResponseLifecycle.waitForSubmissionConfirmation({
    payload: { submission_confirm_timeout_ms: 500, submission_confirm_poll_ms: 0 },
    baseline: before,
    snapshot: () => snapshots[Math.min(index++, snapshots.length - 1)],
    composerText: () => "",
    ensureIdentity: () => {},
    isInterrupted: () => false,
    sleepImpl: async () => { now += 20; },
    nowImpl: () => now
  });
  assert.equal(result.details.submission_confirmed, true);
});

test("unconfirmed send click becomes PAGE_ACTION_UNCERTAIN instead of a false delivery Ack", async () => {
  let now = 0;
  const before = { message_count: 1, assistant_count: 0, last_assistant_text: "", generation_state: "IDLE", identity: { conversation_ref: "conv" } };
  await assert.rejects(
    () => globalThis.BhrResponseLifecycle.waitForSubmissionConfirmation({
      payload: { submission_confirm_timeout_ms: 250, submission_confirm_poll_ms: 0 },
      baseline: before,
      snapshot: () => before,
      composerText: () => "still here",
      ensureIdentity: () => {},
      isInterrupted: () => false,
      sleepImpl: async () => { now += 100; },
      nowImpl: () => now
    }),
    (error) => error?.code === "PAGE_ACTION_UNCERTAIN" && error?.details?.reason === "SUBMISSION_CONFIRMATION_TIMEOUT"
  );
});

test("response timeout diagnostics never expose assistant transcript text", async () => {
  let now = 0;
  const secretText = "sensitive assistant transcript that must stay local";
  const snapshot = {
    message_count: 2,
    assistant_count: 1,
    last_assistant_text: secretText,
    generation_state: "RUNNING",
    identity: { gpt_ref: "g-test", conversation_ref: "conv" }
  };
  await assert.rejects(
    () => globalThis.BhrResponseLifecycle.waitForCompleteResponse({
      payload: { timeout_ms: 1000, start_timeout_ms: 500, stable_ms: 100, poll_ms: 0 },
      baseline: { message_count: 1, assistant_count: 0, last_assistant_text: "", generation_state: "IDLE", identity: snapshot.identity },
      snapshot: () => snapshot,
      ensureIdentity: () => {},
      isInterrupted: () => false,
      sleepImpl: async () => { now += 500; },
      nowImpl: () => now
    }),
    (error) => {
      assert.equal(error.code, "RESPONSE_COMPLETION_TIMEOUT");
      assert.equal(error.details.last_snapshot.last_assistant_chars, secretText.length);
      assert.equal(Object.prototype.hasOwnProperty.call(error.details.last_snapshot, "last_assistant_text"), false);
      assert.equal(JSON.stringify(error.details).includes(secretText), false);
      return true;
    }
  );
});

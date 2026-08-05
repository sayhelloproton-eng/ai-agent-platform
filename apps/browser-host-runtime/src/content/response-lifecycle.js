(() => {
  "use strict";

  async function waitForCompleteResponse({
    payload,
    baseline,
    snapshot,
    ensureIdentity,
    isInterrupted,
    sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    nowImpl = () => Date.now()
  }) {
    const timeoutMs = Math.min(Math.max(Number(payload.timeout_ms ?? 120000), 1000), 300000);
    const startTimeoutMs = Math.min(Math.max(Number(payload.start_timeout_ms ?? 20000), 1000), timeoutMs);
    const stableMs = Math.min(Math.max(Number(payload.stable_ms ?? 1200), 0), 5000);
    const pollMs = Math.min(Math.max(Number(payload.poll_ms ?? 250), 0), 2000);
    const startedAt = nowImpl();
    let responseStartedAt = baseline.generation_state === "RUNNING" ? startedAt : null;
    let lastChangedAt = startedAt;
    let previousText = baseline.last_assistant_text;
    let lastSnapshot = baseline;

    while (nowImpl() - startedAt < timeoutMs) {
      await sleepImpl(pollMs);
      ensureIdentity?.(payload.expected_identity);
      if (isInterrupted?.()) {
        throw Object.assign(new Error("The user interrupted the automated response wait."), { code: "RESPONSE_INTERRUPTED_BY_USER" });
      }
      const current = snapshot();
      lastSnapshot = current;
      const changed = current.assistant_count > baseline.assistant_count || current.last_assistant_text !== baseline.last_assistant_text;
      if (!responseStartedAt && (current.generation_state === "RUNNING" || changed)) responseStartedAt = nowImpl();
      if (current.last_assistant_text !== previousText) {
        previousText = current.last_assistant_text;
        lastChangedAt = nowImpl();
      }
      if (!responseStartedAt && nowImpl() - startedAt >= startTimeoutMs) {
        throw Object.assign(new Error("ChatGPT did not start a response before the start timeout."), { code: "RESPONSE_START_TIMEOUT" });
      }
      if (responseStartedAt && current.generation_state === "IDLE" && changed && nowImpl() - lastChangedAt >= stableMs) {
        return {
          status: "ACTION_SUCCEEDED",
          details: {
            message_submitted: true,
            response_started: true,
            response_completed: true,
            response_started_at: new Date(responseStartedAt).toISOString(),
            response_completed_at: new Date(nowImpl()).toISOString(),
            assistant_message_count_after: current.assistant_count,
            final_response_chars: current.last_assistant_text.length
          }
        };
      }
    }
    throw Object.assign(new Error("ChatGPT response did not complete before timeout."), {
      code: "RESPONSE_COMPLETION_TIMEOUT",
      details: { response_started: Boolean(responseStartedAt), last_snapshot: lastSnapshot }
    });
  }

  globalThis.BhrResponseLifecycle = Object.freeze({ waitForCompleteResponse });
})();

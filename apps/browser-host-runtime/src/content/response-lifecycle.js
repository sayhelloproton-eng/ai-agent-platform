(() => {
  "use strict";

  function boundedNumber(value, fallback, min, max) {
    return Math.min(Math.max(Number(value ?? fallback), min), max);
  }


  function snapshotDiagnostics(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    return {
      message_count: Number(snapshot.message_count ?? 0),
      assistant_count: Number(snapshot.assistant_count ?? 0),
      last_assistant_chars: String(snapshot.last_assistant_text ?? "").length,
      generation_state: snapshot.generation_state ?? null,
      identity: snapshot.identity ?? null
    };
  }

  async function waitForSubmissionConfirmation({
    payload,
    baseline,
    snapshot,
    composerText = () => null,
    ensureIdentity,
    isInterrupted,
    sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    nowImpl = () => Date.now()
  }) {
    const timeoutMs = boundedNumber(payload.submission_confirm_timeout_ms, 3000, 250, 10000);
    const pollMs = boundedNumber(payload.submission_confirm_poll_ms, 100, 0, 1000);
    const startedAt = nowImpl();
    let lastSnapshot = baseline;

    while (nowImpl() - startedAt < timeoutMs) {
      await sleepImpl(pollMs);
      ensureIdentity?.(payload.expected_identity);
      const current = snapshot();
      lastSnapshot = current;
      const currentComposerText = composerText?.();
      const messageObserved = current.message_count > baseline.message_count;
      const responseStarted = current.generation_state === "RUNNING" ||
        current.assistant_count > baseline.assistant_count ||
        current.last_assistant_text !== baseline.last_assistant_text;
      const conversationPromoted = !baseline.identity?.conversation_ref && Boolean(current.identity?.conversation_ref);
      const composerCleared = currentComposerText === "";

      if (messageObserved || responseStarted || conversationPromoted || composerCleared) {
        return {
          status: "ACTION_SUCCEEDED",
          details: {
            submission_confirmed: true,
            message_observed: messageObserved,
            response_started: responseStarted,
            conversation_promoted: conversationPromoted,
            composer_cleared: composerCleared,
            confirmed_at: new Date(nowImpl()).toISOString()
          }
        };
      }

      if (isInterrupted?.()) {
        throw Object.assign(new Error("The page changed under user control after the send click; message delivery is uncertain and must not be retried blindly."), {
          code: "PAGE_ACTION_UNCERTAIN",
          details: { reason: "USER_CONTROL_DURING_SUBMISSION_CONFIRMATION", last_snapshot: snapshotDiagnostics(lastSnapshot) }
        });
      }
    }

    throw Object.assign(new Error("The send click could not be confirmed as a ChatGPT message submission; delivery is uncertain and must not be retried blindly."), {
      code: "PAGE_ACTION_UNCERTAIN",
      details: { reason: "SUBMISSION_CONFIRMATION_TIMEOUT", last_snapshot: snapshotDiagnostics(lastSnapshot) }
    });
  }

  async function waitForCompleteResponse({
    payload,
    baseline,
    snapshot,
    ensureIdentity,
    isInterrupted,
    sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    nowImpl = () => Date.now()
  }) {
    const timeoutMs = boundedNumber(payload.timeout_ms, 120000, 1000, 300000);
    const startTimeoutMs = boundedNumber(payload.start_timeout_ms, 20000, 1000, timeoutMs);
    const stableMs = boundedNumber(payload.stable_ms, 1200, 0, 5000);
    const pollMs = boundedNumber(payload.poll_ms, 250, 0, 2000);
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
      details: { response_started: Boolean(responseStartedAt), last_snapshot: snapshotDiagnostics(lastSnapshot) }
    });
  }

  globalThis.BhrResponseLifecycle = Object.freeze({ waitForSubmissionConfirmation, waitForCompleteResponse });
})();

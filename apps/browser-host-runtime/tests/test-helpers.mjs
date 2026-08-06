import { buildWakeEnvelope } from "../src/shared/contracts.js";

export function hostCommand(overrides = {}) {
  return {
    host_command_version: "0.1.0",
    command_id: "cmd",
    dispatch_ref: "dispatch",
    task_id: "task",
    target: { role_ref: "controller", gpt_ref: "g-test", conversation_ref: "conv" },
    action: { type: "SUBMIT_MESSAGE", payload_ref: "payload" },
    preconditions: {},
    approval_ref: "approval",
    idempotency_key: "idem",
    expires_at: "2030-01-01T00:00:00.000Z",
    ...overrides
  };
}

export function platformWake({
  command_id = "wake-cmd",
  dispatch_ref = "wake-dispatch",
  task_id = "wake-task",
  role_ref = "controller",
  gpt_ref = "g-test",
  conversation_ref = null,
  action_type = "OPEN_OR_RESUME_SESSION",
  payload_ref = "wake-payload",
  idempotency_key = "wake-idem",
  expires_at = "2030-01-01T00:00:00.000Z"
} = {}) {
  const wake = buildWakeEnvelope({
    task_id,
    required_role: role_ref,
    event_id: "wake-event",
    dispatch_ref,
    conversation_ref
  });
  const authorization_ref = "wake-auth";
  const command = hostCommand({
    command_id,
    dispatch_ref,
    task_id,
    target: { role_ref, gpt_ref, conversation_ref },
    action: { type: action_type, payload_ref },
    approval_ref: null,
    idempotency_key,
    expires_at,
    preconditions: {
      authorization_class: "PLATFORM_WAKE",
      authorization_ref,
      platform_wake_authorization: {
        authorization_version: "0.1.0",
        authorization_ref,
        issuer: "action-gateway",
        signature_ref: "sig:test",
        signature_verified: true,
        task_id,
        role_ref,
        gpt_ref,
        idempotency_key,
        allowed_actions: ["OPEN_OR_RESUME_SESSION", "CONTINUE_ROLE_SESSION", "SUBMIT_MESSAGE"],
        expires_at
      }
    }
  });
  const text = JSON.stringify(wake);
  const payload = action_type === "OPEN_OR_RESUME_SESSION"
    ? { url: `https://chatgpt.com/g/${gpt_ref}`, wake_text: text, wake }
    : { text, wake };
  return { command, payload, wake };
}

export function observation(overrides = {}) {
  return {
    observation_version: "0.1.0",
    observation_id: "obs",
    host_id: "host",
    binding_id: "binding",
    provider: "chatgpt-web",
    gpt_ref: "g-test",
    conversation_ref: "conv",
    page_url: "https://chatgpt.com/g/g-test/example/c/conv",
    page_fingerprint: "sha256:page",
    page_state: "READY",
    generation_state: "IDLE",
    follow_latest: true,
    screenshot_ref: null,
    visible_text_ref: "text",
    dom_summary_ref: "dom",
    interactive_elements: [],
    blocking_ui: [],
    observed_at: "2026-08-05T00:00:00.000Z",
    ...overrides
  };
}

export function binding(overrides = {}) {
  return {
    binding_id: "binding",
    host_id: "host",
    provider: "chatgpt-web",
    role_ref: "controller",
    gpt_ref: "g-test",
    conversation_ref: "conv",
    page_fingerprint: "sha256:page",
    state: "READY",
    chrome_tab_id: 10,
    ...overrides
  };
}

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

import { APPROVAL_POLICY_MODE } from "../shared/constants.js";

const LOCAL_KEY = "bhr.config";
const SESSION_SECRET_KEY = "bhr.session_secrets";
const LOCAL_DEV_SECRET_KEY = "bhr.local_dev_gateway_secret";

export const DEFAULT_CONFIG = Object.freeze({
  transport_mode: "gateway",
  gateway_endpoint: "http://127.0.0.1:8787/v1/browser-host/invoke",
  gateway_timeout_ms: 5000,
  dispatch_poll_seconds: 30,
  heartbeat_seconds: 60,
  observation_seconds: 30,
  model_mode: "fixture",
  model_endpoint: "http://127.0.0.1:8795/v1/inference",
  model_timeout_ms: 20000,
  screenshot_quality: 75,
  observe_visible_text_max_chars: 20000,
  approval_policy_mode: APPROVAL_POLICY_MODE.PLATFORM_WAKE_CANDIDATE,
  fixture_test_mode: false,
  paused: false,
  emergency_stopped: false
});

export async function readConfig() {
  const local = await chrome.storage.local.get(LOCAL_KEY);
  return { ...DEFAULT_CONFIG, ...(local[LOCAL_KEY] ?? {}) };
}

export async function writeConfig(patch) {
  const current = await readConfig();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [LOCAL_KEY]: next });
  return next;
}

export async function readSessionSecrets() {
  const session = await chrome.storage.session.get(SESSION_SECRET_KEY);
  const current = session[SESSION_SECRET_KEY] ?? {};
  if (current.gateway_api_key || current.model_api_key) return current;

  // Transitional private-development fallback: survive unpacked-extension reloads
  // during Phase 2 validation. Replace this with Native Messaging + short-lived
  // session credentials before the extension is treated as a distributable build.
  const local = await chrome.storage.local.get(LOCAL_DEV_SECRET_KEY);
  const fallback = local[LOCAL_DEV_SECRET_KEY] ?? {};
  if (fallback.gateway_api_key || fallback.model_api_key) {
    await chrome.storage.session.set({ [SESSION_SECRET_KEY]: fallback });
    return fallback;
  }
  return {};
}

export async function writeSessionSecrets(secrets) {
  const filtered = {
    gateway_api_key: typeof secrets.gateway_api_key === "string" ? secrets.gateway_api_key.trim() : "",
    model_api_key: typeof secrets.model_api_key === "string" ? secrets.model_api_key.trim() : ""
  };
  await chrome.storage.session.set({ [SESSION_SECRET_KEY]: filtered });
  await chrome.storage.local.set({ [LOCAL_DEV_SECRET_KEY]: filtered });
  return {
    gateway_api_key_set: Boolean(filtered.gateway_api_key),
    model_api_key_set: Boolean(filtered.model_api_key),
    credential_source: "local-private-development-fallback"
  };
}

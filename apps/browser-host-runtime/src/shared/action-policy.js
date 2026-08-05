import { ACTION_TYPES, APPROVAL_POLICY_MODE, HIGH_RISK_ACTIONS } from "./constants.js";
import { BhrError } from "./errors.js";
import { requireObject } from "./json.js";

const registered = new Set(Object.values(ACTION_TYPES));

export function classifyAction(actionType) {
  if (!registered.has(actionType)) throw new BhrError("ACTION_NOT_REGISTERED", `Action ${actionType} is not registered.`);
  return HIGH_RISK_ACTIONS.has(actionType) ? "HIGH" : "LOW";
}

function isProposedPlatformWake(command) {
  const preconditions = command?.preconditions ?? {};
  return preconditions.authorization_class === "PLATFORM_WAKE" &&
    typeof preconditions.authorization_ref === "string" &&
    preconditions.authorization_ref.length > 0;
}

export function requiresApproval(commandOrActionType, { mode = APPROVAL_POLICY_MODE.STRICT } = {}) {
  const command = typeof commandOrActionType === "string" ? null : commandOrActionType;
  const actionType = typeof commandOrActionType === "string" ? commandOrActionType : commandOrActionType?.action?.type;
  if (classifyAction(actionType) === "LOW") return false;

  // This mode is an implementation-ready proposal only. The default remains STRICT
  // until the platform owner freezes the public Approval semantics.
  if (mode === APPROVAL_POLICY_MODE.PLATFORM_WAKE_PROPOSAL && isProposedPlatformWake(command)) {
    return !new Set([
      ACTION_TYPES.OPEN_OR_RESUME_SESSION,
      ACTION_TYPES.SET_COMPOSER_TEXT,
      ACTION_TYPES.SUBMIT_MESSAGE
    ]).has(actionType);
  }
  return true;
}

export function validateResolvedPayload(actionType, payload) {
  const value = requireObject(payload ?? {}, "resolved_payload");
  switch (actionType) {
    case ACTION_TYPES.OBSERVE_PAGE:
    case ACTION_TYPES.FOLLOW_LATEST:
    case ACTION_TYPES.WAIT_FOR_RESPONSE:
      return value;
    case ACTION_TYPES.OPEN_OR_RESUME_SESSION:
      if (typeof value.url !== "string" || !value.url.startsWith("https://chatgpt.com/")) {
        throw new BhrError("TARGET_URL_NOT_ALLOWED", "OPEN_OR_RESUME_SESSION only accepts https://chatgpt.com URLs.");
      }
      if (value.wake_text !== undefined && (typeof value.wake_text !== "string" || value.wake_text.length < 1 || value.wake_text.length > 8000)) {
        throw new BhrError("MESSAGE_PAYLOAD_INVALID", "wake_text must contain 1..8000 characters.");
      }
      return value;
    case ACTION_TYPES.SET_COMPOSER_TEXT:
    case ACTION_TYPES.SUBMIT_MESSAGE:
      if (typeof value.text !== "string" || value.text.length < 1 || value.text.length > 8000) {
        throw new BhrError("MESSAGE_PAYLOAD_INVALID", "Message text must contain 1..8000 characters.");
      }
      return value;
    case ACTION_TYPES.STOP_GENERATION:
      return value;
    case ACTION_TYPES.CLICK_REGISTERED_UI:
      if (typeof value.observation_id !== "string" || typeof value.element_ref !== "string") {
        throw new BhrError("ELEMENT_REFERENCE_REQUIRED", "Registered UI click requires observation_id and element_ref.");
      }
      return value;
    default:
      throw new BhrError("ACTION_NOT_REGISTERED", `Action ${actionType} is not registered.`);
  }
}

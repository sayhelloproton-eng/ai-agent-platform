import { ACTION_TYPES, HIGH_RISK_ACTIONS } from "./constants.js";
import { BhrError } from "./errors.js";
import { requireObject } from "./json.js";

const registered = new Set(Object.values(ACTION_TYPES));

export function classifyAction(actionType) {
  if (!registered.has(actionType)) throw new BhrError("ACTION_NOT_REGISTERED", `Action ${actionType} is not registered.`);
  return HIGH_RISK_ACTIONS.has(actionType) ? "HIGH" : "LOW";
}

export function requiresApproval(actionType) {
  return classifyAction(actionType) === "HIGH";
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

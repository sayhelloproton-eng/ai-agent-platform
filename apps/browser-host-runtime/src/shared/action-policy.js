import {
  ACTION_TYPES,
  APPROVAL_POLICY_MODE,
  CONTRACT_VERSION,
  HIGH_RISK_ACTIONS,
  PLATFORM_WAKE_ACTIONS
} from "./constants.js";
import { assertWakeEnvelope } from "./contracts.js";
import { BhrError } from "./errors.js";
import { requireArray, requireBoolean, requireIsoDate, requireObject, requireString } from "./json.js";

const registered = new Set(Object.values(ACTION_TYPES));

export function classifyAction(actionType) {
  if (!registered.has(actionType)) throw new BhrError("ACTION_NOT_REGISTERED", `Action ${actionType} is not registered.`);
  return HIGH_RISK_ACTIONS.has(actionType) ? "HIGH" : "LOW";
}

function normalizePolicyMode(mode) {
  return mode === APPROVAL_POLICY_MODE.PLATFORM_WAKE_PROPOSAL
    ? APPROVAL_POLICY_MODE.PLATFORM_WAKE_CANDIDATE
    : mode;
}

function wakePayloadFor(command, resolvedPayload) {
  if (command.action.type === ACTION_TYPES.OPEN_OR_RESUME_SESSION) {
    if (!resolvedPayload.wake_text) return null;
    return resolvedPayload.wake ?? null;
  }
  if ([ACTION_TYPES.SUBMIT_MESSAGE, ACTION_TYPES.CONTINUE_ROLE_SESSION].includes(command.action.type)) {
    return resolvedPayload.wake ?? null;
  }
  return null;
}

export function validatePlatformWakeAuthorization(command, resolvedPayload, { now = new Date() } = {}) {
  if (!PLATFORM_WAKE_ACTIONS.has(command.action.type)) {
    throw new BhrError("PLATFORM_WAKE_ACTION_NOT_ALLOWED", "The action is not in the platform Wake allowlist.");
  }
  const preconditions = requireObject(command.preconditions ?? {}, "host_command.preconditions");
  if (preconditions.authorization_class !== "PLATFORM_WAKE") {
    throw new BhrError("PLATFORM_WAKE_AUTHORIZATION_REQUIRED", "Platform Wake requires authorization_class=PLATFORM_WAKE.");
  }
  requireString(preconditions.authorization_ref, "host_command.preconditions.authorization_ref", { max: 256 });
  const authorization = requireObject(preconditions.platform_wake_authorization, "host_command.preconditions.platform_wake_authorization");
  if (authorization.authorization_version !== CONTRACT_VERSION) {
    throw new BhrError("PLATFORM_WAKE_AUTHORIZATION_VERSION_UNSUPPORTED", "Unsupported platform Wake authorization version.");
  }
  requireString(authorization.authorization_ref, "platform_wake_authorization.authorization_ref", { max: 256 });
  if (authorization.authorization_ref !== preconditions.authorization_ref) {
    throw new BhrError("PLATFORM_WAKE_AUTHORIZATION_REF_MISMATCH", "Platform Wake authorization reference does not match the command precondition.");
  }
  requireString(authorization.issuer, "platform_wake_authorization.issuer", { max: 128 });
  requireString(authorization.signature_ref, "platform_wake_authorization.signature_ref", { max: 512 });
  requireBoolean(authorization.signature_verified, "platform_wake_authorization.signature_verified");
  if (!authorization.signature_verified) {
    throw new BhrError("PLATFORM_WAKE_SIGNATURE_INVALID", "Platform Wake signature was not verified by the authenticated Gateway adapter.");
  }
  requireString(authorization.task_id, "platform_wake_authorization.task_id", { max: 128 });
  requireString(authorization.role_ref, "platform_wake_authorization.role_ref", { max: 128 });
  requireString(authorization.gpt_ref, "platform_wake_authorization.gpt_ref", { max: 256 });
  requireString(authorization.idempotency_key, "platform_wake_authorization.idempotency_key", { max: 256 });
  requireIsoDate(authorization.expires_at, "platform_wake_authorization.expires_at");
  const allowedActions = requireArray(authorization.allowed_actions, "platform_wake_authorization.allowed_actions", { max: 16 });
  if (authorization.task_id !== command.task_id) throw new BhrError("PLATFORM_WAKE_TASK_MISMATCH", "Platform Wake authorization task does not match the Host Command.");
  if (authorization.role_ref !== command.target.role_ref) throw new BhrError("PLATFORM_WAKE_ROLE_MISMATCH", "Platform Wake authorization role does not match the Host Command.");
  if (authorization.gpt_ref !== command.target.gpt_ref) throw new BhrError("PLATFORM_WAKE_TARGET_MISMATCH", "Platform Wake authorization GPT target does not match the Host Command.");
  if (authorization.idempotency_key !== command.idempotency_key) throw new BhrError("PLATFORM_WAKE_IDEMPOTENCY_MISMATCH", "Platform Wake authorization idempotency key does not match the Host Command.");
  if (!allowedActions.includes(command.action.type)) throw new BhrError("PLATFORM_WAKE_ACTION_NOT_ALLOWED", "Platform Wake authorization does not allow this action.");
  const authExpiry = new Date(authorization.expires_at);
  if (authExpiry <= now || new Date(command.expires_at) <= now) throw new BhrError("PLATFORM_WAKE_AUTHORIZATION_EXPIRED", "Platform Wake authorization or Host Command has expired.");
  if (authExpiry < new Date(command.expires_at)) throw new BhrError("PLATFORM_WAKE_EXPIRY_MISMATCH", "Platform Wake authorization expires before the Host Command.");

  const wake = wakePayloadFor(command, resolvedPayload);
  if (!wake) throw new BhrError("PLATFORM_WAKE_PAYLOAD_REQUIRED", "The low-risk platform Wake path requires a structured Wake Envelope.");
  const validWake = assertWakeEnvelope(wake);
  if (validWake.task_id !== command.task_id) throw new BhrError("PLATFORM_WAKE_PAYLOAD_TASK_MISMATCH", "Wake Envelope task does not match the Host Command.");
  if (validWake.required_role !== command.target.role_ref) throw new BhrError("PLATFORM_WAKE_PAYLOAD_ROLE_MISMATCH", "Wake Envelope role does not match the Host Command.");
  if (validWake.dispatch_ref !== command.dispatch_ref) throw new BhrError("PLATFORM_WAKE_PAYLOAD_DISPATCH_MISMATCH", "Wake Envelope dispatch does not match the Host Command.");
  if (command.target.conversation_ref && validWake.conversation_ref !== command.target.conversation_ref) {
    throw new BhrError("PLATFORM_WAKE_PAYLOAD_CONVERSATION_MISMATCH", "Wake Envelope conversation does not match the Host Command target.");
  }
  return { authorization, wake: validWake };
}

export function requiresApproval(commandOrActionType, {
  mode = APPROVAL_POLICY_MODE.STRICT,
  resolvedPayload = {},
  now = new Date()
} = {}) {
  const command = typeof commandOrActionType === "string" ? null : commandOrActionType;
  const actionType = typeof commandOrActionType === "string" ? commandOrActionType : commandOrActionType?.action?.type;
  if (classifyAction(actionType) === "LOW") return false;

  if (normalizePolicyMode(mode) === APPROVAL_POLICY_MODE.PLATFORM_WAKE_CANDIDATE && command && PLATFORM_WAKE_ACTIONS.has(actionType)) {
    validatePlatformWakeAuthorization(command, resolvedPayload, { now });
    return false;
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
    case ACTION_TYPES.CONTINUE_ROLE_SESSION:
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

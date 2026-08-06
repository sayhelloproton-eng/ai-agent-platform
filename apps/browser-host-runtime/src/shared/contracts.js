import {
  ACTION_TYPES,
  ASSESSMENT_DECISIONS,
  CONTRACT_VERSION,
  HOST_RESULT_STATUS
} from "./constants.js";
import {
  optionalString,
  requireArray,
  requireBoolean,
  requireIsoDate,
  requireObject,
  requireString
} from "./json.js";
import { BhrError } from "./errors.js";
import { randomId } from "./crypto.js";

const actionValues = new Set(Object.values(ACTION_TYPES));
const resultValues = new Set(Object.values(HOST_RESULT_STATUS));

export function assertWakeEnvelope(value) {
  const input = requireObject(value, "wake");
  if (input.wake_version !== CONTRACT_VERSION) throw new BhrError("CONTRACT_VERSION_UNSUPPORTED", "Unsupported wake_version.");
  requireString(input.task_id, "wake.task_id", { max: 128 });
  requireString(input.required_role, "wake.required_role", { max: 128 });
  requireString(input.event_id, "wake.event_id", { max: 128 });
  requireString(input.dispatch_ref, "wake.dispatch_ref", { max: 128 });
  optionalString(input.conversation_ref, "wake.conversation_ref", { max: 256 });
  requireString(input.instruction, "wake.instruction", { max: 500 });
  const allowed = new Set(["wake_version", "task_id", "required_role", "event_id", "dispatch_ref", "conversation_ref", "instruction"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new BhrError("WAKE_ENVELOPE_TOO_BROAD", `Wake Envelope contains forbidden field: ${key}`);
  }
  return input;
}

export function buildWakeEnvelope({ task_id, required_role, event_id, dispatch_ref, conversation_ref = null }) {
  return assertWakeEnvelope({
    wake_version: CONTRACT_VERSION,
    task_id,
    required_role,
    event_id,
    dispatch_ref,
    conversation_ref,
    instruction: "请查询最新 Decision Context，确认角色后再 Claim 并继续处理。"
  });
}

export function assertHostCommand(value) {
  const input = requireObject(value, "host_command");
  if (input.host_command_version !== CONTRACT_VERSION) throw new BhrError("CONTRACT_VERSION_UNSUPPORTED", "Unsupported host_command_version.");
  requireString(input.command_id, "host_command.command_id", { max: 128 });
  requireString(input.dispatch_ref, "host_command.dispatch_ref", { max: 128 });
  requireString(input.task_id, "host_command.task_id", { max: 128 });
  const target = requireObject(input.target, "host_command.target");
  requireString(target.role_ref, "host_command.target.role_ref", { max: 128 });
  requireString(target.gpt_ref, "host_command.target.gpt_ref", { max: 256 });
  optionalString(target.conversation_ref, "host_command.target.conversation_ref", { max: 256 });
  const action = requireObject(input.action, "host_command.action");
  requireString(action.type, "host_command.action.type", { max: 64 });
  if (!actionValues.has(action.type)) throw new BhrError("ACTION_NOT_REGISTERED", `Unsupported action type: ${action.type}`);
  optionalString(action.payload_ref, "host_command.action.payload_ref", { max: 256 });
  requireObject(input.preconditions ?? {}, "host_command.preconditions");
  optionalString(input.approval_ref, "host_command.approval_ref", { max: 256 });
  requireString(input.idempotency_key, "host_command.idempotency_key", { max: 256 });
  requireIsoDate(input.expires_at, "host_command.expires_at");
  return input;
}

export function assertApprovalGrant(value) {
  const input = requireObject(value, "approval_grant");
  requireString(input.approval_ref, "approval_grant.approval_ref", { max: 256 });
  requireString(input.grant_id, "approval_grant.grant_id", { max: 256 });
  requireString(input.action_fingerprint, "approval_grant.action_fingerprint", { max: 128 });
  requireString(input.binding_id, "approval_grant.binding_id", { max: 256 });
  requireString(input.task_id, "approval_grant.task_id", { max: 128 });
  requireString(input.command_id, "approval_grant.command_id", { max: 128 });
  requireString(input.allowed_action_type, "approval_grant.allowed_action_type", { max: 64 });
  requireString(input.page_precondition_hash, "approval_grant.page_precondition_hash", { max: 128 });
  requireBoolean(input.single_use, "approval_grant.single_use");
  requireIsoDate(input.expires_at, "approval_grant.expires_at");
  if (input.consumed_at !== null && input.consumed_at !== undefined) requireIsoDate(input.consumed_at, "approval_grant.consumed_at");
  return input;
}

export function assertObservation(value) {
  const input = requireObject(value, "observation");
  if (input.observation_version !== CONTRACT_VERSION) throw new BhrError("CONTRACT_VERSION_UNSUPPORTED", "Unsupported observation_version.");
  requireString(input.observation_id, "observation.observation_id", { max: 128 });
  requireString(input.host_id, "observation.host_id", { max: 128 });
  requireString(input.binding_id, "observation.binding_id", { max: 256 });
  requireString(input.provider, "observation.provider", { max: 64 });
  requireString(input.gpt_ref, "observation.gpt_ref", { max: 256 });
  optionalString(input.conversation_ref, "observation.conversation_ref", { max: 256 });
  requireString(input.page_url, "observation.page_url", { max: 2048 });
  requireString(input.page_fingerprint, "observation.page_fingerprint", { max: 128 });
  requireString(input.page_state, "observation.page_state", { max: 64 });
  requireString(input.generation_state, "observation.generation_state", { max: 64 });
  requireBoolean(input.follow_latest, "observation.follow_latest");
  optionalString(input.screenshot_ref, "observation.screenshot_ref", { max: 512 });
  optionalString(input.visible_text_ref, "observation.visible_text_ref", { max: 512 });
  optionalString(input.dom_summary_ref, "observation.dom_summary_ref", { max: 512 });
  requireArray(input.interactive_elements ?? [], "observation.interactive_elements", { max: 200 });
  requireArray(input.blocking_ui ?? [], "observation.blocking_ui", { max: 50 });
  requireIsoDate(input.observed_at, "observation.observed_at");
  return input;
}

export function assertAssessment(value) {
  const input = requireObject(value, "assessment");
  if (input.assessment_version !== CONTRACT_VERSION) throw new BhrError("CONTRACT_VERSION_UNSUPPORTED", "Unsupported assessment_version.");
  requireString(input.assessment_id, "assessment.assessment_id", { max: 128 });
  requireString(input.observation_id, "assessment.observation_id", { max: 128 });
  requireString(input.decision, "assessment.decision", { max: 64 });
  if (!ASSESSMENT_DECISIONS.has(input.decision)) throw new BhrError("ASSESSMENT_DECISION_INVALID", "Unknown assessment decision.");
  if (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1) {
    throw new BhrError("CONTRACT_INVALID", "assessment.confidence must be between 0 and 1.");
  }
  requireArray(input.evidence_refs ?? [], "assessment.evidence_refs", { max: 32 });
  requireArray(input.warnings ?? [], "assessment.warnings", { max: 32 });
  if (input.candidate_action !== null && input.candidate_action !== undefined) requireObject(input.candidate_action, "assessment.candidate_action");
  requireIsoDate(input.assessed_at, "assessment.assessed_at");
  return input;
}

export function buildHostResult({ command, status, binding_id, pre_observation_ref = null, post_observation_ref = null, error = null, details = {} }) {
  if (!resultValues.has(status)) throw new BhrError("HOST_RESULT_STATUS_INVALID", `Unknown Host Result status: ${status}`);
  return {
    host_result_version: CONTRACT_VERSION,
    result_id: randomId("host-result"),
    command_id: command.command_id,
    dispatch_ref: command.dispatch_ref,
    task_id: command.task_id,
    binding_id,
    status,
    pre_observation_ref,
    post_observation_ref,
    error,
    details,
    completed_at: new Date().toISOString()
  };
}
export function buildDeliveryFact({ command, binding_id, execution }) {
  const submittedAt = execution?.delivery?.submitted_at ?? execution?.details?.submitted_at ?? new Date().toISOString();
  return {
    delivery_version: CONTRACT_VERSION,
    delivery_id: execution?.delivery?.delivery_id ?? `${command.command_id}:delivery`,
    command_id: command.command_id,
    dispatch_ref: command.dispatch_ref,
    task_id: command.task_id,
    binding_id,
    action_type: command.action.type,
    status: "DELIVERED",
    submitted_at: submittedAt,
    response_expected: Boolean(execution?.response_pending),
    details: execution?.delivery?.details ?? {}
  };
}


export function buildUncertainSideEffect({
  command,
  command_fingerprint,
  binding_id = null,
  page_identity = null,
  last_stage,
  reason,
  evidence_refs = [],
  error = null
}) {
  return {
    uncertain_version: CONTRACT_VERSION,
    uncertain_id: `${command.command_id}:uncertain`,
    command_id: command.command_id,
    dispatch_ref: command.dispatch_ref,
    task_id: command.task_id,
    idempotency_key: command.idempotency_key,
    command_fingerprint,
    binding_id,
    page_identity,
    last_stage,
    reason,
    evidence_refs: [...new Set(evidence_refs.filter(Boolean))],
    error,
    observed_at: new Date().toISOString()
  };
}

export function assertUncertainSideEffect(value) {
  const input = requireObject(value, "uncertain_side_effect");
  if (input.uncertain_version !== CONTRACT_VERSION) throw new BhrError("CONTRACT_VERSION_UNSUPPORTED", "Unsupported uncertain_version.");
  requireString(input.uncertain_id, "uncertain_side_effect.uncertain_id", { max: 256 });
  requireString(input.command_id, "uncertain_side_effect.command_id", { max: 128 });
  requireString(input.dispatch_ref, "uncertain_side_effect.dispatch_ref", { max: 128 });
  requireString(input.task_id, "uncertain_side_effect.task_id", { max: 128 });
  requireString(input.idempotency_key, "uncertain_side_effect.idempotency_key", { max: 256 });
  requireString(input.command_fingerprint, "uncertain_side_effect.command_fingerprint", { max: 128 });
  optionalString(input.binding_id, "uncertain_side_effect.binding_id", { max: 256 });
  if (input.page_identity !== null && input.page_identity !== undefined) requireObject(input.page_identity, "uncertain_side_effect.page_identity");
  requireString(input.last_stage, "uncertain_side_effect.last_stage", { max: 64 });
  requireString(input.reason, "uncertain_side_effect.reason", { max: 256 });
  requireArray(input.evidence_refs ?? [], "uncertain_side_effect.evidence_refs", { max: 64 });
  if (input.error !== null && input.error !== undefined) requireObject(input.error, "uncertain_side_effect.error");
  requireIsoDate(input.observed_at, "uncertain_side_effect.observed_at");
  return input;
}

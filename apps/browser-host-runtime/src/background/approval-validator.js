import { assertApprovalGrant } from "../shared/contracts.js";
import { computeActionFingerprint, computePagePreconditionHash } from "../shared/fingerprints.js";
import { BhrError } from "../shared/errors.js";

export async function validateApprovalGrant({ grant, command, binding, resolved_payload, observation, now = new Date() }) {
  const value = assertApprovalGrant(grant);
  if (!value.single_use) throw new BhrError("APPROVAL_SINGLE_USE_REQUIRED", "High-risk browser approval must be single-use.");
  if (value.consumed_at) throw new BhrError("APPROVAL_ALREADY_CONSUMED", "Approval grant has already been consumed.");
  if (new Date(value.expires_at) <= now) throw new BhrError("APPROVAL_EXPIRED", "Approval grant has expired.");
  if (value.approval_ref !== command.approval_ref) throw new BhrError("APPROVAL_REFERENCE_MISMATCH", "Approval reference does not match command.");
  if (value.binding_id !== binding.binding_id) throw new BhrError("APPROVAL_BINDING_MISMATCH", "Approval binding does not match current binding.");
  if (value.task_id !== command.task_id) throw new BhrError("APPROVAL_TASK_MISMATCH", "Approval task does not match command.");
  if (value.command_id !== command.command_id) throw new BhrError("APPROVAL_COMMAND_MISMATCH", "Approval command does not match.");
  if (value.allowed_action_type !== command.action.type) throw new BhrError("APPROVAL_ACTION_MISMATCH", "Approval does not allow this action type.");
  const pageHash = await computePagePreconditionHash(observation);
  if (value.page_precondition_hash !== pageHash) throw new BhrError("APPROVAL_PRECONDITION_CHANGED", "Page precondition changed after approval.");
  const actionFingerprint = await computeActionFingerprint({ command, binding_id: binding.binding_id, resolved_payload, page_precondition_hash: pageHash });
  if (value.action_fingerprint !== actionFingerprint) throw new BhrError("APPROVAL_FINGERPRINT_MISMATCH", "Approval fingerprint does not match the planned action.");
  return { grant: value, page_precondition_hash: pageHash, action_fingerprint: actionFingerprint };
}

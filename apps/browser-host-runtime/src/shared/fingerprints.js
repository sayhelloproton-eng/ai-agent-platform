import { sha256Ref } from "./crypto.js";

export function pagePreconditionProjection(observation) {
  // Approval preconditions must bind the action to the exact Browser Session
  // identity and execution readiness, but they must not bind to incidental UI
  // chrome that naturally changes while the user reviews/approves the Draft.
  //
  // In particular, interactive_elements and blocking_ui are observational
  // evidence, not stable identity. Including them made the same approved
  // Command impossible to resume after the Controller conversation rendered
  // the Approval Action/result. Safety-relevant blocking UI is checked
  // explicitly by validateApprovalGrant before the side-effect boundary.
  return {
    binding_id: observation.binding_id,
    provider: observation.provider,
    gpt_ref: observation.gpt_ref ?? null,
    conversation_ref: observation.conversation_ref ?? null,
    page_fingerprint: observation.page_fingerprint,
    page_state: observation.page_state,
    generation_state: observation.generation_state
  };
}

export async function computePagePreconditionHash(observation) {
  return sha256Ref(pagePreconditionProjection(observation));
}

export async function computeActionFingerprint({ command, binding_id, resolved_payload, page_precondition_hash }) {
  return sha256Ref({
    command_id: command.command_id,
    dispatch_ref: command.dispatch_ref,
    task_id: command.task_id,
    binding_id,
    action_type: command.action.type,
    resolved_payload,
    page_precondition_hash
  });
}

import { sha256Ref } from "./crypto.js";

export function pagePreconditionProjection(observation) {
  return {
    binding_id: observation.binding_id,
    provider: observation.provider,
    gpt_ref: observation.gpt_ref ?? null,
    conversation_ref: observation.conversation_ref ?? null,
    page_fingerprint: observation.page_fingerprint,
    page_state: observation.page_state,
    generation_state: observation.generation_state,
    blocking_ui: observation.blocking_ui,
    interactive_elements: (observation.interactive_elements ?? [])
      .map((item) => ({
        role: item.role,
        accessible_name: item.accessible_name,
        enabled: item.enabled
      }))
      .sort((a, b) => `${a.role}:${a.accessible_name}`.localeCompare(`${b.role}:${b.accessible_name}`))
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

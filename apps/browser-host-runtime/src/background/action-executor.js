import { ACTION_TYPES } from "../shared/constants.js";
import { BhrError } from "../shared/errors.js";
import { sendTabMessage } from "./observation-coordinator.js";

function deliveryId(command) { return `${command.command_id}:delivery`; }

export class BrowserActionExecutor {
  constructor({ roleSessionManager = null } = {}) {
    this.roleSessionManager = roleSessionManager;
  }

  async execute({ binding, command, resolved_payload }) {
    if (command.action.type === ACTION_TYPES.OPEN_OR_RESUME_SESSION) {
      if (!this.roleSessionManager) throw new BhrError("ROLE_SESSION_MANAGER_UNAVAILABLE", "Role Session Manager is not configured.");
      return this.roleSessionManager.openOrResume({ command, resolved_payload });
    }
    if (!binding) throw new BhrError("BINDING_NOT_READY", "A ready Browser Session Binding is required for this action.");

    const isMessageDelivery = [ACTION_TYPES.SUBMIT_MESSAGE, ACTION_TYPES.CONTINUE_ROLE_SESSION].includes(command.action.type);
    const actionType = command.action.type === ACTION_TYPES.CONTINUE_ROLE_SESSION ? ACTION_TYPES.SUBMIT_MESSAGE : command.action.type;
    const payload = {
      ...resolved_payload,
      ...(isMessageDelivery ? { wait_for_response: false } : {}),
      expected_identity: {
        gpt_ref: binding.gpt_ref,
        conversation_ref: binding.conversation_ref ?? null
      }
    };
    const response = await sendTabMessage(binding.chrome_tab_id, {
      type: "BHR_EXECUTE_ACTION",
      command_id: command.command_id,
      action_type: actionType,
      payload
    });
    if (!response?.ok) throw new BhrError(response?.error?.code ?? "PAGE_ACTION_FAILED", response?.error?.message ?? "Page action failed.", response?.error?.details);
    const data = response.data;
    if (!isMessageDelivery) return data;
    return {
      status: data?.status ?? "ACTION_SUCCEEDED",
      binding,
      response_pending: true,
      delivery: {
        delivery_id: deliveryId(command),
        submitted_at: data?.details?.submitted_at ?? new Date().toISOString(),
        response_baseline: data?.details?.response_baseline ?? null,
        details: data?.details ?? {}
      },
      details: data?.details ?? {}
    };
  }

  async waitForResponse({ binding, command, delivery, resolved_payload = {} }) {
    if (!binding) throw new BhrError("BINDING_NOT_READY", "A ready Browser Session Binding is required while waiting for a response.");
    const response = await sendTabMessage(binding.chrome_tab_id, {
      type: "BHR_EXECUTE_ACTION",
      command_id: command.command_id,
      action_type: ACTION_TYPES.WAIT_FOR_RESPONSE,
      payload: {
        response_baseline: delivery?.response_baseline ?? null,
        timeout_ms: resolved_payload.timeout_ms,
        start_timeout_ms: resolved_payload.start_timeout_ms,
        stable_ms: resolved_payload.stable_ms,
        poll_ms: resolved_payload.poll_ms,
        expected_identity: {
          gpt_ref: binding.gpt_ref,
          conversation_ref: binding.conversation_ref ?? null
        }
      }
    });
    if (!response?.ok) throw new BhrError(response?.error?.code ?? "RESPONSE_OBSERVATION_FAILED", response?.error?.message ?? "Response observation failed.", response?.error?.details);
    return response.data;
  }
}

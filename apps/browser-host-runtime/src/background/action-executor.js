import { ACTION_TYPES } from "../shared/constants.js";
import { BhrError } from "../shared/errors.js";
import { sendTabMessage } from "./observation-coordinator.js";

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
    const response = await sendTabMessage(binding.chrome_tab_id, {
      type: "BHR_EXECUTE_ACTION",
      command_id: command.command_id,
      action_type: command.action.type,
      payload: {
        ...resolved_payload,
        expected_identity: {
          gpt_ref: binding.gpt_ref,
          conversation_ref: binding.conversation_ref ?? null
        }
      }
    });
    if (!response?.ok) throw new BhrError(response?.error?.code ?? "PAGE_ACTION_FAILED", response?.error?.message ?? "Page action failed.");
    return response.data;
  }
}

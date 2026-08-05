import { ACTION_TYPES } from "../shared/constants.js";
import { BhrError } from "../shared/errors.js";
import { sendTabMessage } from "./observation-coordinator.js";

export class BrowserActionExecutor {
  async execute({ binding, command, resolved_payload }) {
    if (command.action.type === ACTION_TYPES.OPEN_OR_RESUME_SESSION) {
      const tab = await chrome.tabs.get(binding.chrome_tab_id);
      await chrome.tabs.update(tab.id, { url: resolved_payload.url, active: true });
      return { status: "ACTION_SUCCEEDED", details: { navigation_started: true } };
    }
    const response = await sendTabMessage(binding.chrome_tab_id, {
      type: "BHR_EXECUTE_ACTION",
      command_id: command.command_id,
      action_type: command.action.type,
      payload: resolved_payload
    });
    if (!response?.ok) throw new BhrError(response?.error?.code ?? "PAGE_ACTION_FAILED", response?.error?.message ?? "Page action failed.");
    return response.data;
  }
}

import { ACTION_TYPES, HOST_RESULT_STATUS, JOURNAL_STATE } from "../shared/constants.js";
import { assertHostCommand, buildHostResult } from "../shared/contracts.js";
import { requiresApproval, validateResolvedPayload } from "../shared/action-policy.js";
import { BhrError, asSafeError } from "../shared/errors.js";
import { validateApprovalGrant } from "./approval-validator.js";

export class RuntimeCoordinator {
  constructor({ host_id, dispatchClient, approvalClient, bindingRegistry, journal, observationCoordinator, actionExecutor, modelProvider, evidenceStore, configProvider }) {
    Object.assign(this, { host_id, dispatchClient, approvalClient, bindingRegistry, journal, observationCoordinator, actionExecutor, modelProvider, evidenceStore, configProvider });
  }

  async processOne() {
    const config = await this.configProvider();
    if (config.paused || config.emergency_stopped) return { processed: false, reason: config.emergency_stopped ? "EMERGENCY_STOPPED" : "PAUSED" };
    const pending = await this.dispatchClient.listPending(this.host_id);
    if (!Array.isArray(pending) || pending.length === 0) return { processed: false, reason: "NO_DISPATCH" };
    const dispatch = pending[0];
    const claim = await this.dispatchClient.claim(dispatch.dispatch_ref, this.host_id);
    const command = assertHostCommand(await this.dispatchClient.get(dispatch.dispatch_ref, claim.claim_token));
    const started = await this.journal.begin(command);
    if (started.duplicate) {
      if (started.entry.state === JOURNAL_STATE.REPORTED) return { processed: false, reason: "ALREADY_REPORTED", command_id: command.command_id };
      if (started.entry.state === JOURNAL_STATE.SIDE_EFFECT_STARTED || started.entry.state === JOURNAL_STATE.UNCERTAIN) {
        const result = buildHostResult({ command, status: HOST_RESULT_STATUS.UNCERTAIN, binding_id: started.entry.binding_id ?? "unknown", error: { code: "DUPLICATE_AFTER_SIDE_EFFECT_START", message: "Duplicate command arrived after a side effect may have started." } });
        await this.dispatchClient.report(command.dispatch_ref, claim.claim_token, result);
        await this.journal.mark(command.command_id, JOURNAL_STATE.UNCERTAIN, result.error);
        return { processed: true, result };
      }
    }
    await this.journal.mark(command.command_id, JOURNAL_STATE.CLAIMED, { claim_token: claim.claim_token });
    let binding = null;
    let pre = null;
    try {
      if (new Date(command.expires_at) <= new Date()) {
        const result = buildHostResult({ command, status: HOST_RESULT_STATUS.EXPIRED, binding_id: "unbound" });
        await this.dispatchClient.report(command.dispatch_ref, claim.claim_token, result);
        await this.journal.mark(command.command_id, JOURNAL_STATE.FAILED, { code: "COMMAND_EXPIRED" });
        return { processed: true, result };
      }
      binding = await this.bindingRegistry.findForTarget(command.target);
      if (!binding) throw new BhrError("BINDING_NOT_READY", "No ready Browser Session Binding matches the Host Command target.");
      await this.journal.mark(command.command_id, JOURNAL_STATE.PRECHECKED, { binding_id: binding.binding_id });
      const resolvedPayload = validateResolvedPayload(command.action.type, command.action.payload_ref ? await this.dispatchClient.resolvePayload(command.action.payload_ref) : {});
      pre = await this.observationCoordinator.observe(binding, { includeScreenshot: true });

      if (requiresApproval(command.action.type)) {
        if (!command.approval_ref) throw new BhrError("APPROVAL_REQUIRED", "High-risk browser action requires approval_ref.");
        const grant = await this.approvalClient.getGrant(command.approval_ref);
        if (!grant) throw new BhrError("APPROVAL_NOT_FOUND", "Approval grant could not be resolved.");
        const validated = await validateApprovalGrant({ grant, command, binding, resolved_payload: resolvedPayload, observation: pre.observation });
        await this.journal.mark(command.command_id, JOURNAL_STATE.SIDE_EFFECT_STARTED, {
          binding_id: binding.binding_id,
          action_fingerprint: validated.action_fingerprint,
          page_precondition_hash: validated.page_precondition_hash
        });
        await this.approvalClient.consume(grant.approval_ref, grant.grant_id, command.command_id);
      }

      const execution = await this.actionExecutor.execute({ binding, command, resolved_payload: resolvedPayload });
      if (requiresApproval(command.action.type)) await this.journal.mark(command.command_id, JOURNAL_STATE.SIDE_EFFECT_CONFIRMED, execution);
      const post = await this.observationCoordinator.observe(binding, { includeScreenshot: true });
      const evidence = { page: post.local };
      if (this.evidenceStore?.get) {
        if (post.observation.screenshot_ref) evidence.screenshot = await this.evidenceStore.get(post.observation.screenshot_ref);
        if (post.observation.visible_text_ref) evidence.visible_text = await this.evidenceStore.get(post.observation.visible_text_ref);
        if (post.observation.dom_summary_ref) evidence.dom = await this.evidenceStore.get(post.observation.dom_summary_ref);
      }
      const assessment = await this.modelProvider.analyze({ observation: post.observation, evidence });
      const uncertain = execution.status === "UNCERTAIN";
      const status = uncertain ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.ACTION_SUCCEEDED;
      const result = buildHostResult({
        command,
        status,
        binding_id: binding.binding_id,
        pre_observation_ref: pre.observation.observation_id,
        post_observation_ref: post.observation.observation_id,
        details: { execution, assessment }
      });
      await this.dispatchClient.report(command.dispatch_ref, claim.claim_token, result);
      await this.journal.mark(command.command_id, uncertain ? JOURNAL_STATE.UNCERTAIN : JOURNAL_STATE.REPORTED, { result_id: result.result_id });
      return { processed: true, result };
    } catch (error) {
      const safe = asSafeError(error);
      const uncertainCodes = new Set(["APPROVAL_PRECONDITION_CHANGED", "CONTENT_SCRIPT_UNAVAILABLE", "PAGE_ACTION_UNCERTAIN"]);
      const status = uncertainCodes.has(safe.code) ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.BLOCKED;
      const result = buildHostResult({
        command,
        status,
        binding_id: binding?.binding_id ?? "unbound",
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        error: safe
      });
      await this.dispatchClient.report(command.dispatch_ref, claim.claim_token, result);
      await this.journal.mark(command.command_id, status === HOST_RESULT_STATUS.UNCERTAIN ? JOURNAL_STATE.UNCERTAIN : JOURNAL_STATE.FAILED, safe);
      return { processed: true, result };
    }
  }
}

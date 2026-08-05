import { ACTION_TYPES, HOST_RESULT_STATUS, JOURNAL_STATE } from "../shared/constants.js";
import { assertHostCommand, buildHostResult } from "../shared/contracts.js";
import { requiresApproval, validateResolvedPayload } from "../shared/action-policy.js";
import { BhrError, asSafeError } from "../shared/errors.js";
import { validateApprovalGrant } from "./approval-validator.js";

const executionStartedStates = new Set([
  JOURNAL_STATE.EXECUTING,
  JOURNAL_STATE.SIDE_EFFECT_STARTED,
  JOURNAL_STATE.UNCERTAIN
]);

export class RuntimeCoordinator {
  constructor({ host_id, dispatchClient, approvalClient, bindingRegistry, journal, observationCoordinator, actionExecutor, modelProvider, evidenceStore, configProvider }) {
    Object.assign(this, { host_id, dispatchClient, approvalClient, bindingRegistry, journal, observationCoordinator, actionExecutor, modelProvider, evidenceStore, configProvider });
  }

  async persistAndReport({ command, claim_token, result, binding_id = null, execution = null }) {
    await this.journal.markExecuted(command.command_id, { result, binding_id, execution });
    try {
      await this.dispatchClient.report(command.dispatch_ref, claim_token, result);
      await this.journal.mark(command.command_id, JOURNAL_STATE.REPORTED, { result_id: result.result_id, result });
      return { reported: true };
    } catch (error) {
      return { reported: false, error: asSafeError(error) };
    }
  }

  async resumeExecutedReport(command, claim_token, entry) {
    const report = await this.persistAndReport({
      command,
      claim_token,
      result: entry.result,
      binding_id: entry.binding_id ?? entry.result?.binding_id ?? null,
      execution: entry.details?.execution ?? null
    });
    return { processed: true, recovered_report_only: true, result: entry.result, report };
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
      if (started.entry.state === JOURNAL_STATE.EXECUTED && started.entry.result) {
        return this.resumeExecutedReport(command, claim.claim_token, started.entry);
      }
      if (executionStartedStates.has(started.entry.state)) {
        const result = started.entry.result ?? buildHostResult({
          command,
          status: HOST_RESULT_STATUS.UNCERTAIN,
          binding_id: started.entry.binding_id ?? "unknown",
          error: { code: "DUPLICATE_AFTER_EXECUTION_START", message: "The command was seen after execution may have started; it will not be executed again." }
        });
        const report = await this.persistAndReport({ command, claim_token: claim.claim_token, result, binding_id: result.binding_id });
        return { processed: true, result, report };
      }
    }

    await this.journal.mark(command.command_id, JOURNAL_STATE.CLAIMED, { claim_token: claim.claim_token });
    let binding = null;
    let pre = null;
    let execution = null;
    let actionStarted = false;

    try {
      if (new Date(command.expires_at) <= new Date()) {
        const result = buildHostResult({ command, status: HOST_RESULT_STATUS.EXPIRED, binding_id: "unbound" });
        const report = await this.persistAndReport({ command, claim_token: claim.claim_token, result });
        return { processed: true, result, report };
      }

      const resolvedPayload = validateResolvedPayload(
        command.action.type,
        command.action.payload_ref ? await this.dispatchClient.resolvePayload(command.action.payload_ref) : {}
      );

      if (command.action.type !== ACTION_TYPES.OPEN_OR_RESUME_SESSION) {
        binding = await this.bindingRegistry.findForTarget(command.target);
        if (!binding) throw new BhrError("BINDING_NOT_READY", "No ready Browser Session Binding matches the Host Command target.");
        pre = await this.observationCoordinator.observe(binding, { includeScreenshot: true });
        binding = await this.bindingRegistry.validateObservation(binding, pre.observation, command.target);
      } else {
        binding = await this.bindingRegistry.findForTarget(command.target);
        if (binding) {
          pre = await this.observationCoordinator.observe(binding, { includeScreenshot: true });
          binding = await this.bindingRegistry.validateObservation(binding, pre.observation, command.target);
        }
      }

      const approvalRequired = requiresApproval(command, { mode: config.approval_policy_mode });
      if (approvalRequired) {
        if (!command.approval_ref) throw new BhrError("APPROVAL_REQUIRED", "This browser action requires approval_ref under the active approval policy.");
        if (!binding || !pre) throw new BhrError("APPROVAL_BINDING_UNAVAILABLE", "Strict approval requires a confirmed Binding and page precondition. Use an existing Binding or wait for the platform Wake policy decision.");
        const grant = await this.approvalClient.getGrant(command.approval_ref);
        if (!grant) throw new BhrError("APPROVAL_NOT_FOUND", "Approval grant could not be resolved.");
        const validated = await validateApprovalGrant({ grant, command, binding, resolved_payload: resolvedPayload, observation: pre.observation });
        await this.journal.mark(command.command_id, JOURNAL_STATE.PREPARED, {
          binding_id: binding.binding_id,
          action_fingerprint: validated.action_fingerprint,
          page_precondition_hash: validated.page_precondition_hash,
          approval_required: true
        });
        await this.journal.mark(command.command_id, JOURNAL_STATE.EXECUTING, { binding_id: binding.binding_id });
        actionStarted = true;
        await this.approvalClient.consume(grant.approval_ref, grant.grant_id, command.command_id);
      } else {
        await this.journal.mark(command.command_id, JOURNAL_STATE.PREPARED, {
          binding_id: binding?.binding_id ?? null,
          approval_required: false,
          approval_policy_mode: config.approval_policy_mode
        });
        await this.journal.mark(command.command_id, JOURNAL_STATE.EXECUTING, { binding_id: binding?.binding_id ?? null });
        actionStarted = true;
      }

      execution = await this.actionExecutor.execute({ binding, command, resolved_payload: resolvedPayload });
      binding = execution.binding ?? binding;
      if (!binding) throw new BhrError("BINDING_NOT_READY", "The browser action completed without a confirmed Binding.");

      const post = await this.observationCoordinator.observe(binding, { includeScreenshot: true });
      binding = await this.bindingRegistry.validateObservation(binding, post.observation, command.target);
      const evidence = { page: post.local };
      if (this.evidenceStore?.get) {
        if (post.observation.screenshot_ref) evidence.screenshot = await this.evidenceStore.get(post.observation.screenshot_ref);
        if (post.observation.visible_text_ref) evidence.visible_text = await this.evidenceStore.get(post.observation.visible_text_ref);
        if (post.observation.dom_summary_ref) evidence.dom = await this.evidenceStore.get(post.observation.dom_summary_ref);
      }
      const assessment = await this.modelProvider.analyze({ observation: post.observation, evidence });
      const uncertain = execution.status === "UNCERTAIN";
      const result = buildHostResult({
        command,
        status: uncertain ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.ACTION_SUCCEEDED,
        binding_id: binding.binding_id,
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        post_observation_ref: post.observation.observation_id,
        details: { execution: { ...execution, binding: undefined }, assessment }
      });
      const report = await this.persistAndReport({ command, claim_token: claim.claim_token, result, binding_id: binding.binding_id, execution });
      return { processed: true, result, report };
    } catch (error) {
      const safe = asSafeError(error);
      const uncertainCodes = new Set([
        "APPROVAL_PRECONDITION_CHANGED",
        "CONTENT_SCRIPT_UNAVAILABLE",
        "PAGE_ACTION_UNCERTAIN",
        "RESPONSE_START_TIMEOUT",
        "RESPONSE_COMPLETION_TIMEOUT"
      ]);
      const status = actionStarted || uncertainCodes.has(safe.code) ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.BLOCKED;
      const result = buildHostResult({
        command,
        status,
        binding_id: binding?.binding_id ?? "unbound",
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        error: safe,
        details: execution ? { execution } : {}
      });
      const report = await this.persistAndReport({ command, claim_token: claim.claim_token, result, binding_id: binding?.binding_id ?? null, execution });
      return { processed: true, result, report };
    }
  }
}

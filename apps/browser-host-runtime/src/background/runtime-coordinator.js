import { ACTION_TYPES, HOST_RESULT_STATUS, JOURNAL_STATE } from "../shared/constants.js";
import { assertHostCommand, buildDeliveryFact, buildHostResult } from "../shared/contracts.js";
import { requiresApproval, validateResolvedPayload } from "../shared/action-policy.js";
import { BhrError, asSafeError } from "../shared/errors.js";
import { validateApprovalGrant } from "./approval-validator.js";

const executionStartedStates = new Set([
  JOURNAL_STATE.EXECUTING,
  JOURNAL_STATE.SIDE_EFFECT_STARTED,
  JOURNAL_STATE.UNCERTAIN
]);

function responseWaitOptions(payload = {}) {
  return {
    timeout_ms: payload.timeout_ms,
    start_timeout_ms: payload.start_timeout_ms,
    stable_ms: payload.stable_ms,
    poll_ms: payload.poll_ms
  };
}

export class RuntimeCoordinator {
  constructor({ host_id, dispatchClient, approvalClient, bindingRegistry, journal, observationCoordinator, actionExecutor, modelProvider, evidenceStore, configProvider }) {
    Object.assign(this, { host_id, dispatchClient, approvalClient, bindingRegistry, journal, observationCoordinator, actionExecutor, modelProvider, evidenceStore, configProvider });
  }

  async collectAssessment(post) {
    const evidence = { page: post.local };
    if (this.evidenceStore?.get) {
      if (post.observation.screenshot_ref) evidence.screenshot = await this.evidenceStore.get(post.observation.screenshot_ref);
      if (post.observation.visible_text_ref) evidence.visible_text = await this.evidenceStore.get(post.observation.visible_text_ref);
      if (post.observation.dom_summary_ref) evidence.dom = await this.evidenceStore.get(post.observation.dom_summary_ref);
    }
    return this.modelProvider.analyze({ observation: post.observation, evidence });
  }

  async reportHostResult({ command, report_token, result, binding_id = null, execution = null }) {
    await this.journal.markExecuted(command.command_id, { result, binding_id, execution });
    try {
      const receipt = await this.dispatchClient.hostResult(command.dispatch_ref, report_token, result);
      await this.journal.mark(command.command_id, JOURNAL_STATE.REPORTED, { result_id: result.result_id, result, host_result_receipt: receipt });
      return { reported: true, receipt };
    } catch (error) {
      return { reported: false, error: asSafeError(error) };
    }
  }

  async reportPreDeliveryFailure({ command, claim_token, result, binding_id = null, execution = null }) {
    await this.journal.markExecuted(command.command_id, { result, binding_id, execution });
    try {
      const receipt = await this.dispatchClient.fail(command.dispatch_ref, claim_token, result);
      await this.journal.mark(command.command_id, JOURNAL_STATE.REPORTED, { result_id: result.result_id, result, failure_receipt: receipt });
      return { reported: true, receipt };
    } catch (error) {
      return { reported: false, error: asSafeError(error) };
    }
  }

  async acknowledgeDelivery({ command, claim_token, binding, execution, resolvedPayload }) {
    const delivery = buildDeliveryFact({ command, binding_id: binding.binding_id, execution });
    delivery.response_wait = responseWaitOptions(resolvedPayload);
    if (execution?.delivery?.response_baseline) delivery.response_baseline = execution.delivery.response_baseline;
    await this.journal.markDeliveryConfirmed(command.command_id, { delivery, binding_id: binding.binding_id, execution });
    const delivery_ack = await this.dispatchClient.deliveryAck(command.dispatch_ref, claim_token, delivery);
    await this.journal.markDeliveryAcked(command.command_id, {
      delivery_ack,
      report_token: delivery_ack.report_token,
      binding_id: binding.binding_id
    });
    return { delivery, delivery_ack, report_token: delivery_ack.report_token };
  }

  async completeObservedResult({ command, binding, delivery, report_token, pre_observation_ref = null, execution = null }) {
    let responseLifecycle = null;
    if (delivery.response_expected) {
      responseLifecycle = await this.actionExecutor.waitForResponse({
        binding,
        command,
        delivery: {
          response_baseline: delivery.response_baseline,
          ...(delivery.details ?? {})
        },
        resolved_payload: delivery.response_wait ?? {}
      });
    }
    const post = await this.observationCoordinator.observe(binding, { includeScreenshot: true });
    binding = await this.bindingRegistry.validateObservation(binding, post.observation, command.target);
    const assessment = await this.collectAssessment(post);
    const uncertain = execution?.status === "UNCERTAIN" || responseLifecycle?.status === "UNCERTAIN";
    const result = buildHostResult({
      command,
      status: uncertain ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.ACTION_SUCCEEDED,
      binding_id: binding.binding_id,
      pre_observation_ref,
      post_observation_ref: post.observation.observation_id,
      details: {
        delivery: {
          delivery_id: delivery.delivery_id,
          submitted_at: delivery.submitted_at,
          response_expected: delivery.response_expected
        },
        execution: execution ? { ...execution, binding: undefined } : null,
        response_lifecycle: responseLifecycle,
        assessment
      }
    });
    const report = await this.reportHostResult({ command, report_token, result, binding_id: binding.binding_id, execution });
    return { processed: true, result, report, delivery_acknowledged: true };
  }

  async resumeRecoverable() {
    const entries = await this.journal.recoverableEntries();
    if (entries.length === 0) return null;
    const entry = entries[0];
    const command = assertHostCommand(entry.command);

    if (entry.state === JOURNAL_STATE.EXECUTED && entry.result) {
      if (!entry.report_token) {
        return { processed: false, reason: "RECOVERY_REPORT_TOKEN_MISSING", command_id: command.command_id };
      }
      const report = await this.reportHostResult({
        command,
        report_token: entry.report_token,
        result: entry.result,
        binding_id: entry.binding_id ?? entry.result.binding_id,
        execution: entry.details?.execution ?? null
      });
      return { processed: true, recovered_report_only: true, result: entry.result, report };
    }

    let delivery = entry.delivery;
    let reportToken = entry.report_token;
    if (entry.state === JOURNAL_STATE.DELIVERY_CONFIRMED) {
      if (!entry.claim_token || !delivery) return { processed: false, reason: "RECOVERY_DELIVERY_STATE_INCOMPLETE", command_id: command.command_id };
      let deliveryAck;
      try {
        deliveryAck = await this.dispatchClient.deliveryAck(command.dispatch_ref, entry.claim_token, delivery);
      } catch (error) {
        return {
          processed: true,
          recovered_delivery_ack_only: true,
          delivery_ack_pending: true,
          command_id: command.command_id,
          error: asSafeError(error)
        };
      }
      reportToken = deliveryAck.report_token;
      await this.journal.markDeliveryAcked(command.command_id, {
        delivery_ack: deliveryAck,
        report_token: reportToken,
        binding_id: entry.binding_id
      });
    }

    if (!delivery || !reportToken) return { processed: false, reason: "RECOVERY_OBSERVATION_STATE_INCOMPLETE", command_id: command.command_id };
    const binding = await this.bindingRegistry.get(entry.binding_id);
    if (!binding) {
      const result = buildHostResult({
        command,
        status: HOST_RESULT_STATUS.UNCERTAIN,
        binding_id: entry.binding_id ?? "unbound",
        error: { code: "RECOVERY_BINDING_NOT_FOUND", message: "The delivered command cannot resume response observation because its Binding is unavailable." }
      });
      const report = await this.reportHostResult({ command, report_token: reportToken, result, binding_id: entry.binding_id });
      return { processed: true, recovered_observation: true, result, report };
    }
    return {
      ...(await this.completeObservedResult({
        command,
        binding,
        delivery,
        report_token: reportToken,
        pre_observation_ref: entry.details?.pre_observation_ref ?? null,
        execution: entry.details?.execution ?? null
      })),
      recovered_observation: true
    };
  }

  async processOne() {
    const config = await this.configProvider();
    const recoverable = await this.resumeRecoverable();
    if (recoverable) return recoverable;
    if (config.paused || config.emergency_stopped) return { processed: false, reason: config.emergency_stopped ? "EMERGENCY_STOPPED" : "PAUSED" };

    const pending = await this.dispatchClient.listPending(this.host_id);
    if (pending.length === 0) return { processed: false, reason: "NO_DISPATCH" };
    const dispatch = pending[0];
    const claim = await this.dispatchClient.claim(dispatch.dispatch_ref, this.host_id);
    const command = await this.dispatchClient.get(dispatch.dispatch_ref, claim.claim_token);
    const started = await this.journal.begin(command);

    if (started.duplicate) {
      if (started.entry.state === JOURNAL_STATE.REPORTED) return { processed: false, reason: "ALREADY_REPORTED", command_id: command.command_id };
      if (executionStartedStates.has(started.entry.state)) {
        const result = started.entry.result ?? buildHostResult({
          command,
          status: HOST_RESULT_STATUS.UNCERTAIN,
          binding_id: started.entry.binding_id ?? "unknown",
          error: { code: "DUPLICATE_AFTER_EXECUTION_START", message: "The command was seen after execution may have started; it will not be executed again." }
        });
        const report = await this.reportPreDeliveryFailure({ command, claim_token: claim.claim_token, result, binding_id: result.binding_id });
        return { processed: true, result, report };
      }
    }

    await this.journal.mark(command.command_id, JOURNAL_STATE.CLAIMED, { claim_token: claim.claim_token });
    let binding = null;
    let pre = null;
    let execution = null;
    let actionStarted = false;
    let deliveryState = null;

    try {
      if (new Date(command.expires_at) <= new Date()) {
        const result = buildHostResult({ command, status: HOST_RESULT_STATUS.EXPIRED, binding_id: "unbound" });
        const report = await this.reportPreDeliveryFailure({ command, claim_token: claim.claim_token, result });
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

      const approvalRequired = requiresApproval(command, {
        mode: config.approval_policy_mode,
        resolvedPayload
      });
      if (approvalRequired) {
        if (!command.approval_ref) throw new BhrError("APPROVAL_REQUIRED", "This browser action requires approval_ref under the active approval policy.");
        if (!binding || !pre) throw new BhrError("APPROVAL_BINDING_UNAVAILABLE", "Approval requires a confirmed Binding and page precondition.");
        const grant = await this.approvalClient.getGrant(command.approval_ref);
        if (!grant) throw new BhrError("APPROVAL_NOT_FOUND", "Approval grant could not be resolved.");
        const validated = await validateApprovalGrant({ grant, command, binding, resolved_payload: resolvedPayload, observation: pre.observation });
        await this.journal.mark(command.command_id, JOURNAL_STATE.PREPARED, {
          binding_id: binding.binding_id,
          pre_observation_ref: pre.observation.observation_id,
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
          pre_observation_ref: pre?.observation?.observation_id ?? null,
          approval_required: false,
          approval_policy_mode: config.approval_policy_mode
        });
        await this.journal.mark(command.command_id, JOURNAL_STATE.EXECUTING, { binding_id: binding?.binding_id ?? null });
        actionStarted = true;
      }

      execution = await this.actionExecutor.execute({ binding, command, resolved_payload: resolvedPayload });
      binding = execution.binding ?? binding;
      if (!binding) throw new BhrError("BINDING_NOT_READY", "The browser action completed without a confirmed Binding.");

      try {
        deliveryState = await this.acknowledgeDelivery({ command, claim_token: claim.claim_token, binding, execution, resolvedPayload });
      } catch (error) {
        // The browser side effect is already confirmed in the Journal. Do not fail the
        // dispatch and do not submit again. A later poll retries only the delivery Ack.
        return {
          processed: true,
          delivery_ack_pending: true,
          command_id: command.command_id,
          error: asSafeError(error)
        };
      }
      return this.completeObservedResult({
        command,
        binding,
        delivery: deliveryState.delivery,
        report_token: deliveryState.report_token,
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        execution
      });
    } catch (error) {
      const safe = asSafeError(error);
      const uncertainCodes = new Set([
        "APPROVAL_PRECONDITION_CHANGED",
        "CONTENT_SCRIPT_UNAVAILABLE",
        "PAGE_ACTION_UNCERTAIN",
        "RESPONSE_START_TIMEOUT",
        "RESPONSE_COMPLETION_TIMEOUT",
        "RESPONSE_INTERRUPTED_BY_USER"
      ]);
      const status = actionStarted || uncertainCodes.has(safe.code) ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.BLOCKED;
      const result = buildHostResult({
        command,
        status,
        binding_id: binding?.binding_id ?? "unbound",
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        error: safe,
        details: execution ? { execution: { ...execution, binding: undefined } } : {}
      });
      const report = deliveryState?.report_token
        ? await this.reportHostResult({ command, report_token: deliveryState.report_token, result, binding_id: binding?.binding_id ?? null, execution })
        : await this.reportPreDeliveryFailure({ command, claim_token: claim.claim_token, result, binding_id: binding?.binding_id ?? null, execution });
      return { processed: true, result, report };
    }
  }
}

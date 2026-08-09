import { ACTION_TYPES, HOST_RESULT_STATUS, JOURNAL_STATE } from "../shared/constants.js";
import { assertHostCommand, buildDeliveryFact, buildHostResult, buildUncertainSideEffect } from "../shared/contracts.js";
import { classifyAction, requiresApproval, validateResolvedPayload } from "../shared/action-policy.js";
import { BhrError, asSafeError } from "../shared/errors.js";
import { validateApprovalGrant } from "./approval-validator.js";
import { computeActionFingerprint, computePagePreconditionHash } from "../shared/fingerprints.js";

const executionStartedStates = new Set([
  JOURNAL_STATE.EXECUTING,
  JOURNAL_STATE.SIDE_EFFECT_STARTED,
  JOURNAL_STATE.UNCERTAIN
]);

const structuralRecoveryErrors = new Set([
  "RECOVERY_RECORD_INVALID",
  "RECOVERY_REPORT_CREDENTIAL_MISSING",
  "JOURNAL_ENTRY_NOT_FOUND",
  "CONTRACT_VERSION_UNSUPPORTED"
]);

function responseWaitOptions(payload = {}) {
  return {
    timeout_ms: payload.timeout_ms,
    start_timeout_ms: payload.start_timeout_ms,
    stable_ms: payload.stable_ms,
    poll_ms: payload.poll_ms
  };
}


async function buildApprovalDraft({ command, binding, resolvedPayload, observation, preparedAt = null }) {
  const pagePreconditionHash = await computePagePreconditionHash(observation);
  const actionFingerprint = await computeActionFingerprint({
    command,
    binding_id: binding.binding_id,
    resolved_payload: resolvedPayload,
    page_precondition_hash: pagePreconditionHash
  });
  return {
    approval_draft_version: "1.0.0",
    approval_ref: command.approval_ref,
    draft_id: `${command.command_id}:approval-draft`,
    task_id: command.task_id,
    dispatch_ref: command.dispatch_ref,
    command_id: command.command_id,
    binding_id: binding.binding_id,
    allowed_action_type: command.action.type,
    action_fingerprint: actionFingerprint,
    page_precondition_hash: pagePreconditionHash,
    target_role_ref: command.target.role_ref,
    target_profile_ref: command.target.gpt_ref,
    conversation_ref: command.target.conversation_ref ?? null,
    payload_preview: structuredClone(resolvedPayload),
    prepared_at: preparedAt ?? new Date().toISOString(),
    expires_at: command.expires_at
  };
}

function pageIdentity(observation) {
  if (!observation) return null;
  return {
    provider: observation.provider,
    gpt_ref: observation.gpt_ref,
    conversation_ref: observation.conversation_ref ?? null,
    page_url: observation.page_url,
    page_fingerprint: observation.page_fingerprint,
    observed_at: observation.observed_at
  };
}

function approvalResumeShouldDefer(observation) {
  if (!observation) return false;
  if (observation.generation_state === "RUNNING") return true;
  if (observation.page_state === "LOADING" || observation.page_state === "ACTION_CONFIRMATION_PENDING") return true;
  return (observation.blocking_ui ?? []).some((item) => item?.type === "ACTION_CONFIRMATION_PENDING");
}

function userControlShouldDefer(localObservation) {
  return Boolean(localObservation?.user_active || localObservation?.user_reviewing);
}

function isDefinitelyPreSideEffectExecutorError(error) {
  // The content script checks USER_CONTROL_ACTIVE before it mutates the composer.
  // If a trusted pointer/key/scroll races with the background precheck, this error
  // therefore proves that SUBMIT_MESSAGE did not cross the browser side-effect
  // boundary and must not be escalated to UNCERTAIN.
  return error?.code === "USER_CONTROL_ACTIVE";
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

  async _sendPendingReport(entry) {
    const pending = entry.pending_report;
    if (!pending?.kind || !pending.operation || !pending.payload) {
      throw new BhrError("RECOVERY_RECORD_INVALID", "Recoverable Journal entry is missing a typed pending report.");
    }
    const command = assertHostCommand(entry.command);
    let receipt;
    if (pending.kind === "FAIL") {
      if (!pending.credential) throw new BhrError("RECOVERY_REPORT_CREDENTIAL_MISSING", "Pending dispatch failure has no claim credential.");
      receipt = await this.dispatchClient.fail(command.dispatch_ref, pending.credential, pending.payload.result);
    } else if (pending.kind === "HOST_RESULT") {
      if (!pending.credential) throw new BhrError("RECOVERY_REPORT_CREDENTIAL_MISSING", "Pending Host Result has no report credential.");
      receipt = await this.dispatchClient.hostResult(command.dispatch_ref, pending.credential, pending.payload.result);
    } else if (pending.kind === "UNCERTAIN") {
      if (!pending.credential) throw new BhrError("RECOVERY_REPORT_CREDENTIAL_MISSING", "Pending Uncertain report has no claim/report credential.");
      const credential = pending.credential_type === "REPORT_TOKEN"
        ? { report_token: pending.credential }
        : { claim_token: pending.credential };
      receipt = await this.dispatchClient.uncertain(command.dispatch_ref, credential, pending.payload.uncertain);
    } else {
      throw new BhrError("RECOVERY_RECORD_INVALID", `Unsupported pending report kind: ${pending.kind}`);
    }
    await this.journal.markReported(command.command_id, {
      result_id: entry.result?.result_id ?? null,
      result: entry.result ?? null,
      report_kind: pending.kind,
      report_receipt: receipt
    });
    await this.journal.clearRecoveryFailure(command.command_id);
    return receipt;
  }

  async reportHostResult({ command, report_token, result, binding_id = null, execution = null }) {
    await this.journal.markHostResultPending(command.command_id, { result, report_token, binding_id, execution });
    try {
      const entry = await this.journal.get(command.command_id);
      const receipt = await this._sendPendingReport(entry);
      return { reported: true, receipt };
    } catch (error) {
      await this.journal.recordRecoveryFailure(command.command_id, asSafeError(error), { retryable: true });
      return { reported: false, error: asSafeError(error) };
    }
  }

  async reportPreDeliveryFailure({ command, claim_token, result, binding_id = null, execution = null }) {
    await this.journal.markPreDeliveryFailurePending(command.command_id, { result, claim_token, binding_id, execution });
    try {
      const entry = await this.journal.get(command.command_id);
      const receipt = await this._sendPendingReport(entry);
      return { reported: true, receipt };
    } catch (error) {
      await this.journal.recordRecoveryFailure(command.command_id, asSafeError(error), { retryable: true });
      return { reported: false, error: asSafeError(error) };
    }
  }

  async reportUncertainSideEffect({ command, entry = null, claim_token = null, report_token = null, result = null, binding_id = null, execution = null, reason, error = null }) {
    const journalEntry = entry ?? await this.journal.get(command.command_id);
    if (!journalEntry) throw new BhrError("JOURNAL_ENTRY_NOT_FOUND", `No Journal entry exists for uncertain command ${command.command_id}.`);
    const details = journalEntry.details ?? {};
    const uncertain = buildUncertainSideEffect({
      command,
      command_fingerprint: journalEntry.command_fingerprint,
      binding_id: binding_id ?? journalEntry.binding_id ?? null,
      page_identity: details.page_identity ?? details.observed_identity ?? null,
      last_stage: journalEntry.state,
      reason,
      evidence_refs: [details.pre_observation_ref, details.post_observation_ref, ...(details.evidence_refs ?? [])],
      error
    });
    await this.journal.markUncertain(command.command_id, {
      uncertain,
      claim_token: claim_token ?? journalEntry.claim_token ?? null,
      report_token: report_token ?? journalEntry.report_token ?? null,
      result,
      binding_id: binding_id ?? journalEntry.binding_id ?? null,
      execution
    });
    try {
      const pending = await this.journal.get(command.command_id);
      const receipt = await this._sendPendingReport(pending);
      return { reported: true, receipt, uncertain };
    } catch (reportError) {
      const safe = asSafeError(reportError);
      await this.journal.recordRecoveryFailure(command.command_id, safe, { retryable: !structuralRecoveryErrors.has(safe.code) });
      return { reported: false, error: safe, uncertain };
    }
  }

  async acknowledgeDelivery({ command, claim_token, binding, execution, resolvedPayload }) {
    const delivery = buildDeliveryFact({ command, binding_id: binding.binding_id, execution });
    delivery.response_wait = responseWaitOptions(resolvedPayload);
    if (execution?.delivery?.response_baseline) delivery.response_baseline = execution.delivery.response_baseline;
    await this.journal.markDeliveryAckPending(command.command_id, {
      delivery,
      binding_id: binding.binding_id,
      execution,
      claim_token
    });
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
    const allowConversationPromotion = !binding.conversation_ref &&
      !command.target.conversation_ref &&
      [ACTION_TYPES.SUBMIT_MESSAGE, ACTION_TYPES.CONTINUE_ROLE_SESSION].includes(command.action.type) &&
      Boolean(execution?.response_pending);
    binding = await this.bindingRegistry.validateObservation(
      binding,
      post.observation,
      command.target,
      { allowConversationPromotion }
    );
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

  async _resumeEntry(entry, { allowBrowserObservation = true } = {}) {
    const command = assertHostCommand(entry.command);

    if ([JOURNAL_STATE.PRE_DELIVERY_FAILURE_PENDING, JOURNAL_STATE.HOST_RESULT_PENDING, JOURNAL_STATE.UNCERTAIN].includes(entry.state)) {
      const receipt = await this._sendPendingReport(entry);
      return {
        processed: true,
        recovered_report_only: true,
        report_kind: entry.pending_report.kind,
        result: entry.result ?? null,
        report: { reported: true, receipt }
      };
    }

    let delivery = entry.delivery;
    let reportToken = entry.report_token;
    if ([JOURNAL_STATE.DELIVERY_ACK_PENDING, JOURNAL_STATE.DELIVERY_CONFIRMED].includes(entry.state)) {
      const claimToken = entry.pending_report?.credential ?? entry.claim_token;
      if (!claimToken || !delivery) throw new BhrError("RECOVERY_RECORD_INVALID", "Delivery Ack recovery requires persisted claim token and delivery fact.");
      const deliveryAck = await this.dispatchClient.deliveryAck(command.dispatch_ref, claimToken, delivery);
      reportToken = deliveryAck.report_token;
      await this.journal.markDeliveryAcked(command.command_id, {
        delivery_ack: deliveryAck,
        report_token: reportToken,
        binding_id: entry.binding_id
      });
      entry = await this.journal.get(command.command_id);
    }

    if (entry.state === JOURNAL_STATE.EXECUTED && entry.result) {
      if (!entry.report_token) throw new BhrError("RECOVERY_REPORT_CREDENTIAL_MISSING", "Legacy executed record has no report token.");
      await this.journal.markHostResultPending(command.command_id, {
        result: entry.result,
        report_token: entry.report_token,
        binding_id: entry.binding_id ?? entry.result.binding_id,
        execution: entry.details?.execution ?? null
      });
      const pending = await this.journal.get(command.command_id);
      const receipt = await this._sendPendingReport(pending);
      return { processed: true, recovered_report_only: true, result: pending.result, report: { reported: true, receipt } };
    }

    delivery = entry.delivery ?? delivery;
    reportToken = entry.report_token ?? reportToken;
    if (!delivery || !reportToken) throw new BhrError("RECOVERY_RECORD_INVALID", "Response observation recovery requires delivery and report token.");
    if (!allowBrowserObservation) {
      return {
        processed: false,
        deferred_browser_observation: true,
        command_id: command.command_id,
        state: entry.state
      };
    }
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
    try {
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
    } catch (error) {
      const safe = asSafeError(error);
      const result = buildHostResult({
        command,
        status: HOST_RESULT_STATUS.UNCERTAIN,
        binding_id: binding.binding_id,
        pre_observation_ref: entry.details?.pre_observation_ref ?? null,
        error: safe,
        details: { recovery_stage: "RESPONSE_OBSERVATION" }
      });
      const report = await this.reportHostResult({ command, report_token: reportToken, result, binding_id: binding.binding_id, execution: entry.details?.execution ?? null });
      return { processed: true, recovered_observation: true, result, report };
    }
  }

  async resumeRecoverable({ allowBrowserObservation = true } = {}) {
    const entries = await this.journal.recoverableEntries();
    if (entries.length === 0) return null;
    const failures = [];
    const deferredBrowserObservation = [];
    for (const entry of entries) {
      try {
        const result = await this._resumeEntry(entry, { allowBrowserObservation });
        if (result?.deferred_browser_observation) {
          deferredBrowserObservation.push({ command_id: entry.command_id, state: result.state });
          continue;
        }
        if (result?.report?.reported === false) {
          const current = await this.journal.get(entry.command_id);
          failures.push({
            command_id: entry.command_id,
            error: result.report.error,
            state: current?.state ?? entry.state,
            retry: current?.recovery ?? null
          });
          continue;
        }
        await this.journal.clearRecoveryFailure(entry.command_id);
        return result;
      } catch (error) {
        const safe = asSafeError(error);
        const updated = await this.journal.recordRecoveryFailure(entry.command_id, safe, {
          retryable: !structuralRecoveryErrors.has(safe.code)
        });
        failures.push({ command_id: entry.command_id, error: safe, state: updated.state, retry: updated.recovery });
        // Continue. One malformed or temporarily failing record must never block a
        // later safe report-only recovery item.
      }
    }
    return {
      processed: false,
      reason: failures.length > 0 ? "RECOVERY_DEFERRED" : "RECOVERY_BROWSER_OBSERVATION_DEFERRED",
      recovery_failures: failures,
      deferred_browser_observation: deferredBrowserObservation
    };
  }

  async processOne() {
    const config = await this.configProvider();
    const stopped = Boolean(config.paused || config.emergency_stopped);
    const recoverable = await this.resumeRecoverable({ allowBrowserObservation: !stopped });
    if (recoverable?.processed) return recoverable;
    if (stopped) {
      return {
        processed: false,
        reason: config.emergency_stopped ? "EMERGENCY_STOPPED" : "PAUSED",
        recovery: recoverable ?? null
      };
    }
    if (recoverable) return recoverable;

    const capacity = await this.journal.capacityStatus();
    if (!capacity.accepting_new_commands) {
      return { processed: false, reason: "JOURNAL_CAPACITY_EXHAUSTED", capacity };
    }

    const pending = await this.dispatchClient.listPending(this.host_id);
    if (pending.length === 0) return { processed: false, reason: "NO_DISPATCH" };
    const dispatch = pending[0];
    const claim = await this.dispatchClient.claim(dispatch.dispatch_ref, this.host_id);
    const command = await this.dispatchClient.get(dispatch.dispatch_ref, claim.claim_token);
    const started = await this.journal.begin(command, { claim_token: claim.claim_token });

    if (started.duplicate) {
      const approvalResume =
        started.duplicate_by === "COMMAND_ID" &&
        started.entry.state === JOURNAL_STATE.APPROVAL_PENDING;
      if (!approvalResume && started.duplicate_by === "IDEMPOTENCY_KEY" && started.entry.command_id !== command.command_id) {
        const result = buildHostResult({
          command,
          status: HOST_RESULT_STATUS.BLOCKED,
          binding_id: started.entry.binding_id ?? "unbound",
          error: {
            code: "LOGICAL_COMMAND_DUPLICATE_SUPPRESSED",
            message: "A previously journaled command already owns this idempotency key; the rematerialized Browser Dispatch was not executed."
          },
          details: { canonical_command_id: started.entry.command_id }
        });
        let report;
        try {
          const receipt = await this.dispatchClient.fail(command.dispatch_ref, claim.claim_token, result);
          report = { reported: true, receipt };
        } catch (error) {
          // No browser side effect occurred. If this bounded rejection report cannot
          // be delivered, the server may re-offer the dispatch after claim expiry;
          // the same idempotency guard will suppress it again.
          report = { reported: false, error: asSafeError(error) };
        }
        return {
          processed: true,
          reason: "LOGICAL_COMMAND_DUPLICATE_SUPPRESSED",
          canonical_command_id: started.entry.command_id,
          received_command_id: command.command_id,
          idempotency_key: command.idempotency_key,
          result,
          report
        };
      }
      if (!approvalResume && started.entry.state === JOURNAL_STATE.REPORTED) return { processed: false, reason: "ALREADY_REPORTED", command_id: command.command_id };
      if (!approvalResume && executionStartedStates.has(started.entry.state)) {
        const canonicalCommand = assertHostCommand(started.entry.command);
        const result = started.entry.result ?? buildHostResult({
          command: canonicalCommand,
          status: HOST_RESULT_STATUS.UNCERTAIN,
          binding_id: started.entry.binding_id ?? "unknown",
          error: { code: "DUPLICATE_AFTER_EXECUTION_START", message: "The command was seen after browser execution may have started; it will not be executed again." }
        });
        const report = await this.reportUncertainSideEffect({
          command: canonicalCommand,
          entry: started.entry,
          claim_token: claim.claim_token,
          result,
          binding_id: result.binding_id,
          reason: "DUPLICATE_AFTER_EXECUTION_START",
          error: result.error
        });
        return { processed: true, result, report };
      }
      if (!approvalResume) {
        return { processed: false, reason: "DUPLICATE_COMMAND_IN_PROGRESS", command_id: started.entry.command_id, state: started.entry.state };
      }
    }

    await this.journal.mark(command.command_id, JOURNAL_STATE.CLAIMED, { claim_token: claim.claim_token, claim_expires_at: claim.expires_at ?? null });
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
      const preparedDetails = {
        binding_id: binding?.binding_id ?? null,
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        page_identity: pageIdentity(pre?.observation),
        approval_required: approvalRequired,
        approval_policy_mode: config.approval_policy_mode
      };
      if (approvalRequired) {
        if (!command.approval_ref) throw new BhrError("APPROVAL_REQUIRED", "This browser action requires approval_ref under the active approval policy.");
        if (!binding || !pre) throw new BhrError("APPROVAL_BINDING_UNAVAILABLE", "Approval requires a confirmed Binding and page precondition.");
        const currentEntry = await this.journal.get(command.command_id);
        const priorDraft = currentEntry?.details?.approval_draft ?? null;

        // The approval UX itself runs in the bound Controller conversation. While
        // the user is reading/issuing Approval Actions, ChatGPT can legitimately be
        // generating or show its own Action confirmation surface. Those are
        // transient readiness states, not target-identity drift. Failing the WorkItem
        // here creates a race between the Host claim lease and the human approval
        // flow. Preserve the immutable Draft (if one already exists), leave any Grant
        // unconsumed, and retry the same command after the page is stable again.
        if (approvalResumeShouldDefer(pre.observation)) {
          await this.journal.mark(command.command_id, JOURNAL_STATE.APPROVAL_PENDING, {
            ...preparedDetails,
            approval_draft: priorDraft,
            action_fingerprint: priorDraft?.action_fingerprint ?? null,
            page_precondition_hash: priorDraft?.page_precondition_hash ?? null,
            claim_token: claim.claim_token,
            claim_expires_at: claim.expires_at ?? null,
            approval_wait: {
              reason: "TRANSIENT_PAGE_BUSY",
              page_state: pre.observation.page_state,
              generation_state: pre.observation.generation_state,
              blocking_types: (pre.observation.blocking_ui ?? []).map((item) => item?.type).filter(Boolean),
              observed_at: pre.observation.observed_at
            }
          });
          return {
            processed: true,
            reason: priorDraft ? "APPROVAL_PENDING_PAGE_BUSY" : "APPROVAL_PREPARATION_DEFERRED",
            approval_pending: true,
            approval_draft: priorDraft,
            command_id: command.command_id,
            dispatch_ref: command.dispatch_ref
          };
        }

        const draft = await buildApprovalDraft({
          command,
          binding,
          resolvedPayload,
          observation: pre.observation,
          preparedAt: priorDraft?.prepared_at ?? null
        });
        // On Resume, compare the freshly observed stable precondition against the
        // immutable local Draft before attempting to re-publish it. This turns a
        // real page/target drift into an explicit fail-closed precondition error,
        // while benign UI chrome changes remain resumable.
        if (priorDraft && (
          priorDraft.action_fingerprint !== draft.action_fingerprint ||
          priorDraft.page_precondition_hash !== draft.page_precondition_hash
        )) {
          throw new BhrError("APPROVAL_PRECONDITION_CHANGED", "The page or planned action changed after the Approval Draft was prepared.");
        }
        await this.approvalClient.putDraft(draft, claim.claim_token);
        let grant = null;
        if (typeof this.approvalClient.getGrantOrNull === "function") {
          grant = await this.approvalClient.getGrantOrNull(command.approval_ref);
        } else {
          grant = await this.approvalClient.getGrant(command.approval_ref);
        }
        if (!grant) {
          await this.journal.mark(command.command_id, JOURNAL_STATE.APPROVAL_PENDING, {
            ...preparedDetails,
            approval_draft: draft,
            action_fingerprint: draft.action_fingerprint,
            page_precondition_hash: draft.page_precondition_hash,
            claim_token: claim.claim_token,
            claim_expires_at: claim.expires_at ?? null
          });
          return {
            processed: true,
            reason: "APPROVAL_PENDING",
            approval_pending: true,
            approval_draft: draft,
            command_id: command.command_id,
            dispatch_ref: command.dispatch_ref
          };
        }

        // Human Approval Actions themselves create trusted pointer/keyboard activity
        // in the bound Controller tab. The content script intentionally refuses to
        // mutate the composer for ten seconds after such activity (or while the user
        // is scrolled up reviewing history). Treat that local user-control signal as
        // a temporary execution gate before consuming the one-time Grant. Otherwise
        // a perfectly valid Grant is burned and the action is reported UNCERTAIN even
        // though the content script has not touched the composer.
        if (userControlShouldDefer(pre.local)) {
          await this.journal.mark(command.command_id, JOURNAL_STATE.APPROVAL_PENDING, {
            ...preparedDetails,
            approval_draft: draft,
            action_fingerprint: draft.action_fingerprint,
            page_precondition_hash: draft.page_precondition_hash,
            claim_token: claim.claim_token,
            claim_expires_at: claim.expires_at ?? null,
            approval_wait: {
              reason: "USER_CONTROL_ACTIVE",
              user_active: Boolean(pre.local?.user_active),
              user_reviewing: Boolean(pre.local?.user_reviewing),
              observed_at: pre.observation.observed_at
            }
          });
          return {
            processed: true,
            reason: "APPROVAL_PENDING_USER_CONTROL",
            approval_pending: true,
            approval_draft: draft,
            command_id: command.command_id,
            dispatch_ref: command.dispatch_ref
          };
        }

        const validated = await validateApprovalGrant({ grant, command, binding, resolved_payload: resolvedPayload, observation: pre.observation });
        await this.journal.mark(command.command_id, JOURNAL_STATE.PREPARED, {
          ...preparedDetails,
          approval_draft: draft,
          action_fingerprint: validated.action_fingerprint,
          page_precondition_hash: validated.page_precondition_hash
        });
        // Consume the one-time grant before crossing the browser side-effect
        // boundary. A consume failure is therefore a deterministic pre-delivery
        // BLOCKED result, never UNCERTAIN.
        await this.approvalClient.consume(grant.approval_ref, grant.grant_id, command.command_id);
        await this.journal.mark(command.command_id, JOURNAL_STATE.PREPARED, { approval_consumed_at: new Date().toISOString() });
      } else {
        await this.journal.mark(command.command_id, JOURNAL_STATE.PREPARED, preparedDetails);
      }

      await this.journal.mark(command.command_id, JOURNAL_STATE.EXECUTING, {
        binding_id: binding?.binding_id ?? null,
        page_identity: pageIdentity(pre?.observation)
      });
      actionStarted = true;
      execution = await this.actionExecutor.execute({ binding, command, resolved_payload: resolvedPayload });
      binding = execution.binding ?? binding;
      if (!binding) throw new BhrError("BINDING_NOT_READY", "The browser action completed without a confirmed Binding.");

      try {
        deliveryState = await this.acknowledgeDelivery({ command, claim_token: claim.claim_token, binding, execution, resolvedPayload });
      } catch (error) {
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
      // UNCERTAIN is reserved for a high-risk browser action that may already have
      // crossed the side-effect boundary. Pre-action validation/observation
      // failures are BLOCKED, even if they use an error code that may also occur
      // later during response observation.
      const sideEffectMayHaveStarted =
        actionStarted &&
        classifyAction(command.action.type) === "HIGH" &&
        !isDefinitelyPreSideEffectExecutorError(safe);
      const status = sideEffectMayHaveStarted ? HOST_RESULT_STATUS.UNCERTAIN : HOST_RESULT_STATUS.BLOCKED;
      const result = buildHostResult({
        command,
        status,
        binding_id: binding?.binding_id ?? "unbound",
        pre_observation_ref: pre?.observation?.observation_id ?? null,
        error: safe,
        details: execution ? { execution: { ...execution, binding: undefined } } : {}
      });
      let report;
      if (deliveryState?.report_token) {
        report = await this.reportHostResult({ command, report_token: deliveryState.report_token, result, binding_id: binding?.binding_id ?? null, execution });
      } else if (status === HOST_RESULT_STATUS.UNCERTAIN) {
        report = await this.reportUncertainSideEffect({
          command,
          claim_token: claim.claim_token,
          result,
          binding_id: binding?.binding_id ?? null,
          execution,
          reason: safe.code,
          error: safe
        });
      } else {
        report = await this.reportPreDeliveryFailure({ command, claim_token: claim.claim_token, result, binding_id: binding?.binding_id ?? null, execution });
      }
      return { processed: true, result, report };
    }
  }
}

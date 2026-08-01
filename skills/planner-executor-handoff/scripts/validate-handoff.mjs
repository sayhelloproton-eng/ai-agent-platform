#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_REF_RE = /^(?!-)(?!.*\.\.)(?!.*\s)(?!.*@\{)[^~^:?*\[\\]+$/;
const WORKSPACE_STATUSES = ["clean", "dirty", "staged", "untracked", "unknown"];
const GUIDANCE_TIERS = ["compact_controlled", "stepwise_controlled"];
const EXECUTION_AUTHORITIES = ["bounded_implementation", "frozen_artifacts_only"];
const MERGE_STRATEGIES = ["none", "fast_forward_only", "merge_commit", "squash"];
const FEEDBACK_TYPES = [
  "reception_ack",
  "clarification_request",
  "progress_checkpoint",
  "failure_stop_report",
  "execution_result",
  "review_feedback",
  "review_response",
  "executor_switch_checkpoint",
];

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  /\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}/i,
];

function fail(message) { throw new Error(message); }
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function object(value, label) { if (!isObject(value)) fail(`${label} must be an object`); }
function exact(value, fields, label) {
  object(value, label);
  for (const field of fields) if (!(field in value)) fail(`${label} missing ${field}`);
  for (const field of Object.keys(value)) if (!fields.includes(field)) fail(`${label} contains unexpected field ${field}`);
}
function string(value, label) { if (typeof value !== "string") fail(`${label} must be a string`); }
function nonEmpty(value, label) { string(value, label); if (value.length === 0) fail(`${label} must not be empty`); }
function bool(value, label) { if (typeof value !== "boolean") fail(`${label} must be a boolean`); }
function integer(value, label, min = undefined) {
  if (!Number.isInteger(value)) fail(`${label} must be an integer`);
  if (min !== undefined && value < min) fail(`${label} must be >= ${min}`);
}
function array(value, label) { if (!Array.isArray(value)) fail(`${label} must be an array`); }
function strings(value, label, minItems = 0) {
  array(value, label);
  if (value.length < minItems) fail(`${label} must contain at least ${minItems} item(s)`);
  value.forEach((item, index) => string(item, `${label}[${index}]`));
}
function oneOf(value, allowed, label) { if (!allowed.includes(value)) fail(`${label} must be one of ${allowed.join(", ")}`); }
function sha(value, label) { string(value, label); if (!SHA_RE.test(value)) fail(`${label} must be a 40-character lowercase SHA`); }
function nullableSha(value, label) { if (value !== null) sha(value, label); }
function safeRef(value, label) { nonEmpty(value, label); if (!SAFE_REF_RE.test(value)) fail(`${label} is not a safe Git ref`); }
function nullableRef(value, label) { if (value !== null) safeRef(value, label); }
function safePath(value, label) {
  nonEmpty(value, label);
  if (path.isAbsolute(value) || value.split(/[\\/]+/).includes("..")) fail(`${label} is not a safe repository path`);
}
function safePaths(value, label) { strings(value, label); value.forEach((item, index) => safePath(item, `${label}[${index}]`)); }
function safeRefs(value, label) { strings(value, label); value.forEach((item, index) => safeRef(item, `${label}[${index}]`)); }
function nullableString(value, label) { if (value !== null) string(value, label); }

function walk(value, visit) {
  if (typeof value === "string") return visit(value);
  if (Array.isArray(value)) return value.forEach((item) => walk(item, visit));
  if (isObject(value)) Object.values(value).forEach((item) => walk(item, visit));
}
function secrets(value) {
  walk(value, (text) => {
    for (const pattern of SECRET_PATTERNS) if (pattern.test(text)) fail("artifact contains a secret-like value");
  });
}

function validateWorkspace(value, label = "workspace_state") {
  exact(value, ["branch", "head", "status"], label);
  safeRef(value.branch, `${label}.branch`);
  sha(value.head, `${label}.head`);
  oneOf(value.status, WORKSPACE_STATUSES, `${label}.status`);
}

function validateProfile(value) {
  const fields = [
    "executor_id", "platform", "model", "execution_guidance_tier", "execution_authority",
    "classification_source", "tools", "repository_access", "network_access",
    "approval_mode", "allowed_tactical_discretion", "known_limits",
  ];
  exact(value, fields, "executor_profile");
  nonEmpty(value.executor_id, "executor_profile.executor_id");
  nonEmpty(value.platform, "executor_profile.platform");
  nonEmpty(value.model, "executor_profile.model");
  oneOf(value.execution_guidance_tier, GUIDANCE_TIERS, "executor_profile.execution_guidance_tier");
  oneOf(value.execution_authority, EXECUTION_AUTHORITIES, "executor_profile.execution_authority");
  oneOf(value.classification_source, ["user_confirmed", "project_default", "probe_evidence"], "executor_profile.classification_source");
  strings(value.tools, "executor_profile.tools", 1);
  oneOf(value.repository_access, ["none", "read_only", "read_write"], "executor_profile.repository_access");
  oneOf(value.network_access, ["none", "restricted", "available"], "executor_profile.network_access");
  oneOf(value.approval_mode, ["manual", "pre_authorized_scope", "runtime_policy"], "executor_profile.approval_mode");
  strings(value.allowed_tactical_discretion, "executor_profile.allowed_tactical_discretion");
  strings(value.known_limits, "executor_profile.known_limits");
}

function validateGitPolicy(value) {
  const fields = [
    "workspace_strategy", "current_branch", "target_branch", "target_remote",
    "allow_create_local_branch", "allow_create_remote_branch", "commit_allowed", "commit_count",
    "commit_message", "fetch_allowed", "pull_allowed", "push_allowed", "push_target",
    "pr_required", "pr_creation_allowed", "merge_allowed", "merge_strategy", "rebase_allowed",
    "cherry_pick_allowed", "force_push_allowed", "delete_local_branch_allowed",
    "delete_remote_branch_allowed", "remote_branches_allowed_to_delete", "remove_worktree_allowed",
    "cleanup_delivery_directory_allowed",
  ];
  exact(value, fields, "canonical_contract.git_policy");
  oneOf(value.workspace_strategy, ["current_worktree", "new_worktree", "existing_worktree"], "git_policy.workspace_strategy");
  safeRef(value.current_branch, "git_policy.current_branch");
  safeRef(value.target_branch, "git_policy.target_branch");
  safeRef(value.target_remote, "git_policy.target_remote");
  [
    "allow_create_local_branch", "allow_create_remote_branch", "commit_allowed", "fetch_allowed", "pull_allowed",
    "push_allowed", "pr_required", "pr_creation_allowed", "merge_allowed", "rebase_allowed",
    "cherry_pick_allowed", "force_push_allowed", "delete_local_branch_allowed", "delete_remote_branch_allowed",
    "remove_worktree_allowed", "cleanup_delivery_directory_allowed",
  ].forEach((field) => bool(value[field], `git_policy.${field}`));
  integer(value.commit_count, "git_policy.commit_count", 0);
  nullableString(value.commit_message, "git_policy.commit_message");
  nullableRef(value.push_target, "git_policy.push_target");
  oneOf(value.merge_strategy, MERGE_STRATEGIES, "git_policy.merge_strategy");
  safeRefs(value.remote_branches_allowed_to_delete, "git_policy.remote_branches_allowed_to_delete");
  if (!value.allow_create_local_branch && value.current_branch !== value.target_branch) fail("target_branch differs while branch creation is forbidden");
  if (value.commit_allowed && (value.commit_count < 1 || typeof value.commit_message !== "string" || value.commit_message.length === 0)) fail("commit policy is inconsistent");
  if (!value.commit_allowed && (value.commit_count !== 0 || value.commit_message !== null)) fail("commit policy is inconsistent");
  if (value.push_allowed !== (typeof value.push_target === "string" && value.push_target.length > 0)) fail("push policy is inconsistent");
  if (!value.merge_allowed && value.merge_strategy !== "none") fail("merge policy is inconsistent");
  if (value.pr_required && !value.pr_creation_allowed) fail("PR policy is inconsistent");
  if (!value.delete_remote_branch_allowed && value.remote_branches_allowed_to_delete.length > 0) fail("remote deletion policy is inconsistent");
}

function validateFrozenArtifacts(value) {
  exact(value, ["overlay_root", "manifest_path", "file_count", "delete_paths", "byte_compare_required"], "canonical_contract.frozen_artifacts");
  safePath(value.overlay_root, "frozen_artifacts.overlay_root");
  safePath(value.manifest_path, "frozen_artifacts.manifest_path");
  integer(value.file_count, "frozen_artifacts.file_count", 1);
  safePaths(value.delete_paths, "frozen_artifacts.delete_paths");
  bool(value.byte_compare_required, "frozen_artifacts.byte_compare_required");
  if (!value.byte_compare_required) fail("frozen_artifacts.byte_compare_required must be true");
}

function validateContract(value) {
  const fields = [
    "task_id", "task_version", "title", "goal", "why_now", "repository", "source_branch", "source_commit",
    "confirmed_facts", "frozen_decisions", "analysis", "scope", "inputs", "expected_outputs",
    "acceptance_criteria", "validation_plan", "stop_conditions", "evidence_requirements", "delivery_mode",
    "frozen_artifacts", "execution_plan", "change_control", "git_policy",
  ];
  exact(value, fields, "canonical_contract");
  nonEmpty(value.task_id, "canonical_contract.task_id");
  integer(value.task_version, "canonical_contract.task_version", 1);
  ["title", "goal", "why_now", "repository"].forEach((field) => nonEmpty(value[field], `canonical_contract.${field}`));
  safeRef(value.source_branch, "canonical_contract.source_branch");
  sha(value.source_commit, "canonical_contract.source_commit");
  strings(value.confirmed_facts, "canonical_contract.confirmed_facts", 1);
  strings(value.frozen_decisions, "canonical_contract.frozen_decisions", 1);

  exact(value.analysis, ["impact_analysis", "cross_file_relations", "selected_approach", "rejected_approaches", "risks"], "canonical_contract.analysis");
  strings(value.analysis.impact_analysis, "analysis.impact_analysis", 1);
  strings(value.analysis.cross_file_relations, "analysis.cross_file_relations");
  nonEmpty(value.analysis.selected_approach, "analysis.selected_approach");
  strings(value.analysis.rejected_approaches, "analysis.rejected_approaches");
  strings(value.analysis.risks, "analysis.risks");

  exact(value.scope, ["allowed_paths", "forbidden_paths", "allowed_actions", "forbidden_actions"], "canonical_contract.scope");
  safePaths(value.scope.allowed_paths, "scope.allowed_paths");
  safePaths(value.scope.forbidden_paths, "scope.forbidden_paths");
  strings(value.scope.allowed_actions, "scope.allowed_actions", 1);
  strings(value.scope.forbidden_actions, "scope.forbidden_actions", 1);

  ["inputs", "expected_outputs", "acceptance_criteria", "validation_plan", "stop_conditions", "evidence_requirements"].forEach((field) => strings(value[field], field, field === "inputs" ? 0 : 1));

  oneOf(value.delivery_mode, ["implement_frozen_design", "apply_frozen_artifacts"], "canonical_contract.delivery_mode");
  if (value.delivery_mode === "apply_frozen_artifacts") validateFrozenArtifacts(value.frozen_artifacts);
  else if (value.frozen_artifacts !== null) fail("frozen_artifacts must be null for implement_frozen_design");

  exact(value.execution_plan, ["phases", "stepwise_steps"], "canonical_contract.execution_plan");
  strings(value.execution_plan.phases, "execution_plan.phases", 1);
  array(value.execution_plan.stepwise_steps, "execution_plan.stepwise_steps");
  value.execution_plan.stepwise_steps.forEach((step, index) => {
    exact(step, ["step_id", "action", "command", "expected_result", "stop_on_failure"], `execution_plan.stepwise_steps[${index}]`);
    ["step_id", "action", "command", "expected_result"].forEach((field) => nonEmpty(step[field], `stepwise_steps[${index}].${field}`));
    bool(step.stop_on_failure, `stepwise_steps[${index}].stop_on_failure`);
  });

  exact(value.change_control, ["single_source_of_truth", "ambiguity_policy", "executor_may_change_approach", "new_authorization_required_for"], "canonical_contract.change_control");
  if (value.change_control.single_source_of_truth !== "canonical_handoff_contract") fail("single_source_of_truth must be canonical_handoff_contract");
  if (value.change_control.ambiguity_policy !== "stop_and_request_clarification") fail("ambiguity_policy must be stop_and_request_clarification");
  bool(value.change_control.executor_may_change_approach, "change_control.executor_may_change_approach");
  if (value.change_control.executor_may_change_approach) fail("executor_may_change_approach must be false");
  strings(value.change_control.new_authorization_required_for, "change_control.new_authorization_required_for", 1);
  validateGitPolicy(value.git_policy);
}

function validateContext(value, contract) {
  exact(value, ["task_id", "task_version", "must_know_facts", "frozen_decisions", "relevant_files", "prohibited_reinterpretations", "open_questions", "excluded_context"], "context_package");
  nonEmpty(value.task_id, "context_package.task_id");
  integer(value.task_version, "context_package.task_version", 1);
  strings(value.must_know_facts, "context_package.must_know_facts", 1);
  strings(value.frozen_decisions, "context_package.frozen_decisions", 1);
  safePaths(value.relevant_files, "context_package.relevant_files");
  strings(value.prohibited_reinterpretations, "context_package.prohibited_reinterpretations");
  strings(value.open_questions, "context_package.open_questions");
  strings(value.excluded_context, "context_package.excluded_context");
  if (value.task_id !== contract.task_id || value.task_version !== contract.task_version) fail("context identity does not match contract");
}

function validateBundle(value) {
  exact(value, ["executor_profile", "canonical_contract", "context_package"], "bundle");
  validateProfile(value.executor_profile);
  validateContract(value.canonical_contract);
  validateContext(value.context_package, value.canonical_contract);
  if (value.executor_profile.execution_authority === "frozen_artifacts_only" && value.canonical_contract.delivery_mode !== "apply_frozen_artifacts") fail("frozen_artifacts_only executor requires apply_frozen_artifacts");
  secrets(value);
}

const COMMON_FIELDS = ["feedback_type", "task_id", "task_version", "executor_id", "source_commit", "current_state", "completed_steps", "evidence", "workspace_state", "next_required_action"];
const EXTRA_FIELDS = {
  reception_ack: ["understood_goal", "allowed_scope", "forbidden_scope", "planned_validation", "ambiguities", "can_start", "git_policy_acknowledged"],
  clarification_request: ["current_step", "missing_fact", "why_required", "affected_scope", "available_options", "can_continue_without_answer"],
  progress_checkpoint: ["passed_gates", "current_step", "staged_state", "side_effects", "safe_resume_point"],
  failure_stop_report: ["last_successful_gate", "failed_step", "raw_error", "interpreted_cause", "staged_state", "side_effects", "safe_resume_point", "required_decision"],
  execution_result: ["result_state", "changed_files", "deleted_files", "tests", "diff_stat", "commit_sha", "remote_sha", "artifacts", "limitations", "uncompleted_items", "git_operations"],
  review_response: ["review_id", "accepted_changes", "unchanged_scope", "resume_point", "planned_fix", "validation_plan", "ready_to_resume"],
};

function validateCommon(value, type) {
  exact(value, [...COMMON_FIELDS, ...EXTRA_FIELDS[type]], type);
  if (value.feedback_type !== type) fail(`feedback_type must be ${type}`);
  nonEmpty(value.task_id, `${type}.task_id`);
  integer(value.task_version, `${type}.task_version`, 1);
  nonEmpty(value.executor_id, `${type}.executor_id`);
  sha(value.source_commit, `${type}.source_commit`);
  nonEmpty(value.current_state, `${type}.current_state`);
  strings(value.completed_steps, `${type}.completed_steps`);
  strings(value.evidence, `${type}.evidence`);
  validateWorkspace(value.workspace_state, `${type}.workspace_state`);
  nonEmpty(value.next_required_action, `${type}.next_required_action`);
}

function validateReception(value) {
  validateCommon(value, "reception_ack");
  nonEmpty(value.understood_goal, "reception_ack.understood_goal");
  safePaths(value.allowed_scope, "reception_ack.allowed_scope");
  safePaths(value.forbidden_scope, "reception_ack.forbidden_scope");
  strings(value.planned_validation, "reception_ack.planned_validation");
  strings(value.ambiguities, "reception_ack.ambiguities");
  bool(value.can_start, "reception_ack.can_start");
  const g = value.git_policy_acknowledged;
  exact(g, ["actual_branch", "actual_head", "target_branch", "push_target", "remote_delete_targets", "matches_contract"], "reception_ack.git_policy_acknowledged");
  safeRef(g.actual_branch, "git_policy_acknowledged.actual_branch");
  sha(g.actual_head, "git_policy_acknowledged.actual_head");
  safeRef(g.target_branch, "git_policy_acknowledged.target_branch");
  nullableRef(g.push_target, "git_policy_acknowledged.push_target");
  safeRefs(g.remote_delete_targets, "git_policy_acknowledged.remote_delete_targets");
  bool(g.matches_contract, "git_policy_acknowledged.matches_contract");
  if (value.can_start && (value.ambiguities.length > 0 || !g.matches_contract)) fail("can_start requires no ambiguities and matching Git policy");
}
function validateClarification(value) {
  validateCommon(value, "clarification_request");
  ["current_step", "missing_fact", "why_required"].forEach((field) => nonEmpty(value[field], `clarification_request.${field}`));
  safePaths(value.affected_scope, "clarification_request.affected_scope");
  strings(value.available_options, "clarification_request.available_options", 1);
  bool(value.can_continue_without_answer, "clarification_request.can_continue_without_answer");
}
function validateProgress(value) {
  validateCommon(value, "progress_checkpoint");
  strings(value.passed_gates, "progress_checkpoint.passed_gates");
  nonEmpty(value.current_step, "progress_checkpoint.current_step");
  nonEmpty(value.staged_state, "progress_checkpoint.staged_state");
  strings(value.side_effects, "progress_checkpoint.side_effects");
  nonEmpty(value.safe_resume_point, "progress_checkpoint.safe_resume_point");
}
function validateFailure(value) {
  validateCommon(value, "failure_stop_report");
  ["last_successful_gate", "failed_step", "raw_error", "staged_state", "safe_resume_point", "required_decision"].forEach((field) => nonEmpty(value[field], `failure_stop_report.${field}`));
  nullableString(value.interpreted_cause, "failure_stop_report.interpreted_cause");
  strings(value.side_effects, "failure_stop_report.side_effects");
}
function validateTest(value, index) {
  exact(value, ["command", "exit_code", "result"], `execution_result.tests[${index}]`);
  nonEmpty(value.command, `tests[${index}].command`);
  integer(value.exit_code, `tests[${index}].exit_code`);
  oneOf(value.result, ["passed", "failed", "not_run"], `tests[${index}].result`);
}
function validateGitOperations(value) {
  const fields = ["starting_branch", "starting_head", "created_local_branches", "created_remote_branches", "commit_sha", "push_target", "remote_sha", "merge_strategy", "merge_result", "deleted_remote_branches", "cleanup_actions", "final_branch", "final_head", "final_status"];
  exact(value, fields, "execution_result.git_operations");
  safeRef(value.starting_branch, "git_operations.starting_branch");
  sha(value.starting_head, "git_operations.starting_head");
  safeRefs(value.created_local_branches, "git_operations.created_local_branches");
  safeRefs(value.created_remote_branches, "git_operations.created_remote_branches");
  nullableSha(value.commit_sha, "git_operations.commit_sha");
  nullableRef(value.push_target, "git_operations.push_target");
  nullableSha(value.remote_sha, "git_operations.remote_sha");
  oneOf(value.merge_strategy, MERGE_STRATEGIES, "git_operations.merge_strategy");
  nonEmpty(value.merge_result, "git_operations.merge_result");
  safeRefs(value.deleted_remote_branches, "git_operations.deleted_remote_branches");
  strings(value.cleanup_actions, "git_operations.cleanup_actions");
  safeRef(value.final_branch, "git_operations.final_branch");
  sha(value.final_head, "git_operations.final_head");
  oneOf(value.final_status, WORKSPACE_STATUSES, "git_operations.final_status");
}
function validateExecutionResult(value) {
  validateCommon(value, "execution_result");
  oneOf(value.result_state, ["completed", "partially_completed", "blocked", "failed"], "execution_result.result_state");
  safePaths(value.changed_files, "execution_result.changed_files");
  safePaths(value.deleted_files, "execution_result.deleted_files");
  array(value.tests, "execution_result.tests");
  value.tests.forEach(validateTest);
  nonEmpty(value.diff_stat, "execution_result.diff_stat");
  nullableSha(value.commit_sha, "execution_result.commit_sha");
  nullableSha(value.remote_sha, "execution_result.remote_sha");
  strings(value.artifacts, "execution_result.artifacts");
  strings(value.limitations, "execution_result.limitations");
  strings(value.uncompleted_items, "execution_result.uncompleted_items");
  validateGitOperations(value.git_operations);
  if (value.commit_sha !== value.git_operations.commit_sha) fail("execution_result commit_sha mismatch");
  if (value.remote_sha !== value.git_operations.remote_sha) fail("execution_result remote_sha mismatch");
  if (value.workspace_state.branch !== value.git_operations.final_branch || value.workspace_state.head !== value.git_operations.final_head || value.workspace_state.status !== value.git_operations.final_status) fail("execution_result final workspace mismatch");
}
function validateReviewResponse(value) {
  validateCommon(value, "review_response");
  nonEmpty(value.review_id, "review_response.review_id");
  strings(value.accepted_changes, "review_response.accepted_changes");
  strings(value.unchanged_scope, "review_response.unchanged_scope");
  nonEmpty(value.resume_point, "review_response.resume_point");
  strings(value.planned_fix, "review_response.planned_fix", 1);
  strings(value.validation_plan, "review_response.validation_plan", 1);
  bool(value.ready_to_resume, "review_response.ready_to_resume");
}
function validateReviewFeedback(value) {
  const fields = ["feedback_type", "review_id", "task_id", "task_version", "reviewer_id", "reviewed_commit", "review_state", "blocking_findings", "non_blocking_findings", "required_changes", "unchanged_scope", "resume_from", "new_authorization", "next_required_action"];
  exact(value, fields, "review_feedback");
  if (value.feedback_type !== "review_feedback") fail("feedback_type must be review_feedback");
  nonEmpty(value.review_id, "review_feedback.review_id");
  nonEmpty(value.task_id, "review_feedback.task_id");
  integer(value.task_version, "review_feedback.task_version", 1);
  nonEmpty(value.reviewer_id, "review_feedback.reviewer_id");
  sha(value.reviewed_commit, "review_feedback.reviewed_commit");
  oneOf(value.review_state, ["accepted", "changes_required", "blocked"], "review_feedback.review_state");
  ["blocking_findings", "non_blocking_findings", "required_changes", "unchanged_scope", "new_authorization"].forEach((field) => strings(value[field], `review_feedback.${field}`));
  nonEmpty(value.resume_from, "review_feedback.resume_from");
  nonEmpty(value.next_required_action, "review_feedback.next_required_action");
}
function validateSwitch(value) {
  const fields = ["feedback_type", "task_id", "task_version", "source_commit", "previous_executor_id", "next_executor_id", "next_execution_guidance_tier", "branch", "worktree", "current_commit", "completed_steps", "remaining_steps", "passed_gates", "failure_history", "side_effects", "do_not_repeat", "safe_resume_point", "next_required_action"];
  exact(value, fields, "executor_switch_checkpoint");
  if (value.feedback_type !== "executor_switch_checkpoint") fail("feedback_type must be executor_switch_checkpoint");
  nonEmpty(value.task_id, "executor_switch_checkpoint.task_id");
  integer(value.task_version, "executor_switch_checkpoint.task_version", 1);
  sha(value.source_commit, "executor_switch_checkpoint.source_commit");
  nonEmpty(value.previous_executor_id, "executor_switch_checkpoint.previous_executor_id");
  nonEmpty(value.next_executor_id, "executor_switch_checkpoint.next_executor_id");
  oneOf(value.next_execution_guidance_tier, GUIDANCE_TIERS, "executor_switch_checkpoint.next_execution_guidance_tier");
  safeRef(value.branch, "executor_switch_checkpoint.branch");
  nonEmpty(value.worktree, "executor_switch_checkpoint.worktree");
  sha(value.current_commit, "executor_switch_checkpoint.current_commit");
  ["completed_steps", "remaining_steps", "passed_gates", "failure_history", "side_effects"].forEach((field) => strings(value[field], `executor_switch_checkpoint.${field}`));
  strings(value.do_not_repeat, "executor_switch_checkpoint.do_not_repeat", 1);
  nonEmpty(value.safe_resume_point, "executor_switch_checkpoint.safe_resume_point");
  nonEmpty(value.next_required_action, "executor_switch_checkpoint.next_required_action");
}

function validateFeedback(value) {
  object(value, "feedback");
  oneOf(value.feedback_type, FEEDBACK_TYPES, "feedback_type");
  const validators = {
    reception_ack: validateReception,
    clarification_request: validateClarification,
    progress_checkpoint: validateProgress,
    failure_stop_report: validateFailure,
    execution_result: validateExecutionResult,
    review_feedback: validateReviewFeedback,
    review_response: validateReviewResponse,
    executor_switch_checkpoint: validateSwitch,
  };
  validators[value.feedback_type](value);
  secrets(value);
}

function validateCross(bundle, ack, reviewFeedback, reviewResponse, switchCheckpoint) {
  validateBundle(bundle);
  validateReception(ack);
  validateReviewFeedback(reviewFeedback);
  validateReviewResponse(reviewResponse);
  validateSwitch(switchCheckpoint);
  const contract = bundle.canonical_contract;
  const profile = bundle.executor_profile;
  const same = (actual, expected, label) => { if (actual !== expected) fail(`${label} mismatch`); };
  same(ack.task_id, contract.task_id, "reception_ack.task_id");
  same(ack.task_version, contract.task_version, "reception_ack.task_version");
  same(ack.source_commit, contract.source_commit, "reception_ack.source_commit");
  same(ack.executor_id, profile.executor_id, "reception_ack.executor_id");
  same(ack.git_policy_acknowledged.actual_head, contract.source_commit, "reception_ack.actual_head");
  same(ack.git_policy_acknowledged.target_branch, contract.git_policy.target_branch, "reception_ack.target_branch");
  same(ack.git_policy_acknowledged.push_target, contract.git_policy.push_target, "reception_ack.push_target");
  same(reviewFeedback.review_id, reviewResponse.review_id, "review_id");
  same(reviewFeedback.task_id, reviewResponse.task_id, "review task_id");
  same(reviewFeedback.task_version, reviewResponse.task_version, "review task_version");
  same(reviewResponse.source_commit, contract.source_commit, "review_response.source_commit");
  same(switchCheckpoint.task_id, contract.task_id, "switch.task_id");
  same(switchCheckpoint.task_version, contract.task_version, "switch.task_version");
  same(switchCheckpoint.source_commit, contract.source_commit, "switch.source_commit");
  same(switchCheckpoint.next_executor_id, profile.executor_id, "switch.next_executor_id");
  same(switchCheckpoint.next_execution_guidance_tier, profile.execution_guidance_tier, "switch.guidance_tier");
  secrets([bundle, ack, reviewFeedback, reviewResponse, switchCheckpoint]);
}

async function load(file) { return JSON.parse(await readFile(file, "utf8")); }
async function main() {
  const [mode, ...files] = process.argv.slice(2);
  if (mode === "bundle" && files.length === 1) validateBundle(await load(files[0]));
  else if (mode === "feedback" && files.length === 1) validateFeedback(await load(files[0]));
  else if (mode === "cross" && files.length === 5) validateCross(...await Promise.all(files.map(load)));
  else {
    console.error("Usage: validate-handoff.mjs bundle <bundle.json> | feedback <artifact.json> | cross <bundle> <ack> <review-feedback> <review-response> <switch>");
    process.exit(2);
  }
  console.log(`planner-executor-handoff ${mode} validation passed`);
}
main().catch((error) => { console.error(`planner-executor-handoff validation failed: ${error.message}`); process.exit(1); });

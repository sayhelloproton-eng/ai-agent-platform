#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

// ── Strict type assertions ──

function fail(message) {
  throw new Error(message);
}

function assertExactObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a plain object, got ${typeof value}`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string") {
    fail(`${label} must be a string, got ${typeof value}`);
  }
}

function assertNonEmptyString(value, label) {
  assertString(value, label);
  if (value.length === 0) fail(`${label} must not be empty`);
}

function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    fail(`${label} must be a boolean (true or false), got ${typeof value}`);
  }
}

function assertInteger(value, label) {
  if (!Number.isInteger(value)) {
    fail(`${label} must be an integer, got ${typeof value}`);
  }
}

function assertNullableString(value, label) {
  if (value !== null && typeof value !== "string") {
    fail(`${label} must be a string or null, got ${typeof value}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array, got ${typeof value}`);
  }
}

function assertArrayOfStrings(value, label) {
  assertArray(value, label);
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") {
      fail(`${label}[${i}] must be a string, got ${typeof value[i]}`);
    }
  }
}

function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    fail(`${label} must be one of [${allowed.join(", ")}], got ${JSON.stringify(value)}`);
  }
}

function assertPattern(value, regex, label) {
  assertString(value, label);
  if (!regex.test(value)) {
    fail(`${label} must match ${regex}, got ${JSON.stringify(value)}`);
  }
}

function assertCommit(value, label) {
  assertNonEmptyString(value, label);
  if (!/^[0-9a-f]{40}$/.test(value)) {
    fail(`${label} must be a 40-character lowercase commit SHA, got ${JSON.stringify(value)}`);
  }
}

function assertSafeBranch(value, label) {
  assertNonEmptyString(value, label);
  if (value.startsWith("-")) fail(`${label} must not start with "-"`);
  if (value.includes("..")) fail(`${label} must not contain ".."`);
}

// ── Extra fields check ──

function assertNoExtraFields(value, allowed, label) {
  assertExactObject(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(`${label} contains unexpected field: ${key}`);
    }
  }
}

// ── Secret detection ──

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  /\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}/i,
];

function walkStrings(value, visit) {
  if (typeof value === "string") return visit(value);
  if (Array.isArray(value)) return value.forEach((item) => walkStrings(item, visit));
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => walkStrings(item, visit));
  }
}

function validateSecrets(value) {
  walkStrings(value, (text) => {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) fail("artifact contains a secret-like value");
    }
  });
}

// ── Path safety ──

function isSafePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (path.isAbsolute(value)) return false;
  return !value.split(/[\\/]+/).includes("..");
}

// ── Workspace state ──

const WORKSPACE_STATUSES = ["clean", "dirty", "staged", "untracked", "unknown"];

function validateWorkspaceState(ws) {
  assertExactObject(ws, "workspace_state");
  assertNonEmptyString(ws.branch, "workspace_state.branch");
  assertNonEmptyString(ws.head, "workspace_state.head");
  assertEnum(ws.status, WORKSPACE_STATUSES, "workspace_state.status");
}

// ── Common feedback fields ──

const EXECUTOR_FEEDBACK_TYPES = [
  "reception_ack",
  "clarification_request",
  "progress_checkpoint",
  "failure_stop_report",
  "execution_result",
  "review_response",
];

const REVIEW_FEEDBACK_TYPES = [
  "review_feedback",
  "executor_switch_checkpoint",
];

const ALL_FEEDBACK_TYPES = [...EXECUTOR_FEEDBACK_TYPES, ...REVIEW_FEEDBACK_TYPES];

function validateCommonFeedbackFields(fb) {
  assertNonEmptyString(fb.feedback_type, "feedback_type");
  assertNonEmptyString(fb.task_id, "task_id");
  assertInteger(fb.task_version, "task_version");
  if (fb.task_version < 1) fail("task_version must be positive");
  assertNonEmptyString(fb.executor_id, "executor_id");
  assertCommit(fb.source_commit, "source_commit");
  assertNonEmptyString(fb.current_state, "current_state");
  assertArrayOfStrings(fb.completed_steps, "completed_steps");
  assertArrayOfStrings(fb.evidence, "evidence");
  validateWorkspaceState(fb.workspace_state);
  assertNonEmptyString(fb.next_required_action, "next_required_action");
}

// ── Profile validation ──

function validateProfile(profile) {
  assertExactObject(profile, "executor_profile");
  assertNoExtraFields(profile, [
    "executor_id", "platform", "model", "execution_guidance_tier",
    "classification_source", "tools", "repository_access", "network_access",
    "approval_mode", "allowed_tactical_discretion", "known_limits",
  ], "executor_profile");

  assertNonEmptyString(profile.executor_id, "executor_profile.executor_id");
  assertNonEmptyString(profile.platform, "executor_profile.platform");
  assertNonEmptyString(profile.model, "executor_profile.model");
  assertEnum(profile.execution_guidance_tier, ["compact_controlled", "stepwise_controlled"], "executor_profile.execution_guidance_tier");
  assertEnum(profile.classification_source, ["user_confirmed", "project_default", "probe_evidence"], "executor_profile.classification_source");
  assertArrayOfStrings(profile.tools, "executor_profile.tools");
  if (profile.tools.length < 1) fail("executor_profile.tools must have at least one item");
  assertEnum(profile.repository_access, ["none", "read_only", "read_write"], "executor_profile.repository_access");
  assertEnum(profile.network_access, ["none", "restricted", "available"], "executor_profile.network_access");
  assertEnum(profile.approval_mode, ["manual", "pre_authorized_scope", "runtime_policy"], "executor_profile.approval_mode");
  assertArrayOfStrings(profile.allowed_tactical_discretion, "executor_profile.allowed_tactical_discretion");
  assertArrayOfStrings(profile.known_limits, "executor_profile.known_limits");
}

// ── Git policy validation ──

function validateGitPolicy(policy) {
  assertExactObject(policy, "canonical_contract.git_policy");
  assertNoExtraFields(policy, [
    "workspace_strategy", "current_branch", "target_branch", "target_remote",
    "allow_create_local_branch", "allow_create_remote_branch",
    "commit_allowed", "commit_count", "commit_message",
    "fetch_allowed", "pull_allowed", "push_allowed", "push_target",
    "pr_required", "pr_creation_allowed", "merge_allowed", "merge_strategy",
    "rebase_allowed", "cherry_pick_allowed", "force_push_allowed",
    "delete_local_branch_allowed", "delete_remote_branch_allowed",
    "remote_branches_allowed_to_delete", "remove_worktree_allowed",
    "cleanup_delivery_directory_allowed",
  ], "canonical_contract.git_policy");

  assertEnum(policy.workspace_strategy, ["current_worktree", "new_worktree", "existing_worktree"], "git_policy.workspace_strategy");
  assertSafeBranch(policy.current_branch, "git_policy.current_branch");
  assertSafeBranch(policy.target_branch, "git_policy.target_branch");
  assertNonEmptyString(policy.target_remote, "git_policy.target_remote");

  assertBoolean(policy.allow_create_local_branch, "git_policy.allow_create_local_branch");
  assertBoolean(policy.allow_create_remote_branch, "git_policy.allow_create_remote_branch");
  assertBoolean(policy.commit_allowed, "git_policy.commit_allowed");
  assertInteger(policy.commit_count, "git_policy.commit_count");
  assertBoolean(policy.fetch_allowed, "git_policy.fetch_allowed");
  assertBoolean(policy.pull_allowed, "git_policy.pull_allowed");
  assertBoolean(policy.push_allowed, "git_policy.push_allowed");
  assertBoolean(policy.pr_required, "git_policy.pr_required");
  assertBoolean(policy.pr_creation_allowed, "git_policy.pr_creation_allowed");
  assertBoolean(policy.merge_allowed, "git_policy.merge_allowed");
  assertBoolean(policy.rebase_allowed, "git_policy.rebase_allowed");
  assertBoolean(policy.cherry_pick_allowed, "git_policy.cherry_pick_allowed");
  assertBoolean(policy.force_push_allowed, "git_policy.force_push_allowed");
  assertBoolean(policy.delete_local_branch_allowed, "git_policy.delete_local_branch_allowed");
  assertBoolean(policy.delete_remote_branch_allowed, "git_policy.delete_remote_branch_allowed");
  assertBoolean(policy.remove_worktree_allowed, "git_policy.remove_worktree_allowed");
  assertBoolean(policy.cleanup_delivery_directory_allowed, "git_policy.cleanup_delivery_directory_allowed");

  assertEnum(policy.merge_strategy, ["none", "fast_forward_only", "merge_commit", "squash"], "git_policy.merge_strategy");

  assertNullableString(policy.commit_message, "git_policy.commit_message");
  assertNullableString(policy.push_target, "git_policy.push_target");

  assertArrayOfStrings(policy.remote_branches_allowed_to_delete, "git_policy.remote_branches_allowed_to_delete");

  for (const branch of [
    policy.current_branch,
    policy.target_branch,
    ...policy.remote_branches_allowed_to_delete,
  ]) {
    if (typeof branch !== "string" || branch.length === 0 || branch.startsWith("-") || branch.includes("..")) {
      fail(`unsafe git branch or ref: ${branch}`);
    }
  }

  if (!policy.allow_create_local_branch && policy.current_branch !== policy.target_branch) {
    fail("target_branch differs while local branch creation is forbidden");
  }
  if (policy.commit_allowed && (policy.commit_count < 1)) {
    fail("commit_count must be positive when commit is allowed");
  }
  if (!policy.commit_allowed && policy.commit_count !== 0) {
    fail("commit_count must be 0 when commit is forbidden");
  }
  if (policy.commit_allowed && typeof policy.commit_message !== "string") {
    fail("commit_message is required when commit is allowed");
  }
  if (!policy.push_allowed && policy.push_target !== null) {
    fail("push_target must be null when push is forbidden");
  }
  if (policy.push_allowed && (typeof policy.push_target !== "string" || policy.push_target.length === 0)) {
    fail("push_target is required when push is allowed");
  }
  if (!policy.merge_allowed && policy.merge_strategy !== "none") {
    fail("merge_strategy must be none when merge is forbidden");
  }
  if (policy.pr_required && !policy.pr_creation_allowed) {
    fail("pr_creation_allowed must be true when PR is required");
  }
  if (!policy.delete_remote_branch_allowed && policy.remote_branches_allowed_to_delete.length !== 0) {
    fail("remote deletion targets must be empty when deletion is forbidden");
  }
}

// ── Contract validation ──

function validateContract(contract) {
  assertExactObject(contract, "canonical_contract");
  assertNoExtraFields(contract, [
    "task_id", "task_version", "title", "goal", "why_now", "repository",
    "source_branch", "source_commit", "confirmed_facts", "frozen_decisions",
    "analysis", "scope", "inputs", "expected_outputs", "acceptance_criteria",
    "validation_plan", "stop_conditions", "evidence_requirements",
    "execution_plan", "git_policy", "change_control",
  ], "canonical_contract");

  assertNonEmptyString(contract.task_id, "canonical_contract.task_id");
  assertInteger(contract.task_version, "canonical_contract.task_version");
  if (contract.task_version < 1) fail("task_version must be positive");
  assertNonEmptyString(contract.title, "canonical_contract.title");
  assertNonEmptyString(contract.goal, "canonical_contract.goal");
  assertNonEmptyString(contract.why_now, "canonical_contract.why_now");
  assertNonEmptyString(contract.repository, "canonical_contract.repository");
  assertNonEmptyString(contract.source_branch, "canonical_contract.source_branch");
  assertCommit(contract.source_commit, "canonical_contract.source_commit");
  assertArrayOfStrings(contract.confirmed_facts, "canonical_contract.confirmed_facts");
  assertArrayOfStrings(contract.frozen_decisions, "canonical_contract.frozen_decisions");

  // analysis
  assertExactObject(contract.analysis, "canonical_contract.analysis");
  assertNoExtraFields(contract.analysis, [
    "impact_analysis", "cross_file_relations", "selected_approach",
    "rejected_approaches", "risks",
  ], "canonical_contract.analysis");
  assertArrayOfStrings(contract.analysis.impact_analysis, "analysis.impact_analysis");
  assertArrayOfStrings(contract.analysis.cross_file_relations, "analysis.cross_file_relations");
  assertNonEmptyString(contract.analysis.selected_approach, "analysis.selected_approach");
  assertArrayOfStrings(contract.analysis.rejected_approaches, "analysis.rejected_approaches");
  assertArrayOfStrings(contract.analysis.risks, "analysis.risks");

  // scope
  assertExactObject(contract.scope, "canonical_contract.scope");
  assertNoExtraFields(contract.scope, [
    "allowed_paths", "forbidden_paths", "allowed_actions", "forbidden_actions",
  ], "canonical_contract.scope");
  assertArrayOfStrings(contract.scope.allowed_paths, "scope.allowed_paths");
  assertArrayOfStrings(contract.scope.forbidden_paths, "scope.forbidden_paths");
  assertArrayOfStrings(contract.scope.allowed_actions, "scope.allowed_actions");
  assertArrayOfStrings(contract.scope.forbidden_actions, "scope.forbidden_actions");

  for (const candidate of [...contract.scope.allowed_paths, ...contract.scope.forbidden_paths]) {
    if (!isSafePath(candidate)) fail(`unsafe repository path: ${candidate}`);
  }

  // inputs/outputs
  assertArrayOfStrings(contract.inputs, "inputs");
  assertArrayOfStrings(contract.expected_outputs, "expected_outputs");
  assertArrayOfStrings(contract.acceptance_criteria, "acceptance_criteria");
  assertArrayOfStrings(contract.validation_plan, "validation_plan");
  assertArrayOfStrings(contract.stop_conditions, "stop_conditions");
  assertArrayOfStrings(contract.evidence_requirements, "evidence_requirements");

  // execution_plan
  assertExactObject(contract.execution_plan, "execution_plan");
  assertNoExtraFields(contract.execution_plan, ["phases", "stepwise_steps"], "execution_plan");
  assertArrayOfStrings(contract.execution_plan.phases, "execution_plan.phases");
  assertArray(contract.execution_plan.stepwise_steps, "execution_plan.stepwise_steps");
  for (const step of contract.execution_plan.stepwise_steps) {
    assertExactObject(step, "stepwise_step");
    assertNoExtraFields(step, [
      "step_id", "action", "command", "expected_result", "stop_on_failure",
    ], "stepwise_step");
    assertNonEmptyString(step.step_id, `step.${step.step_id}.step_id`);
    assertNonEmptyString(step.action, `step.${step.step_id}.action`);
    assertNonEmptyString(step.command, `step.${step.step_id}.command`);
    assertNonEmptyString(step.expected_result, `step.${step.step_id}.expected_result`);
    assertBoolean(step.stop_on_failure, `step.${step.step_id}.stop_on_failure`);
  }

  validateGitPolicy(contract.git_policy);

  // change_control
  assertExactObject(contract.change_control, "change_control");
  assertNoExtraFields(contract.change_control, [
    "single_source_of_truth", "ambiguity_policy",
    "executor_may_change_approach", "new_authorization_required_for",
  ], "change_control");
  if (contract.change_control.single_source_of_truth !== "canonical_handoff_contract") {
    fail("single_source_of_truth must be canonical_handoff_contract");
  }
  if (contract.change_control.ambiguity_policy !== "stop_and_request_clarification") {
    fail("ambiguity_policy must be stop_and_request_clarification");
  }
  if (contract.change_control.executor_may_change_approach !== false) {
    fail("executor_may_change_approach must be false");
  }
  assertArrayOfStrings(contract.change_control.new_authorization_required_for, "new_authorization_required_for");
}

// ── Context validation ──

function validateContext(context, contract) {
  assertExactObject(context, "context_package");
  assertNoExtraFields(context, [
    "task_id", "task_version", "must_know_facts", "frozen_decisions",
    "relevant_files", "prohibited_reinterpretations", "open_questions",
    "excluded_context",
  ], "context_package");

  assertNonEmptyString(context.task_id, "context_package.task_id");
  assertInteger(context.task_version, "context_package.task_version");
  assertArrayOfStrings(context.must_know_facts, "must_know_facts");
  assertArrayOfStrings(context.frozen_decisions, "frozen_decisions");
  assertArrayOfStrings(context.relevant_files, "relevant_files");
  assertArrayOfStrings(context.prohibited_reinterpretations, "prohibited_reinterpretations");
  assertArrayOfStrings(context.open_questions, "open_questions");
  assertArrayOfStrings(context.excluded_context, "excluded_context");

  if (context.task_id !== contract.task_id || context.task_version !== contract.task_version) {
    fail("context package task identity does not match canonical contract");
  }
  for (const candidate of context.relevant_files) {
    if (!isSafePath(candidate)) fail(`unsafe relevant file path: ${candidate}`);
  }
}

// ── Bundle validation ──

function validateBundle(bundle) {
  assertExactObject(bundle, "bundle");
  assertNoExtraFields(bundle, [
    "executor_profile", "canonical_contract", "context_package", "git_policy",
    "execution_plan", "change_control",
  ], "bundle");
  validateProfile(bundle.executor_profile);
  validateContract(bundle.canonical_contract);
  validateContext(bundle.context_package, bundle.canonical_contract);
  validateSecrets(bundle);
}

// ── Feedback validation ──

const EXECUTOR_FEEDBACK_COMMON = [
  "feedback_type", "task_id", "task_version", "executor_id",
  "source_commit", "current_state", "completed_steps", "evidence",
  "workspace_state", "next_required_action",
];

const EXECUTOR_EXTRA = {
  reception_ack: [
    "understood_goal", "allowed_scope", "forbidden_scope",
    "planned_validation", "ambiguities", "can_start", "git_policy_acknowledged",
  ],
  clarification_request: [
    "current_step", "missing_fact", "why_required", "affected_scope",
    "available_options", "can_continue_without_answer",
  ],
  progress_checkpoint: [
    "passed_gates", "current_step", "staged_state", "side_effects", "safe_resume_point",
  ],
  failure_stop_report: [
    "last_successful_gate", "failed_step", "raw_error", "interpreted_cause",
    "staged_state", "side_effects", "safe_resume_point", "required_decision",
  ],
  execution_result: [
    "result_state", "changed_files", "deleted_files", "tests", "diff_stat",
    "commit_sha", "remote_sha", "artifacts", "limitations", "uncompleted_items", "git_operations",
  ],
  review_response: [
    "review_id", "accepted_changes", "unchanged_scope", "resume_point",
    "planned_fix", "validation_plan", "ready_to_resume",
  ],
};

function validateExecutorFeedback(fb) {
  const fields = EXECUTOR_FEEDBACK_COMMON;
  const extra = EXECUTOR_EXTRA[fb.feedback_type];
  if (!extra) fail(`unsupported executor feedback_type: ${fb.feedback_type}`);
  const allFields = [...fields, ...extra];

  assertExactObject(fb, `feedback(${fb.feedback_type})`);
  assertNoExtraFields(fb, allFields, `feedback(${fb.feedback_type})`);

  validateCommonFeedbackFields(fb);

  // Type-specific validation
  if (fb.feedback_type === "reception_ack") {
    assertNonEmptyString(fb.understood_goal, "understood_goal");
    assertArrayOfStrings(fb.allowed_scope, "allowed_scope");
    assertArrayOfStrings(fb.forbidden_scope, "forbidden_scope");
    assertArrayOfStrings(fb.planned_validation, "planned_validation");
    assertArrayOfStrings(fb.ambiguities, "ambiguities");
    assertBoolean(fb.can_start, "can_start");

    assertExactObject(fb.git_policy_acknowledged, "git_policy_acknowledged");
    assertNoExtraFields(fb.git_policy_acknowledged, [
      "actual_branch", "actual_head", "target_branch", "push_target",
      "remote_delete_targets", "matches_contract",
    ], "git_policy_acknowledged");
    assertNonEmptyString(fb.git_policy_acknowledged.actual_branch, "gpa.actual_branch");
    assertNonEmptyString(fb.git_policy_acknowledged.actual_head, "gpa.actual_head");
    assertNonEmptyString(fb.git_policy_acknowledged.target_branch, "gpa.target_branch");
    assertArrayOfStrings(fb.git_policy_acknowledged.remote_delete_targets, "gpa.remote_delete_targets");
    assertBoolean(fb.git_policy_acknowledged.matches_contract, "gpa.matches_contract");
  }

  if (fb.feedback_type === "execution_result") {
    assertArrayOfStrings(fb.changed_files, "changed_files");
    assertArrayOfStrings(fb.deleted_files, "deleted_files");
    assertArray(fb.tests, "tests");
    for (const test of fb.tests) {
      assertExactObject(test, "test_item");
      assertNonEmptyString(test.command, "test.command");
      if (test.exit_code !== 0) fail(`test ${test.command} exit_code must be 0`);
      if (test.result !== "passed") fail(`test ${test.command} result must be "passed"`);
    }
    assertArrayOfStrings(fb.artifacts, "artifacts");
    assertArrayOfStrings(fb.limitations, "limitations");
    assertArrayOfStrings(fb.uncompleted_items, "uncompleted_items");

    assertExactObject(fb.git_operations, "git_operations");
    assertNoExtraFields(fb.git_operations, [
      "starting_branch", "starting_head", "created_local_branches",
      "created_remote_branches", "commit_sha", "push_target", "remote_sha",
      "merge_strategy", "merge_result", "deleted_remote_branches",
      "cleanup_actions", "final_branch", "final_head", "final_status",
    ], "git_operations");
    assertNonEmptyString(fb.git_operations.starting_branch, "git_ops.starting_branch");
    assertArrayOfStrings(fb.git_operations.created_local_branches, "git_ops.created_local_branches");
    assertArrayOfStrings(fb.git_operations.created_remote_branches, "git_ops.created_remote_branches");
    assertArrayOfStrings(fb.git_operations.deleted_remote_branches, "git_ops.deleted_remote_branches");
    assertArrayOfStrings(fb.git_operations.cleanup_actions, "git_ops.cleanup_actions");
    assertNonEmptyString(fb.git_operations.merge_strategy, "git_ops.merge_strategy");
    assertNonEmptyString(fb.git_operations.merge_result, "git_ops.merge_result");
    assertNonEmptyString(fb.git_operations.final_branch, "git_ops.final_branch");
    assertNonEmptyString(fb.git_operations.final_head, "git_ops.final_head");
    assertNonEmptyString(fb.git_operations.final_status, "git_ops.final_status");
  }

  if (fb.feedback_type === "failure_stop_report") {
    assertArray(fb.side_effects, "side_effects");
    if (fb.side_effects.length !== 0) fail("failure_stop_report side_effects must be []");
  }
}

function validateReviewFeedback(fb) {
  assertExactObject(fb, "review_feedback");
  const fields = [
    "feedback_type", "review_id", "task_id", "task_version", "reviewer_id",
    "reviewed_commit", "review_state", "blocking_findings", "non_blocking_findings",
    "required_changes", "unchanged_scope", "resume_from", "new_authorization",
    "next_required_action",
  ];
  assertNoExtraFields(fb, fields, "review_feedback");

  if (fb.feedback_type !== "review_feedback") fail("feedback_type must be review_feedback");
  assertNonEmptyString(fb.review_id, "review_id");
  assertNonEmptyString(fb.task_id, "task_id");
  assertInteger(fb.task_version, "task_version");
  if (fb.task_version < 1) fail("task_version must be positive");
  assertNonEmptyString(fb.reviewer_id, "reviewer_id");
  assertCommit(fb.reviewed_commit, "reviewed_commit");
  assertEnum(fb.review_state, ["accepted", "changes_required", "blocked"], "review_state");
  assertArrayOfStrings(fb.blocking_findings, "blocking_findings");
  assertArrayOfStrings(fb.non_blocking_findings, "non_blocking_findings");
  assertArrayOfStrings(fb.required_changes, "required_changes");
  assertArrayOfStrings(fb.unchanged_scope, "unchanged_scope");
  assertNonEmptyString(fb.resume_from, "resume_from");
  assertArrayOfStrings(fb.new_authorization, "new_authorization");
  assertNonEmptyString(fb.next_required_action, "next_required_action");
}

function validateExecutorSwitchCheckpoint(fb) {
  assertExactObject(fb, "executor_switch_checkpoint");
  const fields = [
    "feedback_type", "task_id", "task_version", "source_commit",
    "previous_executor_id", "next_executor_id", "next_execution_guidance_tier",
    "branch", "worktree", "current_commit", "completed_steps", "remaining_steps",
    "passed_gates", "failure_history", "side_effects", "do_not_repeat",
    "safe_resume_point", "next_required_action",
  ];
  assertNoExtraFields(fb, fields, "executor_switch_checkpoint");

  if (fb.feedback_type !== "executor_switch_checkpoint") fail("feedback_type must be executor_switch_checkpoint");
  assertNonEmptyString(fb.task_id, "task_id");
  assertInteger(fb.task_version, "task_version");
  if (fb.task_version < 1) fail("task_version must be positive");
  assertCommit(fb.source_commit, "source_commit");
  assertNonEmptyString(fb.previous_executor_id, "previous_executor_id");
  assertNonEmptyString(fb.next_executor_id, "next_executor_id");
  assertEnum(fb.next_execution_guidance_tier, ["compact_controlled", "stepwise_controlled"], "next_execution_guidance_tier");
  assertNonEmptyString(fb.branch, "branch");
  assertNonEmptyString(fb.worktree, "worktree");
  assertCommit(fb.current_commit, "current_commit");
  assertArrayOfStrings(fb.completed_steps, "completed_steps");
  assertArrayOfStrings(fb.remaining_steps, "remaining_steps");
  assertArrayOfStrings(fb.passed_gates, "passed_gates");
  assertArrayOfStrings(fb.failure_history, "failure_history");
  assertArrayOfStrings(fb.side_effects, "side_effects");
  assertArrayOfStrings(fb.do_not_repeat, "do_not_repeat");
  assertNonEmptyString(fb.safe_resume_point, "safe_resume_point");
  assertNonEmptyString(fb.next_required_action, "next_required_action");
}

function validateFeedback(fb) {
  assertExactObject(fb, "feedback");
  const fbType = fb.feedback_type;
  if (!fbType || typeof fbType !== "string") fail("feedback_type is required");
  assertEnum(fbType, ALL_FEEDBACK_TYPES, "feedback_type");

  if (EXECUTOR_FEEDBACK_TYPES.includes(fbType)) {
    validateExecutorFeedback(fb);
  } else if (fbType === "review_feedback") {
    validateReviewFeedback(fb);
  } else if (fbType === "executor_switch_checkpoint") {
    validateExecutorSwitchCheckpoint(fb);
  }

  validateSecrets(fb);
}

// ── Main ──

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!["bundle", "feedback"].includes(mode) || !file) {
    console.error("Usage: validate-handoff.mjs <bundle|feedback> <json-file>");
    process.exit(2);
  }
  const value = JSON.parse(await readFile(file, "utf8"));
  if (mode === "bundle") validateBundle(value);
  else validateFeedback(value);
  console.log(`planner-executor-handoff ${mode} validation passed`);
}

main().catch((error) => {
  console.error(`planner-executor-handoff validation failed: ${error.message}`);
  process.exit(1);
});

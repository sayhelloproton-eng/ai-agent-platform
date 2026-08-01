#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  /\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}/i,
];

const COMMON_FEEDBACK = [
  "feedback_type", "task_id", "task_version", "executor_id",
  "source_commit", "current_state", "completed_steps", "evidence",
  "workspace_state", "next_required_action",
];

const EXTRA = {
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

function fail(message) {
  throw new Error(message);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
}

function requireFields(value, fields, label) {
  for (const field of fields) {
    if (!(field in value)) fail(`${label} missing ${field}`);
  }
}

function assertCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    fail(`${label} must be a 40-character lowercase commit SHA`);
  }
}

function isSafePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (path.isAbsolute(value)) return false;
  return !value.split(/[\\/]+/).includes("..");
}

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

function validateProfile(profile) {
  requireObject(profile, "executor_profile");
  requireFields(profile, [
    "executor_id", "platform", "model", "execution_guidance_tier",
    "classification_source", "tools", "repository_access", "network_access",
    "approval_mode", "allowed_tactical_discretion", "known_limits",
  ], "executor_profile");
  if (!["compact_controlled", "stepwise_controlled"].includes(profile.execution_guidance_tier)) {
    fail("unsupported execution_guidance_tier");
  }
}


function validateGitPolicy(policy) {
  requireObject(policy, "canonical_contract.git_policy");
  requireFields(policy, [
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
  if (policy.commit_allowed && (!Number.isInteger(policy.commit_count) || policy.commit_count < 1)) {
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

function validateContract(contract) {
  requireObject(contract, "canonical_contract");
  requireFields(contract, [
    "task_id", "task_version", "title", "goal", "why_now", "repository",
    "source_branch", "source_commit", "confirmed_facts", "frozen_decisions",
    "analysis", "scope", "inputs", "expected_outputs", "acceptance_criteria",
    "validation_plan", "stop_conditions", "evidence_requirements",
    "execution_plan", "git_policy", "change_control",
  ], "canonical_contract");
  assertCommit(contract.source_commit, "canonical_contract.source_commit");
  if (!Number.isInteger(contract.task_version) || contract.task_version < 1) {
    fail("task_version must be a positive integer");
  }
  requireFields(contract.analysis, [
    "impact_analysis", "cross_file_relations", "selected_approach",
    "rejected_approaches", "risks",
  ], "canonical_contract.analysis");
  requireFields(contract.scope, [
    "allowed_paths", "forbidden_paths", "allowed_actions", "forbidden_actions",
  ], "canonical_contract.scope");
  for (const candidate of [...contract.scope.allowed_paths, ...contract.scope.forbidden_paths]) {
    if (!isSafePath(candidate)) fail(`unsafe repository path: ${candidate}`);
  }
  requireFields(contract.execution_plan, ["phases", "stepwise_steps"], "execution_plan");
  validateGitPolicy(contract.git_policy);
  if (contract.change_control.single_source_of_truth !== "canonical_handoff_contract") {
    fail("single_source_of_truth must be canonical_handoff_contract");
  }
  if (contract.change_control.executor_may_change_approach !== false) {
    fail("executor_may_change_approach must be false");
  }
}

function validateContext(context, contract) {
  requireObject(context, "context_package");
  requireFields(context, [
    "task_id", "task_version", "must_know_facts", "frozen_decisions",
    "relevant_files", "prohibited_reinterpretations", "open_questions",
    "excluded_context",
  ], "context_package");
  if (context.task_id !== contract.task_id || context.task_version !== contract.task_version) {
    fail("context package task identity does not match canonical contract");
  }
  for (const candidate of context.relevant_files) {
    if (!isSafePath(candidate)) fail(`unsafe relevant file path: ${candidate}`);
  }
}

function validateBundle(bundle) {
  requireFields(bundle, ["executor_profile", "canonical_contract", "context_package"], "bundle");
  validateProfile(bundle.executor_profile);
  validateContract(bundle.canonical_contract);
  validateContext(bundle.context_package, bundle.canonical_contract);
  validateSecrets(bundle);
}

function validateFeedback(feedback) {
  requireFields(feedback, COMMON_FEEDBACK, "feedback");
  const extra = EXTRA[feedback.feedback_type];
  if (!extra) fail(`unsupported feedback_type ${feedback.feedback_type}`);
  requireFields(feedback, extra, feedback.feedback_type);
  assertCommit(feedback.source_commit, "feedback.source_commit");
  requireFields(feedback.workspace_state, ["branch", "head", "status"], "workspace_state");
  if (feedback.feedback_type === "reception_ack") {
    requireFields(feedback.git_policy_acknowledged, [
      "actual_branch", "actual_head", "target_branch", "push_target",
      "remote_delete_targets", "matches_contract",
    ], "git_policy_acknowledged");
  }
  if (feedback.feedback_type === "execution_result") {
    requireFields(feedback.git_operations, [
      "starting_branch", "starting_head", "created_local_branches",
      "created_remote_branches", "commit_sha", "push_target", "remote_sha",
      "merge_strategy", "merge_result", "deleted_remote_branches",
      "cleanup_actions", "final_branch", "final_head", "final_status",
    ], "git_operations");
  }
  validateSecrets(feedback);
}

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

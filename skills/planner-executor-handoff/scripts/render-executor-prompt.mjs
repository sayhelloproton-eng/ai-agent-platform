#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

function section(title, values) {
  const body = Array.isArray(values)
    ? values.map((value) => `- ${value}`).join("\n")
    : String(values);
  return `## ${title}\n\n${body}\n`;
}

function renderCompact(profile, contract, context) {
  return [
    `# ${contract.title}`,
    "",
    "Use the Canonical Handoff Contract as the only task truth.",
    "",
    section("Execution authority", [
      `Guidance tier: ${profile.execution_guidance_tier}`,
      `Execution authority: ${profile.execution_authority}`,
      `Delivery mode: ${contract.delivery_mode}`,
      `Overlay root: ${contract.frozen_artifacts?.overlay_root ?? "none"}`,
      `Manifest: ${contract.frozen_artifacts?.manifest_path ?? "none"}`,
      `Frozen file count: ${contract.frozen_artifacts?.file_count ?? 0}`,
      `Byte comparison required: ${contract.frozen_artifacts?.byte_compare_required ?? false}`,
    ]),
    section("Canonical identity", [
      `Task ID: ${contract.task_id}`,
      `Task version: ${contract.task_version}`,
      `Executor ID: ${profile.executor_id}`,
      `Source commit: ${contract.source_commit}`,
    ]),
    section("Goal", contract.goal),
    section("Why now", contract.why_now),
    section("Repository baseline", [
      `Repository: ${contract.repository}`,
      `Branch: ${contract.source_branch}`,
      `Source commit: ${contract.source_commit}`,
    ]),
    section("Confirmed facts", contract.confirmed_facts),
    section("Frozen decisions", contract.frozen_decisions),
    section("Impact analysis", contract.analysis.impact_analysis),
    section("Cross-file relations", contract.analysis.cross_file_relations),
    section("Selected approach", contract.analysis.selected_approach),
    section("Allowed paths", contract.scope.allowed_paths),
    section("Forbidden paths", contract.scope.forbidden_paths),
    section("Context access", [
      `Mode: ${contract.context_access.mode}`,
      `Files: ${contract.context_access.files.join(", ") || "none"}`,
      `Content source: ${contract.context_access.content_source}`,
      `User approval: ${contract.context_access.user_approval}`,
    ]),
    section("Git Operating Policy", [
      `Workspace strategy: ${contract.git_policy.workspace_strategy}`,
      `Current branch: ${contract.git_policy.current_branch}`,
      `Target branch: ${contract.git_policy.target_branch}`,
      `Target remote: ${contract.git_policy.target_remote}`,
      `Create local branch: ${contract.git_policy.allow_create_local_branch}`,
      `Create remote branch: ${contract.git_policy.allow_create_remote_branch}`,
      `Commit allowed/count: ${contract.git_policy.commit_allowed}/${contract.git_policy.commit_count}`,
      `Commit message: ${contract.git_policy.commit_message}`,
      `Push target: ${contract.git_policy.push_target}`,
      `PR required/allowed: ${contract.git_policy.pr_required}/${contract.git_policy.pr_creation_allowed}`,
      `Merge allowed/strategy: ${contract.git_policy.merge_allowed}/${contract.git_policy.merge_strategy}`,
      `Rebase allowed: ${contract.git_policy.rebase_allowed}`,
      `Cherry-pick allowed: ${contract.git_policy.cherry_pick_allowed}`,
      `Force-push allowed: ${contract.git_policy.force_push_allowed}`,
      `Remote deletion allowed: ${contract.git_policy.delete_remote_branch_allowed}`,
      `Remote deletion targets: ${contract.git_policy.remote_branches_allowed_to_delete.join(", ") || "none"}`,
      `Remove Worktree: ${contract.git_policy.remove_worktree_allowed}`,
      `Cleanup delivery directory: ${contract.git_policy.cleanup_delivery_directory_allowed}`,
    ]),
    section("Execution phases", contract.execution_plan.phases),
    section("Validation", contract.validation_plan),
    section("Acceptance", contract.acceptance_criteria),
    section("Stop conditions", contract.stop_conditions),
    section("Evidence required", contract.evidence_requirements),
    section("Relevant files", context.relevant_files),
    "Do not change the goal, frozen approach, scope, dependency policy, or acceptance criteria.",
    "Return Reception Ack before writes and a structured final feedback artifact.",
    "",
  ].join("\n");
}

function renderStepwise(profile, contract, context) {
  const parts = [
    `# ${contract.title}`,
    "",
    "This is a `stepwise_controlled` task.",
    "The current Chat already completed the analysis and selected the approach.",
    "Do not infer missing decisions, redesign the task, expand scope, repair the Contract, or edit frozen artifact content.",
    "",
    section("Execution authority", [
      `Guidance tier: ${profile.execution_guidance_tier}`,
      `Execution authority: ${profile.execution_authority}`,
      `Delivery mode: ${contract.delivery_mode}`,
      `Overlay root: ${contract.frozen_artifacts?.overlay_root ?? "none"}`,
      `Manifest: ${contract.frozen_artifacts?.manifest_path ?? "none"}`,
      `Frozen file count: ${contract.frozen_artifacts?.file_count ?? 0}`,
      `Byte comparison required: ${contract.frozen_artifacts?.byte_compare_required ?? false}`,
    ]),
    section("Canonical identity", [
      `Task ID: ${contract.task_id}`,
      `Task version: ${contract.task_version}`,
      `Executor ID: ${profile.executor_id}`,
      `Source commit: ${contract.source_commit}`,
    ]),
    section("Goal", contract.goal),
    section("Why now", contract.why_now),
    section("Confirmed facts", contract.confirmed_facts),
    section("Frozen decisions", contract.frozen_decisions),
    section("Impact analysis", contract.analysis.impact_analysis),
    section("Cross-file relations", contract.analysis.cross_file_relations),
    section("Selected approach", contract.analysis.selected_approach),
    section("Rejected approaches", contract.analysis.rejected_approaches),
    section("Risks", contract.analysis.risks),
    section("Allowed paths", contract.scope.allowed_paths),
    section("Forbidden paths", contract.scope.forbidden_paths),
    section("Allowed actions", contract.scope.allowed_actions),
    section("Forbidden actions", contract.scope.forbidden_actions),
    section("Context access", [
      `Mode: ${contract.context_access.mode}`,
      `Files: ${contract.context_access.files.join(", ") || "none"}`,
      `Content source: ${contract.context_access.content_source}`,
      `User approval: ${contract.context_access.user_approval}`,
    ]),
    section("Git Operating Policy", [
      `Workspace strategy: ${contract.git_policy.workspace_strategy}`,
      `Current branch: ${contract.git_policy.current_branch}`,
      `Target branch: ${contract.git_policy.target_branch}`,
      `Target remote: ${contract.git_policy.target_remote}`,
      `Create local branch: ${contract.git_policy.allow_create_local_branch}`,
      `Create remote branch: ${contract.git_policy.allow_create_remote_branch}`,
      `Commit allowed/count: ${contract.git_policy.commit_allowed}/${contract.git_policy.commit_count}`,
      `Commit message: ${contract.git_policy.commit_message}`,
      `Push target: ${contract.git_policy.push_target}`,
      `PR required/allowed: ${contract.git_policy.pr_required}/${contract.git_policy.pr_creation_allowed}`,
      `Merge allowed/strategy: ${contract.git_policy.merge_allowed}/${contract.git_policy.merge_strategy}`,
      `Rebase allowed: ${contract.git_policy.rebase_allowed}`,
      `Cherry-pick allowed: ${contract.git_policy.cherry_pick_allowed}`,
      `Force-push allowed: ${contract.git_policy.force_push_allowed}`,
      `Remote deletion allowed: ${contract.git_policy.delete_remote_branch_allowed}`,
      `Remote deletion targets: ${contract.git_policy.remote_branches_allowed_to_delete.join(", ") || "none"}`,
      `Remove Worktree: ${contract.git_policy.remove_worktree_allowed}`,
      `Cleanup delivery directory: ${contract.git_policy.cleanup_delivery_directory_allowed}`,
    ]),
    section("Relevant files", context.relevant_files),
    section("Do not reinterpret", context.prohibited_reinterpretations),
    "## Required execution order",
    "",
  ];
  for (const step of contract.execution_plan.stepwise_steps) {
    parts.push(
      `### ${step.step_id} — ${step.action}`,
      "",
      "```bash",
      step.command,
      "```",
      "",
      `Expected: ${step.expected_result}`,
      `Stop on failure: ${step.stop_on_failure ? "yes" : "no"}`,
      "",
    );
  }
  parts.push(
    section("Validation", contract.validation_plan),
    section("Acceptance", contract.acceptance_criteria),
    section("Stop conditions", contract.stop_conditions),
    section("Evidence required", contract.evidence_requirements),
    "## Feedback",
    "",
    "- Write Reception Ack before any repository change and confirm the Git Operating Policy.",
    "- On ambiguity, write Clarification Request and stop.",
    "- On a failed gate, write Failure / Stop Report and stop.",
    "- On completion, write Execution Result with commands, exit codes, complete Git operations, commit, remote SHA, deletions, artifacts, and workspace state.",
    "",
  );
  return parts.join("\n");
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: render-executor-prompt.mjs <handoff-bundle.json>");
    process.exit(2);
  }
  const check = spawnSync(process.execPath, [path.join(DIR, "validate-handoff.mjs"), "bundle", file], { encoding: "utf8" });
  if (check.status !== 0) {
    process.stderr.write(check.stderr || check.stdout);
    process.exit(1);
  }
  const bundle = JSON.parse(await readFile(file, "utf8"));
  const { executor_profile: profile, canonical_contract: contract, context_package: context } = bundle;
  process.stdout.write(
    profile.execution_guidance_tier === "compact_controlled"
      ? renderCompact(profile, contract, context)
      : renderStepwise(profile, contract, context),
  );
}

main().catch((error) => {
  console.error(`prompt rendering failed: ${error.message}`);
  process.exit(1);
});

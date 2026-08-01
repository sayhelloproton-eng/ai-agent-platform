#!/usr/bin/env node
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = path.join(ROOT, "scripts");
const EXAMPLES = path.join(ROOT, "assets", "examples");
const VALIDATE = path.join(SCRIPTS, "validate-handoff.mjs");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function runFail(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status === 0) {
    throw new Error(`${command} ${args.join(" ")} should have failed but exited 0`);
  }
  return result;
}

// ── Positive tests ──

const compactBundle = path.join(EXAMPLES, "handoff-bundle-compact.json");
const stepwiseBundle = path.join(EXAMPLES, "handoff-bundle-stepwise.json");

// 1. Both bundles validate
run(process.execPath, [VALIDATE, "bundle", compactBundle]);
run(process.execPath, [VALIDATE, "bundle", stepwiseBundle]);

// 2. All eight artifact types validate
const allArtifacts = [
  "reception-ack.json",
  "clarification-request.json",
  "progress-checkpoint.json",
  "failure-stop-report.json",
  "execution-result.json",
  "review-feedback.json",
  "review-response.json",
  "executor-switch-checkpoint.json",
];
for (const filename of allArtifacts) {
  run(process.execPath, [VALIDATE, "feedback", path.join(EXAMPLES, filename)]);
}

// 3. Compact and stepwise share the same contract identity
const compact = JSON.parse(await readFile(compactBundle, "utf8"));
const stepwise = JSON.parse(await readFile(stepwiseBundle, "utf8"));
for (const key of ["task_id", "task_version", "goal", "source_commit"]) {
  if (compact.canonical_contract[key] !== stepwise.canonical_contract[key]) {
    throw new Error(`tier bundles disagree on ${key}`);
  }
}

// 4. review_feedback.review_id == review_response.review_id
const reviewFb = JSON.parse(await readFile(path.join(EXAMPLES, "review-feedback.json"), "utf8"));
const reviewResp = JSON.parse(await readFile(path.join(EXAMPLES, "review-response.json"), "utf8"));
if (reviewFb.review_id !== reviewResp.review_id) {
  throw new Error("review_feedback.review_id != review_response.review_id");
}

// 5. Review Feedback and Review Response share task_id and task_version
if (reviewFb.task_id !== reviewResp.task_id || reviewFb.task_version !== reviewResp.task_version) {
  throw new Error("review_feedback and review_response task identity mismatch");
}

// 6. Executor Switch shares task_id, task_version, source_commit with bundle
const switchCp = JSON.parse(await readFile(path.join(EXAMPLES, "executor-switch-checkpoint.json"), "utf8"));
const contract = stepwise.canonical_contract;
if (switchCp.task_id !== contract.task_id || switchCp.task_version !== contract.task_version || switchCp.source_commit !== contract.source_commit) {
  throw new Error("executor_switch_checkpoint does not match bundle contract identity");
}

// 7. Reception Ack executor_id matches executor_profile.executor_id
const receptionAck = JSON.parse(await readFile(path.join(EXAMPLES, "reception-ack.json"), "utf8"));
if (receptionAck.executor_id !== stepwise.executor_profile.executor_id) {
  throw new Error("reception_ack.executor_id != executor_profile.executor_id");
}

// 8. Executor Switch next_executor_id == stepwise executor_profile.executor_id
if (switchCp.next_executor_id !== stepwise.executor_profile.executor_id) {
  throw new Error("executor_switch.next_executor_id != stepwise executor_profile.executor_id");
}
if (!switchCp.safe_resume_point || switchCp.safe_resume_point.length === 0) {
  throw new Error("executor_switch safe_resume_point must be non-empty");
}
if (!switchCp.do_not_repeat || switchCp.do_not_repeat.length === 0) {
  throw new Error("executor_switch do_not_repeat must be non-empty");
}

// Prompt rendering tests
const compactPrompt = run(process.execPath, [path.join(SCRIPTS, "render-executor-prompt.mjs"), compactBundle]);
const stepwisePrompt = run(process.execPath, [path.join(SCRIPTS, "render-executor-prompt.mjs"), stepwiseBundle]);

for (const marker of [
  "PEH-EVAL-001",
  "374f07b7ede3593400bf8631994fb1e91a4123bd",
  "Selected approach",
  "Stop conditions",
  "Evidence required",
  "Git Operating Policy",
]) {
  if (!compactPrompt.includes(marker) || !stepwisePrompt.includes(marker)) {
    throw new Error(`both prompt tiers must include ${marker}`);
  }
}
if (compactPrompt.includes("### S01")) {
  throw new Error("compact prompt must not render step-by-step commands");
}
if (!stepwisePrompt.includes("### S01") || !stepwisePrompt.includes("Reception Ack") || !stepwisePrompt.includes("Create remote branch: false")) {
  throw new Error("stepwise prompt must render exact steps and feedback requirements");
}

// ── Negative tests ──

const TMP = await mkdtemp(path.join(tmpdir(), "peh-neg-"));

async function writeNeg(name, obj) {
  const p = path.join(TMP, name);
  await writeFile(p, JSON.stringify(obj, null, 2));
  return p;
}

// Reception Ack: can_start = "yes" (should fail)
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg01.json", { ...receptionAck, can_start: "yes" })]);

// Reception Ack: git_policy_acknowledged.matches_contract = "no"
const badAck = JSON.parse(JSON.stringify(receptionAck));
badAck.git_policy_acknowledged.matches_contract = "no";
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg02.json", badAck)]);

// Execution Result: tests = "all passed" (should fail)
const badResult = JSON.parse(await readFile(path.join(EXAMPLES, "execution-result.json"), "utf8"));
badResult.tests = "all passed";
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg03.json", badResult)]);

// Execution Result: git_operations.created_local_branches = "none"
const badResult2 = JSON.parse(await readFile(path.join(EXAMPLES, "execution-result.json"), "utf8"));
badResult2.git_operations.created_local_branches = "none";
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg04.json", badResult2)]);

// Bundle: executor_profile.tools = "shell"
const badBundle1 = JSON.parse(JSON.stringify(stepwise));
badBundle1.executor_profile.tools = "shell";
runFail(process.execPath, [VALIDATE, "bundle", await writeNeg("neg05.json", badBundle1)]);

// Bundle: canonical_contract.task_version = "1"
const badBundle2 = JSON.parse(JSON.stringify(stepwise));
badBundle2.canonical_contract.task_version = "1";
runFail(process.execPath, [VALIDATE, "bundle", await writeNeg("neg06.json", badBundle2)]);

// Bundle: git_policy.allow_create_remote_branch = "false"
const badBundle3 = JSON.parse(JSON.stringify(stepwise));
badBundle3.canonical_contract.git_policy.allow_create_remote_branch = "false";
runFail(process.execPath, [VALIDATE, "bundle", await writeNeg("neg07.json", badBundle3)]);

// Bundle: source_commit = "abc"
const badBundle4 = JSON.parse(JSON.stringify(stepwise));
badBundle4.canonical_contract.source_commit = "abc";
runFail(process.execPath, [VALIDATE, "bundle", await writeNeg("neg08.json", badBundle4)]);

// Bundle: git_policy.current_branch = "-bad"
const badBundle5 = JSON.parse(JSON.stringify(stepwise));
badBundle5.canonical_contract.git_policy.current_branch = "-bad";
runFail(process.execPath, [VALIDATE, "bundle", await writeNeg("neg09.json", badBundle5)]);

// Any artifact: unexpected field
const badAck2 = JSON.parse(JSON.stringify(receptionAck));
badAck2.unexpected_field = true;
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg10.json", badAck2)]);

// Review Feedback: review_state is invalid enum
const badReviewFb = JSON.parse(JSON.stringify(reviewFb));
badReviewFb.review_state = "pending";
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg11.json", badReviewFb)]);

// Executor Switch: task_id differs from bundle (validator validates independently, cross-artifact is self-test positive)
// Replaced with: missing required field in executor_switch
const badSwitch = JSON.parse(JSON.stringify(switchCp));
delete badSwitch.branch;
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg12.json", badSwitch)]);

// Executor Switch: safe_resume_point = ""
const badSwitch2 = JSON.parse(JSON.stringify(switchCp));
badSwitch2.safe_resume_point = "";
runFail(process.execPath, [VALIDATE, "feedback", await writeNeg("neg13.json", badSwitch2)]);

// Cleanup temp dir
await rm(TMP, { recursive: true, force: true });

console.log("planner-executor-handoff self-test passed");

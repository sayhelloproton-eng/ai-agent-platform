#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPTS = path.join(ROOT, "scripts");
const EXAMPLES = path.join(ROOT, "assets", "examples");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

const compactBundle = path.join(EXAMPLES, "handoff-bundle-compact.json");
const stepwiseBundle = path.join(EXAMPLES, "handoff-bundle-stepwise.json");

run(process.execPath, [path.join(SCRIPTS, "validate-handoff.mjs"), "bundle", compactBundle]);
run(process.execPath, [path.join(SCRIPTS, "validate-handoff.mjs"), "bundle", stepwiseBundle]);

for (const feedback of ["reception-ack.json", "failure-stop-report.json", "execution-result.json"]) {
  run(process.execPath, [
    path.join(SCRIPTS, "validate-handoff.mjs"),
    "feedback",
    path.join(EXAMPLES, feedback),
  ]);
}

const compactPrompt = run(process.execPath, [
  path.join(SCRIPTS, "render-executor-prompt.mjs"),
  compactBundle,
]);
const stepwisePrompt = run(process.execPath, [
  path.join(SCRIPTS, "render-executor-prompt.mjs"),
  stepwiseBundle,
]);

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

const compact = JSON.parse(await readFile(compactBundle, "utf8"));
const stepwise = JSON.parse(await readFile(stepwiseBundle, "utf8"));
for (const key of ["task_id", "task_version", "goal", "source_commit"]) {
  if (compact.canonical_contract[key] !== stepwise.canonical_contract[key]) {
    throw new Error(`tier bundles disagree on ${key}`);
  }
}

console.log("planner-executor-handoff self-test passed");

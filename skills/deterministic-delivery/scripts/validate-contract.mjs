#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/validate-contract.mjs <contract.json>");
  process.exit(2);
}
const file = path.resolve(process.cwd(), input);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const required = [
  "version", "execution_mode", "base_commit", "branch",
  "knowledge_content_frozen", "archive", "overlay_paths",
  "delete_paths", "validation_commands", "commit_message",
  "push_remote", "push_branch", "stop_on_failure", "skill_policy",
];
for (const key of required) if (!(key in data)) errors.push(`missing ${key}`);
if (data.version !== 1) errors.push("version must be 1");
if (!["deterministic_delivery", "continuation"].includes(data.execution_mode)) {
  errors.push("invalid execution_mode");
}
if (!/^[0-9a-f]{40}$/.test(data.base_commit ?? "")) errors.push("base_commit must be 40 lowercase hex characters");
if (data.knowledge_content_frozen !== true) errors.push("knowledge_content_frozen must be true");
if (data.stop_on_failure !== true) errors.push("stop_on_failure must be true");

function validatePaths(name, values) {
  if (!Array.isArray(values)) {
    errors.push(`${name} must be an array`);
    return [];
  }
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) errors.push(`${name} contains an invalid path`);
    if (path.isAbsolute(value) || value.split(/[\\/]+/).includes("..")) errors.push(`${name} contains an unsafe path: ${value}`);
    if (seen.has(value)) errors.push(`${name} contains a duplicate path: ${value}`);
    seen.add(value);
  }
  return [...seen];
}
const overlay = validatePaths("overlay_paths", data.overlay_paths);
const deletes = validatePaths("delete_paths", data.delete_paths);
validatePaths("empty_directories", data.empty_directories ?? []);
for (const value of overlay) if (deletes.includes(value)) errors.push(`overlay/delete overlap: ${value}`);
if (!Array.isArray(data.validation_commands) || data.validation_commands.length === 0) errors.push("validation_commands must be non-empty");
if (data.skill_policy?.deterministic_delivery !== "full") errors.push("deterministic_delivery skill policy must be full");
if (!["contract_reference_only", "not_required"].includes(data.skill_policy?.ai_knowledge)) errors.push("invalid ai_knowledge skill policy");
if (data.execution_mode === "continuation") {
  for (const key of ["resume_from", "prior_gates", "new_authorization"]) {
    if (!(key in data)) errors.push(`continuation missing ${key}`);
  }
}
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  execution_mode: data.execution_mode,
  overlay_count: overlay.length,
  delete_count: deletes.length,
}, null, 2));

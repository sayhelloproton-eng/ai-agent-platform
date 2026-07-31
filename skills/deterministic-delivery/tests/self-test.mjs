#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "MANIFEST.json"), "utf8"));
const actualFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else actualFiles.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
}
walk(root);
actualFiles.sort();
const manifestFiles = [...manifest.files].sort();
if (manifest.file_count !== actualFiles.length) {
  throw new Error(`manifest file_count ${manifest.file_count} != ${actualFiles.length}`);
}
if (JSON.stringify(manifestFiles) !== JSON.stringify(actualFiles)) {
  throw new Error("MANIFEST.json file list does not match actual files");
}

function run(relative, expectedStatus) {
  const result = spawnSync("node", ["scripts/validate-contract.mjs", relative], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== expectedStatus) {
    console.error(result.stdout, result.stderr);
    throw new Error(`${relative} expected status ${expectedStatus}, got ${result.status}`);
  }
  return result;
}
run("assets/examples/deterministic-delivery.json", 0);
run("assets/examples/continuation.json", 0);
const invalid = run("tests/fixtures/invalid-overlap.json", 1);
if (!invalid.stderr.includes("overlay/delete overlap")) throw new Error("invalid overlap was not reported");

const skill = fs.readFileSync(path.join(root, "SKILL.md"), "utf8");
for (const marker of [
  "deterministic_delivery",
  "continuation",
  "--no-renames",
  "/usr/bin/cmp",
  "ruby -e",
  "rmdir",
]) {
  if (!skill.includes(marker)) throw new Error(`SKILL.md missing ${marker}`);
}
console.log(JSON.stringify({ ok: true, valid_examples: 2, invalid_examples: 1 }, null, 2));

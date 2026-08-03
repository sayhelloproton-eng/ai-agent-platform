#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function run(kind,rel,expected){const r=spawnSync("node",["scripts/validate-synthesis.mjs",kind,rel],{cwd:root,encoding:"utf8"});if(r.status!==expected){console.error(r.stdout,r.stderr);throw new Error(`${rel} expected ${expected}, got ${r.status}`);}return r;}
run("request","assets/examples/00-project-entry-request.json",0);
run("result","tests/pilots/00-project-entry/synthesis-result.json",0);
const invalid=run("result","tests/fixtures/invalid-unapproved-write.json",1);
if(!invalid.stderr.includes("output_contract") || !invalid.stderr.includes("human approval")) throw new Error("invalid write fixture did not report governance failures");
const skill=fs.readFileSync(path.join(root,"SKILL.md"),"utf8");
for(const marker of ["Freeze Scope","Classify Claims","Map Overlap","Compute Downstream Impact","candidate, not a write instruction","Visual-heavy chapter synthesis guardrails","provisional visual information map"]) if(!skill.includes(marker)) throw new Error(`SKILL.md missing ${marker}`);
console.log(JSON.stringify({ok:true,valid_requests:1,valid_results:1,invalid_results:1,pilot:"00-project-entry"},null,2));

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"MANIFEST.json"),"utf8"));
const actual=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,entry.name);if(entry.isDirectory())walk(abs);else actual.push(path.relative(root,abs).split(path.sep).join("/"));}}
walk(root); actual.sort();
const declared=[...manifest.files].sort();
if(manifest.file_count!==actual.length) throw new Error(`manifest file_count ${manifest.file_count} != ${actual.length}`);
if(JSON.stringify(declared)!==JSON.stringify(actual)) throw new Error("MANIFEST file list mismatch");
function run(kind,rel,expected){const r=spawnSync("node",["scripts/validate-synthesis.mjs",kind,rel],{cwd:root,encoding:"utf8"});if(r.status!==expected){console.error(r.stdout,r.stderr);throw new Error(`${rel} expected ${expected}, got ${r.status}`);}return r;}
run("request","assets/examples/00-project-entry-request.json",0);
run("result","tests/pilots/00-project-entry/synthesis-result.json",0);
const invalid=run("result","tests/fixtures/invalid-unapproved-write.json",1);
if(!invalid.stderr.includes("output_contract") || !invalid.stderr.includes("human approval")) throw new Error("invalid write fixture did not report governance failures");
const skill=fs.readFileSync(path.join(root,"SKILL.md"),"utf8");
for(const marker of ["Freeze Scope","Classify Claims","Map Overlap","Compute Downstream Impact","candidate, not a write instruction"]) if(!skill.includes(marker)) throw new Error(`SKILL.md missing ${marker}`);
console.log(JSON.stringify({ok:true,valid_requests:1,valid_results:1,invalid_results:1,pilot:"00-project-entry"},null,2));

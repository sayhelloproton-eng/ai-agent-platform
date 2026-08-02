#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const run=(file,ok)=>{const r=spawnSync(process.execPath,[path.join(root,"scripts/validate-document.mjs"),file],{cwd:root,encoding:"utf8"});if((r.status===0)!==ok)throw new Error(`${file} unexpected status ${r.status}
${r.stderr}`);};
run("tests/fixtures/valid/README.md",true);run("tests/fixtures/invalid.md",false);
const skill=fs.readFileSync(path.join(root,"SKILL.md"),"utf8");
for(const marker of ["Human-first, AI-lossless","project-knowledge-synthesis","project-knowledge-governance","AI 可读语义镜像"])if(!skill.includes(marker))throw new Error(`missing ${marker}`);
console.log(JSON.stringify({ok:true,valid:1,invalid:1},null,2));

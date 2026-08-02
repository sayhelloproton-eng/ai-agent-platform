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
for(const marker of ["Human-first, AI-lossless","project-knowledge-synthesis","project-knowledge-governance","AI 可读语义镜像","05-formal-diagram-style.md","Stage A — freeze the document text","中文（English）","clickable first-party Markdown links"])if(!skill.includes(marker))throw new Error(`missing ${marker}`);
const style=fs.readFileSync(path.join(root,"references/05-formal-diagram-style.md"),"utf8");
for(const marker of ["portfolio-ready","grid-aligned","editable SVG","Generation rule","frozen document information map","Density and refinement gate"])if(!style.includes(marker))throw new Error(`missing visual style marker ${marker}`);
console.log(JSON.stringify({ok:true,valid:1,invalid:1,formal_diagram_style:true},null,2));

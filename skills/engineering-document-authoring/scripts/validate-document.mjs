#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file=process.argv[2];
if(!file){console.error("Usage: node scripts/validate-document.mjs <document.md>");process.exit(2);}
const abs=path.resolve(file), text=fs.readFileSync(abs,"utf8"), dir=path.dirname(abs), errors=[];
if(/asset:\/\//.test(text)) errors.push("asset:// is retired; use a document-local relative path");
const image=/!\[[^\]]+\]\(([^)]+)\)/g; let match; let count=0;
while((match=image.exec(text))){
  count++; const ref=match[1].trim();
  if(/^https?:\/\//i.test(ref)||path.isAbsolute(ref)||ref.split(/[\\/]+/).includes("..")) errors.push(`unsafe or external image path: ${ref}`);
  if(!ref.startsWith("./assets/")) errors.push(`image must be inside ./assets/: ${ref}`);
  const target=path.resolve(dir,ref); if(!fs.existsSync(target)) errors.push(`missing image: ${ref}`);
  const after=text.slice(match.index+match[0].length, match.index+match[0].length+500);
  if(!/^\s*\n\s*### AI 可读语义镜像/m.test(after)) errors.push(`image lacks immediate AI-readable semantic mirror: ${ref}`);
}
if(errors.length){for(const e of errors) console.error(`- ${e}`);process.exit(1);}
console.log(JSON.stringify({ok:true,file:path.relative(process.cwd(),abs),images:count},null,2));

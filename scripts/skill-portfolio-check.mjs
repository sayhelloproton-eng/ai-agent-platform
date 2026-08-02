import fs from "node:fs";
import path from "node:path";
const root=process.cwd(),skillRoot=path.join(root,"skills");
const active=["planner-executor-handoff","project-knowledge-synthesis","engineering-document-authoring","project-knowledge-governance","engineering-insight-distillation","custom-gpt-actions"];
const retired=["deterministic-delivery","ai-knowledge","microsoft-dev-tunnels"];
const errors=[];
for(const name of active){
  const dir=path.join(skillRoot,name),file=path.join(dir,"SKILL.md"),agent=path.join(dir,"agents/openai.yaml");
  if(!fs.existsSync(file)){errors.push(`${name}: missing SKILL.md`);continue;}
  if(!fs.existsSync(agent))errors.push(`${name}: missing agents/openai.yaml`);
  const text=fs.readFileSync(file,"utf8"),m=text.match(/^---\n([\s\S]*?)\n---/);
  if(!m){errors.push(`${name}: invalid frontmatter`);continue;}
  const keys=[...m[1].matchAll(/^([a-z_]+):/gm)].map(x=>x[1]).sort();
  if(JSON.stringify(keys)!==JSON.stringify(["description","name"]))errors.push(`${name}: frontmatter keys must be name and description only`);
  if(!m[1].includes(`name: ${name}`))errors.push(`${name}: name mismatch`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)||name.length>64)errors.push(`${name}: invalid skill name`);
  const description=(m[1].match(/^description:\s*(.+)$/m)||[])[1]||"";
  if(!/(Use|use|用于|触发)/.test(description))errors.push(`${name}: description lacks positive trigger language`);
  if(!/(Do not|do not|不要|不用于|不得)/.test(description))errors.push(`${name}: description lacks negative trigger language`);
  if(description.length>1024)errors.push(`${name}: description exceeds 1024 characters`);
  for(const extra of ["README.md","CHANGELOG.md","MANIFEST.json"]){if(fs.existsSync(path.join(dir,extra)))errors.push(`${name}: redundant root ${extra}`);}
}
function filesUnder(dir){if(!fs.existsSync(dir))return [];const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isDirectory())out.push(...filesUnder(target));else if(entry.isFile()||entry.isSymbolicLink())out.push(target);}return out;}
for(const name of retired){const files=filesUnder(path.join(skillRoot,name));if(files.length)errors.push(`retired skill still materialized: ${name} (${files.length} files)`);}
if(errors.length){for(const e of errors)console.error(`Skill portfolio check failed: ${e}`);process.exit(1);}console.log(`Skill portfolio check passed: ${active.length} active, ${retired.length} retired.`);

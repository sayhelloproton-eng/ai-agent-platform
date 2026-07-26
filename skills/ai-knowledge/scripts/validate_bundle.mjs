#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const required=['SKILL.md','README.md','references/00-shared-rules.md','references/01-architecture-and-boundaries.md','references/02-project-profile.md','references/03-knowledge-model.md','references/04-retrieval-policy.md','references/05-write-governance.md','references/06-feishu-provider.md','references/07-workflows.md','assets/ai-agent-platform.json','assets/schemas/context-package.schema.json','scripts/lark_read.mjs','scripts/build_index.mjs','scripts/query_index.mjs','scripts/render_draft.mjs','scripts/lark_write.mjs'];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));if(missing.length){console.error('Missing:',missing);process.exit(1);}
const skill=fs.readFileSync(path.join(root,'SKILL.md'),'utf8');if(!skill.startsWith('---\n')||!/^name:\s*ai-knowledge$/m.test(skill)||!/^description:/m.test(skill)){console.error('Invalid SKILL.md frontmatter');process.exit(1);}
for(const f of fs.readdirSync(path.join(root,'assets/schemas'))){if(f.endsWith('.json'))JSON.parse(fs.readFileSync(path.join(root,'assets/schemas',f),'utf8'));}
const profile=JSON.parse(fs.readFileSync(path.join(root,'assets/ai-agent-platform.json'),'utf8'));if(Object.keys(profile.feishu.root_nodes||{}).length!==15)throw new Error('Expected 15 root nodes');
console.log(JSON.stringify({ok:true,skill:'ai-knowledge',required_files:required.length,root_nodes:15},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const required=['SKILL.md','README.md','references/00-shared-rules.md','references/01-architecture-and-boundaries.md','references/02-project-profile.md','references/03-knowledge-model.md','references/04-retrieval-policy.md','references/05-write-governance.md','references/06-feishu-provider.md','references/07-workflows.md','references/11-feishu-publishing.md','assets/ai-agent-platform.json','assets/schemas/context-package.schema.json','scripts/lark_read.mjs','scripts/build_index.mjs','scripts/query_index.mjs','scripts/render_draft.mjs','scripts/lark_write.mjs'];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
if(missing.length){console.error('Missing:',missing);process.exit(1);}
const skill=fs.readFileSync(path.join(root,'SKILL.md'),'utf8');
if(!skill.startsWith('---\n')||!/^name:\s*ai-knowledge$/m.test(skill)||!/^version:\s*1\.2\.0$/m.test(skill)){throw new Error('Invalid SKILL.md frontmatter/version');}
for(const f of fs.readdirSync(path.join(root,'assets/schemas'))){if(f.endsWith('.json'))JSON.parse(fs.readFileSync(path.join(root,'assets/schemas',f),'utf8'));}
const profile=JSON.parse(fs.readFileSync(path.join(root,'assets/ai-agent-platform.json'),'utf8'));
if(profile.project.canonical_source!=='git') throw new Error('Git must be canonical source');
if(profile.canonical_entries.current_status!=='context/current-status.md') throw new Error('Invalid Git current status path');
if(profile.layers.knowledge.root!=='docs/knowledge/'||profile.layers.knowledge.projection_eligible!==true) throw new Error('Invalid Knowledge Layer');
if(profile.projection.source_root!=='docs/knowledge/') throw new Error('Invalid projection source');
if(profile.projection.target_provider!=='feishu') throw new Error('Invalid projection target');
if(profile.projection.direction!=='git_to_feishu'||profile.projection.reverse_write_allowed!==false) throw new Error('Projection must be one way');
if(profile.projection.publish_requires_reviewed_git!==true||profile.projection.publish_requires_confirmation!==true) throw new Error('Projection gates are required');
console.log(JSON.stringify({ok:true,skill:'ai-knowledge',version:'1.2.0',canonical_source:'git',knowledge_source:'docs/knowledge/',projection_target:'feishu',projection_direction:'git_to_feishu',required_files:required.length},null,2));

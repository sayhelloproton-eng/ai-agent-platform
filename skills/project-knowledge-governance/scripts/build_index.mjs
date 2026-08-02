#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
import { readJson, writeJson, listMarkdown } from './lib/files.mjs';
function mapArgs(argv) { const m={}; for(let i=0;i<argv.length;i++){if(argv[i].startsWith('--')){const k=argv[i].slice(2);m[k]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}} return m; }
function frontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3); if (end < 0) return {};
  const out={}; for(const line of text.slice(3,end).split(/\r?\n/)){const i=line.indexOf(':'); if(i>0) out[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');} return out;
}
function tokens(text){return [...new Set((text.toLowerCase().match(/[a-z0-9_-]+|[\u4e00-\u9fff]{1,8}/g)||[]))].slice(0,200);}
const a=mapArgs(process.argv.slice(2)); if(!a.tree||!a.out){console.error('Usage: build_index.mjs --tree tree.json --pages pagesDir --out index.json');process.exit(2);}
const tree=readJson(a.tree); const pageFiles=listMarkdown(a.pages||''); const byToken=new Map();
for(const file of pageFiles){const text=fs.readFileSync(file,'utf8');const fm=frontmatter(text);const token=fm.node_token||fm.obj_token;if(token)byToken.set(token,{file,frontmatter:fm,text});}
const nodes=Array.isArray(tree.nodes)?tree.nodes:Array.isArray(tree)?tree:[];
const items=nodes.map((n,idx)=>{const p=byToken.get(n.node_token)||byToken.get(n.obj_token);const body=p?.text||'';return {id:n.node_token||n.obj_token||`node-${idx}`,title:n.title||p?.frontmatter?.title||'',path:n.path||[],depth:n.depth||0,node_token:n.node_token||'',obj_token:n.obj_token||'',obj_type:n.obj_type||'',source_url:p?.frontmatter?.source_url||'',updated_time:n.updated_time||p?.frontmatter?.updated_time||null,local_file:p?path.relative(process.cwd(),p.file):null,has_content:Boolean(p),size_chars:body.length,terms:tokens(`${n.title||''} ${(n.path||[]).join(' ')} ${body.slice(0,2000)}`)}}); 
writeJson(a.out,{schema_version:'1.0',generated_at:new Date().toISOString(),count:items.length,items}); console.log(`Indexed ${items.length} items -> ${a.out}`);

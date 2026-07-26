#!/usr/bin/env node
import { readJson } from './lib/files.mjs';
function mapArgs(argv){const m={};for(let i=0;i<argv.length;i++){if(argv[i].startsWith('--')){const k=argv[i].slice(2);m[k]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}}return m;}
function terms(s){return s.toLowerCase().match(/[a-z0-9_-]+|[\u4e00-\u9fff]{1,8}/g)||[];}
const a=mapArgs(process.argv.slice(2)); if(!a.index||!a.query){console.error('Usage: query_index.mjs --index index.json --query text [--top 8]');process.exit(2);}
const index=readJson(a.index), q=terms(a.query), top=Number(a.top||8);
const ranked=index.items.map(item=>{let score=0;const title=(item.title||'').toLowerCase(),pth=(item.path||[]).join(' ').toLowerCase(),set=new Set(item.terms||[]);for(const t of q){if(title.includes(t))score+=5;if(pth.includes(t))score+=2;if(set.has(t))score+=3;}if(item.obj_type&&item.obj_type!=='docx')score-=1;if(!item.has_content)score-=1;return {...item,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(b.updated_time||'').localeCompare(String(a.updated_time||''))).slice(0,top);
console.log(JSON.stringify({query:a.query,count:ranked.length,candidates:ranked.map(({terms,...x})=>x),reading_plan:ranked.map((x,i)=>({order:i+1,title:x.title,source:x.source_url||x.node_token,mode:i<3?'outline/section':'metadata-only'}))},null,2));

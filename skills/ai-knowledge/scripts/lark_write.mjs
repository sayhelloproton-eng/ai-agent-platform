#!/usr/bin/env node
import fs from 'node:fs';
import { run, parseJsonLoose } from './lib/cli.mjs';
import { assertRelative } from './lib/files.mjs';
function mapArgs(argv){const [command,...rest]=argv,m={command};for(let i=0;i<rest.length;i++){if(rest[i].startsWith('--')){const k=rest[i].slice(2);m[k]=rest[i+1]&&!rest[i+1].startsWith('--')?rest[++i]:true;}}return m;}
const a=mapArgs(process.argv.slice(2));if(!['create','overwrite','append'].includes(a.command)||!a.content){console.error('Usage: lark_write.mjs create --parent-token T --content relative.md [--apply --confirm I_APPROVE_FEISHU_WRITE] | overwrite|append --doc T --content relative.md');process.exit(2);}
assertRelative(a.content);if(!fs.existsSync(a.content))throw new Error(`Content file not found: ${a.content}`);
const applying=Boolean(a.apply);if(applying&&a.confirm!=='I_APPROVE_FEISHU_WRITE')throw new Error('Real write requires --confirm I_APPROVE_FEISHU_WRITE');
let argv=['docs'];
if(a.command==='create'){if(!a['parent-token'])throw new Error('--parent-token required');argv.push('+create','--content',`@${a.content}`,'--parent-token',a['parent-token']);}
else {if(!a.doc)throw new Error('--doc required');argv.push('+update','--doc',a.doc,'--command',a.command,'--content',`@${a.content}`);}
argv.push('--as',a.identity||'user','--format','json');if(!applying)argv.push('--dry-run');
const result=run('lark-cli',argv,{allowFailure:true});
if(result.status===10){console.error(result.stderr||result.stdout);console.error('Confirmation gate detected. Ask the user; do not auto-add --yes.');process.exit(10);}
if(result.status!==0){console.error(result.stderr||result.stdout);process.exit(result.status);}
try{console.log(JSON.stringify(parseJsonLoose(result.stdout),null,2));}catch{console.log(result.stdout);}

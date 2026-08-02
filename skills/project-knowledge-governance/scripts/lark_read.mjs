#!/usr/bin/env node
import { run, parseJsonLoose, deepFind } from './lib/cli.mjs';
import { writeJson, writeText, assertRelative } from './lib/files.mjs';

function argsToMap(argv) {
  const [command, ...rest] = argv;
  const map = { command };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2); const next = rest[i+1];
    map[key] = next && !next.startsWith('--') ? (i++, next) : true;
  }
  return map;
}
function cli(args) { return parseJsonLoose(run('lark-cli', args).stdout); }
function nodeFrom(data) { return deepFind(data, ['node']) || data?.data?.node || data; }
function normalizeNode(n) {
  return {
    title: n?.title || '', node_token: n?.node_token || n?.token || '', obj_token: n?.obj_token || '', obj_type: n?.obj_type || '',
    node_type: n?.node_type || '', parent_node_token: n?.parent_node_token || '', space_id: String(n?.space_id || ''), has_child: Boolean(n?.has_child),
    updated_time: n?.obj_edit_time || n?.updated_time || n?.edit_time || null
  };
}
async function resolve(ref, identity) {
  const data = cli(['wiki','+node-get','--node-token',ref,'--as',identity,'--format','json']);
  return normalizeNode(nodeFrom(data));
}
async function children(spaceId, parent, identity) {
  const data = cli(['wiki','+node-list','--space-id',spaceId,'--parent-node-token',parent,'--as',identity,'--page-all','--format','json']);
  const candidates = deepFind(data, ['items','nodes']);
  const arr = Array.isArray(candidates) ? candidates : [];
  return arr.map(normalizeNode);
}
async function walk(root, identity, maxDepth, maxNodes) {
  const out = [];
  async function visit(node, depth, path) {
    if (out.length >= maxNodes) return;
    const current = { ...node, depth, path: [...path, node.title] }; out.push(current);
    if (!node.has_child || depth >= maxDepth) return;
    for (const child of await children(node.space_id, node.node_token, identity)) await visit(child, depth + 1, current.path);
  }
  await visit(root, 0, []); return out;
}
const a = argsToMap(process.argv.slice(2));
const identity = a.identity || 'user';
if (!a.command || !a.ref) {
  console.error('Usage: lark_read.mjs resolve|tree|fetch --ref <url/token> [--identity user|bot] [--out relative/path]'); process.exit(2);
}
if (a.out) assertRelative(a.out);
if (a.command === 'resolve') {
  const result = await resolve(a.ref, identity); a.out ? writeJson(a.out, result) : console.log(JSON.stringify(result, null, 2));
} else if (a.command === 'tree') {
  const root = await resolve(a.ref, identity); const tree = await walk(root, identity, Number(a['max-depth'] || 4), Number(a['max-nodes'] || 200));
  const result = { root, count: tree.length, nodes: tree }; a.out ? writeJson(a.out, result) : console.log(JSON.stringify(result, null, 2));
} else if (a.command === 'fetch') {
  const mode = a.mode || 'markdown';
  const cliArgs = ['docs','+fetch','--doc',a.ref,'--as',identity,'--format','json'];
  if (mode === 'outline') cliArgs.push('--scope','outline','--max-depth',String(a['max-depth'] || 3));
  else cliArgs.push('--doc-format','markdown','--detail',a.detail || 'simple');
  const data = cli(cliArgs);
  const content = deepFind(data, ['content','markdown','document_content','text']);
  if (a.out) {
    if (typeof content === 'string') writeText(a.out, content); else writeJson(a.out, data);
  } else console.log(typeof content === 'string' ? content : JSON.stringify(data, null, 2));
} else { console.error(`Unknown command: ${a.command}`); process.exit(2); }

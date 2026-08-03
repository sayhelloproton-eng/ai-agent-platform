#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, parseJsonLoose, deepFind } from './lib/cli.mjs';
import { writeJson, writeText, assertRelative } from './lib/files.mjs';

function argsToMap(argv) {
  const [command, ...rest] = argv;
  const map = { command };
  for (let i = 0; i < rest.length; i += 1) {
    const argument = rest[i];
    if (!argument.startsWith('--')) continue;
    const key = argument.slice(2);
    const next = rest[i + 1];
    map[key] = next && !next.startsWith('--') ? (i += 1, next) : true;
  }
  return map;
}

function cli(args) {
  return parseJsonLoose(run('lark-cli', args).stdout);
}

export function nodeFromEnvelope(data) {
  return data?.data?.node ?? data?.node ?? data;
}

export function nodesFromEnvelope(data) {
  const nodes = data?.data?.nodes ?? data?.nodes;
  if (!Array.isArray(nodes)) {
    throw new Error('Feishu node-list response must contain data.nodes');
  }
  return nodes;
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Feishu node missing required ${field}`);
  }
  return value;
}

export function normalizeNode(node) {
  return {
    title: requiredString(node?.title, 'title'),
    node_token: requiredString(node?.node_token ?? node?.token, 'node_token'),
    obj_token: requiredString(node?.obj_token, 'obj_token'),
    obj_type: requiredString(node?.obj_type, 'obj_type'),
    node_type: node?.node_type ?? null,
    parent_node_token: node?.parent_node_token ?? null,
    space_id: requiredString(String(node?.space_id ?? ''), 'space_id'),
    has_child: Boolean(node?.has_child),
    updated_time: node?.obj_edit_time ?? node?.updated_time ?? node?.edit_time ?? null,
  };
}

export function buildWikiNodeDeleteArgs({ spaceId, nodeToken, identity = 'user', dryRun = true }) {
  const args = [
    'wiki', '+node-delete',
    '--space-id', requiredString(spaceId, 'space_id'),
    '--node-token', requiredString(nodeToken, 'node_token'),
    '--obj-type', 'wiki',
    '--as', identity,
    '--format', 'json',
  ];
  if (dryRun) args.push('--dry-run');
  else args.push('--yes');
  return args;
}

async function resolve(ref, identity) {
  const data = cli(['wiki', '+node-get', '--node-token', ref, '--as', identity, '--format', 'json']);
  return normalizeNode(nodeFromEnvelope(data));
}

async function children(spaceId, parent, identity) {
  const data = cli(['wiki', '+node-list', '--space-id', spaceId, '--parent-node-token', parent, '--as', identity, '--page-all', '--format', 'json']);
  return nodesFromEnvelope(data).map(normalizeNode);
}

export async function walk(root, identity, maxDepth, maxNodes, loadChildren = children) {
  const output = [];
  const parentsByToken = new Map();

  async function visit(node, depth, titles) {
    if (output.length >= maxNodes) return;
    const expectedParent = node.parent_node_token ?? null;
    if (parentsByToken.has(node.node_token) && parentsByToken.get(node.node_token) !== expectedParent) {
      throw new Error(`Feishu node ${node.node_token} has conflicting parents`);
    }
    if (parentsByToken.has(node.node_token)) return;
    parentsByToken.set(node.node_token, expectedParent);
    const current = { ...node, depth, path: [...titles, node.title] };
    output.push(current);
    if (!node.has_child || depth >= maxDepth) return;
    for (const child of await loadChildren(node.space_id, node.node_token, identity)) {
      await visit(child, depth + 1, current.path);
    }
  }

  await visit(root, 0, []);
  return output;
}

async function main() {
  const args = argsToMap(process.argv.slice(2));
  const identity = args.identity || 'user';
  if (!args.command || !args.ref) {
    console.error('Usage: lark_read.mjs resolve|tree|fetch --ref <url/token> [--identity user|bot] [--out relative/path]');
    process.exit(2);
  }
  if (args.out) assertRelative(args.out);

  if (args.command === 'resolve') {
    const result = await resolve(args.ref, identity);
    args.out ? writeJson(args.out, result) : console.log(JSON.stringify(result, null, 2));
  } else if (args.command === 'tree') {
    const root = await resolve(args.ref, identity);
    const tree = await walk(root, identity, Number(args['max-depth'] || 4), Number(args['max-nodes'] || 200));
    const result = { root, count: tree.length, nodes: tree };
    args.out ? writeJson(args.out, result) : console.log(JSON.stringify(result, null, 2));
  } else if (args.command === 'fetch') {
    const mode = args.mode || 'markdown';
    const cliArgs = ['docs', '+fetch', '--doc', args.ref, '--as', identity, '--format', 'json'];
    if (mode === 'outline') cliArgs.push('--scope', 'outline', '--max-depth', String(args['max-depth'] || 3));
    else cliArgs.push('--doc-format', 'markdown', '--detail', args.detail || 'simple');
    const data = cli(cliArgs);
    const content = deepFind(data, ['content', 'markdown', 'document_content', 'text']);
    if (args.out) {
      if (typeof content === 'string') writeText(args.out, content);
      else writeJson(args.out, data);
    } else {
      console.log(typeof content === 'string' ? content : JSON.stringify(data, null, 2));
    }
  } else {
    console.error(`Unknown command: ${args.command}`);
    process.exit(2);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();

#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildWikiNodeDeleteArgs,
  nodesFromEnvelope,
  normalizeNode,
  walk,
} from '../scripts/lark_read.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(root, 'tests/.tmp');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stderr}`);
  return result.stdout;
}

const index = 'tests/.tmp/index.json';
run(['scripts/build_index.mjs', '--tree', 'tests/fixtures/sample-tree.json', '--pages', 'tests/fixtures/pages', '--out', index]);
const result = JSON.parse(run(['scripts/query_index.mjs', '--index', index, '--query', 'Gateway Adapter ADR', '--top', '3']));
if (!result.candidates.some((candidate) => candidate.node_token === 'gateway')) throw new Error('Gateway not retrieved');

const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
for (const marker of ['Document Bundle', 'AI 可读语义镜像', 'project-knowledge-synthesis', 'engineering-document-authoring', 'apply_frozen_artifacts', 'Desired Projection', 'Mapping Diff']) {
  if (!skill.includes(marker)) throw new Error(`missing ${marker}`);
}

const envelope = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/lark-node-list-envelope.json'), 'utf8'));
const normalized = nodesFromEnvelope(envelope).map(normalizeNode);
if (normalized[0].node_token !== 'wikcnREDACTED001') throw new Error('data.nodes node_token not parsed');
if (normalized[0].space_id !== 'spcREDACTED001') throw new Error('data.nodes space_id not parsed');

const missingToken = { ...envelope.data.nodes[0] };
delete missingToken.node_token;
let missingTokenFailed = false;
try { normalizeNode(missingToken); } catch (error) { missingTokenFailed = /node_token/.test(error.message); }
if (!missingTokenFailed) throw new Error('missing node_token must fail');

const rootNode = normalizeNode({ ...envelope.data.nodes[0], parent_node_token: null, has_child: true });
let conflictingParentFailed = false;
try {
  await walk(rootNode, 'user', 4, 10, async () => [
    normalizeNode({ ...envelope.data.nodes[0], parent_node_token: 'wikcnOTHERPARENT' }),
  ]);
} catch (error) {
  conflictingParentFailed = /conflicting parents/.test(error.message);
}
if (!conflictingParentFailed) throw new Error('conflicting parent must fail');

const dryDelete = buildWikiNodeDeleteArgs({ spaceId: 'spcREDACTED001', nodeToken: 'wikcnREDACTED001', dryRun: true });
const applyDelete = buildWikiNodeDeleteArgs({ spaceId: 'spcREDACTED001', nodeToken: 'wikcnREDACTED001', dryRun: false });
if (dryDelete[dryDelete.indexOf('--obj-type') + 1] !== 'wiki' || dryDelete.includes('docx')) throw new Error('delete input token type must be wiki');
if (!dryDelete.includes('--dry-run') || !applyDelete.includes('--yes')) throw new Error('delete safety flags missing');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({
  ok: true,
  index: true,
  retrieval: true,
  boundaries: true,
  cli_envelope: 'data.nodes',
  missing_token_fails: true,
  conflicting_parent_fails: true,
  delete_token_type: 'wiki',
}, null, 2));

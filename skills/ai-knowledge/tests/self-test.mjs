#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skillText = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
for (const required of [
  'deterministic-delivery',
  'knowledge_content_frozen: true',
  'contract_reference_only',
  'continuation / resume',
]) {
  if (!skillText.includes(required)) {
    throw new Error(`SKILL.md missing trigger-boundary marker: ${required}`);
  }
}

const tmpRel = 'tests/.tmp-self-test';
const tmp = path.join(root, tmpRel);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

function run(args) {
  const r = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    process.exit(r.status || 1);
  }
  return r.stdout;
}

run(['scripts/validate_bundle.mjs']);
const indexRel = `${tmpRel}/index.json`;
run(['scripts/build_index.mjs', '--tree', 'tests/fixtures/sample-tree.json', '--pages', 'tests/fixtures/pages', '--out', indexRel]);
const q = run(['scripts/query_index.mjs', '--index', indexRel, '--query', 'Gateway Adapter ADR', '--top', '3']);
const data = JSON.parse(q);
if (!data.candidates.some(x => x.node_token === 'gateway')) throw new Error('Gateway not retrieved');
const draftRel = `${tmpRel}/experiment.md`;
run(['scripts/render_draft.mjs', '--event', 'tests/fixtures/sample-event.json', '--type', 'experiment', '--out', draftRel]);
if (!fs.readFileSync(path.join(root, draftRel), 'utf8').includes('不是匿名读取')) throw new Error('Draft missing limitation');
console.log(JSON.stringify({ ok: true, index_count: JSON.parse(fs.readFileSync(path.join(root, indexRel), 'utf8')).count, top_candidate: data.candidates[0].title, draft_created: true }, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assertRelative } from './lib/files.mjs';

const stateDir = process.argv[2];
if (!stateDir) {
  console.error('Usage: summarize-feishu-execution.mjs <relative-state-dir>');
  process.exit(2);
}
assertRelative(stateDir);

const required = [
  'desired-projection.json',
  'existing-tree.json',
  'mapping-diff.json',
  'operation-plan.json',
];
const documents = Object.fromEntries(required.map((file) => {
  const target = path.join(stateDir, file);
  if (!fs.existsSync(target)) throw new Error(`missing ${file}`);
  return [file, JSON.parse(fs.readFileSync(target, 'utf8'))];
}));

const sourceShas = new Set(Object.values(documents).map((document) => document.source_sha));
if (sourceShas.size !== 1 || !/^[0-9a-f]{40}$/.test([...sourceShas][0] ?? '')) {
  throw new Error('Mapping-first artifacts must share one full source_sha');
}

const desired = documents['desired-projection.json'];
const existing = documents['existing-tree.json'];
const diff = documents['mapping-diff.json'];
const plan = documents['operation-plan.json'];
const groups = desired.navigation_groups ?? [];
const desiredEntries = (desired.standalone_entries?.length ?? 0) + groups.reduce(
  (count, group) => count + 1 + (group.canonical_pages?.length ?? 0),
  0,
);
const deleteEntries = plan.delete_deepest_first ?? plan.delete ?? [];
const reuseEntries = plan.reuse ?? [];
const createEntries = plan.create ?? [];

function safeEntry(entry) {
  return {
    asset_id: entry.asset_id ?? null,
    title: entry.title ?? null,
    level: entry.level ?? null,
    parent: entry.parent ?? null,
  };
}

const summary = {
  ok: true,
  source_sha: [...sourceShas][0],
  mapping_first_artifacts: '4/4',
  desired_entries: diff.desired_count ?? desiredEntries,
  navigation_groups: groups.length,
  existing_nodes: existing.node_count ?? existing.nodes?.length ?? 0,
  reuse: reuseEntries.map(safeEntry),
  delete_count: deleteEntries.length,
  create: createEntries.map(safeEntry),
  hard_stop_after_readback: plan.hard_stop_after_readback === true,
};
const serialized = JSON.stringify(summary, null, 2);
if (/node_token|obj_token|https?:\/\//i.test(serialized)) {
  throw new Error('unsafe private mapping field in summary');
}
console.log(serialized);

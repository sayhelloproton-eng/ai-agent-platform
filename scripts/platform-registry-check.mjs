import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, "platform-registry");

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

function parseAssetBlocks(text) {
  const lines = text.split(/\r?\n/);
  const assets = [];
  let current = null;
  for (const line of lines) {
    const start = line.match(/^\s*-\s+asset_id:\s*(.+?)\s*$/);
    if (start) {
      if (current) assets.push(current);
      current = { asset_id: start[1].replace(/^['"]|['"]$/g, "") };
      continue;
    }
    if (!current) continue;
    const field = line.match(/^\s{2,}([a-z_]+):\s*(.*?)\s*$/);
    if (field) current[field[1]] = field[2].replace(/^['"]|['"]$/g, "");
  }
  if (current) assets.push(current);
  return assets;
}

function parseRelations(text) {
  const lines = text.split(/\r?\n/);
  const relations = [];
  let current = null;
  for (const line of lines) {
    const start = line.match(/^\s*-\s+from:\s*(.+?)\s*$/);
    if (start) {
      if (current) relations.push(current);
      current = { from: start[1].replace(/^['"]|['"]$/g, "") };
      continue;
    }
    if (!current) continue;
    const field = line.match(/^\s{2,}(type|to):\s*(.*?)\s*$/);
    if (field) current[field[1]] = field[2].replace(/^['"]|['"]$/g, "");
  }
  if (current) relations.push(current);
  return relations;
}

function parseRelationTypes(text) {
  return new Set([...text.matchAll(/^\s*-\s+id:\s*(.+?)\s*$/gm)].map((m) => m[1].replace(/^['"]|['"]$/g, "")));
}

function fail(message) {
  console.error(`Registry check failed: ${message}`);
  process.exitCode = 1;
}

async function main() {
  for (const rel of [
    "platform-registry/README.md",
    "platform-registry/AGENTS.md",
    "platform-registry/assets.yaml",
    "platform-registry/relations.yaml",
    "platform-registry/relation-types.yaml",
    "platform-registry/projections.yaml",
    "platform-registry/implementation-status.yaml",
    "platform-registry/releases.yaml",
    "platform-registry/generated/README.md",
  ]) {
    try { await access(path.join(ROOT, rel), constants.R_OK); }
    catch { fail(`missing required file ${rel}`); }
  }

  const assets = parseAssetBlocks(await read("platform-registry/assets.yaml"));
  const ids = new Set();
  for (const asset of assets) {
    if (!asset.asset_id) { fail("asset without asset_id"); continue; }
    if (ids.has(asset.asset_id)) fail(`duplicate asset_id ${asset.asset_id}`);
    ids.add(asset.asset_id);
    if (!asset.canonical_path) fail(`asset ${asset.asset_id} missing canonical_path`);
    if (asset.migration_state !== "planned" && asset.canonical_path) {
      try { await access(path.join(ROOT, asset.canonical_path), constants.F_OK); }
      catch { fail(`asset ${asset.asset_id} points to missing path ${asset.canonical_path}`); }
    }
  }

  const relationTypes = parseRelationTypes(await read("platform-registry/relation-types.yaml"));
  const relations = parseRelations(await read("platform-registry/relations.yaml"));
  for (const relation of relations) {
    if (!ids.has(relation.from)) fail(`relation source not registered: ${relation.from}`);
    if (!relationTypes.has(relation.type)) fail(`unknown relation type: ${relation.type}`);
    if (relation.to && !ids.has(relation.to)) fail(`relation target not registered: ${relation.to}`);
  }

  const projection = await read("platform-registry/projections.yaml");
  for (const required of [
    "direction: git_to_feishu",
    "mode: overwrite",
    "pre_read_content: false",
    "semantic_diff: false",
    "reverse_write: false",
  ]) {
    if (!projection.includes(required)) fail(`projection policy missing ${required}`);
  }

  if (!process.exitCode) {
    console.log(`Platform Registry check passed: ${assets.length} assets, ${relations.length} relations.`);
  }
}

await main();

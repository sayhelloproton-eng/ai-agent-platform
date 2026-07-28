#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { run, parseJsonLoose } from './lib/cli.mjs';
import { assertRelative } from './lib/files.mjs';

function mapArgs(argv) {
  const [command, ...rest] = argv;
  const m = { command };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) {
      const k = rest[i].slice(2);
      m[k] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    }
  }
  return m;
}

function findAssetRefs(content) {
  const refs = [];
  const re = /!\[([^\]]*)\]\(asset:\/\/([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    refs.push({ alt: m[1], assetPath: m[2], full: m[0] });
  }
  return refs;
}

function resolveAssetFile(markdownFile, assetPath) {
  const docDir = path.dirname(markdownFile);
  const filePath = path.join(docDir, assetPath);
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

function extractAssetFromBranch(assetPath) {
  const gitPath = `knowledge-assets:images/${assetPath}`;
  try {
    const buf = execSync(`git show "${gitPath}"`, { encoding: 'buffer', stdio: ['pipe', 'pipe', 'ignore'] });
    if (buf.length === 0) return null;
    const rel = `.tmp_asset_${Date.now()}_${path.basename(assetPath)}`;
    fs.writeFileSync(rel, buf);
    return rel;
  } catch { return null; }
}

function stripAssetRefs(content) {
  return content.replace(/!\[[^\]]*\]\(asset:\/\/[^)]+\)\n?/g, '');
}

function insertMedia(docToken, imageFile, selectionText, identity, applying) {
  const args = [
    'docs', '+media-insert',
    '--doc', docToken,
    '--file', imageFile,
    '--type', 'image',
    '--selection-with-ellipsis', selectionText,
    '--width', '1200',
    '--as', identity,
    '--format', 'json'
  ];
  if (!applying) args.push('--dry-run');
  const result = run('lark-cli', args, { allowFailure: true });
  if (result.status !== 0) {
    console.error(`Media insert failed for "${selectionText}": ${result.stderr || result.stdout}`);
    return null;
  }
  try { return JSON.parse(result.stdout); } catch { return null; }
}

function findAnchorHeader(content, assetPath) {
  const lines = content.split('\n');
  let lastH2 = null;
  for (const line of lines) {
    if (line.startsWith('## ')) lastH2 = line.slice(3).trim();
    if (line.includes(`asset://${assetPath}`)) return lastH2;
  }
  return null;
}

// --- Main ---
const a = mapArgs(process.argv.slice(2));
if (!['create', 'overwrite', 'append'].includes(a.command) || !a.content) {
  console.error('Usage: lark_write.mjs create --parent-token T --content relative.md [--apply --confirm I_APPROVE_FEISHU_WRITE] | overwrite|append --doc T --content relative.md');
  process.exit(2);
}
assertRelative(a.content);
if (!fs.existsSync(a.content)) throw new Error(`Content file not found: ${a.content}`);

const applying = Boolean(a.apply);
if (applying && a.confirm !== 'I_APPROVE_FEISHU_WRITE') throw new Error('Real write requires --confirm I_APPROVE_FEISHU_WRITE');

const identity = a.identity || 'user';
const content = fs.readFileSync(a.content, 'utf8');
const assetRefs = findAssetRefs(content);

// --- Phase 1: Push text content (strip asset:// refs) ---
let textContent = content;
let tmpTextFile = null;

if (assetRefs.length > 0) {
  textContent = stripAssetRefs(content);
  tmpTextFile = `.tmp_text_${Date.now()}.md`;
  fs.writeFileSync(tmpTextFile, textContent);
}

const contentFile = tmpTextFile || a.content;
let argv = ['docs'];
if (a.command === 'create') {
  if (!a['parent-token']) throw new Error('--parent-token required');
  argv.push('+create', '--content', `@${contentFile}`, '--parent-token', a['parent-token']);
} else {
  if (!a.doc) throw new Error('--doc required');
  argv.push('+update', '--doc', a.doc, '--command', a.command, '--content', `@${contentFile}`);
}
argv.push('--as', identity, '--format', 'json');
if (!applying) argv.push('--dry-run');

const textResult = run('lark-cli', argv, { allowFailure: true });
if (tmpTextFile) fs.unlinkSync(tmpTextFile);

if (textResult.status === 10) {
  console.error(textResult.stderr || textResult.stdout);
  console.error('Confirmation gate detected. Ask the user; do not auto-add --yes.');
  process.exit(10);
}
if (textResult.status !== 0) {
  console.error(textResult.stderr || textResult.stdout);
  process.exit(textResult.status);
}

let textOutput;
try { textOutput = parseJsonLoose(textResult.stdout); } catch { textOutput = textResult.stdout; }
console.log(JSON.stringify(textOutput, null, 2));

// --- Phase 2: Insert images ---
if (assetRefs.length === 0 || !applying) process.exit(0);

const docToken = a.doc || (textOutput?.data?.document?.document_id);
if (!docToken) {
  console.error('Warning: cannot determine doc token for image insertion');
  process.exit(0);
}

const mediaResults = [];
for (const ref of assetRefs) {
  const anchor = findAnchorHeader(content, ref.assetPath);
  if (!anchor) {
    console.error(`Warning: no anchor found for asset://${ref.assetPath}, skipping`);
    continue;
  }

  const localFile = resolveAssetFile(a.content, ref.assetPath);
  const imageFile = localFile || extractAssetFromBranch(ref.assetPath);
  if (!imageFile) {
    console.error(`Warning: asset not found: ${ref.assetPath}, skipping`);
    continue;
  }

  const result = insertMedia(docToken, imageFile, anchor, identity, applying);
  if (result) mediaResults.push({ path: ref.assetPath, anchor, result });
  if (imageFile !== localFile && imageFile.startsWith('.tmp_asset_')) fs.unlinkSync(imageFile);
}

if (mediaResults.length > 0) {
  console.error(`Inserted ${mediaResults.length}/${assetRefs.length} images.`);
  for (const r of mediaResults) {
    console.error(`  ✓ ${r.path} → after "${r.anchor}"`);
  }
}

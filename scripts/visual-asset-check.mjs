import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const VISUAL_ROOT = path.join(ROOT, "platform-registry/visual-assets");
const ASSET_ROOT = process.env.KNOWLEDGE_ASSETS_ROOT
  ? path.resolve(process.env.KNOWLEDGE_ASSETS_ROOT)
  : null;
const errors = [];

function fail(message) { errors.push(message); }
async function exists(file) { try { await access(file, constants.F_OK); return true; } catch { return false; } }
async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }
function hash(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function safeRelative(value, label) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value) || value.split(/[\\/]+/).includes("..")) {
    fail(`${label} is not a safe relative path: ${value}`); return false;
  }
  return true;
}
function readPngSize(buffer) {
  const sig = buffer.subarray(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const index = await readJson(path.join(VISUAL_ROOT, "index.json"));
if (index.visual_asset_count !== 10 || index.assets.length !== 10) fail("visual index must contain 10 assets");
const ids = new Set();
for (const entry of index.assets) {
  const id = entry.visual_asset_id;
  if (!/^VIS-\d{3}$/.test(id)) fail(`invalid visual id ${id}`);
  if (ids.has(id)) fail(`duplicate visual id ${id}`);
  ids.add(id);
  const manifestPath = path.join(VISUAL_ROOT, `${id}.json`);
  if (!(await exists(manifestPath))) { fail(`missing manifest ${id}`); continue; }
  const manifest = await readJson(manifestPath);
  for (const field of ["title","target_document","target_document_asset_id","source_documents","source_branch","source_svg","preview_png","asset_uri","width","height","svg_sha256","png_sha256"]) {
    if (!(field in manifest)) fail(`${id} missing ${field}`);
  }
  if (manifest.source_branch !== "knowledge-assets") fail(`${id} source branch`);
  if (manifest.width !== 1800 || manifest.height !== 1100) fail(`${id} dimensions`);
  if (!safeRelative(manifest.source_svg, `${id} source_svg`) || !safeRelative(manifest.preview_png, `${id} preview_png`)) continue;
  if (!manifest.asset_uri.startsWith("asset://") || !manifest.asset_uri.endsWith(".png")) fail(`${id} asset uri`);
  const docPath = path.join(ROOT, manifest.target_document);
  if (!(await exists(docPath))) fail(`${id} target document missing`);
  else {
    const text = await readFile(docPath, "utf8");
    if (!text.includes(`](${manifest.asset_uri})`)) fail(`${id} asset uri not embedded`);
    if (!text.includes(`Visual Asset ID：\`${id}\``)) fail(`${id} id not documented`);
  }
  if (ASSET_ROOT) {
    const svgPath = path.join(ASSET_ROOT, manifest.source_svg);
    const pngPath = path.join(ASSET_ROOT, manifest.preview_png);
    if (!(await exists(svgPath)) || !(await exists(pngPath))) { fail(`${id} asset files missing`); continue; }
    const svg = await readFile(svgPath);
    const png = await readFile(pngPath);
    if (hash(svg) !== manifest.svg_sha256) fail(`${id} svg hash`);
    if (hash(png) !== manifest.png_sha256) fail(`${id} png hash`);
    const svgText = svg.toString("utf8");
    for (const forbidden of ["<script", "<foreignObject", "javascript:", " onload=", " onclick="]) {
      if (svgText.toLowerCase().includes(forbidden.toLowerCase())) fail(`${id} unsafe svg token ${forbidden}`);
    }
    if (/(?:href|xlink:href)=["\']https?:\/\//i.test(svgText)) fail(`${id} external svg reference`);
    const size = readPngSize(png);
    if (!size || size.width !== 1800 || size.height !== 1100) fail(`${id} png size`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`Visual asset check failed: ${error}`);
  process.exit(1);
}
console.log(`Visual asset check passed: ${ids.size} assets${ASSET_ROOT ? " with source files" : ""}.`);

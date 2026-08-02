import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT=process.cwd();
const VISUAL_ROOT=path.join(ROOT,"platform-registry/visual-assets");
const errors=[];
function fail(m){errors.push(m);} async function exists(f){try{await access(f,constants.F_OK);return true;}catch{return false;}}
async function json(f){return JSON.parse(await readFile(f,"utf8"));}
function hash(b){return crypto.createHash("sha256").update(b).digest("hex");}
function safe(v,label){if(typeof v!=="string"||!v||path.isAbsolute(v)||v.split(/[\\/]+/).includes("..")){fail(`${label} unsafe: ${v}`);return false;}return true;}
function pngSize(b){if(b.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")return null;return{width:b.readUInt32BE(16),height:b.readUInt32BE(20)};}
const index=await json(path.join(VISUAL_ROOT,"index.json"));
if(index.storage_model!=="document_bundle"||index.asset_location!=="co_located_with_target_document"||index.semantic_mirror_required!==true)fail("visual index document-bundle policy mismatch");
if(index.visual_asset_count!==index.assets.length)fail("visual index count mismatch");
const ids=new Set();
for(const entry of index.assets){
  const id=entry.visual_asset_id;if(!/^VIS-\d{3}$/.test(id)||ids.has(id))fail(`invalid or duplicate visual id ${id}`);ids.add(id);
  const manifest=await json(path.join(VISUAL_ROOT,`${id}.json`));
  for(const field of ["title","target_document","target_document_asset_id","source_documents","storage_model","source_svg","preview_png","markdown_image","semantic_mirror_heading","width","height","svg_sha256","png_sha256"])if(!(field in manifest))fail(`${id} missing ${field}`);
  if(manifest.storage_model!=="document_bundle")fail(`${id} storage model`);
  if(manifest.semantic_mirror_heading!=="AI 可读语义镜像")fail(`${id} semantic mirror heading`);
  if(!safe(manifest.target_document,`${id} target`)||!safe(manifest.source_svg,`${id} svg`)||!safe(manifest.preview_png,`${id} png`))continue;
  if(!manifest.target_document.endsWith("/README.md"))fail(`${id} target is not a document bundle README`);
  const bundle=path.posix.dirname(manifest.target_document);
  if(!manifest.source_svg.startsWith(`${bundle}/assets/`)||!manifest.preview_png.startsWith(`${bundle}/assets/`))fail(`${id} assets not co-located`);
  if(!manifest.markdown_image.startsWith("./assets/"))fail(`${id} markdown image must be local`);
  const docPath=path.join(ROOT,manifest.target_document),svgPath=path.join(ROOT,manifest.source_svg),pngPath=path.join(ROOT,manifest.preview_png);
  if(!(await exists(docPath))||!(await exists(svgPath))||!(await exists(pngPath))){fail(`${id} document or asset missing`);continue;}
  const text=await readFile(docPath,"utf8"),svg=await readFile(svgPath),png=await readFile(pngPath);
  const imageToken=`](${manifest.markdown_image})`,at=text.indexOf(imageToken);if(at<0)fail(`${id} image not embedded`);
  else{const after=text.slice(at+imageToken.length,at+imageToken.length+500);if(!/^\s*\n\s*### AI 可读语义镜像/m.test(after))fail(`${id} mirror is not immediate`);}
  if(!text.includes(`Visual Asset ID：\`${id}\``))fail(`${id} id not documented`);
  if(hash(svg)!==manifest.svg_sha256||hash(png)!==manifest.png_sha256)fail(`${id} hash mismatch`);
  const st=svg.toString("utf8").toLowerCase();for(const token of ["<script","<foreignobject","javascript:"," onload="," onclick="])if(st.includes(token))fail(`${id} unsafe SVG token ${token}`);
  if(/(?:href|xlink:href)=["']https?:\/\//i.test(svg.toString("utf8")))fail(`${id} external SVG reference`);
  const size=pngSize(png);if(!size||size.width!==manifest.width||size.height!==manifest.height)fail(`${id} PNG dimensions`);
}
if(errors.length){for(const e of errors)console.error(`Visual asset check failed: ${e}`);process.exit(1);}console.log(`Visual asset check passed: ${ids.size} co-located assets with semantic mirrors.`);

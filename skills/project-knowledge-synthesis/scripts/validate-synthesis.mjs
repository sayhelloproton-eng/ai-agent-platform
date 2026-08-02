#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [kind, input] = process.argv.slice(2);
if (!["request", "result"].includes(kind) || !input) {
  console.error("Usage: node scripts/validate-synthesis.mjs <request|result> <file.json>");
  process.exit(2);
}
const file=path.resolve(process.cwd(), input);
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const errors=[];
const has=(key)=>Object.prototype.hasOwnProperty.call(data,key);
const safePath=(value)=>typeof value==="string" && value.length>0 && !path.isAbsolute(value) && !value.split(/[\/]+/).includes("..");
const unique=(values)=>Array.isArray(values) && new Set(values).size===values.length;

if(data.version!==1) errors.push("version must be 1");
if(typeof data.synthesis_id!=="string" || !data.synthesis_id) errors.push("synthesis_id is required");

if(kind==="request") {
  for(const key of ["mode","source_scope","truth_sources","objectives","constraints"]) if(!has(key)) errors.push(`missing ${key}`);
  if(!["directory_consolidation","project_session","asset_formalization"].includes(data.mode)) errors.push("invalid mode");
  for(const key of ["source_scope","truth_sources"]) {
    if(!Array.isArray(data[key]) || data[key].length===0 || !unique(data[key])) errors.push(`${key} must be a non-empty unique array`);
    for(const value of data[key]??[]) if(!safePath(value)) errors.push(`${key} contains unsafe path: ${value}`);
  }
  if(!Array.isArray(data.objectives) || data.objectives.length===0) errors.push("objectives must be non-empty");
  const c=data.constraints??{};
  if(c.preserve_stable_ids!==true) errors.push("preserve_stable_ids must be true");
  if(!["none","proposal_only"].includes(c.write_authority)) errors.push("write_authority must be none or proposal_only");
  if(c.publication_authority!=="none") errors.push("publication_authority must be none");
  if(!["exclude","redact_and_flag"].includes(c.sensitive_handling)) errors.push("invalid sensitive_handling");
} else {
  for(const key of ["result_status","output_contract","source_inventory","claim_summary","overlap_groups","conflicts","target_assets","retired_assets","cross_reference_updates","registry_updates","sensitive_review","quality_gates","human_approval"]) if(!has(key)) errors.push(`missing ${key}`);
  if(!["synthesis_proposed","needs_evidence","rejected"].includes(data.result_status)) errors.push("invalid result_status");
  if(data.output_contract!=="candidate_only") errors.push("output_contract must be candidate_only");
  if(!Array.isArray(data.source_inventory) || data.source_inventory.length===0) errors.push("source_inventory must be non-empty");
  for(const source of data.source_inventory??[]) if(!safePath(source.path)) errors.push(`unsafe source path: ${source.path}`);
  if(data.result_status==="synthesis_proposed" && (!Array.isArray(data.target_assets)||data.target_assets.length===0)) errors.push("synthesis_proposed requires target_assets");
  const gates=data.quality_gates??{};
  for(const key of ["scope","claim_classification","truth_reconciliation","overlap_conflict","asset_placement","traceability","privacy","governance"]) if(gates[key]!==true) errors.push(`quality gate ${key} must pass`);
  if(data.human_approval?.required!==true) errors.push("human approval must be required");
  if(!["pending","confirmed"].includes(data.human_approval?.status)) errors.push("invalid human approval status");
  if(data.sensitive_review?.action==="blocked" && data.result_status==="synthesis_proposed") errors.push("blocked sensitive review cannot propose synthesis");
  for(const asset of data.target_assets??[]) {
    if(!asset.asset_id || !safePath(asset.path)) errors.push("target asset requires safe path and asset_id");
    if(!["keep","rewrite","create"].includes(asset.action)) errors.push(`invalid target action ${asset.action}`);
  }
  for(const asset of data.retired_assets??[]) {
    if(!asset.asset_id || !["archive","supersede","reject"].includes(asset.action)) errors.push("invalid retired asset");
    if(!Array.isArray(asset.replacement_ids) || asset.replacement_ids.length===0) errors.push(`retired asset ${asset.asset_id} requires replacement_ids`);
  }
}
if(errors.length){for(const error of errors) console.error(`- ${error}`);process.exit(1);}
console.log(JSON.stringify({ok:true,kind,synthesis_id:data.synthesis_id},null,2));

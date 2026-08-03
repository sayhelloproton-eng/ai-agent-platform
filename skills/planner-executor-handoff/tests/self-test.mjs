#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATE = path.join(ROOT, "scripts", "validate-handoff.mjs");
const RENDER = path.join(ROOT, "scripts", "render-executor-prompt.mjs");
const EXAMPLES = path.join(ROOT, "assets", "examples");
function run(args) { const r=spawnSync(process.execPath,args,{encoding:"utf8"}); if(r.status!==0) throw new Error(`${args.join(" ")} failed\n${r.stdout}\n${r.stderr}`); return r.stdout; }
function failRun(args) { const r=spawnSync(process.execPath,args,{encoding:"utf8"}); if(r.status===0) throw new Error(`${args.join(" ")} should fail`); }
const load=async name=>JSON.parse(await readFile(path.join(EXAMPLES,name),"utf8"));
const clone=value=>JSON.parse(JSON.stringify(value));
const TMP=await mkdtemp(path.join(tmpdir(),"peh-v051-"));
async function temp(name,value){const p=path.join(TMP,name);await writeFile(p,JSON.stringify(value,null,2));return p;}
async function mutateFeedback(name, mutator){const v=await load(name);mutator(v);failRun([VALIDATE,"feedback",await temp(`neg-${Math.random()}.json`,v)]);}
async function mutateBundle(mutator){const v=await load("handoff-bundle-stepwise.json");mutator(v);failRun([VALIDATE,"bundle",await temp(`negb-${Math.random()}.json`,v)]);}

function approveContextWrite(bundle, files=["context/current-status.md"]) {
  bundle.canonical_contract.context_access={mode:"write_approved",files,content_source:"planner_full_replacement",user_approval:"confirmed"};
  bundle.canonical_contract.scope.allowed_paths.push(...files);
}

const compact=path.join(EXAMPLES,"handoff-bundle-compact.json");
const stepwise=path.join(EXAMPLES,"handoff-bundle-stepwise.json");
run([VALIDATE,"bundle",compact]); run([VALIDATE,"bundle",stepwise]);
const artifacts=["reception-ack.json","clarification-request.json","progress-checkpoint.json","failure-stop-report.json","execution-result.json","review-feedback.json","review-response.json","executor-switch-checkpoint.json"];
for(const name of artifacts) run([VALIDATE,"feedback",path.join(EXAMPLES,name)]);
run([VALIDATE,"cross",stepwise,path.join(EXAMPLES,"reception-ack.json"),path.join(EXAMPLES,"review-feedback.json"),path.join(EXAMPLES,"review-response.json"),path.join(EXAMPLES,"executor-switch-checkpoint.json")]);

const compactObj=await load("handoff-bundle-compact.json"); const stepwiseObj=await load("handoff-bundle-stepwise.json");
for(const field of ["task_id","task_version","goal","source_commit","delivery_mode"]) if(compactObj.canonical_contract[field]!==stepwiseObj.canonical_contract[field]) throw new Error(`tier contract mismatch ${field}`);
if(stepwiseObj.executor_profile.execution_authority!=="frozen_artifacts_only") throw new Error("stepwise example must be artifact-only");
const compactPrompt=run([RENDER,compact]); const stepPrompt=run([RENDER,stepwise]);
for(const marker of ["Execution authority","Delivery mode","Evidence required","Context access","Git Operating Policy"]) if(!compactPrompt.includes(marker)||!stepPrompt.includes(marker)) throw new Error(`prompt missing ${marker}`);
if(!stepPrompt.includes("Execution authority: frozen_artifacts_only")||!stepPrompt.includes("Byte comparison required: true")) throw new Error("stepwise frozen delivery not rendered");
if(compactPrompt.includes("### S01")) throw new Error("compact prompt must not render exact steps");
if(!stepPrompt.includes("### S01")) throw new Error("stepwise prompt must render exact steps");

const approvedWrite=clone(stepwiseObj);
approveContextWrite(approvedWrite);
run([VALIDATE,"bundle",await temp("approved-context-write.json",approvedWrite)]);

// Strict feedback negatives.
await mutateFeedback("clarification-request.json",v=>delete v.missing_fact);
await mutateFeedback("clarification-request.json",v=>v.affected_scope="all");
await mutateFeedback("progress-checkpoint.json",v=>v.current_step=123);
await mutateFeedback("progress-checkpoint.json",v=>v.side_effects="none");
await mutateFeedback("failure-stop-report.json",v=>v.raw_error=[]);
await mutateFeedback("failure-stop-report.json",v=>v.required_decision=false);
await mutateFeedback("review-response.json",v=>v.planned_fix="single string");
await mutateFeedback("review-response.json",v=>v.ready_to_resume="true");
await mutateFeedback("reception-ack.json",v=>v.workspace_state.unexpected=true);
await mutateFeedback("reception-ack.json",v=>v.workspace_state.head="bad");
await mutateFeedback("reception-ack.json",v=>v.git_policy_acknowledged.push_target=false);
await mutateFeedback("reception-ack.json",v=>v.git_policy_acknowledged.actual_head="bad");
await mutateFeedback("reception-ack.json",v=>v.ambiguities=["missing"]) ;
await mutateFeedback("reception-ack.json",v=>v.git_policy_acknowledged.matches_contract=false);
await mutateFeedback("execution-result.json",v=>v.result_state=123);
await mutateFeedback("execution-result.json",v=>v.diff_stat=[]);
await mutateFeedback("execution-result.json",v=>v.commit_sha={});
await mutateFeedback("execution-result.json",v=>v.tests[0].exit_code="0");
await mutateFeedback("execution-result.json",v=>v.tests[0].result="success");
await mutateFeedback("execution-result.json",v=>v.tests[0].unexpected=true);
await mutateFeedback("execution-result.json",v=>v.git_operations.starting_head="bad");
await mutateFeedback("execution-result.json",v=>v.git_operations.created_local_branches="none");
await mutateFeedback("execution-result.json",v=>v.git_operations.final_status="done");
await mutateFeedback("executor-switch-checkpoint.json",v=>v.safe_resume_point="");
await mutateFeedback("executor-switch-checkpoint.json",v=>v.do_not_repeat=[]);

// Bundle negatives and authority gate.
for(const field of ["git_policy","context_access","execution_plan","change_control"]) await mutateBundle(v=>v[field]={});
await mutateBundle(v=>v.executor_profile.tools="shell");
await mutateBundle(v=>v.canonical_contract.task_version="1");
await mutateBundle(v=>v.canonical_contract.git_policy.allow_create_remote_branch="false");
await mutateBundle(v=>v.canonical_contract.context_access.mode="write_approved");
await mutateBundle(v=>{v.canonical_contract.context_access={mode:"write_approved",files:["context/*.md"],content_source:"planner_full_replacement",user_approval:"confirmed"};});
await mutateBundle(v=>v.canonical_contract.scope.allowed_paths.push("context/current-status.md"));
await mutateBundle(v=>{approveContextWrite(v);v.canonical_contract.scope.allowed_paths=v.canonical_contract.scope.allowed_paths.filter(p=>p!=="context/current-status.md");});
await mutateBundle(v=>{approveContextWrite(v);v.canonical_contract.scope.allowed_paths.push("context/**");});
await mutateBundle(v=>{approveContextWrite(v);v.canonical_contract.scope.forbidden_paths.push("context/*.md");});
await mutateBundle(v=>{approveContextWrite(v,["context/current-status.md","context/current-status.md"]);});
await mutateBundle(v=>{approveContextWrite(v);v.canonical_contract.delivery_mode="implement_frozen_design";v.canonical_contract.frozen_artifacts=null;});
await mutateBundle(v=>{approveContextWrite(v);v.executor_profile.execution_authority="bounded_implementation";});
await mutateBundle(v=>v.canonical_contract.source_commit="abc");
await mutateBundle(v=>v.canonical_contract.git_policy.current_branch="-bad");
await mutateBundle(v=>v.canonical_contract.execution_plan.stepwise_steps[0].stop_on_failure="yes");
await mutateBundle(v=>v.canonical_contract.change_control.executor_may_change_approach="false");
await mutateBundle(v=>{v.canonical_contract.delivery_mode="implement_frozen_design";v.canonical_contract.frozen_artifacts=null;});
await mutateBundle(v=>v.canonical_contract.frozen_artifacts.byte_compare_required=false);

// Cross-artifact negatives.
const crossBase={bundle:await load("handoff-bundle-stepwise.json"),ack:await load("reception-ack.json"),rf:await load("review-feedback.json"),rr:await load("review-response.json"),sw:await load("executor-switch-checkpoint.json")};
async function crossMutate(mutator){const x=clone(crossBase);mutator(x);const files=await Promise.all([temp(`b-${Math.random()}.json`,x.bundle),temp(`a-${Math.random()}.json`,x.ack),temp(`rf-${Math.random()}.json`,x.rf),temp(`rr-${Math.random()}.json`,x.rr),temp(`s-${Math.random()}.json`,x.sw)]);failRun([VALIDATE,"cross",...files]);}
await crossMutate(x=>x.rr.review_id="OTHER");
await crossMutate(x=>x.rr.task_version=2);
await crossMutate(x=>x.ack.executor_id="other-executor");
await crossMutate(x=>x.ack.git_policy_acknowledged.push_target="origin/main");
await crossMutate(x=>x.sw.task_id="OTHER");
await crossMutate(x=>x.sw.next_executor_id="other-executor");
await crossMutate(x=>x.sw.next_execution_guidance_tier="compact_controlled");

// Schemas parse and expose eight strict definitions.
const protocol=JSON.parse(await readFile(path.join(ROOT,"assets","schemas","planner-executor-handoff-protocol.schema.json"),"utf8"));
const expectedDefs=["receptionAck","clarificationRequest","progressCheckpoint","failureStopReport","executionResult","reviewFeedback","reviewResponse","executorSwitchCheckpoint"];
if(!protocol.$defs.canonicalContract.required.includes("context_access"))throw new Error("context_access schema missing");
const contextAccessSchema=protocol.$defs.canonicalContract.properties.context_access;
if(contextAccessSchema.properties.files.uniqueItems!==true||!Array.isArray(contextAccessSchema.allOf)||contextAccessSchema.allOf.length!==2)throw new Error("context_access conditional schema missing");
if(!Array.isArray(protocol.$defs.canonicalContract.allOf)||protocol.$defs.canonicalContract.allOf.length<1)throw new Error("canonical Context delivery condition missing");
for(const name of expectedDefs){const d=protocol.$defs[name];if(!d||d.additionalProperties!==false)throw new Error(`schema definition ${name} missing or not strict`);}
if(protocol.$defs.feedback.oneOf.length!==8)throw new Error("feedback schema must contain eight oneOf branches");

// Frozen delivery mode inherited from deterministic-delivery.
const frozenValidate=path.join(ROOT,"scripts","validate-frozen-delivery.mjs");
run([frozenValidate,path.join(EXAMPLES,"frozen-delivery.json")]);
run([frozenValidate,path.join(EXAMPLES,"frozen-delivery-continuation.json")]);
failRun([frozenValidate,path.join(ROOT,"tests","fixtures","invalid-frozen-overlap.json")]);
const handoffSkill=await readFile(path.join(ROOT,"SKILL.md"),"utf8");
for(const marker of ["implement_from_spec","apply_frozen_artifacts","--no-renames","/usr/bin/cmp","Large document-and-visual delivery choreography","article review bundle"]) if(!handoffSkill.includes(marker)) throw new Error(`SKILL.md missing ${marker}`);

await rm(TMP,{recursive:true,force:true});
console.log("planner-executor-handoff self-test passed");

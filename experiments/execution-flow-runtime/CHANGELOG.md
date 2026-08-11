# Changelog

## 0.0.0-lab.13.2

Mobile capability live-gate harness correction only; Runtime/Flow/provider semantics remain unchanged:

- fixes the test-generated inference-node binding template to use schema-valid per-field refs (`inputs.<field>`) instead of the invalid root ref `{"$ref":"inputs"}`;
- adds an explicit `validateExecutionRun(...)` harness preflight before any real MLXHub call so fixture/schema failures fail locally and are not misreported as phone-model failures;
- keeps the same mock Task/Approval/Script/Vision capability scenarios and acceptance thresholds.

## 0.0.0-lab.13.1

Post-freeze mobile capability-evaluation supplement; Runtime/Flow/provider semantics remain unchanged:

- add an explicit real-MLXHub FAST live gate for mock platform judgement scenarios: Task/WorkItem flow candidate decisions, immutable approval-result feedback, allow-listed script selection with fail-closed `NO_MATCH`, and Vision approval-boundary classification;
- run ten cases twice by default with a 5-second request cooldown, requiring exact expected structured output, repeat consistency, zero approval false-negatives and zero invented script refs;
- keep text cases inside `execution.flow.v0`; probe Vision directly through MLXHub `image_url` because the frozen v0 Runtime inference input is JSON/text-only rather than silently widening the protocol;
- bundle two mock PNG UI fixtures and include `live-tests/**/*.ts` in TypeScript checking plus all fixture types in the source package;
- no Browser Host, Gateway, real Approval, Task persistence, Local Control integration, tool execution, or platform deployment is exercised by this capability gate.

## 0.0.0-lab.13

EF-5 freeze-candidate transport/error-model hardening after the full module audit:

- keep `execution.result.v0` as the application-level source of truth: a syntactically accepted `POST /v1/executions` now returns HTTP 200 for completed/blocked/failed runtime outcomes instead of misclassifying provider/action failures as HTTP 422 input errors;
- remove the CLI `run` path's fixed 130-second transport timeout so a valid long REASON or multi-node execution is not aborted before Runtime-owned bounded providers/capabilities complete;
- keep short management/discovery calls bounded separately; v0 client interruption is explicitly not a remote execution-cancel contract;
- add HTTP failure-envelope regression coverage and freeze the transport semantics in README/protocol/integration/CLI manifest;
- make the source-package manifest actually self-contained for freeze audit by including `tests/`, `live-tests/`, `fixtures/` and `tsconfig.json`; add malformed-JSON/undefined-route transport regression coverage;
- no Flow, capability, inference role, deployment-requirements, Phase 2, or MLXHub scheduling semantics changed.

## 0.0.0-lab.12.1

Rebased EF-4 deterministic-authority fix on the latest user source baseline `f0e08caa`:

- preserve the user-validated lab.11 TypeScript fixes (`Ajv2020` named import and explicit test output narrowing);
- retain the lab.12 deterministic routing correction without changing Runtime Core topology;
- keep deployment requirements read-only, MLXHub inference globally serial, and REASON context Flow-projected.

## 0.0.0-lab.12

EF-4 deterministic-authority correction after the first real-phone production-flow failure:

- fix the live-gate root cause: `command_executed=false` was not a missing model field; the first FAST assessment selected the no-command branch even though `verification_required=true`;
- move deterministic `reported_status` / `verification_required` routing out of inference and into explicit Flow `switch` nodes, so model output cannot bypass a required host command;
- keep inference only where semantic judgement is actually needed: post-command FAST verification with optional Flow-owned REASON escalation;
- keep `command_executed` and command evidence derived from actual Flow/capability execution rather than model claims;
- retain the lab.11 serial MLXHub lane, rich REASON context, and read-only deployment-requirements boundary;
- add a regression proving `verification_required=true` reaches `command_ref=node.version` before any inference can affect that decision.

## 0.0.0-lab.11

EF-4B deployment-boundary correction and resource-scheduling hardening:

- replace the rejected module-owned `INSTALL.md` / `install plan` / `install apply` direction with a read-only `deployment requirements --json` descriptor (`aap.deployment.requirements.v0`);
- keep deployment topology, cross-module dependency aggregation, dynamic whole-platform `INSTALL.md`, user confirmation, and apply in a future platform-level Deployment Planner/Executor;
- expose module identity/version, Node/runtime requirements, logical external dependency refs, candidate discovery sources, verification hints, config slots, listener/storage/runtime-home resources, lifecycle commands, provided service interfaces, and potential deployment effects without creating Runtime Home or writing config;
- keep MLXHub FAST and REASON on one FIFO Promise-chain provider lane (`concurrency=1`) with failure recovery so one rejected inference does not poison later jobs;
- keep REASON escalation context explicit and Flow-projected: original relevant input, concrete execution evidence, full FAST assessment/verification, escalation trigger, and fail-closed constraints;
- retain the EF-4 production-shaped rooted read -> FAST -> fixed command_ref -> readback -> FAST verify -> optional REASON flow and its real-phone live gate.

## 0.0.0-lab.10

Internal EF-4B candidate, superseded before acceptance by lab.11:

- introduced the serial MLXHub Promise-chain lane and explicit rich REASON escalation context that are retained in lab.11;
- experimented with a module-owned `INSTALL.md` and `install plan/apply` confirmation flow; that deployment ownership was rejected and removed before acceptance because whole-platform deployment must be dynamically assembled above individual modules.


## 0.0.0-lab.9

EF-4 production-shaped execution + small inference verification:

- evolved the runtime-health example into a real bounded execution flow: rooted file read -> FAST assessment -> Flow switch -> Runtime-owned fixed `node.version` command -> rooted readback -> FAST verification -> optional Flow-owned REASON escalation -> structured return;
- kept host execution behind registered capabilities only; the model never receives arbitrary shell authority and the command remains the opaque Runtime-owned `command_ref=node.version`;
- added real-capability unit coverage using an actual temporary UTF-8 file and the actual Node executable, including the normal FAST path, explicit post-command REASON fallback, evidence ordering, and `max_node_runs` bounding;
- added a managed-service real-phone EF-4 live gate that reuses the same public example Flow and validates real workspace read/readback, fixed command execution, FAST model mapping, structured verification, and optional REASON fallback;
- required no Execution Flow protocol or Runtime Core topology changes.

## 0.0.0-lab.8

EF-3 explicit FAST -> REASON escalation verification:

- proved that `fast` and `reason` are distinct inference roles, not a thinking-mode toggle;
- added a Flow-owned escalation example where FAST returns structured uncertainty, `switch` selects the REASON node, and REASON receives its own instruction/input/output schema;
- added unit coverage proving determinate FAST output does not invoke REASON and uncertain FAST output invokes REASON only because the Flow switch selects it;
- added a managed-service real-phone live gate that executes exactly one FAST inference followed by one REASON inference through the configured MLXHub backend and verifies the two concrete model mappings;
- kept existing provider serialization, schema validation and `<think>` fail-closed behavior unchanged; EF-3 required no Runtime Core topology changes.

## 0.0.0-lab.7

- replaced generic `standard/reasoning profile` semantics with explicit `fast/reason` inference roles;
- mapped MLXHub FAST to the no-think model and REASON to the original thinking model as different bounded responsibilities;
- moved MLXHub URL/model mapping into Runtime-owned persisted config with AI-readable CLI configuration;
- changed normal CLI `run`, `capabilities`, and `providers` to use the single managed service instead of building a second in-process Runtime;
- added `GET /v1/inference-backends`;
- moved the real-phone live gate out of the normal unit suite into explicit `npm run test:mlxhub-live`;
- added regression coverage for persisted provider config plus managed-service CLI execution.

## 0.0.0-lab.6

EF-2 MLXHub provider hardening and live pluggability verification:

- normalized MLXHub runtime failures into stable execution errors for unavailable, busy, unreachable and timeout conditions while preserving provider codes/details;
- kept fast inference bounded at the validated default `max_tokens=1024`; reason output budget is no longer frozen to a module default and is only sent when explicitly configured;
- preserved provider-wide serialized inference so FAST/REASON requests never overlap on the same MLXHub backend instance;
- added unit coverage for model/role selection, closed/unclosed `<think>` handling, provider failures, invalid JSON, transport failures and serialized requests;
- upgraded the MLXHub live test to execute the same `ExecutionFlow` through Fixture and real MLXHub backends via the HTTP service, proving backend replacement without Runtime Core changes.

## 0.0.0-lab.5

EF-1 single-service hardening and verification support:

- managed `restart --json` now emits exactly one machine-readable JSON document instead of two concatenated JSON payloads;
- lifecycle internals are split into reusable start/stop operations without changing public CLI semantics;
- `createExecutionFlowServer` accepts an optional injected `RuntimeEnvironment` for isolated service-level tests while production/default startup still builds the normal environment;
- service tests now cover a pure deterministic HTTP flow, an injected Fixture Inference HTTP flow, and the default fixed-command HTTP flow;
- lifecycle tests now cover start, status, singleton second start, restart identity rotation, normal stop, final stopped status, and the existing unverified-PID protection.

## 0.0.0-lab.4

- Reserved `$ref` as protocol syntax: any object containing a `$ref` key must validate as an exact `BindingRef`; malformed or mixed `$ref` objects are rejected.
- Hardened binding traversal to own properties only; inherited/prototype properties such as `constructor`, `toString` and `__proto__` cannot be resolved through bindings.
- Added regression coverage for malformed `$ref` objects and prototype-chain traversal.

## 0.0.0-lab.3

- Unified published protocol validation on JSON Schema 2020-12 via Ajv.
- Replaced implicit `$steps.*` / `$inputs.*` string bindings with explicit `{ "$ref": "..." }` binding objects.
- Added `template-value.v0` public schema.
- Added singleton managed-service lock per runtime home.
- Made `start` idempotent and prevented a second managed service when identity is uncertain.
- Made `stop` refuse to kill unverified PIDs; `--force` only SIGKILLs a verified runtime.
- Fixed fixed-command timeout/output overflow so the child is terminated before the error returns.
- Extended file protection to block symlink aliases that resolve to protected files.
- Added protocol, lifecycle and hardening regression tests.
- Kept caller token/JWT authentication out of the current lab scope.

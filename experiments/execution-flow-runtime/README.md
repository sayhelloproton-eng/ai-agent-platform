# @ai-agent-platform/execution-flow-runtime

A TypeScript-source-only lab module for running **spec-defined execution flows**. The published schemas, runtime validator, CLI validator, documentation and tests live together in this module.

This module is not a Task domain, not a Controller, and not a free-form Agent loop. It accepts a structured execution contract, runs explicit nodes, invokes only registered capabilities, and uses small-model inference only where the flow declares an inference node.

## Current package mode

- 100% TypeScript executable/source code.
- Root public entry: `index.ts`.
- No `dist/`, `lib/`, transpiled JavaScript, compatibility wrapper, CJS build, or generated declarations.
- Intended runtime during the lab stage: Node 20 + `tsx`.
- Package shape is already suitable for a future npm package, but compatibility packaging is intentionally deferred.
- The source-package manifest keeps specs, docs, examples, fixtures, unit tests, live-test sources and `tsconfig.json` together so the frozen lab remains auditable/re-runnable as one module.

## Package / deployment boundary

Package installation after publication may use the platform-selected package mechanism. During the lab, local dependencies are installed from this directory:

```bash
cd experiments/execution-flow-runtime
npm install
```

The module does **not** plan or apply its own deployment. Instead it exposes a read-only, machine-readable requirements descriptor:

```bash
aap-execution-flow deployment requirements --json
```

A future platform-level Deployment Planner aggregates this descriptor with all selected modules, resolves the cross-module dependency graph, and dynamically generates the deployment-specific `INSTALL.md`/plan presented to AI and the user.

## Service lifecycle

The lab uses **one managed Execution Flow Runtime service per runtime home**. MLXHub/PC/cloud inference implementations are pluggable backends inside this service, not additional runtime services.


```bash
aap-execution-flow start
aap-execution-flow status
aap-execution-flow stop
aap-execution-flow restart
```

Foreground mode:

```bash
aap-execution-flow serve
```

Default service:

```text
http://127.0.0.1:43170
```

## AI-friendly CLI documentation

The CLI is part of the public interface.

For a machine-readable command contract:

```bash
aap-execution-flow describe --json
```

For AI-oriented module guidance:

```bash
aap-execution-flow docs ai --json
```

For protocol docs:

```bash
aap-execution-flow docs protocol
```

For bundled schemas:

```bash
aap-execution-flow spec list --json
aap-execution-flow spec execution-run --json
```

For runtime capabilities and inference providers:

```bash
aap-execution-flow capabilities --json
aap-execution-flow providers --json
```

The goal is that an AI agent can inspect the module before using it instead of relying on hidden assumptions.

## Core rule

The flow defines **what node runs next**. Data binding is explicit with `{ "$ref": "steps.node.output.field" }`; plain strings are never treated as bindings, and `$ref` is a reserved protocol key that must form a valid exact binding object.

The model does not invent shell commands, filesystem permissions, capabilities, or global task transitions.

See:

```bash
aap-execution-flow docs protocol
aap-execution-flow docs security
aap-execution-flow docs integration
```


## Managed service lifecycle

The runtime is a single managed service per `EXECUTION_FLOW_RUNTIME_HOME`.

```bash
aap-execution-flow start --json
aap-execution-flow status --json
aap-execution-flow restart --json
aap-execution-flow stop --json
```

`start` is singleton/idempotent for the same runtime home. `restart --json` emits one JSON document containing both the previous stop result and the current start result, which keeps the CLI machine-readable for AI/automation callers.

For isolated tests, set a dedicated runtime home:

```bash
export EXECUTION_FLOW_RUNTIME_HOME=/tmp/aap-execution-flow-runtime-test
```

The HTTP service remains the same single runtime process; inference backends are providers inside that service, not separate Execution Flow Runtime services.

`POST /v1/executions` returns the stable `execution.result.v0` envelope over
HTTP 200 once a request is syntactically accepted. Execution failures are
reported through `status` / `error`; they are not mislabeled as HTTP 422 input
errors. The CLI `run` path does not impose a shorter fixed timeout than the
Runtime's bounded backend/capability operations.

## MLXHub provider lab configuration

MLXHub is one optional inference backend inside the single Execution Flow Runtime service. The execution-flow protocol contains only `backend` plus semantic inference `role`; it does not contain phone URLs or model IDs.

Persist the provider mapping into the Runtime-owned config:

```bash
aap-execution-flow config mlxhub set \
  --base-url "http://192.168.0.104:8080/" \
  --fast-model "sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think" \
  --reason-model "mlx-community/Qwen3.5-4B-MLX-4bit"
```

Inspect it with:

```bash
aap-execution-flow config show --json
aap-execution-flow doctor --json
```

The mapping is persisted under Runtime Home `config.json`; normal `start`, `restart`, `run`, `providers` and service execution do not require per-command provider environment variables. Configuration changes apply after a managed-service start/restart.

`fast` is the high-frequency no-think execution judgement role and defaults to `max_tokens=1024`. `reason` is a different low-frequency escalation role backed by the original thinking model; it intentionally has no package-wide default `max_tokens` unless explicitly configured with `--reason-max-tokens`.

The normal unit suite never calls the real phone. After configuration, the explicit live gates are:

```bash
npm run test:mlxhub-live
npm run test:mlxhub-roles-live
```

`test:mlxhub-live` is the EF-2 backend-pluggability gate. `test:mlxhub-roles-live` is the EF-3 gate: the already-running managed service executes one `fast` inference, the Flow switch explicitly escalates structured uncertainty, and a separate `reason` node runs the original thinking model. This is a role/flow correctness gate, not a performance benchmark.

## EF-4 production-shaped execution gate

The `examples/runtime-health.flow.json` example now exercises a production-shaped bounded sequence while remaining independent from Task Control, Local Control, Browser Host and Gateway:

```text
workspace.file.read
  -> deterministic Flow switch on reported_status / verification_required
  -> process.command.run-fixed(command_ref=node.version)
  -> workspace.file.read readback
  -> FAST verification
  -> Flow switch
     -> verified: return
     -> uncertain: REASON inference -> return
```

The command is Runtime-owned and uses `shell=false`; inference never supplies an executable, argv, cwd or shell line. Deterministic structured preconditions such as `reported_status` and `verification_required` are Flow-owned and are never delegated to inference. The second file read is an explicit readback/evidence step after the host command.

The normal unit suite uses real local file/process capabilities with Fixture inference. The explicit phone gate uses the already-running managed service and configured MLXHub backend:

```bash
npm run test:mlxhub-production-live
```

It is a single execution-flow correctness gate, not a benchmark. REASON is invoked only if the post-command FAST verification returns structured uncertainty.


## Mobile platform-capability live evaluation

The frozen Runtime semantics are also exercised against a small set of **mock platform inputs with the real configured MLXHub FAST model**. This gate is about whether the phone model is competent for bounded platform judgement tasks; it is not a Browser Host, Gateway, Approval, Task persistence, or Local Control integration test.

```bash
npm run test:mlxhub-capabilities-live
```

For low-frequency REASON-role capability evaluation (mock platform inputs, real MLXHub REASON model, no real BHR/Gateway/Task/LCL side effects):

```bash
npm run test:mlxhub-reason-capabilities-live
```

This REASON gate exercises evidence conflict resolution, immutable approval-scope mismatch, conservative side-effect classification, ambiguous allow-listed script selection, and bounded recovery diagnosis. It is a model-capability gate, not an integration test.

For the temporal-freshness case, the safety/control outcome remains strict (`decision=READY`, `confidence=high`, and the newer verified live evidence must win). The evaluator treats `resolution=fresh_verified_evidence` and `resolution=primary_authoritative` as equivalent diagnostic labels for that one case; the label is explanatory metadata rather than a routing/control field. All other REASON cases remain exact-output graded.

The live evaluation runs ten mock cases twice with a default 5-second cooldown between model requests:

- Task/WorkItem candidate flow judgement: advance, retry, or block from supplied status/evidence facts;
- approval-result feedback: continue only for a valid unexpired/unconsumed scoped grant, otherwise stop;
- allow-listed script selection: return an exact `script_ref` / executable / argv tuple or fail closed with `NO_MATCH`;
- Vision approval boundary: classify two bundled mock UI screenshots, requiring approval for external `SUBMIT_MESSAGE` and allowing read-only `OBSERVE_PAGE`.

Text scenarios run through `execution.flow.v0` + the configured `mlxhub` inference backend. The Vision cases intentionally probe MLXHub `image_url` directly because the current frozen `execution.flow.v0` inference input is JSON/text-only; this test does **not** silently extend the Runtime protocol. A future multimodal Runtime contract, if needed, must be separately versioned.

Acceptance is strict: every repeated result must match the expected structured output, both repeats of each case must be identical, approval false-negatives must be zero, no script reference may be invented, and every request must use the configured FAST model. `MLXHUB_CAPABILITY_EVAL_REPEATS` (1..3) and `MLXHUB_CAPABILITY_EVAL_COOLDOWN_MS` (0..30000) exist only for test control; defaults are 2 repeats and 5000 ms.

## Platform-aggregated deployment requirements

This module is self-describing but not self-deploying. Its deployment contract is exposed only through:

```bash
aap-execution-flow deployment requirements --json
```

The descriptor reports module identity/version, Node/runtime requirements, logical external dependencies, candidate discovery sources, verification hints, config slots, listener/storage/runtime-home resources, provided service interfaces, lifecycle commands, and potential deployment effects. The command is read-only and must not create Runtime Home, write config, start processes, ask the user for confirmation, or choose another module's physical address.

Platform deployment owns the larger sequence:

```text
module requirements discovery
  -> aggregate selected modules
  -> build dependency graph
  -> resolve / verify concrete values
  -> dynamically generate whole-platform INSTALL.md / deployment plan
  -> AI presents one confirmation
  -> platform executor applies config/start
  -> per-module health + cross-module acceptance
```

Flow specifications continue to contain only logical backend/capability/command references; physical endpoints and roots are injected through Runtime-owned configuration after the platform plan is confirmed.

MLXHub remains one exclusive provider lane. FAST and REASON share one FIFO promise chain (`concurrency=1`); a rejected job fails only that job and cannot poison the next queued inference.

# Changelog

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

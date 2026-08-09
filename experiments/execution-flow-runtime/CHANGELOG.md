# Changelog

## 0.0.0-lab.6

EF-2 MLXHub provider hardening and live pluggability verification:

- normalized MLXHub runtime failures into stable execution errors for unavailable, busy, unreachable and timeout conditions while preserving provider codes/details;
- kept standard inference bounded at the validated default `max_tokens=1024`; reasoning output budget is no longer frozen to a module default and is only sent when explicitly configured;
- preserved provider-wide serialized inference so standard/reasoning requests never overlap on the same MLXHub backend instance;
- added unit coverage for model/profile selection, closed/unclosed `<think>` handling, provider failures, invalid JSON, transport failures and serialized requests;
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

# Phase 3 Runtime Integration Spike

Minimal executable evidence for the Phase 3 Task -> Execution Flow Runtime integration boundary.

## Scope

This experiment does not redefine Task Control, Local Control or the frozen Execution Flow Runtime. It provides the thinnest adapters needed to prove the public integration path.

Current spike evidence:

1. Task WorkItem -> frozen Runtime -> fixture capability -> `execution.result.v0` -> WorkItem `SUCCEEDED`.
2. Task WorkItem -> frozen Runtime -> Local Control public `local.health.read` -> WorkItem `SUCCEEDED`.
3. Runtime `CAPABILITY_NOT_FOUND` -> durable WorkItem `FAILED` / `ROLE_WORK_FAILED` mapping.
4. Live FAST gate: Task WorkItem -> frozen Runtime -> real Local Control public API -> MLXHub FAST -> `execution.result.v0` -> WorkItem `SUCCEEDED`.
5. Durable/service-boundary acceptance: `JsonFileTaskControlStore` -> Task worker -> loopback Runtime HTTP `/v1/executions` -> Local Control -> MLXHub FAST -> file-backed result reference; then close/reopen Task + reference stores, prove the WorkItem/event/resultRef/result remain resolvable, and mechanically resume Controller processing to advance the Plan and persist Task `COMPLETED`.

## Frozen boundaries

- Runtime receives Task identifiers only as opaque correlation metadata.
- Runtime does not own Task state, Claim, Approval, Controller decisions or durable Task transitions.
- Local Control is reached through its public API adapter; its internal handlers/stores are not imported into Runtime.
- The Runtime HTTP boundary uses the frozen `/v1/executions` contract; the spike injects a Runtime environment without changing the frozen Runtime package.
- The live Flow uses the logical inference backend name `mlxhub`; physical endpoint/model configuration is injected by the test harness and is not embedded in the Flow.
- FAST is one bounded inference node. Capability execution occurs before inference and Flow topology remains deterministic.
- `JsonFileExecutionReferenceStore` is a spike-only durability adapter used to prove that Task `resultRef` remains resolvable after reopen. It is not a proposed platform storage contract.
- This spike does not add Browser Host, Approval Grant, cancellation/progress, Deployment Planner, dynamic INSTALL generation or formal package migration.

## Commands

```bash
npm run check
npm test
```

The normal suite is offline and must not call MLXHub.

The single durable HTTP + FAST acceptance gate is opt-in:

```bash
MLXHUB_BASE_URL=http://<mlxhub-host>:<port> \
MLXHUB_FAST_MODEL=<fast-model> \
MLXHUB_REASON_MODEL=<reason-model> \
MLXHUB_TIMEOUT_MS=180000 \
npm run test:mlxhub-live
```

`MLXHUB_REASON_MODEL` is required by the frozen MLXHub backend constructor even though this live gate invokes only the FAST role.

# Phase 3 Runtime Integration Spike

Status: `0.0.0-spike.1` — intentionally temporary integration evidence.

This experiment collapses the next Phase 3 step to the smallest executable seam:

```text
Task WorkItem
→ TaskRuntimeWorker
→ execution.run.v0
→ frozen Execution Flow Runtime lab.13
→ CapabilityRegistry
→ fixture capability OR Local Control public API
→ execution.result.v0
→ WorkItem SUCCEEDED / FAILED
```

## Scope

This spike does **not** change the frozen `experiments/execution-flow-runtime` implementation and does not migrate it into `packages/`.
It does not reopen Phase 2 CTL/BHR/Gateway integration.

It proves only three things:

1. a Task `WorkItem` can be projected into an `ExecutionRun` without leaking Task internals into Runtime;
2. an external capability provider can be adapted behind Runtime `CapabilityRegistry` without putting physical deployment data into Flow;
3. `ExecutionResult` can be durably projected back into Task Control as WorkItem success/failure.

## Explicitly deferred

- Browser Host
- Approval Grant token format
- cancellation/progress protocol
- MLXHub inference in this spike (already proven by EF-4)
- Common Result/Error redesign
- deployment planner / dynamic INSTALL.md
- formal Runtime migration to `packages/`

## Validation

The test suite is intentionally only three tests:

- fixture capability success;
- real Local Control `local.health.read` success;
- Runtime failure mapped to Task WorkItem failure.

If these pass, the next validation adds one real FAST inference path rather than another design round.

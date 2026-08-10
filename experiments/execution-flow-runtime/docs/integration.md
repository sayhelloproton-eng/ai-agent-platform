# Integration

The module is a horizontal runtime module, not a fifth business domain.

Typical caller:

```text
Task Control node
    -> adapter creates execution.run.v0
    -> Execution Flow Runtime
    -> execution.result.v0
    -> adapter maps result back into Task Control semantics
```

Task Control may treat a whole Execution Flow as the execution content of one Task node.

The runtime does not import Task Control internals and does not interpret task status.

Other callers may use the same protocol:

- CLI
- Controller-side application service
- Management Console
- scheduler
- HTTP client
- another runtime

The same module may later bind different inference backends:

- MLXHub on mobile
- PC local model server
- cloud model API

Those backends are replaceable infrastructure. They do not change the execution-flow protocol.


## RuntimeEnvironment injection for isolated verification

`createExecutionFlowServer` accepts an optional `runtimeEnvironment` only as a programmatic composition seam. It allows service-level tests to inject Fixture capabilities/backends without adding a test backend to the managed production/default service configuration.

Default CLI/service startup does not register the Fixture backend. Real providers continue to be supplied by the normal runtime environment.

## EF-2 inference-provider boundary

MLXHub configuration belongs to Runtime-owned persisted config, not to `execution.run.v0` or `execution.flow.v0`. Flow authors select only the registered backend name and the semantic inference role (`fast` or `reason`). `fast` and `reason` are different bounded responsibilities, not two settings for one generic task.

The MLXHub backend serializes all inference requests for one backend instance. This enforces a single active inference operation even when callers concurrently request `fast` and `reason` roles.

Provider failures are normalized for Runtime callers while retaining the provider-specific code in error details:

- `INFERENCE_PROVIDER_UNAVAILABLE` — provider paused or 5xx availability failure;
- `INFERENCE_PROVIDER_BUSY` — `model_busy` or HTTP 429;
- `INFERENCE_PROVIDER_UNREACHABLE` — transport/connectivity failure;
- `INFERENCE_TIMEOUT` — bounded inference timeout;
- `INFERENCE_PROVIDER_ERROR` — other non-success provider responses;
- `INFERENCE_INVALID_JSON` / `INFERENCE_EMPTY_RESPONSE` / `INFERENCE_THINK_UNCLOSED` — invalid provider output.

These errors are execution-runtime failures, not Task-domain states.

## Single managed service usage

Normal CLI execution is service-oriented: `run`, `capabilities` and `providers` talk to the verified managed service. They do not create a second in-process Runtime. Programmatic library APIs remain available for embedding/tests, but the CLI operational model is one managed service per Runtime Home.

Provider configuration is persisted through `aap-execution-flow config ...`; provider/model mapping is not expected to be re-exported in the terminal for every command. Fixed host commands remain Runtime-owned `command_ref` definitions and are never model-generated shell strings.

## EF-3 explicit role escalation

FAST and REASON are separate Flow-declared responsibilities. A valid escalation shape is:

```text
FAST inference
    -> structured state
    -> Flow switch
       -> determinate: return/continue
       -> uncertain: REASON inference
```

The backend does not promote a request from FAST to REASON and the model does not select its own next node. The REASON node is a different node with its own bounded instruction, input projection and output schema.

The MLXHub backend remains serialized across both roles so the phone never receives overlapping FAST/REASON requests from one backend instance. Closed `<think>...</think>` content from the REASON model is removed before JSON parsing; an unclosed thinking block fails closed.

The explicit real-device gate is `npm run test:mlxhub-roles-live`. It talks to the already-running managed Execution Flow Runtime service and performs one FAST call followed by one REASON call; it does not create a second managed service and is not a performance benchmark.


## EF-4 production-shaped execution boundary

EF-4 keeps the same public protocol and service topology. A caller can submit one bounded Flow that combines real registered capabilities with schema-bounded small inference:

```text
real rooted file read
  -> FAST judgement
  -> Flow-owned branch
  -> Runtime-owned fixed command_ref
  -> real rooted readback
  -> FAST verification
  -> optional Flow-owned REASON escalation
  -> execution.result.v0 + evidence
```

This is still not Task orchestration. The Runtime does not know Task/Plan/Claim/Approval semantics, and EF-4 does not connect CTL/TSK/LCL/BHR/Gateway. Capability results and inference results remain execution evidence only.

The fixed command remains host-registered (`node.version`) and cannot be replaced by model-generated executable/argv/shell data. The readback uses the same rooted `workspace.file.read` boundary, so file traversal, protected paths and symlink escape rules remain unchanged.

## Independent deployment / dependency boundary

The runtime is a deployable module, not a source-level extension of CTL/TSK/LCL/BHR. Its deployment dependencies are exposed by the read-only `deployment requirements --json` descriptor and later resolved by a platform-level Deployment Planner into Runtime-owned configuration/composition roots. A Flow must not contain physical service endpoints, filesystem roots, executable paths, or imports of another module's internal implementation.

Current built-in file/command executors are one deployment choice. Future remote
capability adapters must implement versioned public contracts and be selected by
configuration without changing the Execution Flow protocol.

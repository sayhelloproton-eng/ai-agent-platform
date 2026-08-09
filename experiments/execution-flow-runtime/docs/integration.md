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

MLXHub configuration belongs to the provider/runtime environment, not to `execution.run.v0` or `execution.flow.v0`. Flow authors select only the registered backend name and the generic profile (`standard` or `reasoning`).

The MLXHub backend serializes all inference requests for one backend instance. This enforces a single active inference operation even when callers concurrently request `standard` and `reasoning` profiles.

Provider failures are normalized for Runtime callers while retaining the provider-specific code in error details:

- `INFERENCE_PROVIDER_UNAVAILABLE` — provider paused or 5xx availability failure;
- `INFERENCE_PROVIDER_BUSY` — `model_busy` or HTTP 429;
- `INFERENCE_PROVIDER_UNREACHABLE` — transport/connectivity failure;
- `INFERENCE_TIMEOUT` — bounded inference timeout;
- `INFERENCE_PROVIDER_ERROR` — other non-success provider responses;
- `INFERENCE_INVALID_JSON` / `INFERENCE_EMPTY_RESPONSE` / `INFERENCE_THINK_UNCLOSED` — invalid provider output.

These errors are execution-runtime failures, not Task-domain states.

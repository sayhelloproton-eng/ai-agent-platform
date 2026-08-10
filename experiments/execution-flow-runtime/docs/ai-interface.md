# AI interface

An AI consumer should not guess this module's behavior.

Recommended discovery sequence:

1. `aap-execution-flow describe --json`
2. `aap-execution-flow spec execution-run --json`
3. `aap-execution-flow spec execution-flow --json`
4. `aap-execution-flow spec template-value --json`
5. `aap-execution-flow capabilities --json`
6. `aap-execution-flow providers --json`
7. `aap-execution-flow docs security --json`

The AI should produce or consume only structures allowed by the published contracts.

Important:

- A flow is supplied by the caller; the inference model does not own flow topology.
- A binding is explicit: `{ "$ref": "steps.node.output.field" }`. Plain strings are plain strings. The `$ref` key is reserved; malformed or mixed `$ref` objects are invalid protocol input.
- An inference node receives an explicit instruction, explicit input and an explicit output schema.
- An inference output is data. It becomes a host operation only when a flow-defined action node invokes a registered capability.
- A capability name is not authority. `execution.run.v0.authorization.allowed_capabilities` is checked before invocation.
- `process.command.run-fixed` accepts only opaque `command_ref` values registered by the host. It never accepts an arbitrary shell line.
- `workspace.file.read` is rooted to configured workspace, relative-path-only, and blocks traversal/symlink escape/protected paths.
- The managed runtime is a single service per runtime home; MLXHub/PC/cloud inference are backends inside that service, not sibling services.

## MLXHub backend discovery

An AI caller must not embed MLXHub host/model details into an Execution Flow. Provider configuration is owned by the Runtime environment. Use:

```bash
aap-execution-flow providers --json
```

to discover whether `mlxhub` is registered. A Flow may then reference `backend: "mlxhub"` with `role: "fast"` or `role: "reason"` while keeping all transition logic in the Flow itself.


Operational rule: configure providers with `aap-execution-flow config ...`, start one managed service, then use `run`, `capabilities`, and `providers` as clients of that service. Automation must not spawn parallel Runtime instances.

## FAST -> REASON escalation rule

An AI authoring a Flow must encode escalation explicitly. Use a FAST inference node to produce a schema-bounded state, a `switch` node to branch on that state, and a distinct REASON inference node only on the escalation branch. Do not ask either model to choose `next_node`, switch its own role, or invent a capability.


## Production-shaped Flow authoring rule

For execution + small-inference flows, keep authority explicit in topology:

```text
action(read) -> inference(fast) -> switch -> action(fixed command)
-> action(readback) -> inference(fast verify) -> switch
-> return OR inference(reason) -> return
```

Inference output may select only among Flow-declared branches. It must never contain an executable, shell line, arbitrary filesystem path outside a registered capability contract, or a self-selected next node. Post-action verification should consume concrete capability evidence/readback, and REASON should appear only on a Flow-declared uncertainty branch.

## Deployment discovery

For deployment discovery, call:

```bash
aap-execution-flow deployment requirements --json
```

Treat the returned `aap.deployment.requirements.v0` document as one module descriptor only. Do **not** ask the user to confirm this module in isolation and do not apply configuration from this command. The platform Deployment Planner must aggregate all selected module descriptors, resolve provider/consumer links and physical values, dynamically generate the whole-platform deployment `INSTALL.md`/plan, and only then present one confirmation to the user.

The module descriptor may tell the planner where candidate values can be discovered and how they can be verified, but it never selects topology or hard-codes another module's endpoint.

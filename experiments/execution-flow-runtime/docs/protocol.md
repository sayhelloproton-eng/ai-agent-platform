# Execution Flow Protocol v0

## Purpose

The runtime accepts a business-agnostic execution request. It does not require Task, Plan, Claim, WorkItem or Controller semantics.

A caller may attach opaque `correlation` metadata. The runtime preserves it but does not interpret it.

The published JSON Schemas in `spec/` are the protocol source of truth. Runtime validation and CLI validation use those same schemas through Ajv JSON Schema 2020-12.

## Input

`execution.run.v0` contains:

- `execution_id`
- `flow`
- `inputs`
- `authorization.allowed_capabilities`
- optional `max_node_runs`
- optional opaque `correlation`

## Flow

`execution.flow.v0` contains an `entry_node` and explicit nodes.

Current node types:

- `action`: invoke a registered capability.
- `inference`: call a registered inference backend with a fixed instruction/input/output schema.
- `switch`: deterministic branch over prior structured output.
- `return`: finish and return a structured value.

The flow, not the model, owns transitions.

## Structured bindings

Bindings are explicit objects, not magic strings.

```json
{ "$ref": "steps.read.output.status" }
```

Valid roots are `inputs` and `steps`.

A normal string such as `$PATH` or `$100` remains a normal string. Only an object containing exactly one `$ref` field is interpreted as a binding. The `$ref` property name is reserved by the protocol: an object that contains `$ref` but is not a valid exact binding reference is rejected rather than treated as ordinary data.

Bindings may appear recursively inside action arguments, inference input and return output. A switch `select` is a binding reference.

## Inference

An inference node declares:

- backend
- role: `fast | reason`
- instruction
- input template
- output schema
- next node

`fast` and `reason` are semantic execution roles, not a thinking-mode toggle. The provider decides which concrete model implements each role.

A Flow may explicitly escalate between them. The FAST node can emit a schema-bounded state such as `uncertain`; a following `switch` node owns the branch to a separate REASON node. The REASON node may have a different instruction, different input projection and different output schema. The inference backend never decides to escalate itself.

The runtime validates model output against the declared JSON Schema 2020-12 document before the next node can use it.

The model output is data. It does not own the flow topology and cannot invent a next node unless a future protocol version explicitly defines such behavior.

## Actions

An action node declares:

- capability
- structured arguments
- next node

The runtime resolves bindings, validates capability input schema, checks execution authorization, then invokes the host-registered handler.

## Output

`execution.result.v0` returns:

- completed / blocked / failed
- final output
- node run records
- evidence records
- normalized error
- opaque correlation metadata

The runtime validates its own returned result against the published execution-result schema.

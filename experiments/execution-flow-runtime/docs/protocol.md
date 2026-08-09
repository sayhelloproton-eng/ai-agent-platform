# Execution Flow Protocol v0

## Purpose

The runtime accepts a business-agnostic execution request. It does not require Task, Plan, Claim, WorkItem or Controller semantics.

A caller may attach opaque `correlation` metadata. The runtime preserves it but does not interpret it.

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

## Inference

An inference node declares:

- backend
- profile: `standard | reasoning`
- instruction
- input binding
- output schema
- next node

The runtime validates model output against `output_schema` before the next node can use it.

## Actions

An action node declares:

- capability
- structured arguments
- next node

The runtime resolves bindings, validates capability input schema, checks authorization, then invokes the host-registered handler.

## Output

`execution.result.v0` returns:

- completed / blocked / failed
- final output
- node run records
- evidence records
- normalized error
- opaque correlation metadata

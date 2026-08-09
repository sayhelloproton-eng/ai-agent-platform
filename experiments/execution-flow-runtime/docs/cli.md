# CLI

The command line is a first-class public interface and documentation surface.

## Bootstrap

`aap-execution-flow install`

Creates the runtime home and default configuration. It does **not** install the npm package.

## Service lifecycle

- `aap-execution-flow start`
- `aap-execution-flow status`
- `aap-execution-flow stop`
- `aap-execution-flow restart`
- `aap-execution-flow serve`

`start` runs the local HTTP service in the background. `serve` runs it in the foreground.

## Execution

- `aap-execution-flow validate --file run.json`
- `aap-execution-flow run --file run.json`

Validation never executes capabilities.

## Discovery

- `aap-execution-flow capabilities --json`
- `aap-execution-flow providers --json`
- `aap-execution-flow spec list --json`
- `aap-execution-flow docs list --json`

## AI discovery

`aap-execution-flow describe --json`

This is the preferred machine-readable entry point. It describes command names, side-effect class, usage, service endpoints and runtime invariants.

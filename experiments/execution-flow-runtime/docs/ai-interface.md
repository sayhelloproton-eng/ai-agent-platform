# AI interface

An AI consumer should not guess this module's behavior.

Recommended discovery sequence:

1. `aap-execution-flow describe --json`
2. `aap-execution-flow spec execution-run --json`
3. `aap-execution-flow spec execution-flow --json`
4. `aap-execution-flow capabilities --json`
5. `aap-execution-flow providers --json`
6. `aap-execution-flow docs security --json`

The AI should produce or consume only structures allowed by the published contracts.

Important:

- A flow is supplied by the caller; the inference model does not own flow topology.
- An inference node receives an explicit instruction, explicit input and an explicit output schema.
- An inference output is data. It becomes a host operation only when a later action node maps it to a registered capability.
- A capability name is not authority. `execution.run.v0.authorization.allowed_capabilities` is checked before invocation.
- `process.command.run-fixed` accepts only opaque `command_ref` values registered by the host. It never accepts an arbitrary shell line.
- `workspace.file.read` is rooted to configured workspace, relative-path-only, and blocks traversal/symlink escape/protected paths.

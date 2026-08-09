# Security boundary

This runtime is intentionally spec-driven.

## Model boundary

Inference backends do not receive host tool handles. A model returns structured node output only.

The runtime rejects output that does not match the inference node's output schema.

## Command boundary

The built-in process capability is `process.command.run-fixed`.

It accepts:

```json
{ "command_ref": "node.version" }
```

The host registry maps that opaque reference to a fixed executable and argv.

The model cannot provide:

- arbitrary executable
- arbitrary argv
- `sh -c`
- `bash -c`
- shell operators
- arbitrary cwd
- arbitrary environment

The process is spawned with `shell=false`.

## File boundary

The built-in file reader is rooted to one configured workspace.

It denies:

- absolute paths
- `..` traversal segments
- realpath escape
- symlink escape
- protected patterns such as `.env`, `.git/**`, `**/*.key`
- files larger than the configured byte limit

There is no generic file write/delete capability in this lab.

## Authorization boundary

A capability being registered does not authorize it.

Each `execution.run.v0` carries `authorization.allowed_capabilities`. Invocation fails closed when the current capability is not in that list.

This snapshot is deliberately generic. A future Task/Policy/Approval integration may produce the snapshot, but this module does not own those business semantics.


## HTTP service boundary

The lab service is deliberately loopback-only (`127.0.0.1`, `::1`, or `localhost`). It does not yet implement caller authentication, so binding it to a LAN/public interface is rejected.

`authorization.allowed_capabilities` is an execution authorization snapshot, not proof of caller identity. A future platform integration must authenticate the caller before constructing that snapshot.

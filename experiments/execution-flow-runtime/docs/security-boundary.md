# Security boundary

This runtime is intentionally spec-driven.

Caller authentication (API token/JWT/Gateway identity) is intentionally deferred during the lab stage. Execution safety is not deferred.

## Model boundary

Inference backends do not receive host tool handles. A model returns structured node output only.

The runtime rejects output that does not match the inference node's JSON Schema 2020-12 output contract.

Flow transitions are defined by the flow. The model cannot add hidden `next_node`, `command`, `capability`, shell or filesystem authority outside the declared output schema.

## Command boundary

The built-in process capability is `process.command.run-fixed`.

It accepts:

```json
{ "command_ref": "node.version" }
```

The host registry maps that opaque reference to a fixed executable and argv.

The model/flow cannot provide arbitrary executable, argv, shell line, cwd or environment through this capability. The process is spawned with `shell=false`.

A fixed command is bounded by timeout and output limits. When either limit is exceeded, the child process is terminated before the capability returns the error.

## File boundary

The built-in file reader is rooted to one configured workspace.

It denies:

- absolute paths
- `..` traversal segments
- resolved path escape
- symlink escape
- protected requested paths such as `.env`, `.git/**`, `**/*.key`
- symlink aliases that resolve to protected paths inside the workspace
- files larger than the configured byte limit

There is no generic file write/delete capability in this lab.

## Authorization boundary

A capability being registered does not authorize it.

Each `execution.run.v0` carries `authorization.allowed_capabilities`. Invocation fails closed when the current capability is not in that list.

This is an execution authorization snapshot. This lab does not yet define caller authentication or who is entitled to construct that snapshot.

## Service process boundary

There is one managed Execution Flow Runtime service per runtime home.

`start` is idempotent and refuses to create a second service if a live runtime PID/lock exists but identity cannot be verified.

`stop` kills a PID only after `/health` proves that the stored PID belongs to the stored runtime instance. `stop --force` may SIGKILL only a verified runtime that ignored SIGTERM. For an unverified live PID, `--force` clears stale state only and leaves the process untouched.

## HTTP service boundary

The lab service is loopback-only (`127.0.0.1`, `::1`, or `localhost`). Caller token/authentication is deliberately outside the current lab scope.

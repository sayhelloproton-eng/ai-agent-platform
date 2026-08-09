# CLI

The command line is a first-class public interface and documentation surface.

## Bootstrap

`aap-execution-flow install`

Creates the runtime home and default configuration. It does **not** install the npm package.

## One managed service

The lab runs one managed Execution Flow Runtime service per runtime home. Inference backends such as MLXHub are providers inside that service; they are not separate runtime services.

Service lifecycle:

- `aap-execution-flow start`
- `aap-execution-flow status`
- `aap-execution-flow stop`
- `aap-execution-flow restart`
- `aap-execution-flow serve`

`start` is idempotent. A singleton lock prevents concurrent managed instances for the same runtime home.

`stop` only signals a PID after runtime identity is verified through health. `stop --force` never kills an unverified PID; for an unverified PID it only removes stale state.

## Execution

- `aap-execution-flow validate --file run.json`
- `aap-execution-flow run --file run.json`

Validation never executes capabilities and uses the same published protocol schemas as runtime execution.

## Discovery

- `aap-execution-flow capabilities --json`
- `aap-execution-flow providers --json`
- `aap-execution-flow spec list --json`
- `aap-execution-flow docs list --json`

## AI discovery

`aap-execution-flow describe --json`

This is the preferred machine-readable entry point. It describes command names, side-effect class, usage, service endpoints and runtime invariants.


## Machine-readable lifecycle

All lifecycle commands support `--json`. In particular, `restart --json` returns one JSON document:

```json
{
  "ok": true,
  "status": "restarted",
  "previous": {
    "ok": true,
    "status": "stopped",
    "pid": 12345
  },
  "current": {
    "ok": true,
    "status": "started",
    "state": {
      "pid": 12346,
      "instance_id": "..."
    }
  }
}
```

Use `EXECUTION_FLOW_RUNTIME_HOME` to isolate a managed service instance during tests.

## Runtime-owned provider config

```bash
aap-execution-flow config show --json
aap-execution-flow config mlxhub set --base-url http://192.168.0.104:8080/ --fast-model sayhelloproton/Qwen3.5-4B-MLX-4bit-no-think --reason-model mlx-community/Qwen3.5-4B-MLX-4bit --json
aap-execution-flow config mlxhub clear --json
```

The provider/model mapping is persisted in Runtime Home config. `run`, `capabilities`, and `providers` communicate with the single managed service and do not instantiate a second Runtime.

# @ai-agent-platform/execution-flow-runtime

A TypeScript-source-only lab module for running **spec-defined execution flows**.

This module is not a Task domain, not a Controller, and not a free-form Agent loop. It accepts a structured execution contract, runs explicit nodes, invokes only registered capabilities, and uses small-model inference only where the flow declares an inference node.

## Current package mode

- 100% TypeScript executable/source code.
- Root public entry: `index.ts`.
- No `dist/`, `lib/`, transpiled JavaScript, compatibility wrapper, CJS build, or generated declarations.
- Intended runtime during the lab stage: Node 20 + `tsx`.
- Package shape is already suitable for a future npm package, but compatibility packaging is intentionally deferred.

## Install

Package installation after publication:

```bash
npm install @ai-agent-platform/execution-flow-runtime
```

Lab/local source:

```bash
cd experiments/execution-flow-runtime
npm install
```

Initialize runtime home/config:

```bash
aap-execution-flow install
```

## Service lifecycle

```bash
aap-execution-flow start
aap-execution-flow status
aap-execution-flow stop
aap-execution-flow restart
```

Foreground mode:

```bash
aap-execution-flow serve
```

Default service:

```text
http://127.0.0.1:43170
```

## AI-friendly CLI documentation

The CLI is part of the public interface.

For a machine-readable command contract:

```bash
aap-execution-flow describe --json
```

For AI-oriented module guidance:

```bash
aap-execution-flow docs ai --json
```

For protocol docs:

```bash
aap-execution-flow docs protocol
```

For bundled schemas:

```bash
aap-execution-flow spec list --json
aap-execution-flow spec execution-run --json
```

For runtime capabilities and inference providers:

```bash
aap-execution-flow capabilities --json
aap-execution-flow providers --json
```

The goal is that an AI agent can inspect the module before using it instead of relying on hidden assumptions.

## Core rule

The flow defines **what node runs next**.

The model does not invent shell commands, filesystem permissions, capabilities, or global task transitions.

See:

```bash
aap-execution-flow docs protocol
aap-execution-flow docs security
aap-execution-flow docs integration
```

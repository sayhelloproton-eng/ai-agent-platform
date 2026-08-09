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

# Context Ownership and Access

## Ownership

`context/**` is shared project startup state. Its semantic owner is the master/control Planner.

- The master/control Planner decides whether a project-level fact changed and authors complete replacement files.
- Specialist agents, reviewers, researchers, and executors may report drift with evidence.
- The user reviews every Context change and approves important changes when required.
- Executors do not author Context.

## Contract

Read-only is the default:

```json
{
  "mode": "read_only",
  "files": [],
  "content_source": "none",
  "user_approval": "not_required"
}
```

Approved write:

```json
{
  "mode": "write_approved",
  "files": ["context/current-status.md"],
  "content_source": "planner_full_replacement",
  "user_approval": "confirmed"
}
```

Rules:

- `write_approved` must list one or more exact `context/` files.
- `planner_full_replacement` is the only allowed write source.
- The same files must be allowed by Scope Lock.
- The executor must copy complete files byte-for-byte and may not rewrite them.
- `user_approval` is `confirmed` for important changes and may be `not_required` only for routine synchronization already covered by standing authorization.

## Drift report

A non-owner reports:

```yaml
context_change_report:
  required: true
  reason: <why context may be stale>
  evidence:
    - <commit, path, test, or runtime evidence>
  suggested_files:
    - context/<file>.md
```

The report does not grant write access.

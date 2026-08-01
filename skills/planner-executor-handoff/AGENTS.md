# Planner Executor Handoff Rules

> Applies to `skills/planner-executor-handoff/**`.

- Keep Chat as the sole planner, decision maker, contract author, and reviewer.
- Keep every Codex, Work, OpenCode/DeepSeek, Runtime, or future model in the execution layer.
- Keep one Canonical Handoff Contract as the task truth.
- Treat guidance tiers as execution formatting, not authority levels.
- Require structured feedback before writes, at checkpoints, on failure, at completion, and after review.
- Bind artifacts to task ID, version, executor ID, and source commit.
- Treat branch, Push, PR, merge, rebase, cherry-pick, force-push, deletion, Worktree, and cleanup policy as Chat-owned frozen decisions.
- Never create a remote review branch solely because Chat will review the result.
- Never store secrets, tokens, cookies, private keys, or temporary authorization in artifacts.
- Stop when facts, Git state, scope, authorization, versions, side effects, or evidence are incomplete.
- Evolve the protocol only from reviewed incidents and evaluations.

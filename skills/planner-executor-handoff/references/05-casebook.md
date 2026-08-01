# ai-agent-platform Handoff Casebook

- Missing context caused the executor to ask the user for already-decided facts.
- Chat launcher, ZIP task book, and later corrections created multiple task truths.
- A gate assumed PyYAML while dependency installation was forbidden.
- A worktree verification could not resolve the approved Node runtime.
- zsh `path` invalidated a scope check.
- Git rename detection disagreed with the path whitelist.
- Ruby and Chinese paths caused source and encoding failures.
- Empty directories were treated as Git artifacts.
- Failure reports omitted staged state and safe resume points.
- Codex quota exhaustion required a more explicit DeepSeek continuation.
- Completion reports lacked verifiable snapshots or remote evidence.

Convert each recurring incident into a contract field, validator, test, or stop rule.

## Unrequested remote review branch

The user asked to migrate a frozen Skill into the repository, but the Contract created and pushed `skill/planner-executor-handoff-v0.2` only to support Chat Review.

Rule:

- Review does not imply a remote feature branch.
- Freeze the current and target branch explicitly.
- Default to the current authorized branch when the user asks to continue there.
- Require exact permission before creating or deleting any remote branch.

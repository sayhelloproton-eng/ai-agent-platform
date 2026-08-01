# Review, Resume, and Executor Switching

## Review

Inspect actual files, tracked and untracked scope, diff, tests and exit codes, commit topology, remote SHA, artifacts, workspace state, and external side effects.

Return Review Feedback with reviewed commit, blocking and non-blocking findings, required changes, unchanged scope, resume point, new authorization, and review state.

## Resume

Validate task version, source commit, workspace, staged state, side effects, and passed gates before continuing.

Resume from `safe_resume_point`. Do not repeat accepted work.

## Executor switch

Record prior and next executor, guidance tier, branch, worktree, current commit, completed and remaining steps, passed gates, failure history, side effects, steps not to repeat, and safe resume point.

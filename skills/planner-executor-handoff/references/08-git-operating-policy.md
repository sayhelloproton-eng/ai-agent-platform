# Git Operating Policy

## Ownership

Git strategy is part of Chat-owned deterministic analysis.

The executor must not decide to create a branch, push a review branch, open a PR, merge, rebase, cherry-pick, squash, force-push, or delete resources unless the Canonical Handoff Contract explicitly authorizes that exact action.

## Required contract fields

Freeze:

- `workspace_strategy`;
- `current_branch`;
- `target_branch`;
- `target_remote`;
- local and remote branch-creation permissions;
- commit permission, count, and message;
- fetch and pull permissions;
- push permission and exact target;
- PR requirement and creation permission;
- merge permission and strategy;
- rebase, cherry-pick, and force-push permissions;
- local branch, remote branch, Worktree, and delivery cleanup permissions;
- exact remote branches that may be deleted.

## Default policy

Unless Chat freezes otherwise:

- continue on the current authorized branch;
- do not create local or remote branches;
- do not create a PR;
- do not merge, rebase, cherry-pick, squash, or force-push;
- do not delete branches, Worktrees, or delivery files;
- stop when the actual branch or remote state differs.

Review does not imply a remote feature branch.

## Reception Ack

Before writes, report:

- actual branch and HEAD;
- expected target branch;
- push target;
- remote deletion targets;
- whether the actual state matches the contract.

`can_start` must be false when Git state or permissions do not match.

## Execution Result

Report:

- starting branch and HEAD;
- created local and remote branches;
- commit SHA;
- push target and remote SHA;
- merge strategy and result;
- deleted remote branches;
- cleanup actions;
- final branch, HEAD, and workspace state.

Explicitly report empty lists for actions that were not performed.

## Deletion order

When a remote branch deletion is authorized as cleanup:

1. finish the target branch commit and validation;
2. push and read back the target branch;
3. verify the target remote SHA;
4. delete only the exact authorized remote branch;
5. fetch with prune and verify absence;
6. report the deletion in Execution Result.

Do not use wildcard deletion.

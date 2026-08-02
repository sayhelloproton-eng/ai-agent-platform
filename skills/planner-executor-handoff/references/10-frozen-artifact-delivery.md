# Frozen Artifact Delivery

## Purpose

`apply_frozen_artifacts` is the deterministic branch of Planner–Executor handoff. It guarantees that Planner-authored files are applied without Executor authorship.

## Required contract

- fixed base Commit, branch, remote head and clean workspace/index;
- package hash, single top-level directory, Manifest and source hashes;
- exact Overlay, Delete and optional empty-directory sets;
- domain and repository validation commands;
- one authorized Commit message and Push target;
- continuation fields when resuming after a stopped gate.

## Mandatory gates

1. Verify ZIP central directory: no duplicate names, absolute paths, `..`, symlinks or special entries.
2. Extract outside the repository.
3. Verify package Manifest and every SHA-256.
4. Verify base source hashes from the fixed Git object, not from a potentially drifted worktree.
5. Require exact branch, local/remote SHA, clean worktree and empty index.
6. Apply only declared Overlay and Delete paths.
7. Compare every result byte-for-byte; prefer `/usr/bin/cmp`.
8. Compute Scope from tracked plus untracked paths with rename detection disabled.
9. Run all declared tests and `git diff --check`.
10. Recheck the remote before staging.
11. Stage exact paths, inspect cached Scope and create one authorized Commit.
12. Push without force, read back the remote SHA and prove a clean workspace.

## Continuation

A continuation does not repeat successful side effects. It verifies the stop report, current SHA, worktree, index, package directory and completed gates, then resumes only at `resume_from` with the smallest new authorization.

## Shell and path hazards

- use `--no-renames` for deterministic Scope comparison;
- do not name a zsh loop variable `path`;
- pass Chinese paths as data rather than embedding them in fragile inline source;
- Git does not track empty directories, so declare and remove them separately with `rmdir` only when empty;
- never change content, tests, Schema, validator, or Contract to make a failing gate pass.

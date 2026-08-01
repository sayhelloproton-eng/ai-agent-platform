---
name: planner-executor-handoff
description: Prepare, validate, render, execute, review, resume, and evolve deterministic handoffs between a planning/review Chat and local execution agents. Use when Chat delegates repository, terminal, browser, or tool work to Codex, GPT Work, OpenCode/DeepSeek, or another executor; when an executor must acknowledge, request clarification, checkpoint, stop, report results, respond to review, resume, or switch; or when recurring handoff failures should become protocol tests and revisions.
---
# Planner Executor Handoff

## Core invariant

Keep planning and execution separate.

- Treat the current Chat as the brain, planner, decision maker, contract author, and reviewer.
- Treat Codex, GPT Work, OpenCode/DeepSeek, Runtime, and future models as execution-layer agents.
- Complete deterministic analysis before delegation. Recover missing facts with repository reads, Actions, files, tools, or explicit user confirmation.
- Do not delegate goal discovery, architecture decisions, impact analysis, scope selection, or acceptance design to the executor.
- Allow the executor to observe, execute, validate, and report only within the frozen contract.

## Workflow

1. Recover facts.
2. Freeze one Canonical Handoff Contract.
3. Build a minimal Context Package.
4. Choose `compact_controlled` or `stepwise_controlled` and freeze `execution_authority`.
5. Complete and freeze all implementation artifacts required by `frozen_artifacts_only` executors.
6. Render an executor view from the same contract.
7. Require Reception Ack before writes.
8. Freeze and enforce the Git Operating Policy.
9. Execute with structured feedback.
10. Review real evidence.
11. Resume or switch only from a reviewed safe point.
12. Evolve rules only from incidents and evaluations.

## Execution guidance tiers

### `compact_controlled`

Provide complete deterministic analysis, selected approach, cross-file relations, scope, validation, evidence, and stop conditions.

Omit repeated history, tutorials, and unnecessary command-by-command narration.

Permit only tactical discretion: equivalent commands, necessary read-only checks, and local command-error diagnosis. Do not permit changes to goal, architecture, approach, dependencies, scope, or acceptance.

### `stepwise_controlled`

Provide the same complete analysis plus exact paths, fixed step order, concrete commands, expected results, multi-layer checks, checkpoints, stop conditions, safe resume points, and a fixed report format.

For a low-capability executor, set `execution_authority: frozen_artifacts_only`. Chat must finish the code, schemas, tests, documents, overlay, manifest, and hashes before handoff. The executor may only validate, copy byte-identical artifacts, run fixed commands, commit, push, and report. Do not give a weak executor a development specification and ask it to implement or repair the solution.

## Execution authority

Use one of two authority modes:

- `bounded_implementation`: the executor may implement the already-frozen design inside exact scope. Chat still owns analysis, architecture, approach, acceptance, and review.
- `frozen_artifacts_only`: the executor may not author or edit task content. Chat must provide a complete overlay, manifest, hashes, delete list, fixed commands, and expected results.

Current project default:

- Codex normally uses `compact_controlled` with `bounded_implementation` or `frozen_artifacts_only`, depending on task readiness.
- OpenCode/DeepSeek uses `stepwise_controlled` with `frozen_artifacts_only`.

A handoff is not ready for `frozen_artifacts_only` until every repository artifact is final and independently tested by Chat. If the task still requires coding choices, schema design, test design, prose drafting, or cross-file reasoning, Chat must complete that work before delegation.

## Canonical artifacts

- Executor Profile
- Canonical Handoff Contract
- Context Package
- Reception Ack
- Clarification Request
- Progress Checkpoint
- Failure / Stop Report
- Execution Result
- Review Feedback
- Review Response
- Executor Switch Checkpoint

Bind artifacts to task ID, task version, executor ID, and source commit when applicable.

## Git Operating Policy

Treat every Git action as a Chat-owned decision.

The Canonical Handoff Contract must state:

- current and target branch;
- target remote;
- whether local or remote branch creation is allowed;
- whether commit, fetch, pull, push, PR, merge, rebase, cherry-pick, squash, or force-push is allowed;
- exact push target and commit count/message when authorized;
- merge strategy when authorized;
- whether local branch, remote branch, Worktree, or delivery-directory cleanup is allowed;
- exact remote branches allowed to be deleted.

Do not create a feature branch merely because Chat Review is required.

When the user asks to install or migrate into the current repository branch, continue on that branch unless Chat explicitly freezes another target.

Require Reception Ack to confirm the actual branch and Git policy before writes. Require Execution Result to report all created, pushed, merged, deleted, and cleaned Git resources.

## Feedback contract

Require the execution layer to report facts and state, not make planning decisions.

Every executor feedback artifact must identify current state, completed steps, evidence, workspace state, and next required action.

Failure reports must include the last successful gate, failed step, raw error, side effects, safe resume point, and required decision.

Completion reports must include changed and deleted files, tests and exit codes, diff stat, commit and remote SHA, artifacts, limitations, unfinished items, and workspace state.

## Review and change control

Return Review Feedback with the reviewed commit, findings, required changes, unchanged scope, resume point, and new authorization.

Require Review Response before revision. Do not allow the executor to expand the task from review comments.

## Skill routing

- Use `deterministic-delivery` for frozen ZIP, overlay, Git scope, staging, commit, push, and deterministic continuation.
- Use `ai-knowledge` for knowledge semantics, lifecycle, Registry meaning, and Feishu projection.
- Use `engineering-insight-distillation` to decide whether an incident should become a durable engineering rule.
- Use provider-specific skills for their own tools and APIs.

## Read references progressively

- `references/01-role-boundaries.md`
- `references/02-guidance-tiers.md`
- `references/03-contract-context-feedback.md`
- `references/04-review-resume-switch.md`
- `references/05-casebook.md`
- `references/06-design-basis-and-evaluation.md`
- `references/07-related-skills.md`
- `references/08-git-operating-policy.md`

## Stop rules

Stop and return a structured artifact when the source commit, current or target branch, remote head, workspace, staged state, Git authorization, scope, artifact versions, side effects, or completion evidence do not match the contract.

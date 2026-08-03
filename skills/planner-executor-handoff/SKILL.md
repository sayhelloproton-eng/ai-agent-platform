---
name: planner-executor-handoff
description: Prepare, validate, execute, review, resume, and switch controlled handoffs between a planning/review Chat and local executors. Use for repository, terminal, browser, or tool delegation; for bounded implementation from an approved specification; or for byte-identical application of frozen ZIP/Overlay artifacts. Also use for Reception Ack, clarification, checkpoints, failure reports, review responses, Git authorization, and continuation. Do not use to discover goals, choose architecture, author unresolved content, or replace domain-specific semantic review.
---

# Planner Executor Handoff

## Core invariant

The Planner owns meaning and authorization. The Executor owns bounded observation, execution, validation, and factual feedback.

- The current Chat is the brain, contract author, reviewer, and change-control authority.
- Codex, GPT Work, OpenCode/DeepSeek, Runtime, scripts, and future models are execution-layer agents.
- Do not delegate goal discovery, architecture, approach selection, impact analysis, scope design, acceptance design, Context semantics, or unresolved prose.
- Every task has one Canonical Handoff Contract; prompts, ZIP task books, Context Packages, and resume instructions derive from it.

## Delivery modes

### `implement_from_spec`

Use when the design, scope, constraints, acceptance, and Git policy are frozen, but the Executor must still implement within those boundaries.

- `execution_authority: bounded_implementation`;
- tactical command choices are allowed;
- architecture, dependencies, external behavior, scope, and acceptance may not change;
- unexpected design choices require clarification.

### `apply_frozen_artifacts`

Use when the Planner has already authored the complete final files or ZIP Overlay.

- `execution_authority: frozen_artifacts_only`;
- the Executor may validate, copy, delete exact paths, compare bytes, run fixed checks, create the authorized Commit, Push, and report;
- use `/usr/bin/cmp` for byte identity and Git `--no-renames` when computing deterministic Scope;
- no rewriting, repair, formatting, semantic merge, Schema redesign, or “optimization” is allowed;
- the existence of knowledge or Context paths does not transfer control to a domain Skill.

Read [`references/10-frozen-artifact-delivery.md`](references/10-frozen-artifact-delivery.md) and validate the frozen contract with `scripts/validate-frozen-delivery.mjs`.

## Main workflow

1. Recover current repository, environment, remote, and task facts.
2. Freeze goal, selected approach, Scope Lock, acceptance, stop rules, Context Access, and Git Operating Policy.
3. Select `compact_controlled` or `stepwise_controlled` guidance and one delivery mode.
4. For frozen delivery, finish and independently verify every Artifact before delegation.
5. Render the executor view from the same contract.
6. Require Reception Ack before writes.
7. Execute with structured checkpoints and immediate stop on contract mismatch.
8. Review real Diff, tests, Commit, remote SHA, side effects, and workspace state.
9. Resume or switch only from a reviewed safe point.

## Guidance tiers

- `compact_controlled`: complete deterministic analysis with concise execution guidance; suitable for an Executor that reliably respects boundaries.
- `stepwise_controlled`: the same analysis plus exact order, commands, expected results, checkpoints, stop conditions, and report format.

Guidance detail never expands execution authority.

## Context ownership

`context/**` is Planner-owned semantic state.

- Default: `context_access.mode: read_only`.
- `write_approved` requires exact files, `content_source: planner_full_replacement`, user authorization, matching Scope Lock, `delivery_mode: apply_frozen_artifacts`, and `frozen_artifacts_only`.
- Specialist agents report drift and evidence; they do not author Context.
- Broad grants such as `context/**` are forbidden.

Read [`references/09-context-ownership-and-access.md`](references/09-context-ownership-and-access.md).

## Git Operating Policy

Every contract explicitly states current/target branch, remote, allowed branch creation, Commit count/message, Fetch/Pull/Push/PR/Merge/Rebase/Cherry-pick/Squash/Force Push permissions, cleanup permissions, and exact deletion targets.

Chat Review is not a reason to create or Push a feature branch. A remote write requires an explicit push target and remote-head check.

Read [`references/08-git-operating-policy.md`](references/08-git-operating-policy.md).

## Feedback artifacts

Use structured:

- Reception Ack;
- Clarification Request;
- Progress Checkpoint;
- Failure / Stop Report;
- Execution Result;
- Review Feedback and Review Response;
- Executor Switch Checkpoint.

A failure report includes the last successful gate, raw error, side effects, workspace/index state, safe resume point, and required decision. A completion report includes exact files, tests and exit codes, Diff, Commit and remote SHA, artifacts, limitations, unfinished items, and final workspace state.

## Routing boundaries

- `project-knowledge-synthesis` decides what project knowledge should remain, merge, conflict, or retire.
- `engineering-document-authoring` writes approved formal documents.
- `project-knowledge-governance` supplies read-only knowledge placement, Registry, integrity, and publication constraints.
- `engineering-insight-distillation` is invoked explicitly for reusable lessons.
- Provider-specific Skills govern their own external contracts.

In `apply_frozen_artifacts`, domain Skills are constraint references only and may not reinterpret the package.

## Large document-and-visual delivery choreography

For documentation chapters that combine heavy authoring and many formal diagrams, prefer short chained deliveries instead of one monolithic package.

Recommended order:

1. **article review bundle** — Markdown only or Markdown-first, for semantic review;
2. **visual asset patch bundle** — approved images only, mapped to exact article paths;
3. **final frozen execution bundle** — the combined reviewed result for mechanical application.

Additional rules:

- if a package change only repairs validation contracts or continuation scripts, prefer `continuation` over re-applying the full bundle;
- the Executor does not reinterpret article meaning or redesign diagrams;
- do not require large preview composites unless the Planner explicitly requests them;
- long image-generation work should be upstream of the final frozen delivery, not inside the executor run.

This reduces stalled runs caused by mixing semantic writing, asset design, validation, and execution in one handoff.

## Stop rules

Stop when source or remote SHA, branch, workspace/index, package hash, Manifest, Scope, Context Access, Git policy, Artifact identity, validation evidence, or side effects differ from the contract. Report facts; do not adapt the contract silently.

## Progressive references

Read only what the task needs:

- role and guidance: `references/01-role-boundaries.md`, `02-guidance-tiers.md`;
- contract and feedback: `03-contract-context-feedback.md`, `04-review-resume-switch.md`;
- cases and evaluation: `05-casebook.md`, `06-design-basis-and-evaluation.md`;
- routing and Git: `07-related-skills.md`, `08-git-operating-policy.md`;
- Context: `09-context-ownership-and-access.md`;
- frozen ZIP/Overlay: `10-frozen-artifact-delivery.md`.

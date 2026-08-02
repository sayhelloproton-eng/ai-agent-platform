---
name: engineering-insight-distillation
description: Screen or distill evidence-backed engineering incidents, disproved assumptions, approach changes, and repeated workflow failures into bounded, actionable insights. Use only when the user explicitly asks whether an event is worth retaining, asks to generalize a resolved lesson, or asks to revise an existing insight with new evidence. Do not auto-trigger for debugging, implementation, every failure, ordinary review, status, translation, project synthesis, or unsupported root-cause claims.
---

# Engineering Insight Distillation

## Purpose

Convert a verified or explicitly uncertain engineering event into a reusable judgment, pattern, anti-pattern, heuristic or checklist without losing evidence, applicability limits or governance state.

This is an explicit-trigger specialist Skill. It is not a project history store, automatic memory system, general post-Commit hook or permission to modify formal rules.

## Modes

### Screening

Use for “is this worth retaining?”, batches, ambiguous value or incomplete evidence. Return one:

- `proceed_full`;
- `needs_evidence`;
- `reject`.

Screening does not create or promote an insight.

### Full

Use after `proceed_full` or when the user explicitly requests a complete governed insight and the event is sufficiently evidenced. Return the distillation-result contract.

## Full workflow

1. Separate observed event, impact, assumption, cause analysis, resolution and verification.
2. Classify every claim as verified fact, inference, hypothesis or recommendation.
3. Decide whether the mechanism can improve a future decision; reject trivial or unexplained events.
4. Abstract the mechanism beyond project/provider names while retaining concrete actionability.
5. Choose one primary form: judgment, pattern, anti-pattern, heuristic or checklist.
6. State applicable contexts, preconditions, exclusions, counterconditions and evidence strength.
7. Check whether this is a new insight, occurrence, evidence update, refinement or contradiction.
8. Produce at least one executable design check, test rule, acceptance gate, exit criterion or operational checklist.
9. Keep maturity, lifecycle and approval separate; never auto-promote.

## Evidence and boundaries

- Do not fabricate root cause, verification, occurrence or uniqueness.
- One event cannot justify an unconditional global rule.
- If the governed index is unavailable, deduplication is `unverified`.
- Conflicting evidence triggers revision review, not silent averaging.
- Human approval is required before formal policy adoption or maturity/lifecycle change.

## Routing

- Project-wide fact recovery and asset consolidation → `project-knowledge-synthesis`.
- Final human-readable insight article → `engineering-document-authoring`.
- Registry/lifecycle placement → `project-knowledge-governance`.
- Repository execution → `planner-executor-handoff`.

## Progressive references

Read only relevant files under `references/`: evidence, abstraction, forms, applicability, deduplication, maturity, output quality, collaboration, cost mode and Registry protocol.

## Stop rules

Return `needs_evidence` or `reject` rather than manufacturing an insight when evidence, transferability, mechanism, boundary or verification is insufficient.

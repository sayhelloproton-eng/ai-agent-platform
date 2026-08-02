---
name: project-knowledge-synthesis
description: Synthesize multiple project documents, sessions, reports, and registry evidence into a bounded, reviewable knowledge-change proposal. Use for directory consolidation, project-history reconstruction, duplicate/conflict analysis, or deciding whether assets should be kept, rewritten, merged, archived, or superseded. Do not use for ordinary single-document summarization, implementation, current-status lookup, engineering-insight distillation, or direct unreviewed writes.
---

# Project Knowledge Synthesis

## Purpose

Produce a traceable synthesis proposal from multiple project sources while preserving claim classes, evidence, conflicts, privacy boundaries, stable asset IDs, and downstream link / Registry impact.

This Skill is a semantic planning capability. It does not grant write, publish, merge, lifecycle-promotion, or Context-authoring authority.

## Required Inputs

Prefer a request conforming to `assets/schemas/synthesis-request.schema.json`.

At minimum identify:

- synthesis ID and mode;
- exact source scope;
- truth and evidence sources;
- objectives and constraints;
- stable IDs that must be preserved;
- publication and privacy boundaries;
- current write authority.

## Workflow

### Checkpoint 1 — Freeze Scope and Inventory

List every source file or conversation range. Separate formal sources, evidence, historical assets and contextual notes. Do not silently expand scope.

### Checkpoint 2 — Extract and Classify Claims

Classify each material claim as:

- verified fact;
- accepted decision;
- current status;
- target design;
- historical / superseded statement;
- engineering inference;
- open hypothesis;
- private or sensitive context.

Do not turn plans into implementations or inferences into facts.

### Checkpoint 3 — Reconcile with Truth Sources

Use code, tests, Registry, Release, Migration, accepted ADR and current Context to identify stale or conflicting claims. Preserve uncertainty when evidence is insufficient.

### Checkpoint 4 — Map Overlap and Conflict

Group sources that answer the same question. Distinguish useful cross-reference from duplicated ownership. Record conflicts explicitly instead of averaging them into vague prose.

### Checkpoint 5 — Decide Target Asset Placement

For each source or Claim group choose a bounded action:

- keep;
- rewrite;
- merge into another stable asset;
- create a new asset;
- archive;
- supersede;
- reject from formal knowledge.

Preserve stable IDs whenever the conceptual asset continues. Do not reuse retired IDs.

### Checkpoint 6 — Compute Downstream Impact

List required updates to:

- README navigation;
- cross-document links;
- Context;
- Platform Registry assets and relations;
- Release / Migration records;
- Skill docs and tests;
- Feishu projection eligibility.

### Checkpoint 7 — Privacy and Publication Gate

Remove or flag secrets, personal identifiers, private paths, third-party copyrighted material and unsupported claims. Formal publication always requires human Review and separate authorization.

### Checkpoint 8 — Return a Governed Proposal

Return `assets/schemas/synthesis-result.schema.json` with:

- source inventory and claim summary;
- overlap groups and conflicts;
- target assets and retired assets;
- link / Registry / Context impact;
- quality gates and unresolved evidence;
- required human approval.

A synthesis result is a candidate, not a write instruction. The total-control Planner must transform approved results into complete frozen files. Executor writes only those frozen files.

## Stop Rules

Return `needs_evidence` or stop when:

- source scope is ambiguous;
- current truth sources are unavailable but current status is being asserted;
- conflicts cannot be resolved without Project Owner input;
- requested output would expose private or unauthorized material;
- stable asset IDs or replacement targets are unclear;
- the user asks the Skill to directly publish or silently overwrite formal assets.

## Relationship to Other Skills

- `ai-knowledge` governs formal knowledge lifecycle and Feishu projection;
- `engineering-insight-distillation` extracts reusable engineering lessons from verified events;
- `planner-executor-handoff` carries approved frozen artifacts to the Executor;
- `deterministic-delivery` applies the frozen package exactly.

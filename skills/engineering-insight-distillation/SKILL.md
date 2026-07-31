---
name: engineering-insight-distillation
description: Screen or fully distill evidence-backed engineering incidents, disproved assumptions, approach changes, and repeated workflow failures into bounded, actionable insights. Use when the user explicitly asks whether an event is worth retaining, asks to generalize a resolved engineering lesson, or asks to update an existing insight with new evidence. Do not use for ordinary debugging, implementation, translation, project-wide summarization, status queries, or unsupported root-cause claims.
---

# Engineering Insight Distillation

## Purpose

Transform a verified or explicitly uncertain engineering event into a reusable insight without losing evidence, applicability boundaries, lifecycle history, or governance controls.

This Skill is a distillation method. It is not an experience store, project history, automatic memory system, or authorization to modify formal project assets.

## Execution Modes

Read [`references/09-运行模式与成本控制.md`](references/09-运行模式与成本控制.md).

### Screening

Use Screening to decide whether an event deserves full distillation.

Return `assets/schemas/screening-result.schema.json` with one decision:

- `proceed_full`;
- `needs_evidence`;
- `reject`.

Screening does not create an insight ID, maturity recommendation, duplicate claim, or formal engineering rule.

### Full

Use Full only when:

- Screening returned `proceed_full`; or
- the user explicitly requests a governed insight and the input is already sufficiently complete.

Full executes all seven Checkpoints and returns `assets/schemas/distillation-result.schema.json`.

### Auto

In Auto mode:

- use Screening for ambiguous, batch, low-evidence, or “is this worth retaining?” requests;
- use Full for explicit, complete, evidence-backed distillation or insight-update requests;
- do not trigger for ordinary debugging, implementation, translation, general summarization, or status lookup.

## Required Input

Prefer an `experience candidate` conforming to `assets/schemas/experience-candidate.schema.json`.

At minimum identify:

- expected outcome;
- observed event and impact;
- assumptions;
- evidence and source references;
- cause analysis with uncertainty preserved;
- resolution and verification;
- proposed lesson, if one exists;
- comparison context when uniqueness or duplication is being claimed.

Classify claims as verified fact, engineering inference, open hypothesis, or recommendation. Never silently convert one class into another.

## Full Workflow

### Checkpoint 1 — Qualify the Input

Read [`references/01-输入资格与证据规则.md`](references/01-输入资格与证据规则.md).

- Verify that the event, evidence, resolution, and verification are distinguishable.
- Separate symptoms from causes and event success from causal proof.
- If evidence is incomplete, return `needs_evidence` and list missing evidence.
- Never fabricate a root cause, verification result, occurrence, or source.

### Checkpoint 2 — Decide Whether It Is Worth Retaining

Retain an event only when it can plausibly improve future decisions or execution.

Strong candidates expose at least one of:

- a trust, architecture, authorization, state, or role boundary;
- an incorrect validation or decision sequence;
- a repeated workflow defect;
- a failed assumption that changed the approach;
- a reusable prevention mechanism;
- a pattern with likely transfer to another context.

Reject or defer trivial errors, accidental typos, unexplained failures, and observations with no transferable mechanism.

### Checkpoint 3 — Identify the Mechanism and Abstract

Read [`references/02-工程经验抽象方法.md`](references/02-工程经验抽象方法.md).

Identify the underlying mechanism, such as:

- trust boundary;
- control or information flow;
- authorization layers;
- verification path;
- state ownership;
- decision order;
- role responsibility;
- failure recovery;
- dependency uncertainty;
- reversibility or observability.

The result must be more reusable than the original event, more concrete than a slogan, and actionable without depending on the original project name.

### Checkpoint 4 — Select the Insight Form

Read [`references/03-模式反模式与启发式.md`](references/03-模式反模式与启发式.md).

Choose exactly one `primary_type`:

- `judgment`;
- `pattern`;
- `anti_pattern`;
- `heuristic`;
- `checklist`.

Use `secondary_types` only when they materially improve retrieval or application.

### Checkpoint 5 — Bound Applicability

Read [`references/04-适用边界与错误泛化.md`](references/04-适用边界与错误泛化.md).

Every proposed insight must state:

- applicable contexts;
- preconditions;
- exclusions or counterconditions;
- evidence strength;
- maturity level;
- lifecycle status;
- source references.

Reject product-bound rules, absolute claims derived from one event, empty advice, and principles that ignore stage, risk, trust, reversibility, or opposing conditions.

### Checkpoint 6 — Check Duplication, Conflict, and Evolution

Read [`references/05-查重冲突与经验演进.md`](references/05-查重冲突与经验演进.md).

Before proposing a new insight, decide whether the candidate is:

- a new insight;
- a new occurrence of an existing insight;
- new evidence for an existing insight;
- a refinement or specialization;
- a revision caused by conflicting evidence;
- a contradiction that requires human review.

Prefer evidence merge and boundary revision over near-duplicate creation. If the governed insight index is unavailable, set deduplication to `unverified` and do not claim uniqueness.

### Checkpoint 7 — Make It Actionable and Governed

Read [`references/06-成熟度与版本治理.md`](references/06-成熟度与版本治理.md) and [`references/07-输出契约与质量门.md`](references/07-输出契约与质量门.md).

Each accepted insight must produce at least one executable artifact:

- design check;
- test rule;
- acceptance gate;
- review rule;
- exit criterion;
- prompt constraint;
- architecture pattern;
- anti-pattern warning;
- operational checklist.

Return a `distillation result` conforming to `assets/schemas/distillation-result.schema.json`.

- `insight_proposed`: include a complete `engineering insight`;
- `needs_evidence`: do not manufacture an insight; list exact missing evidence;
- `rejected`: do not manufacture an insight; state the bounded rejection reason.

Require human approval before maturity promotion, lifecycle changes, formal policy adoption, or writing to another asset.

## Output Contracts

### Screening

Use:

- `assets/schemas/screening-result.schema.json`;
- `assets/templates/screening-result.yaml`.

### Full

Use:

- `assets/schemas/distillation-result.schema.json` for every Full run;
- `assets/schemas/engineering-insight.schema.json` only when `result_status` is `insight_proposed`;
- corresponding templates under `assets/templates/`.

Full results must preserve:

- quality-gate outcomes;
- unresolved uncertainty and missing evidence;
- source traceability;
- evidence strength;
- maturity level and rationale;
- lifecycle status and rationale;
- applicability and exclusions;
- occurrence records;
- duplicate/conflict decision;
- recommended actions and prevention checks;
- downstream placement suggestions;
- pending governance actions.

## Quality Gates

All critical gates must pass before proposing a formal insight:

- Evidence;
- Abstraction;
- Boundary;
- Actionability;
- Deduplication;
- Maturity;
- Traceability;
- Governance.

See [`references/07-输出契约与质量门.md`](references/07-输出契约与质量门.md).


## Registry Integration

When a governed registry is available, read [`references/10-工程洞见注册表协议.md`](references/10-工程洞见注册表协议.md).

Before claiming a new insight:

1. load the registry index;
2. compare mechanism, principle, actions, applicability, and related insights;
3. prefer a new occurrence, new evidence, boundary refinement, or contradiction record over duplicate creation;
4. update the registry only when the task grants write authority;
5. validate the registry after every approved write.

The recommended Git canonical root is:

```text
docs/technical/元数据/engineering-insights/
```

The registry is an experience asset, not part of the Skill kernel and not a Feishu publication source.

## Evaluation

Use the dependency-free harness:

```bash
node scripts/eval.mjs self-test
node scripts/eval.mjs score-triggers tests/evals/sample-trigger-predictions.json
node scripts/eval.mjs score-rubric tests/evals/sample-rubric-scores.json
node scripts/eval.mjs validate-screening <screening-result.json>
node scripts/eval.mjs validate-result <distillation-result.json>
node scripts/eval.mjs validate-insight <engineering-insight.json>
node scripts/eval.mjs validate-registry <engineering-insight-registry-root>
```

The harness does not call a model. It validates contracts, deterministic invariants, recorded pilot outputs, trigger predictions, and rubric score files.

## Write and Promotion Boundaries

- Do not directly edit formal engineering rules, architecture decisions, project status, or another Skill.
- Do not publish to an external knowledge system.
- Do not auto-approve maturity promotion or lifecycle changes.
- Do not claim automatic learning or persistent memory.
- Do not store secrets, private source material, or unsupported conclusions.
- Do not treat an optional upstream as a required dependency.

See [`references/08-上下游协作边界.md`](references/08-上下游协作边界.md).

## Stop Rules

Stop and return `needs_evidence` or `rejected` when:

- the event cannot be distinguished from interpretation;
- the root cause is asserted without supporting evidence;
- resolution or verification is missing but a high maturity is requested;
- source material contains sensitive or unauthorized information;
- existing insights required for deduplication are unavailable and uniqueness is being claimed;
- the requested output would bypass human approval or overwrite conflicting history.

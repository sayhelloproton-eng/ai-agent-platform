---
name: engineering-document-authoring
description: Write or rewrite approved architecture, project, product, PRD, ADR, technical design, runbook, experiment, README, portfolio, and knowledge documents into clear, high-density, visually structured engineering artifacts. Use after facts, decisions, scope, and target placement are sufficiently established. Enforce Human-first, AI-lossless visual blocks and Feishu-ready Markdown. Do not use to reconstruct project truth from many sources, decide knowledge lifecycle or Registry state, publish externally, or execute repository writes.
---

# Engineering Document Authoring

## Core question

How should approved engineering content be expressed so that people understand it quickly and AI can recover the same meaning without image access?

## Preconditions

Before writing, require:

- a named document type and primary reader;
- approved facts, decisions, evidence and uncertainty;
- one core question the document owns;
- target path or a governance placement proposal;
- clear separation of current implementation, accepted decision, target design and future plan.

When multiple sources still conflict or duplicate ownership is unresolved, route first to `project-knowledge-synthesis`.

## Workflow

1. **Define ownership** — state the one question this document answers and what belongs elsewhere.
2. **Select a type pattern** — architecture, product/PRD, ADR, technical design, runbook, experiment, README or portfolio. Read `references/02-document-type-patterns.md`.
3. **Build the skeleton** — front-load scope, boundary and current/target status; use short sections with descriptive headings.
4. **Choose dense forms** — prefer diagrams, matrices, tables, timelines, state transitions, checklists and decision records over long narrative.
5. **Create visual semantic blocks** — every image is followed immediately by an AI-readable semantic mirror. Read `references/03-human-first-ai-lossless.md`.
6. **Preserve evidence and uncertainty** — distinguish verified fact, accepted decision, inference, hypothesis, recommendation and non-goal.
7. **Make it Git-first and Feishu-ready** — local relative assets, stable heading order, portable tables/code blocks, no Feishu URL in Git.
8. **Review** — run the checklist and deterministic validator before presenting the candidate.

## Human-first, AI-lossless

A formal visual block is atomic:

```markdown
![Meaningful title](./assets/diagram.png)

### AI 可读语义镜像

Structured prose, a relationship list, table, ASCII architecture, text flow, state transitions or key conclusions that preserve all decision-relevant meaning in the image.
```

Rules:

- the visual optimizes human scanning and comprehension;
- the mirror is a semantic equivalent, not a decorative caption;
- image and mirror are reviewed and updated together;
- local image files stay inside the document bundle’s `assets/` directory;
- complex cross-layer or multi-role diagrams use formal image assets; Mermaid is limited to simple local relations;
- a document must remain usable by a text-only Agent.

## Output

Return a complete document candidate and, when applicable:

- required `assets/` files or an exact asset-generation brief;
- AI-readable semantic mirrors;
- source/evidence notes;
- cross-reference changes;
- unresolved questions and Review gates.

Authoring does not grant lifecycle promotion, Registry mutation, Feishu publication, Commit, or Push authority.

Route placement, stable IDs, lifecycle, Registry relations, bundle integrity, and publication eligibility to `project-knowledge-governance`.

## Stop rules

Stop and request clarification when the document’s core question, truth source, current/target boundary, primary reader, stable ID, or evidence is unresolved. Do not conceal conflicts through polished prose.

## Progressive references

- claim discipline: `references/01-source-and-claim-discipline.md`;
- document structures: `references/02-document-type-patterns.md`;
- visual blocks: `references/03-human-first-ai-lossless.md`;
- final review: `references/04-review-checklist.md`.

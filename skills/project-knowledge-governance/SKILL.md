---
name: project-knowledge-governance
description: Govern formal project knowledge as Git-first assets: classify legal locations, stable IDs, lifecycle, Registry relations, document bundles, local visual resources, retrieval order, integrity checks, and one-way Feishu projection. Use when deciding or validating knowledge placement, supersession, publication eligibility, Registry updates, document-bundle integrity, or Git-to-Feishu media conversion. Do not use to synthesize conflicting project sources, author architecture/PRD prose, decide Context meaning, apply frozen repository packages, or manage task/runtime state.
---

# Project Knowledge Governance

## Core invariant

Git is the only formal knowledge source. Feishu, Custom GPT Knowledge, HTML and other destinations are rebuildable projections.

This Skill governs how approved knowledge becomes and remains a valid project asset. It does not create project truth or grant write authority.

## Responsibilities

- legal placement across `context/`, `docs/knowledge/`, `docs/technical/`, `docs/adr/` and Archive;
- stable Asset IDs, canonical paths, lifecycle, supersession and Registry relations;
- index-first retrieval and bounded Context Packages;
- Document Bundle and local-resource integrity;
- Human-first, AI-lossless visual block requirements;
- link, image, privacy and publication gates;
- Git → Feishu one-way overwrite, media upload, image-block insertion and read-back verification.

## Non-responsibilities

- multi-source fact recovery, duplicate/conflict synthesis → `project-knowledge-synthesis`;
- formal document writing and visual semantic mirrors → `engineering-document-authoring`;
- Context semantic decisions → master/control Planner;
- ZIP/Overlay application, Commit or Push → `planner-executor-handoff`;
- reusable incident lessons → `engineering-insight-distillation`;
- task state, checkpoints, logs, user Memory or secret storage.

## Workflow

1. Identify the proposed asset type, stable ID, canonical owner question and lifecycle status.
2. Validate its legal directory and whether a document bundle is required.
3. Detect duplicate canonical ownership, stale path, invalid supersession or relation impact.
4. Validate links, local resources, AI-readable semantic mirrors, privacy and source traceability.
5. Update or propose Registry Asset/Relation/Projection changes.
6. Require Planner/user Review before lifecycle promotion or formal write.
7. For external publication, generate a preview, require explicit authorization, overwrite from Git, upload local images and read back text/media/revision.

## Document bundles

A resource-bearing formal document uses:

```text
Document-ID-title/
├── README.md
└── assets/
```

- resources stay with the document on the same branch and Commit;
- Markdown uses `./assets/...` relative paths;
- `asset://`, external image hosts and a separate resource branch are not canonical;
- each image is immediately followed by `### AI 可读语义镜像`;
- image and semantic mirror are one atomic review unit.

## Retrieval

Use the smallest sufficient path:

```text
Context → Registry / local index → up to a few relevant full documents → code/tests/evidence
```

Do not silently scan all Git or all Feishu. Current task state must not be inferred from long-term knowledge.

## Feishu projection

- source is always the reviewed Git document bundle;
- publish by overwrite, never merge or reverse sync;
- treat the Feishu Space root as the navigation container: standalone entries and navigation groups are level-1 siblings, never implicit children of a homepage;
- compile the public Desired Projection before reading the private Existing Tree, then build a Mapping Diff and an explicit operation plan before any delete, create or reuse action;
- local images are uploaded during projection and replaced by Feishu media/image blocks at the same location;
- Feishu media tokens, URLs and Block IDs never write back into Git;
- the AI-readable semantic mirror remains ordinary text;
- publication requires preview, human confirmation, API verification and read-back.

## Frozen artifact boundary

When a Canonical Handoff Contract declares `delivery_mode: apply_frozen_artifacts`, this Skill is `contract_reference_only`. It may identify a policy conflict and require stop, but may not rewrite or reinterpret the frozen package.

## Stop rules

Stop on ambiguous stable ID, conflicting canonical owner, missing replacement target, unsupported lifecycle promotion, unresolved sensitive content, broken local resource, missing semantic mirror, reverse-write request, or absent publication authorization.

## Progressive references

- model and placement: `references/01-knowledge-model-and-placement.md`;
- lifecycle and Registry: `references/02-lifecycle-registry-and-relations.md`;
- retrieval: `references/03-retrieval-policy.md`;
- bundles and visuals: `references/04-document-bundles-and-visuals.md`;
- Feishu: `references/05-feishu-projection.md`;
- write/security gates: `references/06-write-security-and-review.md`.

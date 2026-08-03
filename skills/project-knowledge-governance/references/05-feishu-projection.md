# Feishu Projection

Projection is `Git canonical document → Feishu document node` with overwrite semantics. The Publisher parses local Markdown images, validates bundle ownership, uploads files, publishes text, inserts image/media blocks at stable headings and reads back content and revision.

## Governed reading tree

Canonical pages remain one-to-one, but Feishu navigation does not have to mechanically copy Git directories.

For the current knowledge base:

- the Space is `智能体工程探索`;
- the Space root is the navigation container and is not a content page;
- `CTX-001《智能体工程探索录》` is a standalone level-1 entry under the Space root and preserves its existing node;
- `CTX-001` belongs to the `00_项目与产品` knowledge domain but is excluded from the “项目与产品” child group;
- every navigation group is a level-1 sibling under the Space root;
- each group README supplies the level-1 group body;
- Canonical documents are level-2 children of their group and sort by Stable Asset ID;
- the remaining CTX, DEC and PRD pages under `docs/knowledge/00_项目与产品/` are projected below “项目与产品”;
- `CTX-001` is published exactly once. It is not the Space, a hidden root, the parent of all groups, or a child of “项目与产品”.

This is a projection-only hierarchy. It does not create a second Canonical source or change Stable Asset IDs.

## Mapping-first workflow

The mandatory order is:

```text
Compile Desired Mapping
→ Read Existing Tree
→ Build Mapping Diff
→ Generate Delete/Create/Reuse Plan
→ Preview
→ Apply
→ Readback
```

Before any delete, create or reuse operation, write these private execution artifacts below `.local-state/feishu/<SOURCE_SHA>/`:

- `desired-projection.json`;
- `existing-tree.json`;
- `mapping-diff.json`;
- `operation-plan.json`.

`platform-registry/projections.yaml` stores public desired rules only. `mappings: []` means actual Feishu mapping has not been persisted. `node_token`, `obj_token`, private URLs and actual mapping evidence belong only in `.local-state/**` and must never enter Git.

## Token types

A Wiki navigation node has two distinct identities:

- input token type: Wiki `node_token`;
- content object type: usually `docx` in `obj_type`, represented by `obj_token`.

When deleting with `lark-cli wiki +node-delete` using a raw Wiki `node_token`, always pass `--obj-type wiki`. Never substitute the carried content object's `obj_type: docx` for the input token type.

## Safety

Never store Feishu media tokens, document tokens, node tokens or private URLs in Git. Never pre-read Feishu body content for semantic merge. A failed image upload, unresolved link, ambiguous insertion anchor or failed readback stops publication rather than silently dropping content.

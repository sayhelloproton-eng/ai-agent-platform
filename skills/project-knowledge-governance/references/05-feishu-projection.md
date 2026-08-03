# Feishu Projection

Projection is `Git canonical document → Feishu document node` with overwrite semantics. The Publisher parses local Markdown images, validates bundle ownership, uploads files, publishes text, inserts image/media blocks at stable headings and reads back content and revision.

## Governed reading tree

Canonical pages remain one-to-one, but Feishu navigation does not have to mechanically copy Git directories.

For the current knowledge base:

- `CTX-001《智能体工程探索录》` is the independent root homepage and preserves the existing root node when possible;
- `CTX-001` belongs to the `00_项目与产品` knowledge domain but is excluded from the “项目与产品” child group;
- the remaining CTX, DEC and PRD pages under `docs/knowledge/00_项目与产品/` are projected below the Feishu group “项目与产品”;
- directory README files are Git / Agent navigation and are not independent Feishu body pages;
- other Canonical documents are grouped by the governed publication plan.

This is a projection-only hierarchy. It does not create a second Canonical source or change Stable Asset IDs.

## Safety

Never store Feishu media tokens, document tokens, node tokens or private URLs in Git. Never pre-read Feishu body content for semantic merge. A failed image upload, unresolved link, ambiguous insertion anchor or failed readback stops publication rather than silently dropping content.

# Human-first, AI-lossless

## Document bundle

A resource-bearing formal document is one directory:

```text
Document-ID-title/
├── README.md
└── assets/
    ├── diagram.svg
    ├── diagram.png
    └── supporting-file.ext
```

The Markdown uses local relative references such as `./assets/diagram.png`. Assets and text share the same branch, Commit, Review and lifecycle.

## Visual semantic block

Immediately after every formal image add `### AI 可读语义镜像` and preserve:

- all nodes/entities;
- direction and relationship types;
- states and transition conditions;
- trust, ownership or system boundaries;
- decision-relevant labels and exceptions;
- conclusions and limits the image supports.

Choose the mirror form that loses the least meaning: table, numbered flow, ASCII diagram, node-edge list, state-transition list or structured prose.

Alt text is not sufficient. A mirror is not OCR output; it is an authored semantic representation.

## Feishu projection

Git keeps local files and Markdown. The Publisher uploads the image and creates a Feishu image/media block at the same position. Media token or Feishu URL is projection state and never writes back to Git. The semantic mirror remains ordinary text in both Git and Feishu.


## Visual quality

Human-first also means professional visual quality. Formal architecture, capability, flow and comparison diagrams follow `05-formal-diagram-style.md`; semantic accuracy does not excuse rough layout, unreadable text or inconsistent visual grammar.

## Text-first visual production

A formal image is generated only after the document text and information map are frozen. The required order is:

```text
source synthesis
→ document text and terminology frozen
→ exact visual brief derived from the frozen text
→ editable SVG and PNG generated
→ visual reviewed independently
→ semantic mirror authored
→ complete document bundle reviewed
```

The visual must not introduce a component, state, relationship or claim that the approved document does not own. A later text change invalidates the affected visual and mirror until all three are reviewed together.

## Terminology and source readability

- On first appearance, prefer `中文（English）`; after that, prefer Chinese.
- Official product names such as ChatGPT, Custom GPT and Codex remain unchanged.
- Current vendor/product claims use clickable first-party Markdown links near the claim.
- A plain source title without a link is not an acceptable citation.

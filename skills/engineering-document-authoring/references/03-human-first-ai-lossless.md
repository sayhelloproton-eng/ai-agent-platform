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

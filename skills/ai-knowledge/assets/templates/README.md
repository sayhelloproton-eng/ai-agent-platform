# Templates

Deterministic Markdown templates used by `render_draft.mjs`. Templates create drafts only and cannot declare a decision accepted or a task completed without evidence.

| Template | Model | Canonical Root | Projection |
|---|---|---|---|
| `knowledge-note.md` | Knowledge | `docs/knowledge/` | Eligible after Git review |
| `experiment.md` | Knowledge | `docs/knowledge/实验与复盘/` | Eligible after Git review |
| `learning-path.md` | Knowledge | `docs/knowledge/` | Eligible after Git review |
| `project-status.md` | Context | `context/` | Prohibited |
| `adr.md` | Decision | `docs/adr/` | Prohibited as knowledge body |

Learning work-in-progress stored under `docs/learning/` remains a Learning asset and is not represented as a publishable Knowledge Item.

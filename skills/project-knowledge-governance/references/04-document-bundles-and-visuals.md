# Document Bundles and Visuals

Resource-bearing documents are directories with `README.md` and `assets/`. Asset paths are local, relative and owned by the document. Shared assets require a separately governed shared-asset decision rather than accidental cross-directory links.

Every formal image has an immediate AI-readable semantic mirror preserving nodes, relations, boundaries, states, transitions and decision-relevant conclusions. Validate that image and mirror change together. Complex diagrams are formal SVG/PNG assets; simple local diagrams may use Mermaid.


Visual composition quality is owned by `engineering-document-authoring`. Governance validates co-location, stable ID, source/preview Hash, safe SVG, semantic mirror, lifecycle and projection mapping; it must not silently redraw or restyle an approved visual.


## Governance gate for text-first visuals

Governance records the visual only after authoring confirms that the owning document text and information map were frozen before image generation. The Registry and validator should preserve:

- the owning Document Bundle and Visual Asset ID;
- editable source and preview Hashes;
- the immediate semantic mirror;
- the Review relationship between text, visual and mirror;
- current / target / future status labels;
- publication mapping without Feishu media identifiers in Git.

Governance must reject a visual that is unowned, generated from an unstable draft, missing its semantic mirror, or inconsistent with the approved document terminology.

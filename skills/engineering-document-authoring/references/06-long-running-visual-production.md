# Long-running Visual Production

## Purpose

Prevent timeout-like stalls, collage drift, repeated generation and lost progress when a document set requires multiple high-density formal diagrams.

## Failure modes observed

1. **Phase inversion** — generating visuals before article facts, terminology, ownership and narrative are frozen creates rework.
2. **Multi-target prompt contamination** — describing several documents or Visual Asset IDs in one generation context can produce an unwanted collage.
3. **Compound-turn overload** — combining image generation, document insertion, Skill edits, package construction and validation in one long run increases interruption risk.
4. **Missing durable checkpoints** — accepted images that are not immediately named, persisted and hashed are difficult to resume safely.
5. **Unreviewed continuation** — continuing after a wrong-layout output multiplies downstream work.

## Required protocol

### 1. Freeze Stage A completely

Do not call an image-generation tool until every target document has frozen facts, terminology, source links, narrative ownership and an information map.

### 2. Build one Visual Manifest

Before generation, list for every asset:

- Visual Asset ID;
- target document and insertion heading;
- one question the image answers;
- required nodes, relations, states and conclusions;
- prohibited content;
- target filename;
- status: `pending`, `generated`, `accepted`, `retry`, `inserted`;
- PNG Hash after acceptance.

### 3. One target per generation call

Each call names exactly one Visual Asset ID and one target question. Do not describe other diagrams, chapter overviews or future assets in the same prompt.

### 4. Persist and validate immediately

After each output:

1. save it under the final target filename;
2. verify the title and Visual Asset ID;
3. confirm it is one diagram, not a collage;
4. check expected density, language, dimensions and prohibited content;
5. record Hash and acceptance status.

Reject and retry immediately when the output owns multiple questions, contains unrelated chapter panels, or violates the information map.

### 5. Use recoverable checkpoints

After every 2–3 accepted diagrams, persist the Visual Manifest and file map. If the run is interrupted, resume from the first `pending` or `retry` entry. Never regenerate an accepted asset unless the user requests a revision.

### 6. Separate production phases

Run these as separate bounded phases:

```text
A. article freeze
B. prompt / manifest preparation
C. image generation and per-image review
D. document insertion and semantic mirrors
E. package construction and validation
```

Do not mix C, D and E in one long-running tool sequence.

## Speed rules

- prepare all compact information maps before the first generation call;
- reuse one approved style template instead of re-reading full articles for every image;
- pass only the sections needed for one image;
- reuse accepted PNG files directly during insertion;
- perform link, whitespace and package checks once after all insertions;
- do not create SVG or regenerate previews unless explicitly required by the current review stage.

## Packaging gate

A package may be built only when all Visual Manifest entries are `accepted` and every image has a target path, insertion point and semantic mirror. Packaging must not trigger new image generation.

## Stop rules

Stop the visual phase when:

- article text is not frozen;
- the requested asset owns more than one primary question;
- the tool returns a collage or unrelated sections;
- an accepted file cannot be located or matched to its Visual Asset ID;
- the run has no durable checkpoint from which it can safely resume.

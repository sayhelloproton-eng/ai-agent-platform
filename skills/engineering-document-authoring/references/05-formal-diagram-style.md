# Formal Diagram Style

## Goal

Formal diagrams are portfolio-grade engineering artifacts, not temporary whiteboard sketches. They must communicate dense system information quickly while remaining calm, precise and maintainable.

## Visual language

Use the following default style unless the document has a stronger domain-specific reason:

- large landscape canvas with a clear title, subtitle, version or Visual Asset ID;
- grid-aligned zones, swimlanes, layers or comparison columns;
- consistent rounded cards, border weight, spacing and internal padding;
- restrained semantic color system: color identifies layer, domain, state or ownership;
- white or very light background, high contrast text and generous whitespace;
- one icon language or simple vector symbols; icons assist recognition and never replace labels;
- orthogonal or short directional lines with minimal crossings;
- title, section, module and annotation typography with obvious hierarchy;
- legend, status badges, source boundary and “what this proves” note when needed;
- editable SVG as source and high-resolution PNG as human preview.

Target quality: architecture-whitepaper, consulting-deck and portfolio-ready.

## Information design

A diagram is produced from a frozen document information map, not from an unstable draft. The information map must name the exact nodes, ownership, relationships, states, conditions, boundaries, exceptions and conclusions that the visual is allowed to express.

A diagram should answer one named question. Organize information through one primary pattern:

- layered architecture;
- capability domain map;
- swimlane flow;
- comparison matrix;
- state machine;
- lifecycle or timeline;
- ownership / boundary map.

Prefer multiple focused diagrams over one unreadable all-in-one graph. High density comes from hierarchy and repeated visual grammar, not from shrinking text.

## Text and labels

- use exact project terminology and stable IDs;
- on first use prefer `中文（English）`; preserve official product names;
- never split an English identifier or product name across lines when a layout adjustment can avoid it;
- keep card text concise and move detailed explanation to the semantic mirror;
- never rely on color alone; retain titles, labels, borders and legends;
- use readable Chinese / English typography and avoid tiny text in PNG previews;
- distinguish current implementation, accepted decision, target design and future idea with explicit badges.

## Connectors

- prefer left-to-right or top-to-bottom reading order;
- use orthogonal lines and route around card content;
- distinguish control, data, evidence and optional relationships through line style and legend;
- avoid decorative arrows, ambiguous bidirectional lines and uncontrolled crossings.

## Density and refinement gate

The target is not a minimal sketch. A formal architecture, comparison or process visual should normally include the information density required to replace repeated prose: section hierarchy, module ownership, configuration controls, state or relationship labels, legend, current/target distinction and a clear conclusion. Density must come from grid discipline and repeated visual grammar, not tiny text.

Reject a visual when any of the following is true:

- it looks like a rough sketch or unaligned flowchart;
- cards, fonts, colors or spacing are inconsistent;
- the reading order is unclear;
- text becomes unreadable at normal document width;
- more than one semantic purpose competes for ownership;
- the visual claims target capabilities as current implementation;
- the AI-readable mirror cannot reconstruct all decision-relevant meaning;
- it was generated before the document text and information map were frozen;
- it is materially simpler than the document question and omits decision-relevant configuration, flow, state, ownership or evidence;
- English identifiers are broken into unreadable fragments or Chinese/English typography is inconsistent.

## Generation rule

Use a two-stage workflow:

1. freeze the document text, terminology, sources and information map first;
2. generate the formal review preview with an approved image-generation tool, then run a separate visual review before insertion.

The currently approved preview tool is the OpenAI image generation workflow (`image_gen`). It is acceptable for formal portfolio-grade architecture, process, comparison and capability diagrams **after** the information map has frozen and **only** when the result meets the density, alignment and readability gates above.

Approved reference style for this project:

- slide-like or whitepaper-like large landscape canvas;
- OpenClaw-style dense card layout with calm spacing;
- section borders with soft semantic color coding;
- high information density without tiny unreadable text;
- title, subtitle, legend, relationship notes and status blocks integrated into one coherent visual.

If the accepted preview PNG is newer than the editable SVG, record that fact in review notes and refresh the SVG in a later package. Never silently pretend an older SVG and a newer PNG are identical. The human-approved PNG remains the authoritative preview until the vector source is refreshed.

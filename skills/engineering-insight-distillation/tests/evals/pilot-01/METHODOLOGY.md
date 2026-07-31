# Eval Methodology

## Paired prompt

Both variants receive the same incident and the same user goal:

> Extract reusable engineering insight from this incident. Avoid merely retelling the event.

Baseline receives no Skill instructions.

Skill variant receives the complete v0.1.1 Skill instructions and required references, and must return the governed Result Schema.

## Rubric

Eight dimensions, each scored 0–2:

- evidence discipline;
- abstraction quality;
- applicability boundaries;
- actionability;
- traceability;
- maturity and governance;
- deduplication and evolution;
- disposition correctness.

Maximum: 16.

## Controls

- Five positive real incidents;
- one insufficient-evidence incident;
- one low-value negative control;
- fixed scoring rubric;
- JSON Schema validation against the shipped Skill;
- character-count efficiency measurement.

## Limitation

This is not an API-run benchmark or independent blind comparison. It is a controlled pilot designed to test whether the Skill contract changes output structure and failure handling in the intended direction.

# Pilot 02 — Screening Mode

## Result

- Cases: 7
- Expected decisions matched: 7/7
- `proceed_full`: 5
- `needs_evidence`: 1
- `reject`: 1
- All outputs pass `screening-result.schema.json`
- Average Screening representation is approximately **15.6%** of the Full result character length from Pilot 01.

## Finding

Screening preserves the most important early decisions:

- whether the event deserves long-term retention;
- whether evidence is ready;
- whether Full mode should run;
- whether the event should be rejected to prevent knowledge growth.

It intentionally does not generate:

- insight IDs;
- detailed patterns;
- maturity promotion;
- duplicate claims;
- downstream formal documents.

## Limitation

This is a controlled contract evaluation, not a repeated model-sampling benchmark. Automatic Skill triggering and independent blind comparison remain future work.

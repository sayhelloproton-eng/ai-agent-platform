# Design Basis and Evaluation

## Official Skill Creator

Adopt concise SKILL content, only `name` and `description` in frontmatter, progressive disclosure, deterministic scripts, explicit references, tested scripts, `agents/openai.yaml`, validation, and iteration.

Project-specific exception: keep README, AGENTS, CHANGELOG, and MANIFEST because this repository governs long-lived Skills as versioned engineering assets.

Source: `https://github.com/openai/skills/tree/main/skills/.system/skill-creator`

## Agent Skills

Adopt the portable directory format, trigger-rich description, optional scripts/references/assets, and progressive loading.

Source: `https://agentskills.io/specification`

## Anthropic Skill Creator

Adopt concrete examples and evaluation-driven iteration. Defer provider-specific eval viewer integration until the project selects that runtime.

Source: `https://github.com/anthropics/skills/tree/main/skills/skill-creator`

## Open-source handoff patterns

Adopt standalone handoffs, explicit scope, prerequisites, validation, incident-traceable guardrails, and stopping points.

Reject transferring architecture and product analysis to the receiving executor. In this project Chat remains the brain.

Compared sources:

- `https://github.com/openclaw/agent-skills/tree/main/skills/handoff`
- `https://github.com/fmaher/agent-skills/tree/main/skills/agent-handoff`
- `https://github.com/mthines/agent-skills`

## Evaluation

Validate trigger behavior, cross-artifact identity, safe paths, secret-like values, both guidance tiers, required feedback fields, and prompt rendering.

After real use, measure clarifications, scope deviations, failed gates, repeated work, review findings, rework, and tier suitability.

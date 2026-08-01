# Planner Executor Handoff

## What

`planner-executor-handoff` manages deterministic, two-way task flow between the planning/review Chat and local execution agents.

The Chat remains the brain. Executors perform authorized actions, observe results, and return structured evidence.

## Why

The project repeatedly encountered missing context, multiple task truths, incorrect environment assumptions, identical prompt density for different executor capabilities, incomplete checkpoints, unsafe executor switching, and completion claims without reviewable evidence.

## Guidance tiers

- `compact_controlled`: complete analysis with concise execution guidance.
- `stepwise_controlled`: the same analysis with exact steps, commands, expected results, checkpoints, and fixed feedback.

The tier changes execution guidance, not ownership of analysis. `execution_authority` separately controls whether the executor may implement a frozen design or may only apply final artifacts.

## Execution authority

- `bounded_implementation`: implement only the Chat-frozen design inside exact scope.
- `frozen_artifacts_only`: apply byte-identical Overlay artifacts only; no implementation or repair.

Current OpenCode/DeepSeek default is `stepwise_controlled + frozen_artifacts_only`.

## Commands

```bash
node skills/planner-executor-handoff/scripts/validate-handoff.mjs bundle \
  skills/planner-executor-handoff/assets/examples/handoff-bundle-stepwise.json

node skills/planner-executor-handoff/scripts/render-executor-prompt.mjs \
  skills/planner-executor-handoff/assets/examples/handoff-bundle-stepwise.json

node skills/planner-executor-handoff/tests/self-test.mjs

node skills/planner-executor-handoff/scripts/validate-handoff.mjs cross \
  skills/planner-executor-handoff/assets/examples/handoff-bundle-stepwise.json \
  skills/planner-executor-handoff/assets/examples/reception-ack.json \
  skills/planner-executor-handoff/assets/examples/review-feedback.json \
  skills/planner-executor-handoff/assets/examples/review-response.json \
  skills/planner-executor-handoff/assets/examples/executor-switch-checkpoint.json
```

Root command:

```bash
npm run check:handoff
```

## Git policy

Every handoff must freeze the current branch, target branch, Push target, PR and merge policy, and cleanup permissions. Review does not imply creating a remote feature branch.

## Status

Version `0.4.0` makes low-capability execution artifact-only, completes strict eight-artifact and cross-artifact validation, and adds Manifest self-verification. It remains `in_review` until the real `knowledge-rebuild-v2` commit is reviewed by Chat.

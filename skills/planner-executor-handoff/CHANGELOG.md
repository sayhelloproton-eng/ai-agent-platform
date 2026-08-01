# Changelog

## 0.4.0

- Add `execution_authority` and distinguish `bounded_implementation` from `frozen_artifacts_only`.
- Default OpenCode/DeepSeek to `stepwise_controlled + frozen_artifacts_only`.
- Require Chat to author and test final overlays before low-capability handoff.
- Complete strict validation for all eight artifact types and nested fields.
- Add runtime cross-artifact validation.
- Rebuild the protocol JSON Schema with strict per-type definitions.
- Add adversarial negative tests and Manifest file-set/hash self-verification.
- Replace the failed pattern of asking a low-capability executor to repair the Skill.

## 0.3.1

- Add strict type, enum, pattern, and extra-field assertions to the validator.
- Add missing `review_feedback` and `executor_switch_checkpoint` as formal schemas and validator support.
- Update the protocol schema to include all eight feedback types with `additionalProperties: false`.
- Add five new formal examples: clarification-request, progress-checkpoint, review-feedback, review-response, and executor-switch-checkpoint.
- Add negative tests for type, enum, SHA, branch, and extra-field violations.
- Add cross-artifact consistency tests (review feedback ↔ review response, executor switch ↔ bundle, reception ack ↔ executor profile).
- Fix `PEH-V03-REVIEW-001`.

## 0.3.0

- Add the Chat-owned Git Operating Policy to the Canonical Handoff Contract.
- Default to the current authorized branch instead of automatically creating review branches.
- Add exact permissions for branch creation, commit, Push, PR, merge, rebase, cherry-pick, force-push, deletion, Worktree, and cleanup.
- Require Git policy confirmation in Reception Ack.
- Require complete Git operations evidence in Execution Result.
- Add the accidental remote review-branch incident to the casebook.
- Install directly on `knowledge-rebuild-v2` and authorize deletion of only `origin/skill/planner-executor-handoff-v0.2`.


## 0.2.0

- Replace model-brand-specific behavior with `compact_controlled` and `stepwise_controlled`.
- Establish Chat as the sole brain and owner of deterministic analysis.
- Add the Canonical Handoff Contract and Context Package.
- Add mandatory two-way feedback artifacts.
- Add structured review, resume, and executor-switch flow.
- Align frontmatter and progressive disclosure with official Skill Creator guidance.
- Add official/open-source design decisions and project incident cases.
- Supersede the unshipped v0.1 draft.

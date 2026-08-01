# Contract, Context, and Feedback

## Canonical Handoff Contract

Freeze task identity, repository baseline, goal, confirmed facts, decisions, impact analysis, selected and rejected approaches, cross-file relations, risks, scope, outputs, validation, evidence, stop conditions, execution plan, delivery mode, frozen artifacts, Git policy, and change control.

For `delivery_mode: apply_frozen_artifacts`, include the overlay root, Manifest path, exact file count, delete list, and byte-comparison requirement. The executor must not modify those artifacts.

Create a new task version when the goal, approach, source commit, scope, acceptance, or authorization changes.

## Context Package

Include only must-know facts, frozen decisions, directly relevant files, prohibited reinterpretations, explicit questions, and excluded context.

Do not include full chat transcripts, unrelated blueprints, duplicate background, or secrets.

## Feedback

Require:

- Reception Ack
- Clarification Request
- Progress Checkpoint
- Failure / Stop Report
- Execution Result
- Review Response

Chat returns Review Feedback.

Every executor feedback artifact must bind task ID, version, executor ID, source commit, current state, completed steps, evidence, workspace state, and next required action.

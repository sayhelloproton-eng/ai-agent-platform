# Feishu Execution Efficiency

Use this fast path only after the source Commit, projection policy, write scope and user authorization are fixed. Safety gates remain mandatory; repeated discovery and repeated narration do not. A one-way projection is a deterministic deployment, not an interactive content migration.

## Evidence boundary

A successful Pilot taking a long time proves the observed duration and result. It does not by itself prove that Feishu, the network or one CLI command was the root cause. Treat repeated help reads, oversized output, model/tool round-trips and per-node orchestration as contribution candidates until timing evidence isolates them.

## One-pass workflow

Run the publication as four bounded phases:

1. **Preflight:** verify Git SHA/status, identity, exact Space and local source assets once.
2. **Plan:** compile Desired Projection and resolve node identity/hierarchy once. Read the full Existing Tree only for reset, restructure or mapping drift. Produce Mapping Diff and Operation Plan, then emit one token-free summary.
3. **Apply:** overwrite Git content directly without reading old Feishu bodies. Execute the approved plan in one deterministic process per mutation class. Keep deletes serial and deepest-first, but do not return control to the model between nodes. Checkpoint every completed operation locally.
4. **Readback:** read the final tree once and each changed document once; verify identity, hierarchy, revision, headings and media counts, then stop at the authorized boundary.

Do not rerun full repository verification during publication when the verified Git SHA and worktree remain unchanged. Repeat only the cheap drift gates: local/remote SHA, status, identity and required projection artifacts. Do not perform semantic diff, old-body fetch, merge analysis or per-page model review.

## CLI discovery budget

- Read the project Skill and only the references required by the requested operation.
- Inspect `--help` once per command family and CLI version. Save full help or capability evidence under `.local-state/**`; report only the selected flags.
- Read embedded CLI documentation only for the operations actually used. Avoid combined commands whose output truncates and forces a second read.
- Do not print full node trees, private mappings, document bodies or raw envelopes into the conversation. Store them with mode `0600` and emit counts, titles, levels, statuses and exit codes only.

## Time and timeout budget

- Local validation and summary commands: 60 seconds.
- One Feishu read/write/delete call: 90 seconds unless the CLI documents a larger bounded async window.
- A two-page Pilot with one structural reset, two images and no authentication interruption has a five-minute execution budget after Git closure. At three minutes, report the slow phase and remaining remote-call count; do not continue adding discovery steps.
- Exceeding five minutes is a performance failure even if the final Readback passes. Preserve the successful delivery result, record phase timings and remove orchestration overhead before the next run.
- Long-running mutation loops: checkpoint after every successful node or page and emit a progress summary at least once per minute.
- Before the first write, estimate remote calls as `reads + validations + mutations + readbacks`. If the estimate exceeds the task budget, pause before mutation and report the plan.
- A timeout before mutation is a safe stop. A timeout after partial mutation must preserve the checkpoint, reread current remote state and resume from the first unverified operation; never replay the whole plan blindly.

## Token-safe orchestration

Use `scripts/summarize-feishu-execution.mjs <state-dir>` to validate the four Mapping-first artifacts and obtain a safe review summary. The summary must never include `node_token`, `obj_token`, URLs or raw content.

Prefer one script invocation that performs `validate → mutate → checkpoint` for a serial delete set or the complete Pilot publication. The model should review phase summaries, not mediate each remote call. The normal Pilot path should require at most three model-visible checkpoints: preflight/plan, apply progress, final readback.

## Stop and non-goals

Stop on drift, ambiguous identity, missing mapping artifacts, token/parent conflicts, unauthorized scope, failed media insertion or failed readback. Do not save time by parallelizing destructive operations, skipping Mapping-first, omitting image-position checks, weakening confirmation, or continuing past the Pilot boundary.

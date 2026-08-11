# Phase 3 Final Platform Acceptance

Status: `0.0.0-acceptance.1` test-only harness.

This directory proves one durable Task across two already-implemented execution paths without changing production modules:

1. `Task → frozen Execution Flow Runtime HTTP → real Local Control local.health.read → MLXHub FAST → Task`.
2. The same Task then advances to `Browser Host SUBMIT_MESSAGE`, where execution must stop at a Browser-generated immutable Approval Draft.
3. Only after the Project Owner explicitly approves that exact draft does the harness issue the matching one-time Grant through the existing Action Gateway approval endpoint.
4. Real Browser Host executes once, reports Delivery + Host Result, and the same durable Task is mechanically finalized to `COMPLETED`.

This is an acceptance harness, not a new platform module. It intentionally reuses the existing Action Gateway Browser Host adapter and Phase 2 integration store as test infrastructure. It does not define a new Approval contract, Browser capability contract, deployment model, or Runtime authorization token.

## Safety boundaries

- `prepare:live` can make one FAST inference call but cannot issue an Approval Grant.
- `prepare:live` stops after the real Browser Host publishes the exact Approval Draft.
- `approve:live` requires `PHASE3_APPROVAL_CONFIRM=I_APPROVE:<approval-ref>` and refuses any other value.
- `SUBMIT_MESSAGE` remains on the human Approval path; no `PLATFORM_WAKE` authorization is inserted.
- The Browser page/action fingerprint and page precondition hash are supplied by the real Browser Host draft and copied exactly into the one-time Grant.
- A changed page/binding/fingerprint remains fail-closed in Browser Host Runtime.
- No production source is modified by this harness.

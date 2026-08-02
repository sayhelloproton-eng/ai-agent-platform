---
name: custom-gpt-actions
description: Design, validate, and troubleshoot Builder-compatible Custom GPT Action OpenAPI schemas and narrow server-side adapter endpoints. Use when modifying an Action schema, resolving GPT Builder validation errors, preventing the model from generating internal platform contracts, or verifying an Action through local validation, Builder parsing, and Preview calls. Do not use for general Custom GPT persona, Knowledge, Agent Profile, Runtime orchestration, public ingress, or unrelated OpenAPI services.
---

# Custom GPT Actions

## Purpose

Produce a narrow, authenticated Action contract that GPT Builder accepts and that preserves the platform's internal security boundaries.

## Workflow

1. Read the target OpenAPI template, its generator, tests, and the server route.
2. Read [OpenAPI Builder compatibility](references/openapi-builder-compatibility.md) before changing Schema structure.
3. Read [Action adapter pattern](references/action-adapter-pattern.md) when the Action would otherwise expose internal Task fields.
4. Keep credentials outside the Schema and preserve the existing server authentication boundary.
5. Add structural regression tests before regenerating resolved OpenAPI.
6. Validate in order: local structure, Builder parsing, then Preview real call. See [Testing and debugging](references/testing-and-debugging.md).
7. Use [Troubleshooting](references/troubleshooting.md) to map Builder or Preview symptoms to bounded fixes.

## Required Boundaries

- Keep `components`, `securitySchemes`, schemas, request bodies, and response objects structurally explicit.
- Emit `components.schemas: {}` even when no shared Schema is used; never omit it or emit a bare, null, or array value.
- Give every object Schema meaningful `properties`.
- Prefer a zero-parameter business adapter endpoint when internal Task fields are server-owned.
- Require the Gateway to generate internal `capability`, `taskId`, `requestedBy`, `input`, and `metadata`; never ask the model to generate or override them.
- Configure Bearer authentication in Builder and never place the Key in OpenAPI.
- Do not weaken a general platform Contract to accommodate model-generated payloads.
- Do not claim Builder compatibility until Builder parsing succeeds.
- Do not claim end-to-end success until Preview performs the real authenticated call.

## MVP Checkpoint

- Verified: GPT Builder requires explicit `components.schemas: {}` even when no shared Schema is used.
- Verified: the Action exposes only zero-parameter `POST /v1/runtime/status`, and the Gateway constructs the internal `TaskRequest`.
- Verified: Builder Bearer authentication succeeded without placing the Key in the Schema.
- Verified: a created Custom GPT used a natural-language request to call `getRuntimeStatus` in a formal conversation.
- Verified result: Runtime `local-runtime` version `0.1.0` reported `ready`, with `gateway.ping` and `runtime.status` capabilities.

## Inputs

- OpenAPI template and resolved Schema;
- Gateway route and Contract boundary;
- Builder validation error or Preview response;
- existing local tests and approved authentication mode.

## Outputs

- minimal Schema or adapter correction;
- deterministic structural regression tests;
- regenerated secret-free OpenAPI;
- sanitized Builder/Preview evidence;
- explicit remaining blocker when manual Builder access is required.

## Stop Rules

Stop before creating or rotating credentials, changing public infrastructure, weakening authentication, or deploying unrelated services unless the user explicitly authorizes that scope.

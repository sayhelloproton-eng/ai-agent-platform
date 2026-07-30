# Troubleshooting

## `object schema missing properties`

Cause: an object response or nested object declares only `type: object`.

Fix: define the real response `properties` and required fields. Do not invent a response shape that differs from the server Contract.

## `schemas subsection is not an object`

Verified cause: GPT Builder currently requires `components.schemas` to exist explicitly as an object. Omitting it can produce `In components section, schemas subsection is not an object`; bare, null, and array forms are also invalid.

Fix: use the inline empty mapping `components.schemas: {}` when no shared Schema is needed. Do not add an unused named Schema. Regenerate the resolved Schema before re-importing it.

## Bearer succeeds but API returns `INVALID_TASK`

Cause: Preview generated platform-internal Task fields incorrectly, such as a capability alias, requester type change, or missing required input.

Fix: expose a zero-parameter business adapter endpoint and construct the full Task on the server. Keep the general Task endpoint strict.

## Operation is missing or duplicated

Cause: duplicated `operationId`, extra paths, or ambiguous method structure.

Fix: retain only the intended path and method and assert exactly one unique `operationId`.

## Local tests pass but Builder rejects

Cause: Builder compatibility is narrower than the local validator or the imported resolved file is stale.

Fix: regenerate the resolved file, inspect its structure without exposing the server URL or credentials, then re-import. Record the Builder error and add a regression test before changing the Schema.

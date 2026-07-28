import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isValidApiKeyFormat,
  redactAuthorizationHeader,
  verifyBearerAuthorization,
} from "../dist/index.js";

const API_KEY = "test-api-key-0123456789abcdef-xyz";

test("accepts a valid Bearer token", () => {
  assert.deepEqual(
    verifyBearerAuthorization(`Bearer ${API_KEY}`, API_KEY),
    { ok: true },
  );
});

test("accepts a case-insensitive Bearer scheme", () => {
  assert.deepEqual(
    verifyBearerAuthorization(`bEaReR ${API_KEY}`, API_KEY),
    { ok: true },
  );
});

test("reports a missing header", () => {
  assert.deepEqual(verifyBearerAuthorization(undefined, API_KEY), {
    ok: false,
    reason: "missing",
  });
});

test("rejects a header array", () => {
  assert.deepEqual(
    verifyBearerAuthorization([`Bearer ${API_KEY}`], API_KEY),
    { ok: false, reason: "malformed" },
  );
});

test("rejects a Basic header", () => {
  assert.deepEqual(
    verifyBearerAuthorization(`Basic ${API_KEY}`, API_KEY),
    { ok: false, reason: "malformed" },
  );
});

test("rejects an empty Bearer token", () => {
  assert.deepEqual(verifyBearerAuthorization("Bearer ", API_KEY), {
    ok: false,
    reason: "malformed",
  });
});

test("rejects whitespace inside a token", () => {
  assert.deepEqual(
    verifyBearerAuthorization(`Bearer ${API_KEY} extra`, API_KEY),
    { ok: false, reason: "malformed" },
  );
});

test("rejects an incorrect API key", () => {
  const wrongKey = "wrong-api-key-0123456789abcdef-xyz";

  assert.deepEqual(
    verifyBearerAuthorization(`Bearer ${wrongKey}`, API_KEY),
    { ok: false, reason: "invalid-key" },
  );
});

test("rejects an invalid expected API key", () => {
  assert.deepEqual(
    verifyBearerAuthorization(`Bearer ${API_KEY}`, "too-short"),
    { ok: false, reason: "invalid-expected-key" },
  );
});

test("accepts the 32-character API key boundary", () => {
  const boundaryKey = "k".repeat(32);

  assert.equal(isValidApiKeyFormat(boundaryKey), true);
  assert.deepEqual(
    verifyBearerAuthorization(`Bearer ${boundaryKey}`, boundaryKey),
    { ok: true },
  );
});

test("rejects a 257-character API key", () => {
  assert.equal(isValidApiKeyFormat("k".repeat(257)), false);
});

test("redacts string and array headers without exposing tokens", () => {
  const stringResult = redactAuthorizationHeader(`Bearer ${API_KEY}`);
  const arrayResult = redactAuthorizationHeader([
    `Bearer ${API_KEY}`,
    "second-secret",
  ]);

  assert.equal(stringResult, "Bearer [REDACTED]");
  assert.equal(arrayResult, "Bearer [REDACTED]");
  assert.equal(stringResult.includes(API_KEY), false);
  assert.equal(arrayResult.includes(API_KEY), false);
  assert.equal(redactAuthorizationHeader(undefined), undefined);
});

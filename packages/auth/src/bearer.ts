import { createHash, timingSafeEqual } from "node:crypto";

export interface BearerVerificationResult {
  readonly ok: boolean;
  readonly reason?:
    | "missing"
    | "malformed"
    | "invalid-key"
    | "invalid-expected-key";
}

const MIN_API_KEY_LENGTH = 32;
const MAX_API_KEY_LENGTH = 256;
const BEARER_PATTERN = /^Bearer ([^\s]+)$/i;

export function isValidApiKeyFormat(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_API_KEY_LENGTH &&
    value.length <= MAX_API_KEY_LENGTH &&
    !/\s/u.test(value)
  );
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyBearerAuthorization(
  authorizationHeader: string | string[] | undefined,
  expectedApiKey: string,
): BearerVerificationResult {
  if (!isValidApiKeyFormat(expectedApiKey)) {
    return { ok: false, reason: "invalid-expected-key" };
  }

  if (authorizationHeader === undefined) {
    return { ok: false, reason: "missing" };
  }

  if (typeof authorizationHeader !== "string") {
    return { ok: false, reason: "malformed" };
  }

  const match = BEARER_PATTERN.exec(authorizationHeader);
  const presentedApiKey = match?.[1];

  if (!isValidApiKeyFormat(presentedApiKey)) {
    return { ok: false, reason: "malformed" };
  }

  const matches = timingSafeEqual(
    digest(presentedApiKey),
    digest(expectedApiKey),
  );

  return matches
    ? { ok: true }
    : { ok: false, reason: "invalid-key" };
}

export function redactAuthorizationHeader(
  authorizationHeader: string | string[] | undefined,
): string | undefined {
  return authorizationHeader === undefined
    ? undefined
    : "Bearer [REDACTED]";
}

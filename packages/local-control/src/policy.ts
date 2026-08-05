import path from "node:path";

import { LocalControlError } from "./errors.js";

const SENSITIVE_BASENAME_PATTERNS: readonly RegExp[] = [
  /^\.env(?:\..*)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa(?:\.pub)?$/i,
  /^id_ed25519(?:\.pub)?$/i,
  /^credentials?(?:\..*)?$/i,
  /^cookies?(?:\..*)?$/i,
  /^tokens?(?:\..*)?$/i,
];

const DENIED_SEGMENTS = new Set([
  "node_modules",
  ".ssh",
  ".gnupg",
  "keychain",
]);

export const HARD_MAX_FILE_BYTES = 1_048_576;
export const HARD_MAX_FILE_LINES = 500;
export const HARD_MAX_TREE_DEPTH = 5;
export const HARD_MAX_TREE_PAGE_SIZE = 500;
export const HARD_MAX_TREE_ENTRIES = 5_000;
export const HARD_MAX_BATCH_SIZE = 8;

export function normalizeRelativePath(input: string): string {
  if (input.includes("\0")) {
    throw new LocalControlError(
      "PATH_OUT_OF_SCOPE",
      "FORBIDDEN",
      "Path contains an invalid null character.",
    );
  }
  if (path.isAbsolute(input) || /^[a-zA-Z]:[\\/]/.test(input)) {
    throw new LocalControlError(
      "ABSOLUTE_PATH_DENIED",
      "FORBIDDEN",
      "Absolute paths are not accepted.",
      { recommendedAction: "Use a registered project_id and project-relative path." },
    );
  }
  if (input.includes("\\")) {
    throw new LocalControlError(
      "PATH_OUT_OF_SCOPE",
      "FORBIDDEN",
      "Backslash path separators are not accepted.",
    );
  }

  const normalized = path.posix.normalize(input.length === 0 ? "." : input);
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new LocalControlError(
      "PATH_TRAVERSAL_DENIED",
      "FORBIDDEN",
      "Path traversal is not accepted.",
    );
  }
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new LocalControlError(
      "PATH_TRAVERSAL_DENIED",
      "FORBIDDEN",
      "Path traversal is not accepted.",
    );
  }
  return normalized;
}

export function assertNonSensitivePath(relativePath: string): void {
  const segments = relativePath.split("/").filter(Boolean);
  for (const segment of segments) {
    if (DENIED_SEGMENTS.has(segment.toLowerCase())) {
      throw new LocalControlError(
        "SENSITIVE_RESOURCE_DENIED",
        "FORBIDDEN",
        "Requested resource is denied by Local Control policy.",
      );
    }
    if (SENSITIVE_BASENAME_PATTERNS.some((pattern) => pattern.test(segment))) {
      throw new LocalControlError(
        "SENSITIVE_RESOURCE_DENIED",
        "FORBIDDEN",
        "Requested resource is denied by Local Control policy.",
      );
    }
  }
  if (segments[0] === ".git") {
    throw new LocalControlError(
      "SENSITIVE_RESOURCE_DENIED",
      "FORBIDDEN",
      "Git internals are not readable through Local Control.",
    );
  }
}

export function shouldExcludeTreeEntry(relativePath: string): boolean {
  try {
    assertNonSensitivePath(relativePath);
    return false;
  } catch {
    return true;
  }
}

export function clampInteger(
  input: unknown,
  defaultValue: number,
  minimum: number,
  maximum: number,
  field: string,
): number {
  if (input === undefined) {
    return defaultValue;
  }
  if (!Number.isInteger(input)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      `${field} must be an integer.`,
    );
  }
  const value = input as number;
  if (value < minimum || value > maximum) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      `${field} must be between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

export function assertLoopbackUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "Runtime health URL is invalid.",
    );
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "Runtime health URL must use HTTP or HTTPS.",
    );
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new LocalControlError(
      "CAPABILITY_DENIED",
      "FORBIDDEN",
      "Runtime health URL must resolve to loopback.",
    );
  }
}

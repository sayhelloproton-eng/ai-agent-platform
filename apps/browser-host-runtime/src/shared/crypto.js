import { stableStringify } from "./json.js";

export async function sha256Hex(value) {
  const text = typeof value === "string" ? value : stableStringify(value);
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Ref(value) {
  return `sha256:${await sha256Hex(value)}`;
}

export function randomId(prefix) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

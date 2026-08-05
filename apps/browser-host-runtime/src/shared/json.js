import { BhrError } from "./errors.js";

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requireObject(value, path = "value") {
  if (!isPlainObject(value)) throw new BhrError("CONTRACT_INVALID", `${path} must be an object.`);
  return value;
}

export function requireString(value, path, { min = 1, max = 4096 } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new BhrError("CONTRACT_INVALID", `${path} must be a string with length ${min}..${max}.`);
  }
  return value;
}

export function optionalString(value, path, options = {}) {
  if (value === null || value === undefined) return null;
  return requireString(value, path, options);
}

export function requireArray(value, path, { max = 256 } = {}) {
  if (!Array.isArray(value) || value.length > max) {
    throw new BhrError("CONTRACT_INVALID", `${path} must be an array with at most ${max} items.`);
  }
  return value;
}

export function requireBoolean(value, path) {
  if (typeof value !== "boolean") throw new BhrError("CONTRACT_INVALID", `${path} must be boolean.`);
  return value;
}

export function requireIsoDate(value, path) {
  requireString(value, path, { max: 64 });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BhrError("CONTRACT_INVALID", `${path} must be an ISO timestamp.`);
  return value;
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

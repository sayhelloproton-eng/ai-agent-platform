import { ExecutionFlowError } from "./errors.js";
import type { BindingRef } from "../types.js";

function getPath(root: unknown, path: string[]): unknown {
  let value: unknown = root;
  for (const segment of path) {
    if (
      value === null ||
      value === undefined ||
      typeof value !== "object" ||
      !(segment in value)
    ) {
      throw new ExecutionFlowError(
        "BINDING_NOT_FOUND",
        `Binding path not found: ${path.join(".")}`
      );
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

export function isBindingRef(value: unknown): value is BindingRef {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length === 1 &&
    entries[0]?.[0] === "$ref" &&
    typeof entries[0]?.[1] === "string"
  );
}

export function resolveBinding(value: unknown, context: unknown): unknown {
  if (isBindingRef(value)) {
    const parts = value.$ref.split(".").filter(Boolean);
    if (parts.length < 2 || !["inputs", "steps"].includes(parts[0] ?? "")) {
      throw new ExecutionFlowError(
        "INVALID_BINDING",
        `Binding reference must start with inputs. or steps.: ${value.$ref}`
      );
    }
    return structuredClone(getPath(context, parts));
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveBinding(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveBinding(item, context),
      ])
    );
  }

  return value;
}

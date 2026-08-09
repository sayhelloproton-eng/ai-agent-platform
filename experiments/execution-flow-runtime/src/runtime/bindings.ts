import { ExecutionFlowError } from "./errors.js";

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

export function resolveBinding(value: unknown, context: unknown): unknown {
  if (typeof value === "string" && value.startsWith("$")) {
    const parts = value.slice(1).split(".").filter(Boolean);
    if (parts.length === 0) {
      throw new ExecutionFlowError(
        "INVALID_BINDING",
        "Binding reference cannot be empty."
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

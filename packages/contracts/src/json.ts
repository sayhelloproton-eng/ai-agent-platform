export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

function isJsonValueInternal(
  input: unknown,
  activeObjects: WeakSet<object>,
): input is JsonValue {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean"
  ) {
    return true;
  }

  if (typeof input === "number") {
    return Number.isFinite(input);
  }

  if (typeof input !== "object") {
    return false;
  }

  if (activeObjects.has(input)) {
    return false;
  }

  activeObjects.add(input);
  let isValid = false;

  if (Array.isArray(input)) {
    isValid = input.every((value) =>
      isJsonValueInternal(value, activeObjects),
    );
  } else {
    const prototype = Object.getPrototypeOf(input);
    if (prototype === Object.prototype || prototype === null) {
      isValid = Object.values(input).every((value) =>
        isJsonValueInternal(value, activeObjects),
      );
    }
  }

  activeObjects.delete(input);
  return isValid;
}

export function isJsonValue(input: unknown): input is JsonValue {
  return isJsonValueInternal(input, new WeakSet<object>());
}

export function isJsonObject(input: unknown): input is JsonObject {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(input);
  return (
    (prototype === Object.prototype || prototype === null) &&
    isJsonValue(input)
  );
}

import { ExecutionFlowError } from "./errors.js";
import type { JsonSchema } from "../types.js";

function typeMatches(value: unknown, type: string): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

export function validateValueAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path = "$"
): true {
  if (!schema || typeof schema !== "object") {
    throw new ExecutionFlowError(
      "INVALID_SCHEMA",
      `Schema at ${path} must be an object.`
    );
  }

  if ("const" in schema && value !== schema.const) {
    throw new ExecutionFlowError(
      "SCHEMA_VALIDATION_FAILED",
      `${path} must equal ${JSON.stringify(schema.const)}.`
    );
  }

  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => Object.is(candidate, value))
  ) {
    throw new ExecutionFlowError(
      "SCHEMA_VALIDATION_FAILED",
      `${path} is not an allowed enum value.`
    );
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      throw new ExecutionFlowError(
        "SCHEMA_VALIDATION_FAILED",
        `${path} does not match type ${types.join("|")}.`
      );
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      throw new ExecutionFlowError(
        "SCHEMA_VALIDATION_FAILED",
        `${path} is shorter than minLength.`
      );
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      throw new ExecutionFlowError(
        "SCHEMA_VALIDATION_FAILED",
        `${path} does not match required pattern.`
      );
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      throw new ExecutionFlowError(
        "SCHEMA_VALIDATION_FAILED",
        `${path} is below minimum.`
      );
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      throw new ExecutionFlowError(
        "SCHEMA_VALIDATION_FAILED",
        `${path} is above maximum.`
      );
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) =>
      validateValueAgainstSchema(item, schema.items as JsonSchema, `${path}[${index}]`)
    );
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>;
    const required = schema.required ?? [];
    for (const key of required) {
      if (!(key in objectValue)) {
        throw new ExecutionFlowError(
          "SCHEMA_VALIDATION_FAILED",
          `${path}.${key} is required.`
        );
      }
    }

    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(properties)) {
      if (key in objectValue) {
        validateValueAgainstSchema(objectValue[key], child, `${path}.${key}`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(objectValue)) {
        if (!(key in properties)) {
          throw new ExecutionFlowError(
            "SCHEMA_VALIDATION_FAILED",
            `${path}.${key} is not allowed.`
          );
        }
      }
    }
  }

  return true;
}

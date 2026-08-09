import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import { ExecutionFlowError } from "./errors.js";
import type { JsonSchema } from "../types.js";

export type PublishedSchemaName =
  | "template-value"
  | "execution-run"
  | "execution-flow"
  | "execution-result"
  | "capability"
  | "inference-node";

const SCHEMA_FILES: Record<PublishedSchemaName, string> = {
  "template-value": "template-value.v0.schema.json",
  "execution-run": "execution-run.v0.schema.json",
  "execution-flow": "execution-flow.v0.schema.json",
  "execution-result": "execution-result.v0.schema.json",
  capability: "capability.v0.schema.json",
  "inference-node": "inference-node.v0.schema.json",
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});

const publishedSchemas = new Map<PublishedSchemaName, JsonSchema>();

for (const [name, filename] of Object.entries(SCHEMA_FILES) as Array<
  [PublishedSchemaName, string]
>) {
  const file = fileURLToPath(new URL(`../../spec/${filename}`, import.meta.url));
  const schema = JSON.parse(fs.readFileSync(file, "utf8")) as JsonSchema;
  publishedSchemas.set(name, schema);
  ajv.addSchema(schema);
}

const publishedValidators = new Map<PublishedSchemaName, ValidateFunction>();
for (const [name, schema] of publishedSchemas) {
  const id = schema.$id;
  if (typeof id !== "string") {
    throw new Error(`Published schema ${name} is missing $id.`);
  }
  const validator = ajv.getSchema(id);
  if (!validator) {
    throw new Error(`Published schema ${name} could not be compiled.`);
  }
  publishedValidators.set(name, validator);
}

function normalizeErrors(errors: ErrorObject[] | null | undefined) {
  return (errors ?? []).map((error) => ({
    instance_path: error.instancePath || "$",
    schema_path: error.schemaPath,
    keyword: error.keyword,
    message: error.message ?? "schema validation failed",
    params: error.params,
  }));
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  const normalized = normalizeErrors(errors);
  return normalized
    .slice(0, 5)
    .map((error) => `${error.instance_path} ${error.message}`)
    .join("; ");
}

export function getPublishedSchema(name: PublishedSchemaName): JsonSchema {
  const schema = publishedSchemas.get(name);
  if (!schema) throw new Error(`Unknown published schema: ${name}`);
  return structuredClone(schema);
}

export function validatePublishedSchema(
  name: PublishedSchemaName,
  value: unknown,
  errorCode = "SCHEMA_VALIDATION_FAILED"
): true {
  const validate = publishedValidators.get(name);
  if (!validate) throw new Error(`Unknown published schema: ${name}`);
  if (!validate(value)) {
    throw new ExecutionFlowError(
      errorCode,
      `${name} validation failed: ${formatErrors(validate.errors)}`,
      { schema: name, errors: normalizeErrors(validate.errors) }
    );
  }
  return true;
}

function createDynamicAjv(): Ajv2020 {
  return new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
  });
}

export function assertValidJsonSchema(schema: JsonSchema, path = "$schema"): true {
  const dynamicAjv = createDynamicAjv();
  try {
    const valid = dynamicAjv.validateSchema(schema);
    if (!valid) {
      throw new ExecutionFlowError(
        "INVALID_SCHEMA",
        `${path} is not a valid JSON Schema 2020-12 document: ${formatErrors(dynamicAjv.errors)}`,
        { errors: normalizeErrors(dynamicAjv.errors) }
      );
    }
    dynamicAjv.compile(schema);
    return true;
  } catch (error) {
    if (error instanceof ExecutionFlowError) throw error;
    throw new ExecutionFlowError(
      "INVALID_SCHEMA",
      `${path} could not be compiled as JSON Schema 2020-12: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function validateValueAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path = "$"
): true {
  const dynamicAjv = createDynamicAjv();
  let validate: ValidateFunction;
  try {
    const valid = dynamicAjv.validateSchema(schema);
    if (!valid) {
      throw new ExecutionFlowError(
        "INVALID_SCHEMA",
        `${path}.schema is not valid JSON Schema 2020-12: ${formatErrors(dynamicAjv.errors)}`,
        { errors: normalizeErrors(dynamicAjv.errors) }
      );
    }
    validate = dynamicAjv.compile(schema);
  } catch (error) {
    if (error instanceof ExecutionFlowError) throw error;
    throw new ExecutionFlowError(
      "INVALID_SCHEMA",
      `${path} schema could not be compiled: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!validate(value)) {
    throw new ExecutionFlowError(
      "SCHEMA_VALIDATION_FAILED",
      `${path} failed schema validation: ${formatErrors(validate.errors)}`,
      { path, errors: normalizeErrors(validate.errors) }
    );
  }
  return true;
}

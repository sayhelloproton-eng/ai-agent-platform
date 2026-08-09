import { ExecutionFlowError } from "../runtime/errors.js";
import { assertValidJsonSchema, validatePublishedSchema, validateValueAgainstSchema } from "../runtime/schema.js";
import type {
  CapabilityDescriptor,
  CapabilityHandler,
  CapabilityInvocationContext,
} from "../types.js";

interface CapabilityEntry {
  descriptor: CapabilityDescriptor;
  handler: CapabilityHandler;
}

export class CapabilityRegistry {
  readonly #entries = new Map<string, CapabilityEntry>();

  register(descriptor: CapabilityDescriptor, handler: CapabilityHandler): this {
    validatePublishedSchema("capability", descriptor, "INVALID_CAPABILITY");
    assertValidJsonSchema(descriptor.input_schema, `${descriptor.name}.input_schema`);
    if (this.#entries.has(descriptor.name)) {
      throw new ExecutionFlowError(
        "DUPLICATE_CAPABILITY",
        `Capability already registered: ${descriptor.name}`
      );
    }
    if (typeof handler !== "function") {
      throw new ExecutionFlowError(
        "INVALID_CAPABILITY",
        "Capability handler must be a function."
      );
    }
    this.#entries.set(descriptor.name, {
      descriptor: structuredClone(descriptor),
      handler,
    });
    return this;
  }

  describe(name: string): CapabilityDescriptor | undefined {
    const entry = this.#entries.get(name);
    return entry ? structuredClone(entry.descriptor) : undefined;
  }

  list(): CapabilityDescriptor[] {
    return [...this.#entries.values()].map(({ descriptor }) =>
      structuredClone(descriptor)
    );
  }

  async invoke(
    name: string,
    args: Record<string, unknown>,
    context: CapabilityInvocationContext
  ): Promise<unknown> {
    const entry = this.#entries.get(name);
    if (!entry) {
      throw new ExecutionFlowError(
        "CAPABILITY_NOT_FOUND",
        `Capability is not registered: ${name}`
      );
    }

    const allowed = new Set(context.authorization.allowed_capabilities);
    if (!allowed.has(name)) {
      throw new ExecutionFlowError(
        "CAPABILITY_DENIED",
        `Capability is not authorized for this run: ${name}`
      );
    }

    validateValueAgainstSchema(args, entry.descriptor.input_schema, "$arguments");
    return await entry.handler(structuredClone(args), context);
  }
}

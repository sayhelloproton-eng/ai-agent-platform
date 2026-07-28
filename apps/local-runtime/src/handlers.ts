import type {
  CapabilityName,
  JsonObject,
} from "@ai-agent-platform/contracts";

export interface CapabilityHandlerContext {
  readonly capabilities: readonly CapabilityName[];
}

export type CapabilityHandler = (
  input: JsonObject,
  context: CapabilityHandlerContext,
) => Promise<JsonObject>;

const handlers: Readonly<
  Partial<Record<CapabilityName, CapabilityHandler>>
> = Object.freeze({
  "gateway.ping": async () => ({
    capability: "gateway.ping",
    status: "ok",
    runtime: "local-runtime",
  }),
  "runtime.status": async (_input, context) => ({
    runtime: "local-runtime",
    version: "0.1.0",
    status: "ready",
    capabilities: [...context.capabilities],
  }),
});

export function getCapabilityHandler(
  capability: CapabilityName,
): CapabilityHandler | undefined {
  return handlers[capability];
}

import { ExecutionFlowError } from "../runtime/errors.js";
import type { InferenceBackend, InferenceRequest, InferenceResponse } from "../types.js";

export class InferenceBackendRegistry {
  readonly #backends = new Map<string, InferenceBackend>();

  register(name: string, backend: InferenceBackend): this {
    if (!name || !backend || typeof backend.infer !== "function") {
      throw new ExecutionFlowError(
        "INVALID_INFERENCE_BACKEND",
        "Inference backend requires a name and infer() function."
      );
    }
    if (this.#backends.has(name)) {
      throw new ExecutionFlowError(
        "DUPLICATE_INFERENCE_BACKEND",
        `Inference backend already registered: ${name}`
      );
    }
    this.#backends.set(name, backend);
    return this;
  }

  has(name: string): boolean {
    return this.#backends.has(name);
  }

  list(): string[] {
    return [...this.#backends.keys()];
  }

  async infer(
    name: string,
    request: InferenceRequest
  ): Promise<InferenceResponse> {
    const backend = this.#backends.get(name);
    if (!backend) {
      throw new ExecutionFlowError(
        "INFERENCE_BACKEND_NOT_FOUND",
        `Inference backend is not registered: ${name}`
      );
    }
    return await backend.infer(structuredClone(request));
  }
}

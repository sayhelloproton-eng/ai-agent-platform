import type {
  InferenceBackend,
  InferenceRequest,
  InferenceResponse,
} from "../types.js";

export class FixtureInferenceBackend implements InferenceBackend {
  readonly #resolver: (
    request: InferenceRequest
  ) => Promise<unknown> | unknown;

  constructor(
    resolver: (request: InferenceRequest) => Promise<unknown> | unknown
  ) {
    this.#resolver = resolver;
  }

  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    const output = await this.#resolver(structuredClone(request));
    return {
      output: structuredClone(output),
      metadata: { provider: "fixture" },
    };
  }
}

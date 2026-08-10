import type {
  ExecutionFlow,
  ExecutionResult,
} from "../../execution-flow-runtime/index.js";

export interface ExecutionPayload {
  flow: ExecutionFlow;
  inputs: Record<string, unknown>;
  allowed_capabilities: string[];
  max_node_runs?: number;
}

export interface ExecutionReferenceStore {
  getExecutionPayload(ref: string): ExecutionPayload;
  putExecutionResult(result: ExecutionResult): string;
  getExecutionResult(ref: string): ExecutionResult;
}

export class InMemoryExecutionReferenceStore implements ExecutionReferenceStore {
  readonly #inputs = new Map<string, ExecutionPayload>();
  readonly #results = new Map<string, ExecutionResult>();

  putExecutionPayload(ref: string, payload: ExecutionPayload): void {
    this.#inputs.set(ref, structuredClone(payload));
  }

  getExecutionPayload(ref: string): ExecutionPayload {
    const value = this.#inputs.get(ref);
    if (!value) throw new Error(`Execution payload reference not found: ${ref}`);
    return structuredClone(value);
  }

  putExecutionResult(result: ExecutionResult): string {
    const ref = `execution-result:${result.execution_id}`;
    this.#results.set(ref, structuredClone(result));
    return ref;
  }

  getExecutionResult(ref: string): ExecutionResult {
    const value = this.#results.get(ref);
    if (!value) throw new Error(`Execution result reference not found: ${ref}`);
    return structuredClone(value);
  }
}

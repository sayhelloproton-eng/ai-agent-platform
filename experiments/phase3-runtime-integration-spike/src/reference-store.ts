import fs from "node:fs";
import path from "node:path";

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

function fileNameForRef(ref: string): string {
  return `${encodeURIComponent(ref)}.json`;
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(tempPath, filePath);
}

function readJson<T>(filePath: string, label: string, ref: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${label} reference not found: ${ref}`);
    }
    throw error;
  }
}

/**
 * Spike-only durable reference adapter. It exists only to prove that a Task's
 * resultRef still resolves after the Task Control store is closed and reopened.
 * It is not a Phase 3 platform storage contract.
 */
export class JsonFileExecutionReferenceStore implements ExecutionReferenceStore {
  readonly #inputDir: string;
  readonly #resultDir: string;

  constructor(rootDir: string) {
    this.#inputDir = path.join(rootDir, "inputs");
    this.#resultDir = path.join(rootDir, "results");
  }

  putExecutionPayload(ref: string, payload: ExecutionPayload): void {
    writeJsonAtomic(path.join(this.#inputDir, fileNameForRef(ref)), payload);
  }

  getExecutionPayload(ref: string): ExecutionPayload {
    return readJson<ExecutionPayload>(
      path.join(this.#inputDir, fileNameForRef(ref)),
      "Execution payload",
      ref,
    );
  }

  putExecutionResult(result: ExecutionResult): string {
    const ref = `execution-result:${result.execution_id}`;
    writeJsonAtomic(path.join(this.#resultDir, fileNameForRef(ref)), result);
    return ref;
  }

  getExecutionResult(ref: string): ExecutionResult {
    return readJson<ExecutionResult>(
      path.join(this.#resultDir, fileNameForRef(ref)),
      "Execution result",
      ref,
    );
  }
}

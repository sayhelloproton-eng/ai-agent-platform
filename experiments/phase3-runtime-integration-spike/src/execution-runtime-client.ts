import type {
  ExecutionResult,
  ExecutionRun,
} from "../../execution-flow-runtime/index.js";

export interface ExecutionRuntimePort {
  execute(run: ExecutionRun): Promise<ExecutionResult>;
}

export interface HttpExecutionRuntimeClientOptions {
  baseUrl: string;
}

export class HttpExecutionRuntimeClient implements ExecutionRuntimePort {
  readonly #baseUrl: string;

  constructor(options: HttpExecutionRuntimeClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
  }

  async execute(run: ExecutionRun): Promise<ExecutionResult> {
    const response = await fetch(`${this.#baseUrl}/v1/executions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(run),
    });
    const body = await response.json().catch(() => undefined) as unknown;

    if (response.status !== 200) {
      throw new Error(
        `Execution Runtime transport failed with HTTP ${response.status}: ${JSON.stringify(body)}`,
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Execution Runtime returned a non-object response.");
    }

    const result = body as Partial<ExecutionResult>;
    if (result.contract !== "execution.result.v0") {
      throw new Error(`Execution Runtime returned unexpected contract: ${String(result.contract)}`);
    }
    if (result.execution_id !== run.execution_id) {
      throw new Error(
        `Execution Runtime execution_id mismatch: expected ${run.execution_id}, received ${String(result.execution_id)}`,
      );
    }
    if (
      typeof result.status !== "string" ||
      !["completed", "blocked", "failed"].includes(result.status)
    ) {
      throw new Error(`Execution Runtime returned invalid status: ${String(result.status)}`);
    }

    return body as ExecutionResult;
  }
}

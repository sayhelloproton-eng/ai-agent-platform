export class ExecutionFlowError extends Error {
  readonly code: string;
  readonly details: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ExecutionFlowError";
    this.code = code;
    this.details = details;
  }
}

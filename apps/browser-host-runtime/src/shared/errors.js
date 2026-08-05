export class BhrError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "BhrError";
    this.code = code;
    this.details = details;
  }
}

export function asSafeError(error) {
  if (error instanceof BhrError) {
    return { code: error.code, message: error.message, details: error.details ?? null };
  }
  return { code: "INTERNAL_ERROR", message: "Browser Host Runtime encountered an internal error.", details: null };
}

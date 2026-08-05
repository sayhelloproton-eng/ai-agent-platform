import type {
  JsonObject,
  LocalErrorCategory,
  LocalErrorCode,
  LocalErrorData,
} from "./contracts.js";

export class LocalControlError extends Error {
  readonly code: LocalErrorCode;
  readonly category: LocalErrorCategory;
  readonly retryable: boolean;
  readonly recommendedAction?: string;
  readonly details?: JsonObject;

  constructor(
    code: LocalErrorCode,
    category: LocalErrorCategory,
    message: string,
    options: {
      readonly retryable?: boolean;
      readonly recommendedAction?: string;
      readonly details?: JsonObject;
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "LocalControlError";
    this.code = code;
    this.category = category;
    this.retryable = options.retryable ?? false;
    if (options.recommendedAction !== undefined) {
      this.recommendedAction = options.recommendedAction;
    }
    if (options.details !== undefined) {
      this.details = options.details;
    }
  }

  toData(): LocalErrorData {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      retryable: this.retryable,
      ...(this.recommendedAction === undefined
        ? {}
        : { recommended_action: this.recommendedAction }),
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }
}

export function asLocalControlError(error: unknown): LocalControlError {
  if (error instanceof LocalControlError) {
    return error;
  }
  return new LocalControlError(
    "INTERNAL_ERROR",
    "INTERNAL",
    "Local Control encountered an internal error.",
    { cause: error },
  );
}

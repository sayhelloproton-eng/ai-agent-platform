import type { ControllerErrorCode } from "@ai-agent-platform/contracts";

export class ControllerTaskControlError extends Error {
  readonly code: ControllerErrorCode;
  readonly httpStatus: number;

  constructor(code: ControllerErrorCode, message: string, httpStatus: number) {
    super(message);
    this.name = "ControllerTaskControlError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

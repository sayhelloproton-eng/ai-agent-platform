import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

import type { LocalRequest, LocalResult } from "./contracts.js";
import { validateLocalRequest } from "./request-validator.js";
import { validateLocalResult } from "./result-validator.js";

export const LOCAL_CONTROL_FIXED_ARGS = [
  "invoke",
  "--input",
  "-",
  "--output",
  "json",
] as const;

export type LocalControlTransportErrorCode =
  | "LOCAL_CLI_NOT_AVAILABLE"
  | "LOCAL_CLI_CANCELLED"
  | "LOCAL_CLI_TIMEOUT"
  | "LOCAL_CLI_OUTPUT_TOO_LARGE"
  | "LOCAL_CLI_PROCESS_FAILED"
  | "LOCAL_CLI_INVALID_RESULT";

export class LocalControlTransportError extends Error {
  readonly code: LocalControlTransportErrorCode;
  readonly retryable: boolean;

  constructor(
    code: LocalControlTransportErrorCode,
    message: string,
    retryable: boolean,
    options: ErrorOptions = {},
  ) {
    super(message, options);
    this.name = "LocalControlTransportError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface LocalControlClient {
  execute(
    request: LocalRequest,
    options?: LocalControlExecutionOptions,
  ): Promise<LocalResult>;
}

export interface LocalControlExecutionOptions {
  readonly signal?: AbortSignal;
}

export interface LocalControlProcessClientOptions {
  readonly executable: string;
  readonly trustedPrefixArgs?: readonly string[];
  readonly cwd: string;
  readonly timeoutMs?: number;
  readonly maxStdoutBytes?: number;
  readonly maxStderrBytes?: number;
  readonly environment?: Readonly<Record<string, string>>;
}

const TRUSTED_ENVIRONMENT_NAMES = new Set([
  "LOCAL_PROJECT_ROOT",
  "LOCAL_GATEWAY_HEALTH_URL",
  "LOCAL_CONTROL_ALLOW_SERVICE_START",
]);

function buildEnvironment(
  supplied: Readonly<Record<string, string>> | undefined,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"] as const) {
    const value = process.env[name];
    if (value !== undefined) {
      environment[name] = value;
    }
  }
  if (supplied !== undefined) {
    for (const [name, value] of Object.entries(supplied)) {
      if (!TRUSTED_ENVIRONMENT_NAMES.has(name)) {
        throw new TypeError(`Unsupported Local Control environment variable: ${name}`);
      }
      environment[name] = value;
    }
  }
  return environment;
}

export function createLocalControlProcessClient(
  options: LocalControlProcessClientOptions,
): LocalControlClient {
  if (!path.isAbsolute(options.executable)) {
    throw new TypeError("Local Control executable must be an absolute path.");
  }
  if (!path.isAbsolute(options.cwd)) {
    throw new TypeError("Local Control cwd must be an absolute path.");
  }
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxStdoutBytes = options.maxStdoutBytes ?? 65_536;
  const maxStderrBytes = options.maxStderrBytes ?? 16_384;
  const prefixArgs = [...(options.trustedPrefixArgs ?? [])];
  const environment = buildEnvironment(options.environment);

  return Object.freeze({
    async execute(
      input: LocalRequest,
      executionOptions: LocalControlExecutionOptions = {},
    ): Promise<LocalResult> {
      const request = validateLocalRequest(input);
      if (executionOptions.signal?.aborted === true) {
        throw new LocalControlTransportError(
          "LOCAL_CLI_CANCELLED",
          "Local Control CLI invocation was cancelled before start.",
          false,
        );
      }
      return new Promise<LocalResult>((resolve, reject) => {
        const effectiveTimeoutMs = Math.min(timeoutMs, request.budget.timeout_ms);
        const effectiveMaxStdoutBytes = Math.min(
          maxStdoutBytes,
          request.budget.max_stdout_bytes,
        );
        let child: ChildProcessWithoutNullStreams;
        try {
          child = spawn(
            options.executable,
            [...prefixArgs, ...LOCAL_CONTROL_FIXED_ARGS],
            {
              cwd: options.cwd,
              env: environment,
              shell: false,
              stdio: ["pipe", "pipe", "pipe"],
            },
          );
        } catch (error) {
          reject(
            new LocalControlTransportError(
              "LOCAL_CLI_PROCESS_FAILED",
              "Local Control CLI could not be started.",
              true,
              { cause: error },
            ),
          );
          return;
        }
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let settled = false;
        let timer: NodeJS.Timeout | undefined;

        const cleanup = (): void => {
          if (timer !== undefined) {
            clearTimeout(timer);
          }
          executionOptions.signal?.removeEventListener("abort", cancel);
        };

        const cancel = (): void => {
          finishReject(
            new LocalControlTransportError(
              "LOCAL_CLI_CANCELLED",
              "Local Control CLI invocation was cancelled.",
              false,
            ),
          );
        };

        const finishReject = (error: LocalControlTransportError): void => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          child.kill("SIGKILL");
          reject(error);
        };

        child.stdout.on("data", (chunk: Buffer) => {
          stdoutBytes += chunk.byteLength;
          if (stdoutBytes > effectiveMaxStdoutBytes) {
            finishReject(
              new LocalControlTransportError(
                "LOCAL_CLI_OUTPUT_TOO_LARGE",
                "Local Control stdout exceeded the adapter limit.",
                false,
              ),
            );
            return;
          }
          stdoutChunks.push(chunk);
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderrBytes += chunk.byteLength;
          if (stderrBytes > maxStderrBytes) {
            finishReject(
              new LocalControlTransportError(
                "LOCAL_CLI_OUTPUT_TOO_LARGE",
                "Local Control stderr exceeded the adapter limit.",
                false,
              ),
            );
            return;
          }
          stderrChunks.push(chunk);
        });
        child.once("error", (error: NodeJS.ErrnoException) => {
          finishReject(
            new LocalControlTransportError(
              error.code === "ENOENT"
                ? "LOCAL_CLI_NOT_AVAILABLE"
                : "LOCAL_CLI_PROCESS_FAILED",
              error.code === "ENOENT"
                ? "Configured Local Control CLI is not available."
                : "Local Control CLI could not be started.",
              true,
              { cause: error },
            ),
          );
        });
        child.once("close", (code, signal) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          if (code !== 0) {
            reject(
              new LocalControlTransportError(
                "LOCAL_CLI_PROCESS_FAILED",
                `Local Control CLI exited unsuccessfully (${code ?? signal ?? "unknown"}).`,
                code === 3 || code === 10,
              ),
            );
            return;
          }
          const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
          const lines = stdout.split(/\r?\n/u).filter((line) => line.length > 0);
          if (lines.length !== 1) {
            reject(
              new LocalControlTransportError(
                "LOCAL_CLI_INVALID_RESULT",
                "Local Control stdout must contain exactly one JSON value.",
                false,
              ),
            );
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(lines[0] ?? "");
          } catch (error) {
            reject(
              new LocalControlTransportError(
                "LOCAL_CLI_INVALID_RESULT",
                "Local Control stdout is not valid JSON.",
                false,
                { cause: error },
              ),
            );
            return;
          }
          try {
            resolve(
              validateLocalResult(parsed, {
                requestId: request.request_id,
                capability: request.capability,
              }),
            );
          } catch (error) {
            reject(
              new LocalControlTransportError(
                "LOCAL_CLI_INVALID_RESULT",
                "Local Control returned an invalid canonical result.",
                false,
                { cause: error },
              ),
            );
          }
        });

        timer = setTimeout(() => {
          finishReject(
            new LocalControlTransportError(
              "LOCAL_CLI_TIMEOUT",
              "Local Control CLI exceeded the adapter timeout.",
              true,
            ),
          );
        }, effectiveTimeoutMs);
        timer.unref();
        executionOptions.signal?.addEventListener("abort", cancel, {
          once: true,
        });
        if (executionOptions.signal?.aborted === true) {
          cancel();
        }

        child.stdin.once("error", (error) => {
          finishReject(
            new LocalControlTransportError(
              "LOCAL_CLI_PROCESS_FAILED",
              "Local Control stdin could not be written.",
              true,
              { cause: error },
            ),
          );
        });
        child.stdin.end(JSON.stringify(request));
      });
    },
  });
}

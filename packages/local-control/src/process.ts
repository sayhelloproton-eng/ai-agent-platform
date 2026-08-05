import { spawn } from "node:child_process";

import { LocalControlError } from "./errors.js";

const ANSI_PATTERN = /[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

export interface ProcessRunOptions {
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}

export interface ProcessRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface DetachedProcessResult {
  readonly pid: number;
  readonly startedAt: string;
}

export interface ProcessRunner {
  run(
    executable: string,
    args: readonly string[],
    options: ProcessRunOptions,
  ): Promise<ProcessRunResult>;
  spawnDetached(
    executable: string,
    args: readonly string[],
    options: Pick<ProcessRunOptions, "cwd">,
  ): DetachedProcessResult;
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const names = ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"] as const;
  const environment: NodeJS.ProcessEnv = {};
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined) {
      environment[name] = value;
    }
  }
  return environment;
}

function sanitizeOutput(input: Buffer): string {
  return input.toString("utf8").replace(ANSI_PATTERN, "");
}

export const defaultProcessRunner: ProcessRunner = Object.freeze({
  run(
    executable: string,
    args: readonly string[],
    options: ProcessRunOptions,
  ): Promise<ProcessRunResult> {
    return new Promise<ProcessRunResult>((resolve, reject) => {
      const child = spawn(executable, [...args], {
        cwd: options.cwd,
        env: safeEnvironment(),
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let totalBytes = 0;
      let finished = false;

      const fail = (error: LocalControlError): void => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        child.kill("SIGKILL");
        reject(error);
      };

      const collect = (target: Buffer[], chunk: Buffer): void => {
        totalBytes += chunk.byteLength;
        if (totalBytes > options.maxOutputBytes) {
          fail(
            new LocalControlError(
              "OUTPUT_TOO_LARGE",
              "EXECUTION_FAILED",
              "Process output exceeded the Local Control budget.",
            ),
          );
          return;
        }
        target.push(chunk);
      };

      child.stdout.on("data", (chunk: Buffer) => collect(stdoutChunks, chunk));
      child.stderr.on("data", (chunk: Buffer) => collect(stderrChunks, chunk));
      child.once("error", (error: NodeJS.ErrnoException) => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        if (error.code === "ENOENT") {
          reject(
            new LocalControlError(
              "DEPENDENCY_NOT_AVAILABLE",
              "UNAVAILABLE",
              "Registered executable is not available.",
              { cause: error },
            ),
          );
          return;
        }
        reject(
          new LocalControlError(
            "PROCESS_FAILED",
            "EXECUTION_FAILED",
            "Registered process could not be started.",
            { cause: error },
          ),
        );
      });
      child.once("close", (code) => {
        if (finished) {
          return;
        }
        finished = true;
        clearTimeout(timer);
        resolve({
          exitCode: code ?? -1,
          stdout: sanitizeOutput(Buffer.concat(stdoutChunks)),
          stderr: sanitizeOutput(Buffer.concat(stderrChunks)),
        });
      });

      const timer = setTimeout(() => {
        fail(
          new LocalControlError(
            "PROCESS_TIMEOUT",
            "TIMEOUT",
            "Registered process exceeded the Local Control timeout.",
            { retryable: true },
          ),
        );
      }, options.timeoutMs);
      timer.unref();
    });
  },

  spawnDetached(
    executable: string,
    args: readonly string[],
    options: Pick<ProcessRunOptions, "cwd">,
  ): DetachedProcessResult {
    let child;
    try {
      child = spawn(executable, [...args], {
        cwd: options.cwd,
        env: safeEnvironment(),
        shell: false,
        detached: true,
        stdio: "ignore",
      });
    } catch (error) {
      throw new LocalControlError(
        "PROCESS_FAILED",
        "EXECUTION_FAILED",
        "Registered service process could not be started.",
        { cause: error },
      );
    }
    if (child.pid === undefined) {
      throw new LocalControlError(
        "PROCESS_FAILED",
        "EXECUTION_FAILED",
        "Registered service process did not expose a process identifier.",
      );
    }
    child.unref();
    return { pid: child.pid, startedAt: new Date().toISOString() };
  },
});

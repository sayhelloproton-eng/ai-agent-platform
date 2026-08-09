import { spawn } from "node:child_process";
import { ExecutionFlowError } from "../runtime/errors.js";
import type {
  CapabilityDescriptor,
  FixedCommandDefinition,
} from "../types.js";

export interface FixedCommandCapabilityOptions {
  commands: Record<string, FixedCommandDefinition>;
  name?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

interface CommandResult {
  command_ref: string;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

function runFixedCommand(
  commandRef: string,
  definition: FixedCommandDefinition,
  timeoutMs: number,
  maxOutputBytes: number
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(definition.executable, definition.args, {
      ...(definition.cwd ? { cwd: definition.cwd } : {}),
      ...(definition.env ? { env: definition.env } : {}),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let terminalError: ExecutionFlowError | undefined;

    const terminate = (error: ExecutionFlowError) => {
      if (!terminalError) terminalError = error;
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      if (terminalError) return;
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        terminate(
          new ExecutionFlowError(
            "COMMAND_OUTPUT_TOO_LARGE",
            `Command stdout exceeded ${maxOutputBytes} bytes.`
          )
        );
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (terminalError) return;
      stderrBytes += chunk.length;
      if (stderrBytes > maxOutputBytes) {
        terminate(
          new ExecutionFlowError(
            "COMMAND_OUTPUT_TOO_LARGE",
            `Command stderr exceeded ${maxOutputBytes} bytes.`
          )
        );
        return;
      }
      stderrChunks.push(chunk);
    });

    child.stdout.on("error", (error) => {
      terminate(
        new ExecutionFlowError(
          "COMMAND_STREAM_ERROR",
          `Command stdout failed: ${error.message}`
        )
      );
    });

    child.stderr.on("error", (error) => {
      terminate(
        new ExecutionFlowError(
          "COMMAND_STREAM_ERROR",
          `Command stderr failed: ${error.message}`
        )
      );
    });

    const timer = setTimeout(() => {
      terminate(
        new ExecutionFlowError(
          "COMMAND_TIMEOUT",
          `Command exceeded ${timeoutMs} ms.`
        )
      );
    }, timeoutMs);

    child.once("error", (error) => {
      terminate(
        new ExecutionFlowError(
          "COMMAND_SPAWN_FAILED",
          `Command could not start: ${error.message}`
        )
      );
    });

    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (terminalError) {
        reject(terminalError);
        return;
      }
      resolve({
        command_ref: commandRef,
        exit_code: code,
        signal,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

export function createFixedCommandCapability({
  commands,
  name = "process.command.run-fixed",
  timeoutMs = 10_000,
  maxOutputBytes = 64 * 1024,
}: FixedCommandCapabilityOptions) {
  const definitions = new Map<string, FixedCommandDefinition>(
    Object.entries(commands ?? {})
  );

  for (const [ref, definition] of definitions) {
    if (
      !definition ||
      typeof definition.executable !== "string" ||
      !Array.isArray(definition.args) ||
      definition.args.some((arg) => typeof arg !== "string")
    ) {
      throw new ExecutionFlowError(
        "INVALID_COMMAND_DEFINITION",
        `Invalid fixed command definition: ${ref}`
      );
    }
  }

  const descriptor: CapabilityDescriptor = {
    contract: "execution.capability.v0",
    name,
    description:
      "Run a host-registered fixed command by opaque command_ref with shell disabled.",
    effects: "process",
    input_schema: {
      type: "object",
      properties: {
        command_ref: { type: "string", minLength: 1 },
      },
      required: ["command_ref"],
      additionalProperties: false,
    },
  };

  return {
    descriptor,
    handler: async (args: Record<string, unknown>) => {
      const commandRef = args.command_ref;
      if (typeof commandRef !== "string") {
        throw new ExecutionFlowError(
          "INVALID_ARGUMENTS",
          "command_ref must be a string."
        );
      }

      const definition = definitions.get(commandRef);
      if (!definition) {
        throw new ExecutionFlowError(
          "COMMAND_REF_DENIED",
          `Unknown fixed command_ref: ${commandRef}`
        );
      }

      return await runFixedCommand(
        commandRef,
        definition,
        timeoutMs,
        maxOutputBytes
      );
    },
  };
}

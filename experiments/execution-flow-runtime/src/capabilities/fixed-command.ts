import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
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

function collect(stream: Readable, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;

    stream.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(
          new ExecutionFlowError(
            "COMMAND_OUTPUT_TOO_LARGE",
            `Command output exceeded ${maxBytes} bytes.`
          )
        );
        return;
      }
      chunks.push(chunk);
    });

    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
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
      !Array.isArray(definition.args)
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

      const child = spawn(definition.executable, definition.args, {
        ...(definition.cwd ? { cwd: definition.cwd } : {}),
        ...(definition.env ? { env: definition.env } : {}),
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const stdoutPromise = collect(child.stdout, maxOutputBytes);
      const stderrPromise = collect(child.stderr, maxOutputBytes);
      const closePromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
        (resolve, reject) => {
          child.once("error", reject);
          child.once("close", (code, signal) => resolve({ code, signal }));
        }
      );

      const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
      try {
        const [stdout, stderr, exit] = await Promise.all([
          stdoutPromise,
          stderrPromise,
          closePromise,
        ]);

        if (exit.signal === "SIGKILL") {
          throw new ExecutionFlowError(
            "COMMAND_TIMEOUT",
            `Command exceeded ${timeoutMs} ms.`
          );
        }

        return {
          command_ref: commandRef,
          exit_code: exit.code,
          signal: exit.signal,
          stdout,
          stderr,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

#!/usr/bin/env node
import { executeLocalRequest } from "./invoke.js";

const MAX_STDIN_BYTES = 262_144;

function diagnostic(code: string, message: string): void {
  process.stderr.write(`${JSON.stringify({ level: "error", code, message })}\n`);
}

function validArguments(args: readonly string[]): boolean {
  return (
    args.length === 5 &&
    args[0] === "invoke" &&
    args[1] === "--input" &&
    args[2] === "-" &&
    args[3] === "--output" &&
    args[4] === "json"
  );
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_STDIN_BYTES) {
      throw new Error("stdin exceeds the Local Control hard limit");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  if (!validArguments(process.argv.slice(2))) {
    diagnostic(
      "INVALID_CLI_ARGUMENTS",
      "Usage: aap-local invoke --input - --output json",
    );
    process.exitCode = 2;
    return;
  }

  let input: unknown;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    diagnostic("INVALID_STDIN", "stdin must contain one valid JSON object.");
    process.exitCode = 2;
    return;
  }

  try {
    const result = await executeLocalRequest(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = 0;
  } catch {
    diagnostic(
      "LOCAL_CONTROL_BOOTSTRAP_FAILED",
      "Local Control could not load its trusted local registry.",
    );
    process.exitCode = 3;
  }
}

void main();

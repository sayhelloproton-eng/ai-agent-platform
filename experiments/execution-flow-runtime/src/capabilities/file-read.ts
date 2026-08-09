import fs from "node:fs/promises";
import path from "node:path";
import { ExecutionFlowError } from "../runtime/errors.js";
import type { CapabilityDescriptor } from "../types.js";

export interface FileReadCapabilityOptions {
  root: string;
  name?: string;
  maxBytes?: number;
  protectedPatterns?: string[];
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function matchesProtected(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.split(path.sep).join("/");
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      return normalized === prefix || normalized.startsWith(`${prefix}/`);
    }
    if (pattern.startsWith("**/*.")) {
      return normalized.endsWith(pattern.slice(4));
    }
    return normalized === pattern;
  });
}

export async function createFileReadCapability({
  root,
  name = "lab.file.read",
  maxBytes = 64 * 1024,
  protectedPatterns = [".env", ".git/**", "**/*.key"],
}: FileReadCapabilityOptions) {
  const realRoot = await fs.realpath(root);

  const descriptor: CapabilityDescriptor = {
    contract: "execution.capability.v0",
    name,
    description: "Read one UTF-8 file beneath a host-configured root.",
    effects: "read",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", minLength: 1 },
      },
      required: ["path"],
      additionalProperties: false,
    },
  };

  return {
    descriptor,
    handler: async (args: Record<string, unknown>) => {
      const relativePath = args.path;
      if (typeof relativePath !== "string") {
        throw new ExecutionFlowError("INVALID_ARGUMENTS", "path must be a string.");
      }

      if (
        path.isAbsolute(relativePath) ||
        relativePath.split(/[\\/]+/).includes("..")
      ) {
        throw new ExecutionFlowError(
          "PATH_OUTSIDE_ROOT",
          "File path must be relative and may not contain traversal segments."
        );
      }

      if (matchesProtected(relativePath, protectedPatterns)) {
        throw new ExecutionFlowError(
          "PROTECTED_PATH",
          `Protected file path denied: ${relativePath}`
        );
      }

      const unresolved = path.resolve(realRoot, relativePath);
      if (!isWithin(realRoot, unresolved)) {
        throw new ExecutionFlowError(
          "PATH_OUTSIDE_ROOT",
          "Resolved path escaped configured root."
        );
      }

      const realTarget = await fs.realpath(unresolved);
      if (!isWithin(realRoot, realTarget)) {
        throw new ExecutionFlowError(
          "PATH_OUTSIDE_ROOT",
          "Symlink target escaped configured root."
        );
      }

      const stat = await fs.stat(realTarget);
      if (!stat.isFile()) {
        throw new ExecutionFlowError("NOT_A_FILE", "Target is not a regular file.");
      }
      if (stat.size > maxBytes) {
        throw new ExecutionFlowError(
          "FILE_TOO_LARGE",
          `File exceeds ${maxBytes} byte limit.`
        );
      }

      const content = await fs.readFile(realTarget, "utf8");
      let json: unknown;
      try {
        json = JSON.parse(content);
      } catch {
        json = undefined;
      }

      return {
        path: relativePath,
        bytes: Buffer.byteLength(content),
        content,
        ...(json === undefined ? {} : { json }),
      };
    },
  };
}

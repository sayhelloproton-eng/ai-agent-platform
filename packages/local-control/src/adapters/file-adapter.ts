import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { JsonObject } from "../contracts.js";
import { LocalControlError } from "../errors.js";
import {
  HARD_MAX_FILE_BYTES,
  HARD_MAX_FILE_LINES,
  HARD_MAX_TREE_DEPTH,
  HARD_MAX_TREE_ENTRIES,
  HARD_MAX_TREE_PAGE_SIZE,
  assertNonSensitivePath,
  clampInteger,
  normalizeRelativePath,
  shouldExcludeTreeEntry,
} from "../policy.js";
import type { ProjectRegistration } from "../registry.js";

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp3",
  ".mp4",
  ".mov",
]);

export interface ResolvedProjectPath {
  readonly rootRealPath: string;
  readonly absolutePath: string;
  readonly relativePath: string;
}

export interface FileReadResult {
  readonly data: JsonObject;
  readonly truncated: boolean;
}

export interface TreeReadResult {
  readonly data: JsonObject;
  readonly truncated: boolean;
  readonly warnings: readonly string[];
}

export async function resolveProjectPath(
  project: ProjectRegistration,
  requestedPath: string,
): Promise<ResolvedProjectPath> {
  const relativePath = normalizeRelativePath(requestedPath);
  assertNonSensitivePath(relativePath);
  const rootRealPath = await fs.realpath(project.root);
  const candidate = path.resolve(rootRealPath, relativePath);
  let absolutePath: string;
  try {
    absolutePath = await fs.realpath(candidate);
  } catch (error) {
    throw new LocalControlError(
      "RESOURCE_NOT_REGISTERED",
      "NOT_FOUND",
      "Requested project resource was not found.",
      { details: { path: relativePath }, cause: error },
    );
  }
  if (
    absolutePath !== rootRealPath &&
    !absolutePath.startsWith(`${rootRealPath}${path.sep}`)
  ) {
    throw new LocalControlError(
      "SYMLINK_ESCAPE",
      "FORBIDDEN",
      "Requested path resolves outside the registered project.",
      { details: { path: relativePath } },
    );
  }
  return { rootRealPath, absolutePath, relativePath };
}

function isProbablyBinary(content: Buffer, extension: string): boolean {
  if (BINARY_EXTENSIONS.has(extension.toLowerCase())) {
    return true;
  }
  return content.subarray(0, 8_192).includes(0);
}

export async function readProjectFile(
  project: ProjectRegistration,
  parameters: JsonObject,
  maximumResultCharacters: number,
): Promise<FileReadResult> {
  const pathInput = parameters.path;
  if (typeof pathInput !== "string") {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "parameters.path must be a project-relative string.",
    );
  }
  const resolved = await resolveProjectPath(project, pathInput);
  const stat = await fs.stat(resolved.absolutePath);
  if (!stat.isFile()) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "Requested resource is not a regular file.",
      { details: { path: resolved.relativePath } },
    );
  }
  if (stat.size > HARD_MAX_FILE_BYTES) {
    throw new LocalControlError(
      "OUTPUT_TOO_LARGE",
      "EXECUTION_FAILED",
      "Requested file exceeds the Local Control hard size limit.",
      { details: { path: resolved.relativePath, size_bytes: stat.size } },
    );
  }

  const content = await fs.readFile(resolved.absolutePath);
  if (isProbablyBinary(content, path.extname(resolved.relativePath))) {
    throw new LocalControlError(
      "BINARY_RESOURCE_DENIED",
      "FORBIDDEN",
      "Binary file content is not returned by Local Control.",
      { details: { path: resolved.relativePath } },
    );
  }

  const text = content.toString("utf8");
  const lines = text.split(/\r?\n/);
  const lineRange = parameters.line_range;
  let start = 1;
  let end = Math.min(lines.length, HARD_MAX_FILE_LINES);
  if (lineRange !== undefined) {
    if (
      lineRange === null ||
      typeof lineRange !== "object" ||
      Array.isArray(lineRange)
    ) {
      throw new LocalControlError(
        "INVALID_REQUEST",
        "VALIDATION",
        "parameters.line_range must be an object.",
      );
    }
    const range = lineRange as Record<string, unknown>;
    start = clampInteger(range.start, 1, 1, Math.max(1, lines.length), "line_range.start");
    end = clampInteger(
      range.end,
      Math.min(lines.length, start + HARD_MAX_FILE_LINES - 1),
      start,
      Math.min(lines.length, start + HARD_MAX_FILE_LINES - 1),
      "line_range.end",
    );
  }

  let selected = lines.slice(start - 1, end).join("\n");
  let truncated = end < lines.length;
  if (selected.length > maximumResultCharacters) {
    selected = selected.slice(0, maximumResultCharacters);
    truncated = true;
  }

  return {
    data: {
      project_id: project.projectId,
      path: resolved.relativePath,
      encoding: "utf-8",
      content: selected,
      line_range: {
        start,
        end,
        total_lines: lines.length,
      },
      size_bytes: stat.size,
      content_hash: `sha256:${createHash("sha256").update(content).digest("hex")}`,
      truncated,
      observed_at: new Date().toISOString(),
    },
    truncated,
  };
}

interface TreeEntry {
  readonly path: string;
  readonly type: "file" | "directory" | "symlink";
  readonly size_bytes: number;
}

function encodeCursor(pathValue: string, offset: number): string {
  return Buffer.from(JSON.stringify({ path: pathValue, offset }), "utf8").toString(
    "base64url",
  );
}

function decodeCursor(
  cursor: unknown,
  expectedPath: string,
): number {
  if (cursor === undefined || cursor === null) {
    return 0;
  }
  if (typeof cursor !== "string" || cursor.length > 512) {
    throw new LocalControlError(
      "CURSOR_INVALID",
      "VALIDATION",
      "Tree cursor is invalid.",
    );
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { readonly path?: unknown; readonly offset?: unknown };
    if (
      parsed.path !== expectedPath ||
      !Number.isInteger(parsed.offset) ||
      (parsed.offset as number) < 0
    ) {
      throw new Error("invalid cursor");
    }
    return parsed.offset as number;
  } catch (error) {
    throw new LocalControlError(
      "CURSOR_INVALID",
      "VALIDATION",
      "Tree cursor is invalid.",
      { cause: error },
    );
  }
}

export async function readProjectTree(
  project: ProjectRegistration,
  parameters: JsonObject,
): Promise<TreeReadResult> {
  const requestedPath =
    typeof parameters.path === "string" ? parameters.path : ".";
  const resolved = await resolveProjectPath(project, requestedPath);
  const stat = await fs.stat(resolved.absolutePath);
  if (!stat.isDirectory()) {
    throw new LocalControlError(
      "INVALID_REQUEST",
      "VALIDATION",
      "Requested tree root is not a directory.",
      { details: { path: resolved.relativePath } },
    );
  }

  const maxDepth = clampInteger(
    parameters.max_depth,
    2,
    0,
    HARD_MAX_TREE_DEPTH,
    "parameters.max_depth",
  );
  const pageSize = clampInteger(
    parameters.page_size,
    200,
    1,
    HARD_MAX_TREE_PAGE_SIZE,
    "parameters.page_size",
  );
  const offset = decodeCursor(parameters.cursor, resolved.relativePath);
  const entries: TreeEntry[] = [];
  let excludedCount = 0;

  const walk = async (
    absoluteDirectory: string,
    relativeDirectory: string,
    depth: number,
  ): Promise<void> => {
    if (entries.length >= HARD_MAX_TREE_ENTRIES) {
      return;
    }
    const directoryEntries = await fs.readdir(absoluteDirectory, {
      withFileTypes: true,
    });
    directoryEntries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of directoryEntries) {
      if (entries.length >= HARD_MAX_TREE_ENTRIES) {
        return;
      }
      const relative = path.posix.join(relativeDirectory, entry.name);
      if (shouldExcludeTreeEntry(relative)) {
        excludedCount += 1;
        continue;
      }
      const absolute = path.join(absoluteDirectory, entry.name);
      const entryStat = await fs.lstat(absolute);
      if (entry.isSymbolicLink()) {
        let target: string;
        try {
          target = await fs.realpath(absolute);
        } catch {
          excludedCount += 1;
          continue;
        }
        if (
          target !== resolved.rootRealPath &&
          !target.startsWith(`${resolved.rootRealPath}${path.sep}`)
        ) {
          excludedCount += 1;
          continue;
        }
        entries.push({ path: relative, type: "symlink", size_bytes: entryStat.size });
        continue;
      }
      if (entry.isDirectory()) {
        entries.push({ path: relative, type: "directory", size_bytes: 0 });
        if (depth < maxDepth) {
          await walk(absolute, relative, depth + 1);
        }
        continue;
      }
      if (entry.isFile()) {
        entries.push({ path: relative, type: "file", size_bytes: entryStat.size });
      }
    }
  };

  const baseRelative = resolved.relativePath === "." ? "" : resolved.relativePath;
  await walk(resolved.absolutePath, baseRelative, 0);
  const page = entries.slice(offset, offset + pageSize);
  const nextOffset = offset + page.length;
  const hasNext = nextOffset < entries.length || entries.length >= HARD_MAX_TREE_ENTRIES;
  const warnings = [
    ...(excludedCount === 0
      ? []
      : [`${excludedCount} sensitive or out-of-scope tree entries were omitted.`]),
    ...(entries.length >= HARD_MAX_TREE_ENTRIES
      ? ["Tree enumeration reached the hard entry limit."]
      : []),
  ];

  return {
    data: {
      project_id: project.projectId,
      path: resolved.relativePath,
      entries: page.map((entry) => ({ ...entry })),
      next_cursor: hasNext
        ? encodeCursor(resolved.relativePath, nextOffset)
        : null,
      truncated: hasNext,
      observed_at: new Date().toISOString(),
    },
    truncated: hasNext,
    warnings,
  };
}

import type { JsonObject } from "../contracts.js";
import { LocalControlError } from "../errors.js";
import type { ProcessRunner } from "../process.js";
import type { ProjectRegistration } from "../registry.js";

export interface GitAdapterOptions {
  readonly project: ProjectRegistration;
  readonly processRunner: ProcessRunner;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}

async function runGit(
  args: readonly string[],
  options: GitAdapterOptions,
  allowFailure = false,
): Promise<string> {
  const result = await options.processRunner.run("git", args, {
    cwd: options.project.root,
    timeoutMs: options.timeoutMs,
    maxOutputBytes: options.maxOutputBytes,
  });
  if (result.exitCode !== 0 && !allowFailure) {
    throw new LocalControlError(
      "PROCESS_FAILED",
      "EXECUTION_FAILED",
      "A registered Git read operation failed.",
      { details: { exit_code: result.exitCode } },
    );
  }
  return result.stdout.trimEnd();
}

function parseStatus(output: string): {
  readonly staged: number;
  readonly modified: number;
  readonly untracked: number;
} {
  let staged = 0;
  let modified = 0;
  let untracked = 0;
  for (const line of output.split("\n")) {
    if (line.length < 2) {
      continue;
    }
    if (line.startsWith("??")) {
      untracked += 1;
      continue;
    }
    const indexState = line[0];
    const worktreeState = line[1];
    if (indexState !== undefined && indexState !== " ") {
      staged += 1;
    }
    if (worktreeState !== undefined && worktreeState !== " ") {
      modified += 1;
    }
  }
  return { staged, modified, untracked };
}

function parseRecentCommits(output: string): JsonObject[] {
  return output
    .split("\u001e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const fields = record.split("\u001f");
      return {
        sha: fields[0] ?? "",
        short_sha: fields[1] ?? "",
        author: fields[2] ?? "",
        authored_at: fields[3] ?? "",
        subject: fields[4] ?? "",
      };
    });
}

export async function readRepositorySnapshot(
  options: GitAdapterOptions,
  recentCommitLimit: number,
): Promise<JsonObject> {
  const [branchRaw, headSha, statusRaw] = await Promise.all([
    runGit(["branch", "--show-current"], options),
    runGit(["rev-parse", "HEAD"], options),
    runGit(["status", "--porcelain=v1", "--untracked-files=normal"], options),
  ]);
  const upstream = await runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    options,
    true,
  );
  let ahead = 0;
  let behind = 0;
  if (upstream.length > 0) {
    const counts = await runGit(
      ["rev-list", "--left-right", "--count", "HEAD...@{u}"],
      options,
      true,
    );
    const [aheadRaw, behindRaw] = counts.trim().split(/\s+/);
    ahead = Number.parseInt(aheadRaw ?? "0", 10) || 0;
    behind = Number.parseInt(behindRaw ?? "0", 10) || 0;
  }
  const recent = await runGit(
    [
      "log",
      `-${recentCommitLimit}`,
      "--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1e",
    ],
    options,
  );
  const changes = parseStatus(statusRaw);
  return {
    project_id: options.project.projectId,
    branch: branchRaw.length === 0 ? null : branchRaw,
    head_sha: headSha,
    upstream: upstream.length === 0 ? null : upstream,
    ahead,
    behind,
    worktree_state:
      changes.staged + changes.modified + changes.untracked === 0
        ? "CLEAN"
        : "DIRTY",
    changes,
    recent_commits: parseRecentCommits(recent),
    observed_at: new Date().toISOString(),
  };
}

export async function readFileGitState(
  options: GitAdapterOptions,
  relativePath: string,
): Promise<string> {
  const status = await runGit(
    ["status", "--porcelain=v1", "--", relativePath],
    options,
    true,
  );
  if (status.startsWith("??")) {
    return "untracked";
  }
  if (status.length >= 2) {
    const staged = status[0] !== " ";
    const modified = status[1] !== " ";
    if (staged && modified) {
      return "staged_and_modified";
    }
    if (staged) {
      return "staged";
    }
    if (modified) {
      return "modified";
    }
  }
  const tracked = await runGit(
    ["ls-files", "--error-unmatch", "--", relativePath],
    options,
    true,
  );
  return tracked.length > 0 ? "committed" : "untracked";
}

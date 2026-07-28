import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedWorkspaces = ["apps/*", "packages/*", "capabilities/*"];
const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
  "package-lock.json",
  ".nvmrc",
  "knowledge.config.yaml",
];
const requiredDirectories = [
  "context",
  "docs",
  "skills",
  "skills/ai-knowledge",
];
const protectedSecretFiles = [".env", ".env.local", ".env.production"];
const failures = [];

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor !== 20) {
  failures.push(
    `Node.js 20 is required; current version is ${process.version}.`,
  );
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(repoRoot, file))) {
    failures.push(`Required file is missing: ${file}`);
  }
}

for (const directory of requiredDirectories) {
  if (!existsSync(resolve(repoRoot, directory))) {
    failures.push(`Required directory is missing: ${directory}`);
  }
}

try {
  const packageJson = JSON.parse(
    readFileSync(resolve(repoRoot, "package.json"), "utf8"),
  );

  if (packageJson.private !== true) {
    failures.push('Root package.json must set "private" to true.');
  }

  if (
    JSON.stringify(packageJson.workspaces) !==
    JSON.stringify(expectedWorkspaces)
  ) {
    failures.push(
      `Workspace patterns must be exactly: ${expectedWorkspaces.join(", ")}`,
    );
  }
} catch (error) {
  failures.push(`Unable to read root package.json: ${error.message}`);
}

try {
  const trackedSecrets = execFileSync(
    "git",
    ["ls-files", "--", ...protectedSecretFiles],
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  if (trackedSecrets.length > 0) {
    failures.push(
      `Sensitive environment files are tracked by Git: ${trackedSecrets.join(", ")}`,
    );
  }
} catch (error) {
  failures.push(`Unable to inspect Git-tracked files: ${error.message}`);
}

if (failures.length > 0) {
  console.error("Repository baseline check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Repository baseline check passed.");
  console.log(`Node: ${process.version}`);
  console.log(`Workspace patterns: ${expectedWorkspaces.length}`);
  console.log("Required files: OK");
  console.log("Tracked secret files: none");
}

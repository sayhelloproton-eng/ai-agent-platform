import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  assertSupportedArchitecture,
  CLI_DOWNLOAD_URL,
  ensureRuntimeDirectories,
  LOCAL_CLI,
  parseCliVersion,
  runCommand,
} from "./lib.mjs";

const temporary = mkdtempSync(resolve(tmpdir(), "ai-agent-platform-devtunnel-"));
try {
  assertSupportedArchitecture();
  ensureRuntimeDirectories();
  const archive = resolve(temporary, "devtunnel.zip");
  runCommand("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    "--output",
    archive,
    CLI_DOWNLOAD_URL,
  ], { errorCode: "CLI_DOWNLOAD_FAILED" });
  runCommand("ditto", ["-x", "-k", archive, temporary], {
    errorCode: "CLI_EXTRACT_FAILED",
  });
  const discovered = runCommand("find", [
    temporary,
    "-type",
    "f",
    "-name",
    "devtunnel",
    "-print",
    "-quit",
  ], { errorCode: "CLI_ARCHIVE_INVALID" }).stdout.trim();
  if (discovered === "") throw new Error("CLI_ARCHIVE_INVALID");
  runCommand("install", ["-m", "0755", discovered, LOCAL_CLI], {
    errorCode: "CLI_INSTALL_FAILED",
  });
  const architecture = runCommand("file", [LOCAL_CLI], {
    errorCode: "CLI_ARCHITECTURE_CHECK_FAILED",
  }).stdout;
  if (!architecture.includes("x86_64")) {
    throw new Error("CLI_ARCHITECTURE_MISMATCH");
  }
  const version = parseCliVersion(
    runCommand(LOCAL_CLI, ["--version"], {
      errorCode: "CLI_VERSION_FAILED",
    }).stdout,
  );
  console.log("CLI install: PASS");
  console.log("CLI source: Microsoft official macOS x64 archive");
  console.log(`CLI version: ${version}`);
  console.log("CLI architecture: x86_64");
} catch (error) {
  console.error(`CLI install: FAIL (${error.code ?? error.message ?? "UNKNOWN"})`);
  process.exitCode = 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

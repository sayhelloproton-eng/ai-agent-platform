import test from "node:test";
import assert from "node:assert/strict";
import { getCliManifest } from "../src/cli/manifest.js";

test("CLI publishes an AI-readable command manifest", () => {
  const manifest = getCliManifest();
  assert.equal(manifest.contract, "execution.cli.v0");
  assert.equal(manifest.source_entry, "index.ts");
  assert.equal(manifest.source_language, "TypeScript");

  const names = new Set(manifest.commands.map((item) => item.command));
  for (const required of [
    "install",
    "start",
    "stop",
    "status",
    "doctor",
    "config",
    "run",
    "validate",
    "docs",
    "spec",
    "describe",
  ]) {
    assert.equal(names.has(required), true, required);
  }
});

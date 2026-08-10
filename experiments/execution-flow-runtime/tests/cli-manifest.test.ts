import test from "node:test";
import assert from "node:assert/strict";
import { getCliManifest } from "../src/cli/manifest.js";

test("CLI publishes an AI-readable command manifest", () => {
  const manifest = getCliManifest();
  assert.equal(manifest.contract, "execution.cli.v0");
  assert.equal(manifest.source_entry, "index.ts");
  assert.equal(manifest.source_language, "TypeScript");
  assert.equal(
    manifest.deployment_requirements_contract,
    "aap.deployment.requirements.v0"
  );
  assert.equal(
    manifest.deployment_requirements_command,
    "aap-execution-flow deployment requirements --json"
  );

  const names = new Set(manifest.commands.map((item) => item.command));
  for (const required of [
    "deployment",
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
  assert.equal(names.has("install"), false, "module must not own deployment install/apply");

  const deployment = manifest.commands.find((item) => item.command === "deployment");
  assert.equal(deployment?.side_effect, "none");

  assert.equal(
    manifest.invariants.some((item) =>
      item.includes("FAST-to-REASON escalation is explicit Flow topology")
    ),
    true
  );
  assert.equal(
    manifest.invariants.some((item) => item.includes("does not deploy itself")),
    true
  );
});

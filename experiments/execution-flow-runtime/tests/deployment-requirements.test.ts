import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { getDeploymentRequirements } from "../src/deployment/requirements.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PATH = path.join(PACKAGE_ROOT, "cli.ts");

function runCli(runtimeHome: string, args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", CLI_PATH, ...args], {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, EXECUTION_FLOW_RUNTIME_HOME: runtimeHome },
    encoding: "utf8",
    timeout: 20_000,
  });
}

test("deployment requirements is a schema-valid module descriptor, not a deployment plan", async () => {
  const descriptor = getDeploymentRequirements();
  const schema = JSON.parse(
    await fs.readFile(
      path.join(PACKAGE_ROOT, "spec", "deployment-requirements.v0.schema.json"),
      "utf8"
    )
  );
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  assert.equal(validate(descriptor), true, JSON.stringify(validate.errors));

  assert.equal(descriptor.contract, "aap.deployment.requirements.v0");
  assert.equal(descriptor.module.id, "execution-flow-runtime");
  assert.equal(descriptor.module.version, "0.0.0-lab.13.3.1");
  assert.equal(descriptor.dependencies[0]?.logical_ref, "inference.backend");
  assert.equal(descriptor.dependencies[0]?.constraints?.max_concurrency, 1);
  assert.equal(descriptor.lifecycle.singleton_scope, "runtime_home");
  assert.equal(descriptor.effects.repository_source_modification, false);

  const text = JSON.stringify(descriptor);
  assert.equal(text.includes("192.168.0.104"), false);
  assert.equal(text.includes("--confirm DEPLOY"), false);
  assert.equal(text.includes("install apply"), false);
});

test("deployment requirements CLI has zero runtime-home side effects", async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-req-"));
  const runtimeHome = path.join(parent, "must-not-be-created");
  const result = runCli(runtimeHome, ["deployment", "requirements", "--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout) as any;
  assert.equal(body.contract, "aap.deployment.requirements.v0");
  await assert.rejects(() => fs.stat(runtimeHome), { code: "ENOENT" });
});

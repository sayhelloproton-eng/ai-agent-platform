import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createFileReadCapability } from "../src/capabilities/file-read.js";
import { createFixedCommandCapability } from "../src/capabilities/fixed-command.js";
import { CapabilityRegistry } from "../src/capabilities/registry.js";

function context(capability: string) {
  return {
    execution_id: "e",
    flow_id: "f",
    node_id: "n",
    authorization: { allowed_capabilities: [capability] },
  };
}

test("file read blocks traversal, absolute paths and protected paths", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-"));
  await fs.writeFile(path.join(root, "ok.txt"), "ok");
  await fs.writeFile(path.join(root, ".env"), "secret");

  const capability = await createFileReadCapability({ root });
  const registry = new CapabilityRegistry().register(
    capability.descriptor,
    capability.handler
  );

  await assert.rejects(
    () => registry.invoke("lab.file.read", { path: "../secret" }, context("lab.file.read")),
    /relative/
  );
  await assert.rejects(
    () => registry.invoke("lab.file.read", { path: "/etc/hosts" }, context("lab.file.read")),
    /relative/
  );
  await assert.rejects(
    () => registry.invoke("lab.file.read", { path: ".env" }, context("lab.file.read")),
    /Protected/
  );
});

test("file read blocks symlink escape and symlink aliases to protected paths", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-root-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-outside-"));
  await fs.writeFile(path.join(outside, "secret.txt"), "outside-secret");
  await fs.writeFile(path.join(root, ".env"), "inside-secret");
  await fs.symlink(path.join(outside, "secret.txt"), path.join(root, "escape-link"));
  await fs.symlink(path.join(root, ".env"), path.join(root, "protected-link"));

  const capability = await createFileReadCapability({ root });
  const registry = new CapabilityRegistry().register(
    capability.descriptor,
    capability.handler
  );

  await assert.rejects(
    () => registry.invoke("lab.file.read", { path: "escape-link" }, context("lab.file.read")),
    /escaped configured root/
  );
  await assert.rejects(
    () => registry.invoke("lab.file.read", { path: "protected-link" }, context("lab.file.read")),
    /Protected real target/
  );
});

test("fixed command accepts opaque registered reference only", async () => {
  const capability = createFixedCommandCapability({
    commands: {
      "node.version": {
        executable: process.execPath,
        args: ["--version"],
      },
    },
  });

  const registry = new CapabilityRegistry().register(
    capability.descriptor,
    capability.handler
  );

  const output = (await registry.invoke(
    "process.command.run-fixed",
    { command_ref: "node.version" },
    context("process.command.run-fixed")
  )) as { exit_code: number | null; stdout: string };

  assert.equal(output.exit_code, 0);
  assert.match(output.stdout, /^v\d+/);

  await assert.rejects(
    () =>
      registry.invoke(
        "process.command.run-fixed",
        { command_ref: "shell.anything" },
        context("process.command.run-fixed")
      ),
    /Unknown fixed command_ref/
  );

  await assert.rejects(
    () =>
      registry.invoke(
        "process.command.run-fixed",
        { command_ref: "node.version", command: "rm -rf /", shell: true },
        context("process.command.run-fixed")
      ),
    /schema validation/
  );
});

test("command output overflow kills the child before returning", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-command-"));
  const pidFile = path.join(root, "child.pid");
  const script = [
    "const fs=require('node:fs');",
    `fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));`,
    "process.stdout.write('x'.repeat(8192));",
    "setTimeout(() => {}, 10000);",
  ].join("");

  const capability = createFixedCommandCapability({
    commands: {
      overflow: {
        executable: process.execPath,
        args: ["-e", script],
      },
    },
    maxOutputBytes: 64,
    timeoutMs: 9000,
  });

  const registry = new CapabilityRegistry().register(
    capability.descriptor,
    capability.handler
  );

  const started = Date.now();
  await assert.rejects(
    () =>
      registry.invoke(
        "process.command.run-fixed",
        { command_ref: "overflow" },
        context("process.command.run-fixed")
      ),
    /stdout exceeded/
  );
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 3000, `overflow termination took ${elapsed}ms`);

  const pid = Number(await fs.readFile(pidFile, "utf8"));
  assert.throws(() => process.kill(pid, 0));
});

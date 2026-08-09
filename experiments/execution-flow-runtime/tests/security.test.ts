import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createFileReadCapability } from "../src/capabilities/file-read.js";
import { createFixedCommandCapability } from "../src/capabilities/fixed-command.js";
import { CapabilityRegistry } from "../src/capabilities/registry.js";

test("file read blocks traversal", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "exec-flow-"));
  await fs.writeFile(path.join(root, "ok.txt"), "ok");

  const capability = await createFileReadCapability({ root });
  const registry = new CapabilityRegistry().register(
    capability.descriptor,
    capability.handler
  );

  await assert.rejects(
    () =>
      registry.invoke(
        "lab.file.read",
        { path: "../secret" },
        {
          execution_id: "e",
          flow_id: "f",
          node_id: "n",
          authorization: { allowed_capabilities: ["lab.file.read"] },
        }
      ),
    /relative/
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
    {
      execution_id: "e",
      flow_id: "f",
      node_id: "n",
      authorization: {
        allowed_capabilities: ["process.command.run-fixed"],
      },
    }
  )) as { exit_code: number | null; stdout: string };

  assert.equal(output.exit_code, 0);
  assert.match(output.stdout, /^v\d+/);

  await assert.rejects(
    () =>
      registry.invoke(
        "process.command.run-fixed",
        { command_ref: "shell.anything" },
        {
          execution_id: "e",
          flow_id: "f",
          node_id: "n",
          authorization: {
            allowed_capabilities: ["process.command.run-fixed"],
          },
        }
      ),
    /Unknown fixed command_ref/
  );
});

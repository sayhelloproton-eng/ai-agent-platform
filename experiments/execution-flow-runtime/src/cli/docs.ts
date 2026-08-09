import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const DOCS: Record<string, string> = {
  protocol: "docs/protocol.md",
  security: "docs/security-boundary.md",
  integration: "docs/integration.md",
  cli: "docs/cli.md",
  ai: "docs/ai-interface.md",
};

const SPECS: Record<string, string> = {
  "execution-run": "spec/execution-run.v0.schema.json",
  "execution-flow": "spec/execution-flow.v0.schema.json",
  "execution-result": "spec/execution-result.v0.schema.json",
  capability: "spec/capability.v0.schema.json",
  "inference-node": "spec/inference-node.v0.schema.json",
};

export function listDocTopics(): string[] {
  return Object.keys(DOCS);
}

export function listSpecs(): string[] {
  return Object.keys(SPECS);
}

export async function readDocTopic(topic: string): Promise<string> {
  const relative = DOCS[topic];
  if (!relative) throw new Error(`Unknown docs topic: ${topic}`);
  return await fs.readFile(path.join(PACKAGE_ROOT, relative), "utf8");
}

export async function readSpec(name: string): Promise<unknown> {
  const relative = SPECS[name];
  if (!relative) throw new Error(`Unknown spec: ${name}`);
  return JSON.parse(await fs.readFile(path.join(PACKAGE_ROOT, relative), "utf8"));
}

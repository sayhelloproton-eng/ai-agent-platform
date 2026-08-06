import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url).pathname;
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, packageJson.version, "manifest.json and package.json versions must match");
assert.equal(manifest.background.type, "module");
assert(!manifest.host_permissions.includes("<all_urls>"));
for (const forbidden of ["cookies", "debugger", "nativeMessaging", "downloads", "webRequestBlocking"]) {
  assert(!manifest.permissions.includes(forbidden), `Forbidden Chrome permission: ${forbidden}`);
}
assert.deepEqual(manifest.content_scripts[0].matches, ["https://chatgpt.com/*"]);

const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(join(root, "src"));
for (const file of files.filter((path) => path.endsWith(".js"))) {
  const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(checked.status, 0, `${relative(root, file)} failed syntax check:\n${checked.stderr}`);
  const text = await readFile(file, "utf8");
  for (const pattern of [/\beval\s*\(/, /new\s+Function\s*\(/, /chrome\.cookies/, /chrome\.debugger/, /nativeMessaging/]) {
    assert(!pattern.test(text), `${relative(root, file)} contains forbidden pattern ${pattern}`);
  }
}
for (const path of [manifest.background.service_worker, manifest.side_panel.default_path, manifest.options_page, ...manifest.content_scripts.flatMap((item) => item.js)]) {
  await readFile(join(root, path));
}
console.log(`BHR static verification passed: ${files.length} source files.`);

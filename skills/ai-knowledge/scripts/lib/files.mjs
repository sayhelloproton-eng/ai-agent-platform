import fs from 'node:fs';
import path from 'node:path';

export function assertRelative(p) {
  if (!p) return;
  if (path.isAbsolute(p) || p.split(path.sep).includes('..')) throw new Error(`Only safe relative paths are allowed: ${p}`);
}
export function writeJson(p, value) { assertRelative(p); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n'); }
export function writeText(p, value) { assertRelative(p); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, value); }
export function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
export function listMarkdown(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdown(full));
    else if (/\.md$/i.test(entry.name)) out.push(full);
  }
  return out;
}

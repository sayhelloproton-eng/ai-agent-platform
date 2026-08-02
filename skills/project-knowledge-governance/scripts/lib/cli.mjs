import { spawnSync } from 'node:child_process';

export function run(command, args, { allowFailure = false } = {}) {
  const env = { ...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1' };
  const result = spawnSync(command, args, { encoding: 'utf8', env, shell: false, maxBuffer: 50 * 1024 * 1024 });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    const error = new Error(`${command} exited with ${result.status}: ${stderr || stdout}`);
    error.exitCode = result.status;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }
  return { status: result.status ?? 0, stdout, stderr };
}

export function parseJsonLoose(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch {}
  const start = Math.min(...['{','['].map(c => trimmed.indexOf(c)).filter(i => i >= 0));
  if (!Number.isFinite(start)) throw new Error('No JSON found in CLI output');
  return JSON.parse(trimmed.slice(start));
}

export function deepFind(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  for (const value of Object.values(obj)) {
    const found = deepFind(value, keys);
    if (found !== undefined) return found;
  }
}

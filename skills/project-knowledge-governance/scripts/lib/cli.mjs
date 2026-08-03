import { spawnSync } from 'node:child_process';

export function run(command, args, { allowFailure = false, timeoutMs = 90_000 } = {}) {
  const env = { ...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1' };
  const result = spawnSync(command, args, { encoding: 'utf8', env, shell: false, maxBuffer: 50 * 1024 * 1024, timeout: timeoutMs, killSignal: 'SIGTERM' });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const timedOut = result.error?.code === 'ETIMEDOUT';
  if (result.error && !timedOut) throw result.error;
  const status = timedOut ? 124 : (result.status ?? 0);
  if (status !== 0 && !allowFailure) {
    const detail = timedOut ? `timed out after ${timeoutMs} ms` : (stderr || stdout);
    const error = new Error(`${command} exited with ${status}: ${detail}`);
    error.exitCode = status;
    error.stdout = stdout;
    error.stderr = stderr;
    error.timedOut = timedOut;
    throw error;
  }
  return { status, stdout, stderr, timedOut };
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

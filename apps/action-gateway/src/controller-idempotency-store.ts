import { randomUUID } from "node:crypto";
import { open, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname } from "node:path";

export interface ControllerIdempotencySnapshot<T = unknown> {
  readonly fingerprint: string;
  readonly result: T;
  readonly createdAt: string;
}

export interface ControllerIdempotencySnapshotStore {
  get<T>(scope: string): Promise<ControllerIdempotencySnapshot<T> | null>;
  putIfAbsent<T>(
    scope: string,
    snapshot: ControllerIdempotencySnapshot<T>,
  ): Promise<ControllerIdempotencySnapshot<T> | null>;
}

export interface ControllerIdempotencyLockOptions {
  readonly ttlMs?: number;
  readonly retryCount?: number;
  readonly retryDelayMs?: number;
  readonly now?: () => Date;
  readonly processId?: number;
  readonly hostId?: string;
  readonly ownerId?: string;
  readonly isProcessAlive?: (pid: number) => boolean;
}

interface JsonStoreState {
  readonly formatVersion: 1;
  readonly records: Record<string, ControllerIdempotencySnapshot>;
}

interface LockMetadata {
  readonly formatVersion: 1;
  readonly ownerId: string;
  readonly pid: number;
  readonly hostId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

interface LockFileObservation {
  readonly metadata: LockMetadata | null;
  readonly modifiedAtMs: number;
}

const EMPTY_STATE: JsonStoreState = { formatVersion: 1, records: {} };
const DEFAULT_LOCK_TTL_MS = 30_000;
const DEFAULT_LOCK_RETRY_COUNT = 80;
const DEFAULT_LOCK_RETRY_DELAY_MS = 25;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertState(value: unknown): JsonStoreState {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { formatVersion?: unknown }).formatVersion !== 1 ||
    typeof (value as { records?: unknown }).records !== "object" ||
    (value as { records?: unknown }).records === null ||
    Array.isArray((value as { records?: unknown }).records)
  ) {
    throw new Error("Controller idempotency state is invalid.");
  }
  return value as JsonStoreState;
}

function parseLockMetadata(value: unknown): LockMetadata | null {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { formatVersion?: unknown }).formatVersion !== 1 ||
    typeof (value as { ownerId?: unknown }).ownerId !== "string" ||
    typeof (value as { pid?: unknown }).pid !== "number" ||
    typeof (value as { hostId?: unknown }).hostId !== "string" ||
    typeof (value as { createdAt?: unknown }).createdAt !== "string" ||
    typeof (value as { expiresAt?: unknown }).expiresAt !== "string"
  ) {
    return null;
  }
  const metadata = value as LockMetadata;
  if (
    !Number.isSafeInteger(metadata.pid) ||
    metadata.pid <= 0 ||
    !Number.isFinite(Date.parse(metadata.createdAt)) ||
    !Number.isFinite(Date.parse(metadata.expiresAt))
  ) {
    return null;
  }
  return metadata;
}

function defaultIsProcessAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM") return true;
    if (code === "ESRCH") return false;
    return true;
  }
}

export class InMemoryControllerIdempotencySnapshotStore
  implements ControllerIdempotencySnapshotStore
{
  readonly #records = new Map<string, ControllerIdempotencySnapshot>();

  async get<T>(scope: string): Promise<ControllerIdempotencySnapshot<T> | null> {
    const value = this.#records.get(scope);
    return value === undefined
      ? null
      : (clone(value) as ControllerIdempotencySnapshot<T>);
  }

  async putIfAbsent<T>(
    scope: string,
    snapshot: ControllerIdempotencySnapshot<T>,
  ): Promise<ControllerIdempotencySnapshot<T> | null> {
    const existing = this.#records.get(scope);
    if (existing !== undefined) {
      return clone(existing) as ControllerIdempotencySnapshot<T>;
    }
    this.#records.set(scope, clone(snapshot));
    return null;
  }
}

export class JsonFileControllerIdempotencySnapshotStore
  implements ControllerIdempotencySnapshotStore
{
  readonly #ttlMs: number;
  readonly #retryCount: number;
  readonly #retryDelayMs: number;
  readonly #now: () => Date;
  readonly #processId: number;
  readonly #hostId: string;
  readonly #ownerId: string;
  readonly #isProcessAlive: (pid: number) => boolean;

  private constructor(
    readonly path: string,
    options: ControllerIdempotencyLockOptions,
  ) {
    this.#ttlMs = options.ttlMs ?? DEFAULT_LOCK_TTL_MS;
    this.#retryCount = options.retryCount ?? DEFAULT_LOCK_RETRY_COUNT;
    this.#retryDelayMs = options.retryDelayMs ?? DEFAULT_LOCK_RETRY_DELAY_MS;
    this.#now = options.now ?? (() => new Date());
    this.#processId = options.processId ?? process.pid;
    this.#hostId = options.hostId ?? hostname();
    this.#ownerId = options.ownerId ?? randomUUID();
    this.#isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;

    if (!Number.isFinite(this.#ttlMs) || this.#ttlMs <= 0) {
      throw new Error("Controller idempotency lock TTL must be positive.");
    }
    if (!Number.isInteger(this.#retryCount) || this.#retryCount <= 0) {
      throw new Error("Controller idempotency lock retry count must be positive.");
    }
    if (!Number.isFinite(this.#retryDelayMs) || this.#retryDelayMs < 0) {
      throw new Error("Controller idempotency lock retry delay must not be negative.");
    }
  }

  static async open(
    path: string,
    options: ControllerIdempotencyLockOptions = {},
  ): Promise<JsonFileControllerIdempotencySnapshotStore> {
    const store = new JsonFileControllerIdempotencySnapshotStore(path, options);
    await mkdir(dirname(path), { recursive: true });
    try {
      await readFile(path, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await store.writeState(EMPTY_STATE);
    }
    await store.readState();
    return store;
  }

  async get<T>(scope: string): Promise<ControllerIdempotencySnapshot<T> | null> {
    const state = await this.readState();
    const value = state.records[scope];
    return value === undefined
      ? null
      : (clone(value) as ControllerIdempotencySnapshot<T>);
  }

  async putIfAbsent<T>(
    scope: string,
    snapshot: ControllerIdempotencySnapshot<T>,
  ): Promise<ControllerIdempotencySnapshot<T> | null> {
    return this.withLock(async () => {
      const state = await this.readState();
      const existing = state.records[scope];
      if (existing !== undefined) {
        return clone(existing) as ControllerIdempotencySnapshot<T>;
      }
      const next: JsonStoreState = {
        formatVersion: 1,
        records: {
          ...state.records,
          [scope]: clone(snapshot),
        },
      };
      await this.writeState(next);
      return null;
    });
  }

  private async readState(): Promise<JsonStoreState> {
    const text = await readFile(this.path, "utf8");
    return assertState(JSON.parse(text) as unknown);
  }

  private async writeState(state: JsonStoreState): Promise<void> {
    const temporary = `${this.path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, this.path);
  }

  private lockMetadata(): LockMetadata {
    const createdAt = this.#now();
    return {
      formatVersion: 1,
      ownerId: this.#ownerId,
      pid: this.#processId,
      hostId: this.#hostId,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + this.#ttlMs).toISOString(),
    };
  }

  private async observeLock(lockPath: string): Promise<LockFileObservation | null> {
    try {
      const [text, information] = await Promise.all([
        readFile(lockPath, "utf8"),
        stat(lockPath),
      ]);
      let metadata: LockMetadata | null = null;
      try {
        metadata = parseLockMetadata(JSON.parse(text) as unknown);
      } catch {
        metadata = null;
      }
      return { metadata, modifiedAtMs: information.mtimeMs };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  private isStale(observation: LockFileObservation): boolean {
    const nowMs = this.#now().getTime();
    if (observation.metadata === null) {
      return nowMs - observation.modifiedAtMs >= this.#ttlMs;
    }
    const metadata = observation.metadata;
    if (metadata.hostId === this.#hostId && this.#isProcessAlive(metadata.pid)) {
      return false;
    }
    if (metadata.hostId === this.#hostId && !this.#isProcessAlive(metadata.pid)) {
      return true;
    }
    return Date.parse(metadata.expiresAt) <= nowMs;
  }

  private async removeIfUnchanged(
    lockPath: string,
    observation: LockFileObservation,
  ): Promise<boolean> {
    const latest = await this.observeLock(lockPath);
    if (latest === null) return true;
    if (observation.metadata !== null && latest.metadata !== null) {
      if (latest.metadata.ownerId !== observation.metadata.ownerId) return false;
    } else if (latest.modifiedAtMs !== observation.modifiedAtMs) {
      return false;
    }
    await rm(lockPath, { force: true });
    return true;
  }

  private async recoverStaleLock(lockPath: string): Promise<boolean> {
    const observation = await this.observeLock(lockPath);
    if (observation === null) return true;
    if (!this.isStale(observation)) return false;
    return this.removeIfUnchanged(lockPath, observation);
  }

  private async releaseOwnedLock(lockPath: string): Promise<void> {
    const observation = await this.observeLock(lockPath);
    if (observation?.metadata?.ownerId !== this.#ownerId) return;
    await rm(lockPath, { force: true });
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockPath = `${this.path}.lock`;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    for (let attempt = 0; attempt < this.#retryCount; attempt += 1) {
      try {
        handle = await open(lockPath, "wx", 0o600);
        try {
          await handle.writeFile(`${JSON.stringify(this.lockMetadata())}\n`, "utf8");
          await handle.sync();
        } catch (error: unknown) {
          await handle.close();
          handle = null;
          await rm(lockPath, { force: true });
          throw error;
        }
        break;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const recovered = await this.recoverStaleLock(lockPath);
        if (!recovered && this.#retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.#retryDelayMs));
        }
      }
    }
    if (handle === null) {
      throw new Error("Controller idempotency state lock timed out.");
    }
    try {
      return await operation();
    } finally {
      await handle.close();
      await this.releaseOwnedLock(lockPath);
    }
  }
}

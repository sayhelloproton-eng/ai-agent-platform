import { open, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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

interface JsonStoreState {
  readonly formatVersion: 1;
  readonly records: Record<string, ControllerIdempotencySnapshot>;
}

const EMPTY_STATE: JsonStoreState = { formatVersion: 1, records: {} };

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
  private constructor(readonly path: string) {}

  static async open(path: string): Promise<JsonFileControllerIdempotencySnapshotStore> {
    const store = new JsonFileControllerIdempotencySnapshotStore(path);
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

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockPath = `${this.path}.lock`;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        handle = await open(lockPath, "wx", 0o600);
        break;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    if (handle === null) {
      throw new Error("Controller idempotency state lock timed out.");
    }
    try {
      return await operation();
    } finally {
      await handle.close();
      await rm(lockPath, { force: true });
    }
  }
}

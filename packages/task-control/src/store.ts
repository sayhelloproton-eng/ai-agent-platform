import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  DISPATCH_STATUSES,
  TASK_EVENT_TYPES,
  TASK_STATUSES,
  WORK_ITEM_STATUSES,
  WORK_PROGRESS_STATUSES,
  HOST_RESULT_STATUSES,
  type TaskAggregate,
  type TaskControlState,
} from "./model.js";
import { TaskControlError } from "./error.js";
import { assertTaskConsistency } from "./policy.js";
import type { TaskControlStore } from "./ports.js";

export function emptyTaskControlState(): TaskControlState {
  return {
    tasks: {},
    events: {},
    workItems: {},
    dispatchSignals: {},
    idempotencyRecords: {},
  };
}

function cloneState(state: TaskControlState): TaskControlState {
  return structuredClone(state);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
}

function validateTaskRecord(key: string, value: unknown): TaskAggregate {
  if (!isRecord(value)) throw new TypeError(`tasks.${key} must be an object.`);
  requiredString(value.taskId, `tasks.${key}.taskId`);
  if (value.taskId !== key) throw new TypeError(`tasks.${key}.taskId must match its store key.`);
  if (!Number.isSafeInteger(value.taskVersion) || Number(value.taskVersion) < 1) {
    throw new TypeError(`tasks.${key}.taskVersion must be a positive safe integer.`);
  }
  if (!TASK_STATUSES.includes(value.status as (typeof TASK_STATUSES)[number])) {
    throw new TypeError(`tasks.${key}.status is unsupported.`);
  }
  if (value.resumeStatus === undefined) {
    value.resumeStatus = value.status === "PAUSED" ? "READY_FOR_CONTROLLER" : null;
  }
  if (
    value.resumeStatus !== null &&
    !TASK_STATUSES.includes(value.resumeStatus as (typeof TASK_STATUSES)[number])
  ) {
    throw new TypeError(`tasks.${key}.resumeStatus is unsupported.`);
  }
  requiredString(value.title, `tasks.${key}.title`);
  requiredString(value.objective, `tasks.${key}.objective`);
  requiredString(value.requiredRole, `tasks.${key}.requiredRole`);
  if (value.plan !== null) {
    if (!isRecord(value.plan) || !Array.isArray(value.plan.nodes)) {
      throw new TypeError(`tasks.${key}.plan must be null or a valid Plan object.`);
    }
  }
  const task = value as unknown as TaskAggregate;
  assertTaskConsistency(task);
  return task;
}

function validateStateShape(value: unknown): TaskControlState {
  if (!isRecord(value)) {
    throw new TypeError("Task Control state must be an object.");
  }
  for (const key of ["tasks", "events", "workItems", "dispatchSignals", "idempotencyRecords"] as const) {
    if (!isRecord(value[key])) throw new TypeError(`Task Control state.${key} must be an object.`);
  }

  const tasks = value.tasks as Record<string, unknown>;
  for (const [key, task] of Object.entries(tasks)) validateTaskRecord(key, task);

  const events = value.events as Record<string, unknown>;
  for (const [taskId, list] of Object.entries(events)) {
    if (!Array.isArray(list)) throw new TypeError(`events.${taskId} must be an array.`);
    if (tasks[taskId] === undefined) throw new TypeError(`events.${taskId} references an unknown Task.`);
    for (const [index, item] of list.entries()) {
      if (!isRecord(item)) throw new TypeError(`events.${taskId}.${index} must be an object.`);
      requiredString(item.eventId, `events.${taskId}.${index}.eventId`);
      if (item.taskId !== taskId) throw new TypeError(`events.${taskId}.${index}.taskId is inconsistent.`);
      if (!TASK_EVENT_TYPES.includes(item.eventType as (typeof TASK_EVENT_TYPES)[number])) {
        throw new TypeError(`events.${taskId}.${index}.eventType is unsupported.`);
      }
      if (!isRecord(item.stateAfter)) {
        throw new TypeError(`events.${taskId}.${index}.stateAfter is required.`);
      }
    }
  }

  const workItems = value.workItems as Record<string, unknown>;
  for (const [key, item] of Object.entries(workItems)) {
    if (!isRecord(item)) throw new TypeError(`workItems.${key} must be an object.`);
    if (item.workItemId !== key) throw new TypeError(`workItems.${key}.workItemId must match its store key.`);
    requiredString(item.taskId, `workItems.${key}.taskId`);
    if (tasks[item.taskId] === undefined) throw new TypeError(`workItems.${key} references an unknown Task.`);
    if (!WORK_ITEM_STATUSES.includes(item.status as (typeof WORK_ITEM_STATUSES)[number])) {
      throw new TypeError(`workItems.${key}.status is unsupported.`);
    }
    if (!Number.isSafeInteger(item.claimEpoch) || Number(item.claimEpoch) < 0) {
      throw new TypeError(`workItems.${key}.claimEpoch must be a non-negative safe integer.`);
    }
    if (item.resultSummary === undefined) item.resultSummary = null;
    if (item.evidenceRefs === undefined) item.evidenceRefs = [];
    if (!Array.isArray(item.evidenceRefs)) throw new TypeError(`workItems.${key}.evidenceRefs must be an array.`);
    if (item.retryable === undefined) item.retryable = null;
    if (item.startedAt === undefined) item.startedAt = null;
    if (item.progressStatus === undefined) item.progressStatus = "NONE";
    if (!WORK_PROGRESS_STATUSES.includes(item.progressStatus as (typeof WORK_PROGRESS_STATUSES)[number])) {
      throw new TypeError(`workItems.${key}.progressStatus is unsupported.`);
    }
    if (item.progressRef === undefined) item.progressRef = null;
    if (item.progressSummary === undefined) item.progressSummary = null;
    if (item.progressEvidenceRefs === undefined) item.progressEvidenceRefs = [];
    if (!Array.isArray(item.progressEvidenceRefs)) {
      throw new TypeError(`workItems.${key}.progressEvidenceRefs must be an array.`);
    }
  }

  const dispatchSignals = value.dispatchSignals as Record<string, unknown>;
  for (const [key, signal] of Object.entries(dispatchSignals)) {
    if (!isRecord(signal)) throw new TypeError(`dispatchSignals.${key} must be an object.`);
    if (signal.signalId !== key) throw new TypeError(`dispatchSignals.${key}.signalId must match its store key.`);
    requiredString(signal.taskId, `dispatchSignals.${key}.taskId`);
    if (tasks[signal.taskId] === undefined) throw new TypeError(`dispatchSignals.${key} references an unknown Task.`);
    if (!DISPATCH_STATUSES.includes(signal.status as (typeof DISPATCH_STATUSES)[number])) {
      throw new TypeError(`dispatchSignals.${key}.status is unsupported.`);
    }
    if (!Number.isSafeInteger(signal.claimEpoch) || Number(signal.claimEpoch) < 0) {
      throw new TypeError(`dispatchSignals.${key}.claimEpoch must be a non-negative safe integer.`);
    }
    if (signal.browserActionType === undefined) signal.browserActionType = null;
    if (signal.payloadRef === undefined) signal.payloadRef = null;
    if (signal.preconditions === undefined) signal.preconditions = {};
    if (signal.approvalRef === undefined) signal.approvalRef = null;
    if (signal.expiresAt === undefined) signal.expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    if (signal.deliveryReceipt === undefined) signal.deliveryReceipt = null;
    if (signal.deliveryId === undefined) signal.deliveryId = null;
    if (signal.reportToken === undefined) signal.reportToken = null;
    if (signal.reportTokenExpiresAt === undefined) signal.reportTokenExpiresAt = null;
    if (signal.reportTokenConsumedAt === undefined) signal.reportTokenConsumedAt = null;
    if (signal.hostResultStatus === undefined) signal.hostResultStatus = "PENDING";
    if (!HOST_RESULT_STATUSES.includes(signal.hostResultStatus as (typeof HOST_RESULT_STATUSES)[number])) {
      throw new TypeError(`dispatchSignals.${key}.hostResultStatus is unsupported.`);
    }
    if (signal.hostResultRef === undefined) signal.hostResultRef = null;
    if (signal.hostResultSummary === undefined) signal.hostResultSummary = null;
    if (signal.hostEvidenceRefs === undefined) signal.hostEvidenceRefs = [];
    if (!Array.isArray(signal.hostEvidenceRefs)) {
      throw new TypeError(`dispatchSignals.${key}.hostEvidenceRefs must be an array.`);
    }
    if (signal.reportedAt === undefined) signal.reportedAt = null;
  }

  const idempotencyRecords = value.idempotencyRecords as Record<string, unknown>;
  for (const [key, record] of Object.entries(idempotencyRecords)) {
    if (!isRecord(record)) throw new TypeError(`idempotencyRecords.${key} must be an object.`);
    requiredString(record.scope, `idempotencyRecords.${key}.scope`);
    requiredString(record.key, `idempotencyRecords.${key}.key`);
    if (record.requestFingerprint === undefined) {
      record.requestFingerprint = `legacy:${record.scope}:${record.key}`;
    }
    requiredString(
      record.requestFingerprint,
      `idempotencyRecords.${key}.requestFingerprint`,
    );
  }

  return value as unknown as TaskControlState;
}

export class InMemoryTaskControlStore implements TaskControlStore {
  protected state: TaskControlState;
  private queue: Promise<void> = Promise.resolve();

  constructor(initialState: TaskControlState = emptyTaskControlState()) {
    this.state = cloneState(initialState);
  }

  async read<T>(reader: (state: Readonly<TaskControlState>) => T): Promise<T> {
    await this.queue;
    return reader(cloneState(this.state));
  }

  async transact<T>(writer: (draft: TaskControlState) => T | Promise<T>): Promise<T> {
    let resolveResult!: (value: T | PromiseLike<T>) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    this.queue = this.queue.then(async () => {
      const draft = cloneState(this.state);
      try {
        const value = await writer(draft);
        await this.beforeCommit(draft);
        this.state = draft;
        resolveResult(value);
      } catch (error) {
        rejectResult(error);
      }
    });

    return result;
  }

  async snapshot(): Promise<TaskControlState> {
    await this.queue;
    return cloneState(this.state);
  }

  protected async beforeCommit(_draft: TaskControlState): Promise<void> {}
}

export interface JsonFileTaskControlStoreOptions {
  readonly staleLockMs?: number;
}

interface StoreWriterLock {
  readonly pid: number;
  readonly hostname: string;
  readonly token: string;
  readonly acquiredAt: string;
  readonly updatedAt: string;
}

function processIsAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function parseWriterLock(raw: string): StoreWriterLock | null {
  try {
    const value = JSON.parse(raw) as Partial<StoreWriterLock>;
    if (
      !Number.isSafeInteger(value.pid) ||
      typeof value.hostname !== "string" ||
      typeof value.token !== "string" ||
      typeof value.acquiredAt !== "string" ||
      typeof value.updatedAt !== "string"
    ) {
      return null;
    }
    return value as StoreWriterLock;
  } catch {
    return null;
  }
}

export class JsonFileTaskControlStore extends InMemoryTaskControlStore {
  private static readonly activeWriterPaths = new Set<string>();
  private static readonly DEFAULT_STALE_LOCK_MS = 30_000;

  readonly filePath: string;
  readonly lockPath: string;
  private readonly lockToken: string;
  private readonly staleLockMs: number;
  private closed = false;

  private constructor(
    filePath: string,
    initialState: TaskControlState,
    lockToken: string,
    staleLockMs: number,
  ) {
    super(initialState);
    this.filePath = filePath;
    this.lockPath = `${filePath}.writer.lock`;
    this.lockToken = lockToken;
    this.staleLockMs = staleLockMs;
  }

  static async open(
    filePath: string,
    options: JsonFileTaskControlStoreOptions = {},
  ): Promise<JsonFileTaskControlStore> {
    const resolvedPath = resolve(filePath);
    const staleLockMs = options.staleLockMs ?? JsonFileTaskControlStore.DEFAULT_STALE_LOCK_MS;
    if (!Number.isSafeInteger(staleLockMs) || staleLockMs < 0) {
      throw new TypeError("staleLockMs must be a non-negative safe integer.");
    }
    if (JsonFileTaskControlStore.activeWriterPaths.has(resolvedPath)) {
      throw new TaskControlError(
        "STORE_SINGLE_WRITER_REQUIRED",
        "JSON Task Control Store permits exactly one writer instance per file path.",
        { filePath: resolvedPath },
      );
    }

    await mkdir(dirname(resolvedPath), { recursive: true });
    const lockToken = randomUUID();
    await JsonFileTaskControlStore.acquireWriterLock(
      `${resolvedPath}.writer.lock`,
      lockToken,
      staleLockMs,
    );

    try {
      let state = emptyTaskControlState();
      try {
        const raw = await readFile(resolvedPath, "utf8");
        state = validateStateShape(JSON.parse(raw));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      JsonFileTaskControlStore.activeWriterPaths.add(resolvedPath);
      return new JsonFileTaskControlStore(resolvedPath, state, lockToken, staleLockMs);
    } catch (error) {
      await JsonFileTaskControlStore.releaseWriterLock(`${resolvedPath}.writer.lock`, lockToken);
      throw error;
    }
  }

  private static async acquireWriterLock(
    lockPath: string,
    token: string,
    staleLockMs: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const now = new Date().toISOString();
      const lock: StoreWriterLock = {
        pid: process.pid,
        hostname: hostname(),
        token,
        acquiredAt: now,
        updatedAt: now,
      };
      try {
        const handle = await open(lockPath, "wx", 0o600);
        try {
          await handle.writeFile(`${JSON.stringify(lock)}\n`, "utf8");
        } finally {
          await handle.close();
        }
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }

      let stale = false;
      try {
        const [raw, metadata] = await Promise.all([readFile(lockPath, "utf8"), stat(lockPath)]);
        const existing = parseWriterLock(raw);
        const ageMs = Date.now() - metadata.mtimeMs;
        if (existing === null) {
          stale = ageMs >= staleLockMs;
        } else if (existing.hostname === hostname()) {
          stale = !processIsAlive(existing.pid) || ageMs >= staleLockMs && !processIsAlive(existing.pid);
        } else {
          stale = ageMs >= staleLockMs;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }

      if (!stale) {
        throw new TaskControlError(
          "STORE_SINGLE_WRITER_REQUIRED",
          "Another OS process owns the JSON Task Control Store writer lock.",
          { lockPath },
        );
      }

      const stalePath = `${lockPath}.stale-${process.pid}-${Date.now()}-${randomUUID()}`;
      try {
        await rename(lockPath, stalePath);
        await unlink(stalePath).catch(() => undefined);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw new TaskControlError(
          "STORE_SINGLE_WRITER_REQUIRED",
          "Stale JSON Task Control writer lock could not be recovered safely.",
          { lockPath },
        );
      }
    }
    throw new TaskControlError(
      "STORE_SINGLE_WRITER_REQUIRED",
      "JSON Task Control writer lock could not be acquired.",
      { lockPath },
    );
  }

  private static async releaseWriterLock(lockPath: string, token: string): Promise<void> {
    try {
      const existing = parseWriterLock(await readFile(lockPath, "utf8"));
      if (existing?.token === token) await unlink(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private async assertAndRefreshWriterLock(): Promise<void> {
    let existing: StoreWriterLock | null = null;
    try {
      existing = parseWriterLock(await readFile(this.lockPath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (existing?.token !== this.lockToken) {
      throw new TaskControlError(
        "STORE_SINGLE_WRITER_REQUIRED",
        "JSON Task Control Store writer lock was lost or replaced.",
        { filePath: this.filePath, lockPath: this.lockPath },
      );
    }
    const refreshed: StoreWriterLock = {
      ...existing,
      updatedAt: new Date().toISOString(),
    };
    await writeFile(this.lockPath, `${JSON.stringify(refreshed)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    await this.snapshot();
    this.closed = true;
    JsonFileTaskControlStore.activeWriterPaths.delete(this.filePath);
    await JsonFileTaskControlStore.releaseWriterLock(this.lockPath, this.lockToken);
  }

  protected override async beforeCommit(draft: TaskControlState): Promise<void> {
    if (this.closed) {
      throw new TaskControlError(
        "STORE_SINGLE_WRITER_REQUIRED",
        "JSON Task Control Store writer is closed.",
        { filePath: this.filePath },
      );
    }
    await this.assertAndRefreshWriterLock();
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tempPath, `${JSON.stringify(draft, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(tempPath, this.filePath);
  }
}

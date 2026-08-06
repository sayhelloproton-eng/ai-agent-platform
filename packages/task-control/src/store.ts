import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  DISPATCH_STATUSES,
  TASK_EVENT_TYPES,
  TASK_STATUSES,
  WORK_ITEM_STATUSES,
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
    if (signal.hostResultStatus === undefined) signal.hostResultStatus = "PENDING";
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

export class JsonFileTaskControlStore extends InMemoryTaskControlStore {
  private static readonly activeWriterPaths = new Set<string>();

  readonly filePath: string;
  private closed = false;

  private constructor(filePath: string, initialState: TaskControlState) {
    super(initialState);
    this.filePath = filePath;
  }

  static async open(filePath: string): Promise<JsonFileTaskControlStore> {
    const resolvedPath = resolve(filePath);
    if (JsonFileTaskControlStore.activeWriterPaths.has(resolvedPath)) {
      throw new TaskControlError(
        "STORE_SINGLE_WRITER_REQUIRED",
        "JSON Task Control Store permits exactly one writer instance per file path.",
        { filePath: resolvedPath },
      );
    }
    let state = emptyTaskControlState();
    try {
      const raw = await readFile(resolvedPath, "utf8");
      state = validateStateShape(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    JsonFileTaskControlStore.activeWriterPaths.add(resolvedPath);
    return new JsonFileTaskControlStore(resolvedPath, state);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    await this.snapshot();
    this.closed = true;
    JsonFileTaskControlStore.activeWriterPaths.delete(this.filePath);
  }

  protected override async beforeCommit(draft: TaskControlState): Promise<void> {
    if (this.closed) {
      throw new TaskControlError(
        "STORE_SINGLE_WRITER_REQUIRED",
        "JSON Task Control Store writer is closed.",
        { filePath: this.filePath },
      );
    }
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tempPath, `${JSON.stringify(draft, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(tempPath, this.filePath);
  }
}

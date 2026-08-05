import { randomUUID } from "node:crypto";

import type { ResolveApprovalInput, TaskAggregate, TaskControlState } from "./model.js";

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: string): string;
  token(prefix: string): string;
}

export interface ApprovalResolutionPort {
  resolveApproval(input: ResolveApprovalInput): Promise<TaskAggregate>;
}

export interface TaskControlStore {
  read<T>(reader: (state: Readonly<TaskControlState>) => T): Promise<T>;
  transact<T>(writer: (draft: TaskControlState) => T | Promise<T>): Promise<T>;
  snapshot(): Promise<TaskControlState>;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class RandomIdGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}-${randomUUID()}`;
  }

  token(prefix: string): string {
    return `${prefix}-${randomUUID()}-${randomUUID()}`;
  }
}

import { randomUUID } from "node:crypto";

import type {
  ClaimDispatchInput,
  ClaimWorkItemApplicationInput,
  CompleteWorkItemInput,
  CreateTaskInput,
  DispatchSignal,
  ExpireWorkItemInput,
  FailHostResultInput,
  FailWorkItemInput,
  HostCommandMaterialization,
  ReportDispatchInput,
  ReportHostResultInput,
  ReportUncertainHostResultInput,
  ReportWorkProgressInput,
  RetryWorkItemInput,
  StartWorkItemInput,
  ResolveApprovalInput,
  TaskAggregate,
  TaskControlState,
  TaskEvent,
  TaskIntakeResult,
  WorkItem,
} from "./model.js";


export interface TaskIntakeApplicationPort {
  intakeTask(input: CreateTaskInput): Promise<TaskIntakeResult>;
}

export interface WorkItemApplicationPort {
  claimWorkItem(input: ClaimWorkItemApplicationInput): Promise<{ readonly workItem: WorkItem }>;
  startWorkItem(input: StartWorkItemInput): Promise<WorkItem>;
  completeWorkItem(input: CompleteWorkItemInput): Promise<TaskAggregate>;
  reportWorkProgress(input: ReportWorkProgressInput): Promise<WorkItem>;
  failWorkItem(input: FailWorkItemInput): Promise<TaskAggregate>;
  retryWorkItem(input: RetryWorkItemInput): Promise<WorkItem>;
  expireWorkItem(input: ExpireWorkItemInput): Promise<WorkItem>;
}

export interface HostDispatchApplicationPort {
  claimDispatch(input: ClaimDispatchInput): Promise<{ readonly dispatch: DispatchSignal }>;
  materializeHostCommand(signalId: string): Promise<HostCommandMaterialization>;
  acknowledgeDispatch(input: ReportDispatchInput): Promise<DispatchSignal>;
  reportHostResult(input: ReportHostResultInput): Promise<DispatchSignal>;
  reportUncertainHostResult(input: ReportUncertainHostResultInput): Promise<DispatchSignal>;
  failHostResult(input: FailHostResultInput): Promise<DispatchSignal>;
}

export interface TaskProjectionApplicationPort {
  getCurrentTask(taskId: string): Promise<TaskAggregate>;
  getCurrentWorkItem(workItemId: string): Promise<WorkItem>;
  getCurrentDispatch(signalId: string): Promise<DispatchSignal>;
  listTaskEvents(taskId: string): Promise<readonly TaskEvent[]>;
}

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

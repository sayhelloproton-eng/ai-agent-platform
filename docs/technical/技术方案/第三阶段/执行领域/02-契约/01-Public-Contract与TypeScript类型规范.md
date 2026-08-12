---
docId: EXECUTION-DOC-02-01
title: 06 · Public Contract 与 TypeScript 类型规范
docType: contract
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 06 · Public Contract 与 TypeScript 类型规范

## 1. [FROZEN] TypeScript-first

所有可约束的公共合同必须 TS 强类型：

- API request/response；
- Capability Input/Result；
- DTO；
- status/error union；
- Browser runtime message；
- Local executor contract；
- configuration shape；
- cross-package contract。

禁止用 `any` 作为公共逃生口。

## 2. Public API

```ts
export interface ExecutionService {
  executeCapability(
    request: ExecuteCapabilityRequest,
  ): Promise<ExecuteCapabilityResponse>;

  getExecution(
    executionRef: ExecutionRef,
  ): Promise<GetExecutionResponse>;

  readExecutionOutput(
    request: ReadExecutionOutputRequest,
  ): Promise<ReadExecutionOutputResponse>;

  cancelExecution(
    request: CancelExecutionRequest,
  ): Promise<CancelExecutionResponse>;
}
```

## 3. Branded/Opaque Refs

[RECOMMENDED]

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

export type ExecutionRef = Brand<string, 'ExecutionRef'>;
export type TaskId = Brand<string, 'TaskId'>;
export type NodeId = Brand<string, 'NodeId'>;
export type RoleRef = Brand<string, 'RoleRef'>;
export type WorkerRef = Brand<string, 'WorkerRef'>;
export type EvidenceRef = Brand<string, 'EvidenceRef'>;
```

这样可以降低把 `workerRef` 当 `roleRef` 传错的概率，但不改变外部 JSON 仍是 string 的事实。

## 4. Capability ID

```ts
export type LocalCapabilityId =
  | 'file.read'
  | 'file.write'
  | 'file.searchText'
  | 'git.status'
  | 'git.diff'
  | 'git.commit'
  | 'git.push'
  | 'project.info'
  | 'project.installDependency'
  | 'quality.test'
  | 'quality.build'
  | 'quality.lint'
  | 'quality.typecheck'
  | 'code.findSymbol'
  | 'code.findReferences'
  | 'process.start'
  | 'process.stop'
  | 'process.status'
  | 'network.request'
  | 'shell.run';

export type BrowserCapabilityId =
  | 'browser.observe'
  | 'browser.screenshot'
  | 'browser.navigate'
  | 'browser.input'
  | 'browser.click'
  | 'browser.upload'
  | 'browser.submit'
  | 'browser.wait'
  | 'browser.verify'
  | 'worker.create'
  | 'worker.restore'
  | 'worker.wake'
  | 'collaboration.deliver';

export type ExecutionCapabilityId =
  | LocalCapabilityId
  | BrowserCapabilityId;
```

具体名字实现时可微调，但必须保持 typed union，不允许 dynamic arbitrary capability。

## 5. Discriminated Union Request

示意：

```ts
interface ExecuteBase {
  executionRef?: ExecutionRef;
  idempotencyKey: string;
  callerRef: string;
  correlationId?: string;
  taskId?: TaskId;
  nodeId?: NodeId;
  runNo?: number;
  roleRef?: RoleRef;
  workerRef?: WorkerRef;
}

export type ExecuteCapabilityRequest =
  | (ExecuteBase & {
      capability: 'file.read';
      input: ReadFileInput;
    })
  | (ExecuteBase & {
      capability: 'file.write';
      input: WriteFileInput;
    })
  | (ExecuteBase & {
      capability: 'quality.test';
      input: RunTestsInput;
    })
  | (ExecuteBase & {
      capability: 'worker.wake';
      input: WakeWorkerInput;
    })
  | ...;
```

禁止：

```ts
interface BadRequest {
  capability: string;
  input: any;
}
```

## 6. Response Envelope

```ts
export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'UNKNOWN';

export type SideEffectState =
  | 'NOT_STARTED'
  | 'STARTED'
  | 'APPLIED'
  | 'NOT_APPLIED'
  | 'UNKNOWN';

export interface ExecutionResultEnvelope<TData> {
  contract: 'execution.v1';
  ok: boolean;
  executionRef: ExecutionRef;
  status: ExecutionStatus;
  sideEffectState: SideEffectState;
  retryable: boolean;
  data?: TData;
  evidenceRefs: EvidenceRef[];
  error?: ExecutionError;
}
```

每个 capability 必须有具体 `TData`。

## 7. Error Union

```ts
export type ExecutionErrorCode =
  | 'INVALID_REQUEST'
  | 'IDENTITY_INVALID'
  | 'SCOPE_DENIED'
  | 'POLICY_DENIED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_INVALID'
  | 'PRECONDITION_FAILED'
  | 'EXECUTOR_UNAVAILABLE'
  | 'EXECUTION_FAILED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'DECISION_UNRESOLVED'
  | 'UNKNOWN_SIDE_EFFECT';

export interface ExecutionError {
  code: ExecutionErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}
```

## 8. Runtime Validation

TS 类型只存在于编译期。以下边界必须 runtime validation：

```text
HTTP request
Gateway payload
Browser Extension messages
SQLite JSON
process output parsed JSON
external config
```

推荐原则：

```ts
const raw: unknown = inbound;
const parsed = SomeSchema.parse(raw); // Zod/Valibot/自研 validator 均可，具体库后定
// 从这里开始 parsed 才进入 typed domain
```

v1 不必现在冻结具体 validation library，但不允许跳过 runtime validation。

## 9. Unknown vs any

```ts
// 禁止
function parse(x: any) { ... }

// 推荐
function parse(x: unknown): TypedValue {
  // validate / narrow
}
```

## 10. Browser Message Contract

推荐把 runtime↔extension、background↔content 的消息也做 discriminated union，例如：

```ts
type BrowserRuntimeMessage =
  | { type: 'SESSION_HELLO'; extensionInstanceId: string }
  | { type: 'HEARTBEAT'; extensionInstanceId: string; at: string }
  | { type: 'EXECUTION_COMMAND'; executionRef: ExecutionRef; command: BrowserCommand }
  | { type: 'EXECUTION_STAGE'; executionRef: ExecutionRef; stage: BrowserExecutionStage }
  | { type: 'EXECUTION_RESULT'; executionRef: ExecutionRef; result: BrowserExecutionResult };
```

不能靠 free-form JSON message。

---

## 当前正式约束：统一 contract envelope

Public Contract 的 `contract` 名称与 SemVer `contractVersion` 分离；边界输入严格 `unknown → runtime validation → typed DTO`。跨域 Ref 使用 branded/opaque types但 wire 可为 string。错误统一外壳保留领域 `error.code/retryable/correlationId`，Gateway/host 不得吞成无语义 INTERNAL_ERROR。

---
docId: MODEL-DOC-02-01
title: 06 · Public Contract 与 TypeScript 类型规范
docType: contract
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 06 · Public Contract 与 TypeScript 类型规范

## 1. [FROZEN] Public API 数量

v1 只保留两个核心入口：

```text
infer(request)
getRuntimeStatus()
```

取消语义可以通过请求 abort / Runtime 内部 cooperative cancellation 表达，不需要为 v1 再新增一组业务 API。

## 2. [FROZEN] InferenceRequest Envelope

推荐最小合同：

```ts
type InferenceMode = "fast" | "reason" | "auto";
type InferencePriority = "business" | "background";

type InferenceTraceContext = {
  callerRef: string;
  correlationId?: string;
  taskId?: string;
  nodeId?: string;
  executionRef?: string;
};

type InferenceRequest<I> = {
  contractVersion: "1.0.0";
  specRef: string;
  mode: InferenceMode;
  priority: InferencePriority;
  trace: InferenceTraceContext;
  payload: I;
  images?: ImageInput[];
  timeoutMs?: number;
};
```

是否需要 `maxOutputTokens` 等字段优先由 Spec 固定；避免调用方随意改变模型行为。

## 3. ImageInput

```ts
type ImageInput = {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  data: string; // boundary representation; Provider Adapter负责转换
};
```

生产实现可以内部使用更高效 binary/file ref，只要跨域语义保持 `image input`；不要让 provider-specific `image_url` 泄漏到上层。

## 4. InferenceResult

```ts
type InferenceStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

type InferenceResult<O> = {
  contractVersion: "1.0.0";
  inferenceRef: string;
  specRef: string;
  status: InferenceStatus;
  requestedMode: InferenceMode;
  actualMode?: "fast" | "reason";
  data?: O;
  error?: InferenceError;
  metrics: {
    queueLatencyMs: number;
    inferenceLatencyMs?: number;
    totalLatencyMs: number;
  };
};
```

## 5. Capability Proposal 合同

Proposal 的具体 args 必须与允许 Capability 的 schema 绑定。

概念：

```ts
type CapabilityProposal<C extends string, A> = {
  action: "PROPOSE_CAPABILITY";
  capability: C;
  arguments: A;
  confidence: number;
  reasonCode: string;
  rationale?: string;
};
```

Model Domain 只保证输出符合当前 Spec；调用领域再做 capability allowlist / scope / policy。

## 6. RuntimeStatus

```ts
type RuntimeHealth = "READY" | "DEGRADED" | "UNAVAILABLE";
type LaneState = "IDLE" | "BUSY";
type ModelRoleState = "READY" | "UNAVAILABLE";

type ModelRuntimeStatus = {
  runtime: RuntimeHealth;
  lane: LaneState;
  fast: ModelRoleState;
  reason: ModelRoleState;
  activeInferenceRef?: string;
  activeRole?: "fast" | "reason";
  businessQueueDepth: number;
  backgroundQueueDepth: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastErrorCode?: InferenceErrorCode;
};
```

## 7. [FROZEN] TypeScript 不是边界校验

所有 HTTP/JSON/provider raw output：

```text
unknown
→ runtime validator
→ TypeScript typed value
```

禁止：

```ts
const value = json as InferenceRequest<any>;
```

公共合同禁止 `any` 漂移，使用 `unknown + narrow`。

## 8. [FROZEN] Reasoning Spec 输出类型

Spec 与 Output Validator 应保持泛型关联，确保：

```text
specRef
→ input type
→ output type
```

不会退化为 `data: Record<string, unknown>` 的全平台弱合同。

---

## 当前正式约束：Public Contract

核心 Public API 冻结为 `infer()` + `getRuntimeStatus()`；`judgeFast/judgeReason/visionJudge` 不属于当前 Public API。Contract name/version/error envelope/runtime validation 与平台公共约定一致。Capability Proposal 最多一个，只能从 caller allowlist 选择，不是 Tool Call/Execution authorization。

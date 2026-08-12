---
docId: EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN
title: 03 · execution-runtime 详细技术方案
docType: module-design
authority: normative
lifecycle: frozen
domain: execution
moduleRef: execution-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN
- EXECUTION-DOC-02-01
- EXECUTION-DOC-02-02
- EXECUTION-DOC-03-01
- EXECUTION-DOC-03-03
---

# 03 · execution-runtime 详细技术方案

## 1. 角色

`execution-runtime` 是 Execution Domain 唯一后端服务与控制真源。

它不直接完成文件/Chrome等真实资源操作；它完成的是**受控执行决策 + Execution 生命周期持久化 + Executor 调度 + 结果收敛**。

## 2. 推荐内部模块

[RECOMMENDED，不增加独立服务]

```text
src/
├── api/                   # Public API / transport adapter
├── capabilities/          # capability dispatch table（静态）
├── identity/
├── scope/
├── policy/
├── decision/              # deterministic / fast / reason / human
├── approvals/
├── executions/
│   ├── execution-service.ts
│   ├── execution-store.ts
│   ├── idempotency.ts
│   └── recovery.ts
├── executors/
│   ├── local-adapter.ts
│   └── browser-adapter.ts
├── evidence/
├── logs/
├── validation/
└── index.ts
```

这只是代码组织，不是服务拆分。

## 3. Execute Lifecycle

### 3.1 Intake

收到 `ExecuteCapabilityRequest`：

1. runtime schema validation；
2. caller/idempotency/fingerprint 处理；
3. 判断 durability policy：简单同步 deterministic read 可只记结构化日志；side-effect/Approval/async/Browser/UNKNOWN/recovery-required 必须建/查 durable Execution Record；
4. 获取需要的 Task/Agent authoritative facts；
5. Scope；
6. Policy；
7. decision path；
8. approval（如必要）；
9. executor call；
10. Result/Evidence；
11. record terminal state。

### 3.2 Side-effect action 的关键顺序

```text
validate
→ create durable Execution Record (PENDING)
→ policy decision
→ persist executable intent / fingerprint
→ RUNNING
→ executor precondition
→ EFFECT_STARTED marker
→ real effect
→ verifier/result
→ SUCCEEDED / FAILED / UNKNOWN
```

危险动作必须在真实 effect 前已有持久记录。

## 4. Identity

Execution 不自建 Role/Worker 身份库。

根据调用来源校验：

- Gateway caller 与其 Role credential；
- Browser Extension 使用 local platform token/session；
- taskId/nodeId/runNo/workerRef 通过 Task/Agent Public API 交叉验证。

Identity invalid → `IDENTITY_INVALID`，模型不参与。

## 5. Scope

核心三类：

```text
Workspace Scope
Browser Scope
Task / Worker Scope
```

Scope 是 hard boundary。模型只能帮助解释语义，不能突破 hard scope。

## 6. Policy / Decision

Policy 只输出：

```text
ALLOW
REQUIRE_APPROVAL
DENY
```

Decision path 记录：

```text
deterministic
fast
reason
human
```

普通安全副作用不等于每次人工；FAST 可自动允许正常研发路径。

## 7. Executor Routing

静态映射，不做动态 registry。

示意：

```text
file.* / git.* / project.* / test.* / process.* / network.* / shell.*
→ local executor

browser.* / worker.* / collaboration-delivery.*
→ browser executor
```

如果 executor 不可用 → `EXECUTOR_UNAVAILABLE`。

## 8. Approval

Execution Runtime 持有 Effect Approval 必要事实或其持久引用。

Approval validation 必须校验：

```text
execution/caller/task
capability
target
fingerprint
precondition
expiry
status
```

approval 不匹配 → `APPROVAL_INVALID`。

Browser carrier permission（例如 ChatGPT Allow popup）不自动等于 Effect Approval；它由 Browser Task Driver 按页面现实处理。

## 9. Recovery

Runtime restart 时：

- 绝不自动 replay `RUNNING` side-effect；
- 查 Execution Record 的 sideEffectState；
- 能现实查询就 query/reconcile；
- Browser 由 Extension Recovery Scan + evidence 恢复；
- Local 用 file hash/HEAD/manifest/process/endpoint 等现实状态恢复；
- 无法确认 → UNKNOWN。

## 10. Logging

每个 execution 至少可通过 `executionRef` / correlationId 下钻。

结构化日志推荐字段：

```text
timestamp
level
component
executionRef
correlationId
taskId/nodeId/runNo
roleRef/workerRef
capability
phase/event
errorCode
```

Secret 必须 redaction。

## 11. Runtime Service 的非职责

明确不在 runtime 里实现：

- Task scheduler；
- Agent collaboration state machine；
- Browser DOM logic；
- File/Git concrete ops；
- model loading/queue；
- Deployment lifecycle；
- general workflow engine。

---

## 当前正式约束：调用、重试与故障隔离

- identity/scope/schema/hard rules → policy → model（需要时）→ human（需要时）→ effect 顺序冻结。
- Model proposal 不扩大 scope、不直接授权；Execution 可调用 Model Public `infer()`，但 deterministic DENY/mandatory approval 永远优先。
- 只有明确 NOT_STARTED 的 Effect 才允许安全 retry；STARTED/APPLIED/UNKNOWN 先 reality check/reconcile。
- timeout 不自动等于 FAILED；跨域依赖不可用返回明确 dependency state，不能拖垮整个进程拓扑。

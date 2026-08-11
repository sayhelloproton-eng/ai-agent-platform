# 99 · 下一 Chat 交接上下文（Execution Domain）

如果下一 Chat 需要继续 Phase 3 总纲/实现，只需先读取 `README.md`、`00-完整技术方案与上下文真源.md` 和本文件；涉及专项再读取对应编号文档。

## 1. 当前状态

Execution Domain 已完成架构与详细技术方案第一轮正式冻结，准备等待五领域总体设计完成后进入新仓库实施。

不要再为 Execution 扩新模块，除非遇到真实实现阻塞或跨域冲突。

## 2. 核心定义

Execution = real-world effect plane：`Intent → Effect → Evidence`。

它不拥有 Task/Agent/Model/Deployment 业务语义。

## 3. v1 Packages

```text
execution-contracts
execution-runtime            # only backend service
execution-local              # in-process executor library
execution-browser-extension  # Chrome Extension
```

MCP v1 **彻底删除**。

Knowledge Retrieval **v1 不实现，只占未来语义位**。

## 4. Runtime

唯一 Execution control truth：Identity/Scope/Policy/FAST/REASON/Human/Effect Approval/Execution Record/Idempotency/Result/Evidence/UNKNOWN recovery。

状态：PENDING/RUNNING/SUCCEEDED/FAILED/UNKNOWN。

side effect：NOT_STARTED/STARTED/APPLIED/NOT_APPLIED/UNKNOWN。

危险 effect：先 persist intent，再执行。

UNKNOWN 不盲重试。

## 5. Browser

顶层只有 Task Driver + System Observer。

Task Driver：Worker CREATE/RESTORE/WAKE、Collaboration delivery、Action Permission、Human continuation、异常恢复。

System Observer：lowest priority、只读、不驱动业务。

Stable worker identity = roleRef + workerRef；tab/content/extension instance 全是 transient。

ONLINE = current session + heartbeat freshness。

无周期全局 reconciliation，只有 startup/reload/reconnect one-time Recovery Scan。

Browser stage facts：COMMAND_ACCEPTED → PRECONDITION_VERIFIED → EFFECT_STARTED → RESULT_REPORTED。

EFFECT_STARTED 后断线 → UNKNOWN/reality verification。

Side Panel 是 P0：一眼看到 Runtime/Worker/Execution/异常/Evidence/Logs/Observer。

## 6. Local

P0 8 组：File / Git / Project-Package-Dependency / Build-Test-Quality / Code Query / Process / Network / Shell Escape Hatch。

路径边界 = projectRoot；`.ai-agent-platform` reserved；外部默认 deny。

只读 deterministic；普通 mutation FAST；复杂 REASON；Human 稀少。

Shell 始终至少 FAST。

Secret：controlled env、redaction、不传平台完整 process.env、不主动把 `.env` 原文送模型。

Process：One-shot + Managed Process；timeout/maxOutput/cancel/process-tree cleanup/stdout/stderr。

## 7. Public Contract

统一 typed `executeCapability(request)`，但必须 discriminated union。

另有 `getExecution/readExecutionOutput/cancelExecution`。

禁止 `capability:string + input:any`。

## 8. Engineering

Node 20.20.1 + TypeScript-first + `tsx` runtime + `tsc --noEmit` type gate。

外部数据 runtime validation；`unknown` 优先于 `any`。

## 9. Test Gates

E1 Contract / E2 Local Real / E3 Browser Real / E4 Reliability Fault Injection / E5 Cross-domain E2E。

E4 不 PASS 不能进入最终 E5。

## 10. 下一步

Phase 3 总纲应进入剩余正式领域（若尚未完成），而不是继续扩 Execution。

等五领域文档都完成后：

1. 做跨领域总审计；
2. 解决 Task/Agent/Execution/Model/Deployment 的接口最终命名/契约冲突；
3. 创建新仓库；
4. 按 `14-新仓库实现顺序与停止门.md` 逐片实施。

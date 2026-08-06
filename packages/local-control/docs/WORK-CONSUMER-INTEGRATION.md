# Unified Worker → Local Control Adapter

## Purpose

本包导出：

```ts
mapWorkClaimToLocalRequest(input)
createLocalWorkConsumer(options)
createLocalWorkContractTestFixture(options?)
```

Consumer 只接收已经授权的 `LocalWorkClaimInput`，不读取或解释 Task、Plan、PlanNode、Claim、WorkItem 状态、Retry Policy 或下一处理者。

## Pure mapping

`mapWorkClaimToLocalRequest()` 只处理 Local Work Contract v1 字段，并从 Local Capability Catalog 得到固定执行模式。任何额外 Task / Plan / WorkItem 字段都会被拒绝。

`request_id` 是传输尝试 ID。业务幂等身份是：

```text
idempotency_key + fingerprintLocalRequest(request)
```

因此同一业务请求可以使用新的 `request_id` 重投；业务 Payload 改变时复用同一 Key 会被拒绝。

## Required ports

调用方必须注入：

- `LocalResultSinkPort`：按幂等键和请求指纹保存/读取完整 Local Result 或 Transport Error，返回不可变 `result_ref`；
- `LocalEvidenceSinkPort`：读取/保存观察证据并返回稳定 `evidence_refs`；
- 可选 `LocalWorkReportPort`：把安全报告交回统一 Worker 或 Gateway。

这些 Port 只定义调用边界，不表示 LCL 拥有平台 Result/Evidence Store。

## Cross-domain report

报告严格只有：

```text
status
summary
result_ref
evidence_refs
error
correlation_id
idempotency_key
```

完整 `local_result` 只进入 Result Sink，绝不进入跨域完成 Envelope。

## Retry and recovery

- 同一 Key + 同一规范化业务请求返回同一引用；
- 同一 Key + 新 `request_id` 仍恢复同一引用；
- 同一 Key + 不同业务指纹返回 `LOCAL_WORK_IDEMPOTENCY_CONFLICT`；
- Result Sink 已成功但 Report 失败时，重试不重新执行；
- 新 Consumer 或进程重启先回读 Result Sink；
- Sink / Report Port 失败由统一 Worker 决定调度，LCL 不修改 WorkItem 状态。

## Bounded in-flight behavior

`createLocalWorkConsumer()` 的 `inFlight` 选项：

```ts
{
  maxEntries?: number;
  ttlMs?: number;
  now?: () => number;
}
```

默认 `maxEntries=64`、`ttlMs=30000`。该 Map 只合并同进程内同时到达的相同请求，Promise 完成后立即删除。它不是持久化、Receipt Store 或长期去重表。

## Result states

- `ACCEPTED`：非终态，需要按引用继续查询，不自动重发；
- `PARTIAL`：本次请求终态，正文和 Cursor 只在 Result Sink；
- `SUCCEEDED`：终态成功；
- `FAILED`：终态失败，`error.retryable` 仅提供候选建议。

公共 Work 状态映射已经由 Phase 2 Integration Contract `1.0.0` 冻结：`ACCEPTED/PARTIAL` 映射为非终态 Work Progress，`SUCCEEDED/FAILED` 映射为终态；`UNCERTAIN` 不属于 Local Result 状态。

## Transport behavior

- Timeout：`LOCAL_CLI_TIMEOUT`；
- 取消：`LOCAL_CLI_CANCELLED`；
- 进程异常：`LOCAL_CLI_PROCESS_FAILED`；
- stdout/stderr 超限：`LOCAL_CLI_OUTPUT_TOO_LARGE`；
- CLI 返回领域失败：保存 Canonical Local Result，并只回报安全 Error 字段。

## Contract fixture

`createLocalWorkContractTestFixture()` 提供稳定内存 Sink、Report Port、引用复用和 Report 失败注入，供总控直接验证统一 Worker 接线。它不是生产存储。

正式字段与状态见 `packages/contracts/src/phase2-integration.ts` 和 `docs/technical/技术方案/第二阶段/SOL-INT-001-第二阶段四域综合集成与验收.md`。生产 Worker 位于 `apps/action-gateway/src/local-work-worker.ts`。

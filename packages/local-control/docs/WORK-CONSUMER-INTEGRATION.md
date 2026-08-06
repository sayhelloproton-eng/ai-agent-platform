# Unified Worker → Local Control Adapter

## Purpose

本包导出：

```ts
mapWorkClaimToLocalRequest(input)
createLocalWorkConsumer(options)
```

Consumer 只接收已经授权的 `LocalWorkClaimInput`，不读取或解释 Task、Plan、PlanNode、Claim、WorkItem 状态、Retry Policy 或下一处理者。

## Pure mapping

`mapWorkClaimToLocalRequest()` 只处理 Local Work v1 候选字段，并从 Local Capability Catalog 得到固定执行模式。任何额外 Task/Plan/WorkItem 字段都会被拒绝。

## Ports

调用方必须注入：

- `LocalResultSinkPort`：按幂等键和请求指纹保存/读取完整 Local Result，返回不可变 `result_ref`；
- `LocalEvidenceSinkPort`：保存观察证据并返回稳定 `evidence_refs`；
- 可选 `LocalWorkReportPort`：把安全报告交回统一 Worker 或 Gateway。

这些 Port 不代表 LCL 拥有平台 Result/Evidence Store，只定义调用边界。

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

- 同一 Key + 同一规范化请求返回同一引用；
- 同一 Key + 不同请求返回 `LOCAL_WORK_IDEMPOTENCY_CONFLICT`；
- Result Sink 已成功但 Report 失败时，重试不重新执行，复用原引用；
- 新 Consumer 先回读 Result Sink，存在同指纹结果时不重新执行；
- Sink/Report Port 失败由统一 Worker 决定重试，LCL 不修改 WorkItem 状态。

## Transport behavior

- Timeout：`LOCAL_CLI_TIMEOUT`；
- 取消：`LOCAL_CLI_CANCELLED`；
- 进程异常：`LOCAL_CLI_PROCESS_FAILED`；
- stdout/stderr 超限：`LOCAL_CLI_OUTPUT_TOO_LARGE`；
- CLI 返回领域失败：保存 Canonical Local Result，并只回报安全 Error 字段。

正式候选字段与待总控冻结项见 `LOCAL-WORK-V1-PROPOSAL.md`。

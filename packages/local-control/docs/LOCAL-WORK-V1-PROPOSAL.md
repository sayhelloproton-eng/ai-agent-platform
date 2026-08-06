# Local Work v1 Contract Change Proposal

状态：`Proposed / Not Frozen`

本提案只定义总控、统一 Worker 或唯一 Gateway 调用 Local Control 所需的候选边界，不修改 `packages/contracts`，也不冻结 Task、Plan、WorkItem、Claim、Result Store 或 Approval 公共语义。

## Input

`LocalWorkClaimInput` 只携带已授权的本地能力调用：

```text
local_work_version
request_id
capability_ref
actor
correlation_id
scope?
parameters
budget
idempotency_key
```

映射函数 `mapWorkClaimToLocalRequest()`：

- 只按 Local Capability Catalog 决定 `execution_mode`；
- 只把 `correlation_id` 放入 Local Request；
- 拒绝额外 Task、Plan、PlanNode、Claim 或 WorkItem 状态字段；
- 不解释业务目标，不选择下一节点，不修改调度状态。

## Output

跨域报告严格只有：

```text
status
summary
result_ref
evidence_refs
error
correlation_id
idempotency_key
```

完整 `LocalResult` 只能停留在 LCL 进程内，或写入调用方注入的 `LocalResultSinkPort`。报告不得内联 `data`、`meta`、原始 stdout、stderr 或完整 `local_result`。

## Error and retryability

- 领域失败使用 Canonical Local Result 的 `code/category/message/retryable`；
- CLI 未安装、取消、超时、进程失败、输出超限和非法结果使用 `LOCAL_CLI_*` Transport Error；
- 同一幂等键绑定不同规范化请求指纹时抛出 `LOCAL_WORK_IDEMPOTENCY_CONFLICT`，不可重试；
- Sink 或跨域 Report 传输失败直接向调用方抛出，由统一 Worker 决定重试，不伪造成功。

## Timeout and cancellation

- Timeout 取 Process Adapter 上限与请求预算较小值；
- `AbortSignal` 取消会终止子进程并返回 `LOCAL_CLI_CANCELLED`；
- 所有子进程固定 `shell:false`；
- stdout/stderr 分别受限，超限后终止子进程。

## Result and Evidence Ports

`LocalResultSinkPort`：

- 按 `idempotency_key` 读取已保存结果；
- 保存规范化请求指纹、完整 Local Result 或 Transport Error；
- 返回不可变 `result_ref`；
- 同一 Key + Fingerprint 必须返回同一记录；
- 不同 Fingerprint 必须拒绝。

`LocalEvidenceSinkPort`：

- 保存 Local Result 自带的观察证据；
- 对同一 Key + Fingerprint + Result Ref 返回稳定 `evidence_refs`；
- 不在 LCL 中定义平台 Evidence Store 的数据库、URI 或生命周期。

## Idempotency and recovery

- 同一 Consumer 内并发/重复调用只执行一次；
- 新 Consumer 或进程恢复先从 Result Sink 回读，存在同指纹记录时不重复执行；
- Result Sink 已写入但跨域报告失败时，重试复用原 `result_ref/evidence_refs`；
- CLI、Gateway Process Adapter 和 Work Consumer 都以同一个 Canonical Local Result 为执行事实。

## Pending total-control decisions

- 正式 Work Claim Envelope 和授权身份来源；
- Result/Evidence Store 的平台所有者与 URI 规则；
- 统一 Worker 的 Claim fencing、重试次数和最终回报操作名；
- Transport Error 到平台公共 Error Taxonomy 的映射；
- Local Work v1 何时进入 `packages/contracts`。

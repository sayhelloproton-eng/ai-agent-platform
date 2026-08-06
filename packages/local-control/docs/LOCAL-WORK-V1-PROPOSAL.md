# Local Work v1 Contract Change Proposal

状态：`Proposed / Not Frozen`

本提案只定义总控、统一 Worker 或唯一 Gateway 调用 Local Control 所需的候选边界，不修改 `packages/contracts`，也不冻结 Task、Plan、WorkItem、Claim、Result Store、Evidence Store 或 Approval 公共语义。

## Request identity

`request_id` 的 LCL 候选语义冻结为：

```text
transport-attempt-id
```

含义：

- 每次 CLI / Process Adapter 传输尝试都有自己的 `request_id`；
- CLI 返回的 `LocalResult.request_id` 必须与当前传输尝试一致；
- `request_id` 不进入业务请求指纹；
- 重试可以使用新的 `request_id`；
- 重启后从 Result Sink 恢复的完整 Local Result 可以保留原始传输 `request_id`；
- 业务幂等身份由 `idempotency_key + normalized business fingerprint` 决定。

规范化业务指纹包含：

```text
local_request_version
capability
execution_mode
actor
correlation
scope
parameters
budget
```

它不包含：

```text
request_id
idempotency_key
```

相同幂等键绑定不同业务指纹必须稳定返回 `LOCAL_WORK_IDEMPOTENCY_CONFLICT`。

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

`mapWorkClaimToLocalRequest()`：

- 只按 Local Capability Catalog 决定 `execution_mode`；
- 只把 `correlation_id` 放入 Local Request；
- 拒绝额外 Task、Plan、PlanNode、Claim 或 WorkItem 状态字段；
- 不解释业务目标，不选择下一节点，不修改调度状态。

## Cross-domain output

跨域 `LocalWorkConsumerReport` 严格只有：

```text
status
summary
result_ref
evidence_refs
error
correlation_id
idempotency_key
```

完整 `LocalResult` 只能：

1. 停留在 LCL 执行边界内；或
2. 写入调用方注入的 `LocalResultSinkPort`。

跨域报告不得内联：

```text
data
meta
raw stdout
raw stderr
local_result
```

## Non-binary result proposal

LCL 内部候选语义：

| Local Result | Terminal | Continue polling | Retry candidate | 说明 |
|---|---:|---:|---:|---|
| `ACCEPTED` | 否 | 是 | 否 | 副作用或异步动作已经被接受；不得因未完成而自动重发原请求，应查询返回引用对应的状态。 |
| `PARTIAL` | 是 | 否 | 否 | 本次请求以预算内部分结果终结；Cursor、分页和完整正文只能通过 `result_ref` 获取。继续读取应创建新的显式请求。 |
| `SUCCEEDED` | 是 | 否 | 否 | 本次请求成功终结。 |
| `FAILED` | 是 | 否 | 取 `error.retryable` | `retryable` 只是候选建议，是否重试及重试次数由 Task Control / 总控决定。 |

以上是 `LocalWorkV1` 候选映射，不修改 TSK 状态机。总纲需要决定它们如何映射到公共 `WorkResultV1` 和 Task / Work 状态。

## Timeout, cancellation and process failures

- Timeout 取 Process Adapter 上限与请求预算的较小值；
- `AbortSignal` 取消会终止子进程并返回 `LOCAL_CLI_CANCELLED`；
- 所有子进程固定 `shell:false`；
- stdout/stderr 分别受限，超限后终止子进程；
- 非零退出返回 `LOCAL_CLI_PROCESS_FAILED`；
- Transport Error 会先写入 Result Sink，再以引用形式回报。

稳定候选 Transport Error：

```text
LOCAL_CLI_NOT_AVAILABLE
LOCAL_CLI_TIMEOUT
LOCAL_CLI_CANCELLED
LOCAL_CLI_OUTPUT_TOO_LARGE
LOCAL_CLI_PROCESS_FAILED
LOCAL_CLI_INVALID_RESULT
```

## Result and Evidence Ports

`LocalResultSinkPort`：

- 按 `idempotency_key` 读取已保存结果；
- 保存请求指纹、摘要、完整 Local Result 或 Transport Error；
- 返回不可变 `result_ref`；
- 同一 Key + Fingerprint 必须返回同一记录；
- 不同 Fingerprint 必须拒绝。

`LocalEvidenceSinkPort`：

- 按 Key + Fingerprint + Result Ref 读取或保存证据引用；
- 对同一输入返回稳定 `evidence_refs`；
- 不在 LCL 中定义平台 Evidence Store 的数据库、URI 或生命周期。

写入 Result Sink 成功但跨域 Report 失败时：

```text
retry
→ load existing result by idempotency_key
→ validate same business fingerprint
→ load/reuse evidence refs
→ report same result_ref/evidence_refs
→ do not re-execute CLI
```

## Bounded in-flight merge

内存 `inFlight` 只用于同进程短期并发合并：

- 默认容量：64；
- 默认 TTL：30 秒；
- 完成或失败后立即清理；
- 不长期保存 Promise、完整 Local Result 或敏感引用；
- 容量满返回 `LOCAL_WORK_INFLIGHT_CAPACITY`；
- 同一执行超过 TTL 后，后续并发加入返回 `LOCAL_WORK_INFLIGHT_EXPIRED`，不会启动第二次执行；
- 进程重启恢复只依赖 Result Sink，不依赖内存。

## Contract test fixture

包导出：

```ts
createLocalWorkContractTestFixture()
```

该 Fixture 提供可复用的：

- `LocalResultSinkPort`；
- `LocalEvidenceSinkPort`；
- `LocalWorkReportPort`；
- 稳定引用状态；
- Report 失败注入。

它只用于总控和统一 Worker 的 Contract Test，不代表正式平台存储实现。

## Pending total-control decisions

总纲仍需冻结：

- 正式 `LocalWorkV1 / WorkResultV1` 公共 Envelope；
- Work Claim 授权、Lease 与 Fencing；
- Result/Evidence Store 所有者、URI 和保留策略；
- `ACCEPTED / PARTIAL` 到公共 Work 状态的映射；
- Transport Error 到公共 Error Envelope 的映射；
- Report 重试、Receipt 和 Delivery Ack；
- 幂等记录和非终态记录的统一保留期限；
- Local Work v1 进入 `packages/contracts` 的版本和迁移方式。

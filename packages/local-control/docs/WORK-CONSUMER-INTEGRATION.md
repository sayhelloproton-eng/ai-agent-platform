# Task Work Consumer → Local Control Adapter

## Purpose

本包正式导出：

```ts
createLocalWorkConsumer(options)
```

它只接收已经由 Task Control / Worker 转换好的 `LocalRequest`，调用 `LocalControlClient`，再通过调用方注入的 Result Persistence Port 保存结果引用。

它不读取 Task Control 内部表，也不解释：

- Task；
- Plan；
- PlanNode；
- Claim；
- WorkItem 状态；
- Retry Policy；
- 下一处理者。

## Invocation

```ts
const consumer = createLocalWorkConsumer({
  client: localControlClient,
  resultPersistence: {
    async persist({ request, result, summary }) {
      // 由 Task / Evidence 集成层持久化并生成公共引用。
      return {
        result_ref: "...",
        evidence_refs: ["..."],
      };
    },
  },
});

const report = await consumer.run(localRequest);
```

## Report contract

Runner 返回候选集成报告：

```text
capability_ref
request_id
correlation_id?
idempotency_key?
result_ref
evidence_refs[]
status
error_code?
retryable
summary
local_result
```

规则：

- `capability_ref` 来自 `LocalRequest.capability`；
- `request_id` 原样保留；
- `correlation_id` 原样透传；
- `idempotency_key` 原样透传；
- `error_code` 和 `retryable` 只来自 Canonical Local Result；
- `summary` 是确定性摘要，不替代完整结果；
- `result_ref` 和 `evidence_refs` 由注入的 Persistence Port 生成；
- Local Control 不规定公共 Result Ref 的 URI、数据库或生命周期。

## Duplicate requests

Work Consumer 是无状态 Runner，不建立自己的幂等表。

- 同步读取可以安全重放；
- 副作用能力必须携带 `idempotency_key`；
- WorkItem 去重、请求指纹冲突和重试次数由 Task Control / Worker 层负责；
- Local Control 不把相同 Key 与不同 WorkItem 语义自行合并。

## Failure ownership

```text
LocalResult.status = FAILED
→ 领域执行失败
→ Report 保留 error_code / retryable / summary

LocalControlTransportError
→ CLI 传输或进程失败
→ Worker 决定如何记录 Execution 和重试

Result Persistence 失败
→ Runner Promise 失败
→ 不能伪造 result_ref
```

## Cross-domain fields pending total-control freeze

以下公共语义不能由 LCL 单方面冻结：

- `result_ref` 格式和生成者；
- `evidence_refs` 类型；
- Work Consumer 成功/失败回报 Envelope；
- TSK WorkItem Payload 到 LocalRequest 的映射；
- Transport Error 的公共错误名；
- 是否把完整 `local_result` 内联回报或只保存引用。

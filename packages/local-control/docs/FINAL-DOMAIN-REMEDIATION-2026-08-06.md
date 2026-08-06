# SOL-LCL-001 最终领域整改与总控交接记录

## Reference

```text
Deep-audit reference: main@6988b4b3711836c96706a5e79b195cd346d80fb3
Execution rule: apply cumulatively on the current latest main
Scope: packages/local-control/**
```

本轮是 `SOL-LCL-001` 专题的最后一轮领域整改。它只收敛 LCL 内部幂等、恢复、引用和 Work Worker 接口，不修改公共 Contracts、Task 状态机、Gateway Route 或 Browser Host。

## Closed findings

### P-05 request_id semantics

- `request_id` 冻结为单次传输尝试 ID；
- 业务指纹明确排除 `request_id`；
- Process Adapter 仍严格校验当前 stdout Result 的 `request_id`；
- Result Sink 重启恢复只校验 Capability 和业务指纹，允许已保存 Result 保留原始传输 ID；
- 同一 Key + 新 request_id 稳定复用同一 `result_ref`；
- 同一 Key + 不同业务 Payload 稳定冲突。

### Bounded inFlight

- 增加容量、TTL 和完成清理；
- 内存仅合并短期并发；
- 过期项不会触发第二次执行；
- 重启恢复以 Result Sink 为真源。

### Non-binary result semantics

- `ACCEPTED`：非终态，继续查询，禁止因未完成自动重发；
- `PARTIAL`：本次请求终态，正文/Cursor 通过 Result Ref 获取；
- `SUCCEEDED`：终态成功；
- `FAILED`：终态失败，重试建议来自 Error。

该映射仅作为 Contract Change Proposal，未修改 TSK。

### Stable Result/Evidence references

- Result 和 Evidence 均支持 load + persist；
- Sink 已写入但 Report 失败后，重试复用原引用；
- 完整 Local Result 只在 LCL 或 Result Sink；
- WorkReport 严格只包含公共摘要和引用字段。

### Work Worker handoff

稳定导出：

```text
LocalWorkClaimInput
mapWorkClaimToLocalRequest
fingerprintLocalRequest
createLocalControlProcessClient
createLocalWorkConsumer
classifyLocalResult
createLocalWorkContractTestFixture
```

## Domain boundary retained

LCL 仍不拥有：

```text
Task
Plan
PlanNode
WorkItem
Claim
Retry schedule
Task/Work state transition
Gateway HTTP route
Browser command
Approval lifecycle
```

## Contract change proposals for total control

总纲需要统一冻结：

1. `request_id` 采用传输尝试 ID；
2. `idempotency_key + business fingerprint` 作为业务去重身份；
3. `ACCEPTED / PARTIAL / SUCCEEDED / FAILED` 的公共 Work 映射；
4. Result/Evidence URI、Receipt 和保留期限；
5. Transport Error 公共映射；
6. Work Report Delivery Ack 和失败恢复。

## Handoff

本轮后，LCL 专题退出第二阶段整改。总纲可以直接使用本包的 Adapter、Port 和 Fixture 实现：

```text
TSK Work Claim
→ public adapter
→ LocalWorkClaimInput
→ Local Work Consumer
→ Process Client / CLI
→ Result/Evidence Sink
→ reference-only WorkReport
```

后续公共合同修改、跨域 Worker、E2E、全局文档和 Registry 由总纲负责。

# SOL-TSK-001 最终领域整改实施报告

## 1. 结论

本轮以第二轮累计 Task Control Overlay 为连续实现基线，完成最终领域整改。没有修改 `packages/contracts`、CTL、LCL、BHR、Gateway、Registry、Context 或根级阶段文档。

Task Control 当前具备：

- 跨进程互斥的 JSON 单 Writer；
- PID/Token Writer Lock 与陈旧锁恢复；
- Task Intake、Controller、Work、Approval、Dispatch 全生命周期稳定首次执行回执；
- 独立 Current Projection 与 Event Readback；
- Controller Command 首次 WorkItem/Dispatch/Event 引用稳定回放；
- Approval Result Ref 受控引用校验；
- WorkItem/Dispatch 自动取消不可变事件；
- LCL `ACCEPTED/PARTIAL` 非终态承载；
- BHR `UNCERTAIN` 安全阻断，不自动重发；
- 最终集成 Application Port。

## 2. 关闭的最终审计问题

### 跨进程单写者

`JsonFileTaskControlStore` 使用独占锁文件记录 PID、hostname、随机 Token 和更新时间。第二 OS 进程无法静默覆盖同一状态文件；死亡 PID/陈旧锁可按受控规则恢复；每次提交前重新验证锁所有权。

### 稳定 Command Receipt

所有主要写操作把首次结果快照写入带请求指纹的幂等账本。立即回放、状态变化后回放与重启回放不重新读取当前可变实体。Controller Command 首次产生的 Dispatch ID 已进入稳定 Receipt。当前状态通过独立 Projection API 查询。

### Approval 引用边界

Approval Resolution 与 Work/Host 共用受控引用校验，拒绝换行、空白正文、超长文本和无稳定引用结构的内容。Event 只保存引用与最小摘要。

### 取消事件完整性

终止协调自动取消未完成 WorkItem/Dispatch 时，分别产生 `WORK_ITEM_CANCELLED` 和 `HOST_DISPATCH_CANCELLED`，包含实体 ID、原因、触发 Event 与关联 Task Version。

### 非二值状态

- `reportWorkProgress(ACCEPTED/PARTIAL)` 不完成 WorkItem；
- `reportUncertainHostResult()` 将 Task 转入人工/总控复核，保留指纹、阶段、页面身份引用与 Evidence，禁止自动生成替代 Dispatch。

这些名称仍是 TSK 内部安全承载点和 Candidate Proposal，不是单方面冻结的公共状态。

## 3. 最终 Application Port

- Task Intake；
- Controller Decision Context / Claim / Command / Release；
- Work list / claim / start / progress / complete / fail / retry / expire；
- Approval wait / resolve；
- Dispatch list / claim / materialize / delivery ack / host result / uncertain / fail；
- Current Task / WorkItem / Dispatch Projection；
- Task Event Readback。

## 4. 测试结果

```text
55 tests passed
0 failed
```

最终新增动态验证覆盖：

- 两个 OS 进程竞争同一 JSON Store；
- 死亡 PID Writer Lock 恢复；
- Controller Command Dispatch ID 立即和重启回放稳定；
- Work/Claim/Release/Ack/Fail/Host Result/Approval 回执在状态变化后仍保持首次快照；
- Approval 内联、换行、超长和伪引用拒绝；
- WorkItem/Dispatch 自动取消事件；
- `UNCERTAIN` 不自动重试；
- `ACCEPTED/PARTIAL` 不提前完成；
- Delivery Ack 在 Host Result 后保持首次 `DELIVERED` 回执。

## 5. 公共合同提案

本领域只提交候选：

- `CommandReceiptV1`；
- `CurrentProjectionV1`；
- `WorkProgressV1`；
- `UncertainSideEffectV1`；
- `CancellationEventV1`；
- Task Intake、Controller、Local Work、Host Dispatch 既有候选。

这些内容只存在于 `integration-proposals.ts` 和 `INTEGRATION-CONTRACT-PROPOSALS.md`，未写入 `packages/contracts`。

## 6. 总控接线说明

总控可以基于本包冻结唯一公共合同并实现 Gateway/Worker/BHR Adapter。接线时必须：

1. 所有写入口走 Application Port，不直接写 Store；
2. 一个进程内所有 Adapter 共享同一个 Store/Service；
3. 把 Receipt 当作历史命令结果，把 Projection 当作当前状态；
4. `UNCERTAIN` 进入复核/人工接管，禁止自动重发；
5. `ACCEPTED/PARTIAL` 只更新进度；
6. Local Result、DOM、截图和 Binding 正文继续留在所属领域。

## 7. 剩余风险

- JSON Store 是跨进程互斥的本地单 Writer，不是多主机共享数据库；生产迁移由总控裁决；
- 公共 Receipt、Progress、Uncertain、Cancellation 字段尚未冻结；
- Gateway、LCL Worker、BHR Server Adapter 和四域 E2E 由第二阶段总纲接管；
- 本轮结束后，TSK 专题不再承担第二阶段后续串联修复。

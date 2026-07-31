# WFL-007 上下文Checkpoint与任务移交

## 1. 文档定位

本文定义上下文 Checkpoint 和任务移交流程，使长任务在会话压缩、执行器切换、资源不足或人工接管后可以安全继续。

## 2. 触发条件

Checkpoint 在阶段完成、上下文接近上限、配额不足、执行器异常、等待审批、暂停、移交或安全终止前生成。高风险副作用前后也应保存关键状态。

## 3. 快照内容

```text
task_id / version
goal / scope
source_commit
completed_steps
remaining_steps
current_execution_point
confirmed_facts
decisions
approvals
evidence_refs
side_effects
errors
next_action
```

## 4. 移交

新执行器先验证 Task 版本、Git 状态、Lease 和证据完整性，再从明确的 Execution Point 继续。无法确认时回到只读恢复，不猜测前一会话的隐藏状态。

## 5. 完整性

Checkpoint 保存稳定 ID、路径和 Hash，不复制所有日志。含敏感信息的引用按权限过滤；过期审批和临时凭证不得随移交复用。

## 6. 当前实现边界

当前长任务依靠 Chat 摘要、执行报告和 Git Commit 恢复；没有标准 Checkpoint Schema、自动触发或 Lease 验证。

## 7. 目标设计边界

目标先实现人工可读与机器可读的 Snapshot，接入暂停、错误和执行器切换，再验证自动恢复。

## 8. 设计原则

- Checkpoint 绑定 Task 版本和 Source Commit。
- 保留决定、错误、证据和下一步。
- 不复制 Secret 和过期授权。
- 恢复前验证工作区和副作用。
- 信息不足时回到只读恢复。

## 9. 关联文档

- [KNO-002 多级领域上下文架构](../05_上下文与知识系统/KNO-002-多级领域上下文架构.md)
- [KNO-003 上下文Token与证据治理](../05_上下文与知识系统/KNO-003-上下文Token与证据治理.md)
- [ARC-014 健康与恢复治理架构](../04_平台架构/ARC-014-健康与恢复治理架构.md)
- [WFL-005 多角色任务合同](WFL-005-多角色任务合同.md)
- [WFL-008 任务暂停恢复与安全终止](WFL-008-任务暂停恢复与安全终止.md)

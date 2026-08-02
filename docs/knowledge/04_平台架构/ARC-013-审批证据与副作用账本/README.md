# ARC-013 审批、证据与副作用账本

## 1. 文档定位

定义 Approval、Evidence 与 Side-effect Ledger 的职责，证明高风险动作为什么被允许、做了什么以及结果是否成立。


## 正式视觉资产

![审批、证据与副作用账本](./assets/VIS-007-审批证据与副作用账本.png)

### AI 可读语义镜像

```text
Requested Action
  → Approval：谁批准、Task 版本、动作、范围、风险、过期时间
  → Execution
  → Side-effect Ledger：目标、前后引用、幂等键、补偿、状态
  → Evidence：测试、Commit、Hash、API 回读、Revision、人工 Review
  → Acceptance
  → completed / failed / needs_review
```

版本或范围变化会使旧 Approval 失效。模型摘要不能代替证据；Git Push、外部发布、删除和权限变化都必须进入副作用账本。

- Visual Asset ID：`VIS-007`；
- 可编辑源文件：[`./assets/VIS-007-审批证据与副作用账本.svg`](./assets/VIS-007-审批证据与副作用账本.svg)；
- 人类预览：[`./assets/VIS-007-审批证据与副作用账本.png`](./assets/VIS-007-审批证据与副作用账本.png)；
- 事实边界：高风险动作必须同时保留授权、执行副作用和完成证据。

## 2. Approval

Approval 绑定 task_id、task_version、requested_action、scope、risk、requested_by、approved_by、expires_at 和 decision。版本或范围变化后旧批准失效。

## 3. Evidence

证据包括测试、Commit、Hash、API 回读、外部 revision、日志摘要和人工 Review，并记录来源、时间、Task 版本与完整性。

## 4. Ledger

Ledger 记录 effect_id、task_id、operation、target、before_ref、after_ref、idempotency_key、compensation 和 status。Commit、Push、发布、删除和权限变化都应记录。

## 5. 完成判定

completed 必须满足验收、必要 Approval、证据充分、副作用明确和未解决错误披露；模型文本不能自行提升状态。

## 6. 当前实现边界

当前以人工提示词授权 Commit、Push 和飞书写入，并以 Git、测试和真实链路作为证据；没有结构化 Store。

## 7. 目标设计边界

目标先为 Git 写入和外部发布建立结构化 Approval、Evidence 与 Ledger，再扩展其他高风险工具。

## 8. 设计原则

- Approval 绑定 Task 版本与动作
- 证据保存引用和完整性
- 外部写入记录副作用
- 执行前设计幂等与补偿
- 证据不足只能未验证

## 9. 关联文档

- [ARC-009 轻量 Task Control](../ARC-009-轻量Task-Control架构/README.md)
- [THY-005 可信 Agent 系统](../../03_架构思想与理论/THY-005-可信Agent系统基本原则.md)
- [KNO-003 Token 与证据治理](../../05_上下文与知识系统/KNO-003-上下文Token与证据治理.md)

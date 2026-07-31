# ARC-009 轻量 Task Control 架构

## 1. 文档定位

定义不依赖重型图编排框架的最小 Task Control。优先解决状态、版本、权限、证据和恢复，不提前建设任意复杂 Workflow。

## 2. Task Contract

最小字段包括 task_id、goal、version、status、requested_by、capability、scope、dependencies、acceptance、assigned_executor、approvals 与 evidence_refs。

## 3. 状态机

建议 `proposed → ready → running → waiting_approval / blocked / paused → completed / failed / cancelled / terminated`。每次写入携带 expected_version。

## 4. 命令与事件

Command 表达意图并可被拒绝；Event 记录已发生事实且不可静默改写。MVP 可以从单一 Task Store 与追加事件开始。

## 5. 控制与执行

控制面决定状态、Lease、Approval 与完成证据；执行面消费授权工作并返回 Result，不拥有 Task 目标。

## 6. 当前实现边界

当前 Runtime 处理请求级窄 Capability，没有持久 Task Store、版本竞争、Approval 或恢复状态机。

## 7. 目标设计边界

下一阶段先实现持久状态、Expected Version、Executor Lease、Approval Request 和 Evidence Reference，再根据真实分支需求评估图编排。

## 8. 设计原则

- 先控制状态和副作用
- 完成由验收和证据决定
- 写入使用版本或幂等键
- 执行器不拥有目标
- 暂停和安全终止是正式状态

## 9. 关联文档

- [THY-005 可信 Agent 系统基本原则](../03_架构思想与理论/THY-005-可信Agent系统基本原则.md)
- [PRD-005 能力地图与演进路线](../01_产品体系/PRD-005-能力地图与演进路线.md)
- [CTX-007 当前实现与目标架构](../00_项目入口/CTX-007-当前实现与目标架构.md)

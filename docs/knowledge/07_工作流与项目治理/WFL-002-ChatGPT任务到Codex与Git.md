# WFL-002 ChatGPT 任务到 Codex 与 Git

## 目标流程

```text
ChatGPT 决策
  → Task 契约
  → 受控 Handoff
  → Codex / Executor 执行
  → 测试与结果
  → 当前任务 Git Operating Policy 允许的 Commit / Push / PR
  → 知识更新提案
```

## 必要契约

Task 必须包含 Goal、Scope、Allowed、Forbidden、Inputs、Acceptance、Stop Conditions 和 Report Format。Result 必须包含变更、测试、证据、限制与未完成项。

## 安全

Codex 不得自行改变总体架构、扩大范围、Force Push、修改权限或把未验证结果写成完成。高风险动作由 Project Owner 决定。

## 状态

人工规划、Canonical Handoff Contract、冻结 Artifact、确定性交付、Commit / Push 和 Chat Review 已在真实知识批次中使用；是否创建 Branch、Worktree 或 PR 由每个任务的 Git Operating Policy 决定。尚未实现的是动态 Task Store、Gateway 到 Codex 的自动调度、Approval、Evidence、Recovery 和完整闭环。

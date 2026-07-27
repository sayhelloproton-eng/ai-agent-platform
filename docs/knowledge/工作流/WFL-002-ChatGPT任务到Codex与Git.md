---
asset_id: WFL-002
asset_type: workflow
title: ChatGPT 任务到 Codex 与 Git
status: proposed
evidence_level: hypothesis
canonical_path: docs/knowledge/工作流/WFL-002-ChatGPT任务到Codex与Git.md
related_assets: [ARC-003, DOM-001, CTX-004]
---

# WFL-002 ChatGPT 任务到 Codex 与 Git

## 目标流程

```text
ChatGPT 决策
  → Task 契约
  → Gateway / Bridge
  → Codex 执行
  → 测试与结果
  → Branch / Commit / PR
  → 知识更新提案
```

## 必要契约

Task 必须包含 Goal、Scope、Allowed、Forbidden、Inputs、Acceptance、Stop Conditions 和 Report Format。Result 必须包含变更、测试、证据、限制与未完成项。

## 安全

Codex 不得自行改变总体架构、扩大范围、Force Push、修改权限或把未验证结果写成完成。高风险动作由 Project Owner 决定。

## 状态

尚未实现。Phase 2 首先交付 Task Contract、薄 Bridge 和本地可审计执行，不提前建设复杂编排平台。

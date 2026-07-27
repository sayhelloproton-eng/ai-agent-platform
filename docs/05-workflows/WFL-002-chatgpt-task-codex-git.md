---
asset_id: WFL-002
asset_type: workflow
status: proposed
evidence_level: hypothesis
canonical_path: docs/05-workflows/WFL-002-chatgpt-task-codex-git.md
related_assets: [ARC-003, DOM-001, CTX-004]
---

# WFL-002 ChatGPT → Task → Codex → Git

## Target Flow

```text
ChatGPT decision
  → Task Contract
  → Gateway / Bridge
  → Codex execution
  → Tests and Result
  → Branch / Commit / PR
  → Knowledge update proposal
```

## Required Contracts

Task 必须包含 Goal、Scope、Allowed、Forbidden、Inputs、Acceptance、Stop Conditions 和 Report Format。Result 必须包含变更、测试、证据、限制与未完成项。

## Safety

Codex 不得自行改变总体架构、扩大范围、Force Push、修改权限或把未验证结果写成完成。高风险动作由 Project Owner 决定。

## Status

尚未实现。Phase 2 首先交付 Task Contract、薄 Bridge 和本地可审计执行，不提前建设复杂编排平台。

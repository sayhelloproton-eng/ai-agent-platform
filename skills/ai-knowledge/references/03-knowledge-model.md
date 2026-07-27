# Knowledge Model

## Knowledge Item

字段：`id`、`title`、`type`、`status`、`evidence_level`、`canonical_path`、`summary`、`relations`、`source`、`visibility`、`sensitivity`。

## Knowledge Event

Task 验收、实验结论、决策、状态变化或显式外部导入。事件必须带证据；聊天消息本身不是正式事件。

## Context Package

当前任务的最小知识集合：sources、facts、decisions、current_status、constraints、gaps、budget 和 confidence。它是任务输入，不是长期存储格式。

## Project State

规范源是 Git `CTX-002`。字段包括 phase、objective、completed、in_progress、next、blockers、evidence 和 updated_at。飞书 Project Status 是投影对象。

## Write Plan

写入前记录目标、模式、Diff、风险、幂等线索、revision / hash 前置条件、验收和失败处理。

## Lifecycle

```text
Raw Source → Classify → Draft → Review → Git Merge → Index
→ Optional Projection → Verify → Evolve / Archive
```

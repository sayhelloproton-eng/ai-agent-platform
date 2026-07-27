# Knowledge Model

## Knowledge Item

字段：`id`、`title`、`type`、`status`、`evidence_level`、`canonical_path`、`summary`、`relations`、`source`、`visibility`、`sensitivity`。

`canonical_path` 必须指向 Git。只有位于 `docs/knowledge/` 的 Item 具有项目 Feishu Projection 资格；资格不等于已发布或已授权。

## Git Layer

| Layer | Path | Typical Content |
|---|---|---|
| Context | `context/` | status、task、constraints、rules |
| Knowledge | `docs/knowledge/` | human-readable project knowledge |
| Technical | `docs/technical/` | implementation and engineering docs |
| Learning | `docs/learning/` | learning assets |
| Decision | `docs/adr/` | decisions and consequences |

分类发生在 Git 写入前。Provider 类型不能决定 Git Layer。

## Knowledge Event

Task 验收、实验结论、决策、状态变化或显式外部导入。事件必须带证据；聊天消息、Feishu 页面和 Provider 输出本身不是正式事件。

## Context Package

当前任务的最小知识集合：sources、facts、decisions、current_status、constraints、gaps、budget 和 confidence。它是任务输入，不是长期存储格式。

## Project State

规范源是 Git `context/current-status.md`。字段包括 phase、objective、completed、in_progress、next、blockers、evidence 和 updated_at。

Feishu 状态页只能是面向人的 Projection，不得替代或覆盖 Context。

## Change Plan

Git 写入前记录目标 Layer、路径、来源、Diff、风险、验收、回滚和范围门禁。

## Projection Plan

仅针对 `docs/knowledge/`，记录目标、渲染内容、Git 来源、Commit/Hash、发布模式、revision 前置条件、确认和回读验收。

## Lifecycle

```text
Evidence
  → Classify Git Layer
  → Git Draft
  → Review
  → Git Merge
  → Validate / Index
  → Optional docs/knowledge Projection Plan
  → Separate Confirmation
  → Publish
  → Read-back Verify
```

外部 Feishu 内容进入流程时从 Evidence 开始，不能跳过 Git Draft / Review。

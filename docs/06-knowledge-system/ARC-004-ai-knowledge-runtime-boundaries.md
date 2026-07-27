---
asset_id: ARC-004
asset_type: architecture
status: accepted
evidence_level: decided
canonical_path: docs/06-knowledge-system/ARC-004-ai-knowledge-runtime-boundaries.md
related_assets: [ARC-002, SKL-001, ADR-002, SOL-002]
---

# ARC-004 AI Knowledge Runtime Boundaries

## Layers

```text
Agent Intent
  → AI Knowledge Skill
  → Knowledge Port
  → Git / Feishu / Local / Web Adapter
  → External System
```

## Canonical Boundary

Git stores formal assets and dynamic Current State. Feishu stores Projection or Native material. Provider metadata such as Space ID and Node Token may appear in adapter configuration, but cannot define domain truth.

## Runtime Responsibilities

- **Agent**：理解任务、选择证据、组织语义、决定草稿类型。
- **Skill**：路由、最小检索、Schema、Write Plan、验证与 Drift 规则。
- **Provider**：鉴权、分页、重试、格式转换和底层错误。
- **Index**：候选筛选和关系导航，不替代正文。

## Write Path

正式变更：Git Draft → Review → Merge → Projection Plan → Feishu Write → Read-back Verify。Feishu Native 晋升也必须先回到 Git Draft。

## Security

默认只读；删除、权限、公开分享、批量移动和自动反写禁止。凭据只存在于环境或 Secret Manager，不进入 Schema、Fixture、日志摘要或 `.private-context/`。

---
asset_id: WFL-001
asset_type: workflow
status: implemented
evidence_level: observed
canonical_path: docs/05-workflows/WFL-001-knowledge-lifecycle.md
related_assets: [ARC-002, ARC-004, SKL-001, ADR-002]
---

# WFL-001 Knowledge Lifecycle

```text
Capture → Classify → Draft → Review → Merge to Git → Index
       → Optional Feishu Projection → Read-back Verify → Drift Check
```

## Rules

1. Chat、日志和飞书 Native 默认是 Raw Source。
2. Agent 选择资产类型、来源、证据和敏感级别。
3. 正式事实先生成 Git Draft，Review 后 Merge。
4. 索引更新后才可作为默认检索来源。
5. 飞书写入需要 Write Plan、确认、幂等和回读。
6. Drift 不能静默双向合并；Git Canonical Asset 胜出。

## Failure Handling

- 证据不足：保留 Draft / Unknown。
- Asset ID 冲突：停止并报告。
- Feishu 写入失败：Git 状态不回滚为失败；记录 Projection Pending。
- 回读不一致：标记 Drift，不重复创建资源。

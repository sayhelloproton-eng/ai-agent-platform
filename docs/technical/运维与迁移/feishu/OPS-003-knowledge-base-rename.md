---
asset_id: OPS-003
asset_type: operation
status: validated
evidence_level: verified
canonical_path: docs/technical/运维与迁移/feishu/OPS-003-knowledge-base-rename.md
related_assets: [OPS-001, RSH-001]
---

# OPS-003 Feishu Knowledge Base Rename Check

目标 Space 已只读核验，但没有执行名称或描述修改。原因是 `lark-cli 1.0.77` 与公开 Wiki Schema 没有 Space 名称/描述更新接口；现有 Space Setting 接口不支持这两个字段。

结论：不调用未公开或猜测的生产接口。需要改名时使用飞书 Web UI，并在操作前检查公开范围和敏感内容。

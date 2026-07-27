---
asset_id: ENG-001
asset_type: engineering
status: implemented
evidence_level: verified
canonical_path: docs/11-engineering/ENG-001-public-repository-standard.md
related_assets: [ADR-002, SOL-003, MIG-001]
---

# ENG-001 Public Repository Standard

## Repository Boundary

Public Git 可以包含代码、Schema、测试、架构、ADR、已脱敏实验和项目自产快照。不得包含私人材料、真实凭据、认证缓存、未授权第三方全文和本地 Agent 状态。

## Required Structure

- 根 `AGENTS.md` 和 README 是入口。
- 每个长期目录必须有 README。
- 正式文档使用稳定 Asset ID 和 Canonical Path。
- `.private-context` 只跟踪 README。
- 第三方全文、运行日志和大型产物使用忽略目录或外部存储。

## Change Discipline

批量迁移、删除、公开范围、权限、Force Push 和历史重写必须先计划并 Review。提交前运行路径、链接、敏感信息、索引和相关测试。

## Distribution

对外 Review ZIP 不包含 `.git/`、`.omo/`、私有正文、认证状态、第三方全文镜像或生成缓存。

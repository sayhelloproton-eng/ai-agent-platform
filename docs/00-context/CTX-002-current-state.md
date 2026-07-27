---
asset_id: CTX-002
asset_type: status
title: Current State
status: implemented
evidence_level: verified
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/00-context/CTX-002-current-state.md
related_assets: [CTX-001, CTX-003, CTX-004, ADR-002, MIG-001]
---

# CTX-002 Current State

## Current Phase

**Knowledge Foundation — repository normalization and Git-first knowledge governance.**

## Completed in the Current Tree

- 分层 `AGENTS.md` 与 Governance 规则。
- Public Git、`.private-context/` 和 Secret 三类边界。
- Context、Product、Architecture、Domain、Agent、Workflow、Knowledge、Solution、Research、Experiment、ADR、Engineering、Operations、Portfolio 的正式目录。
- Git 唯一真源与 Feishu Projection 决策。
- AI Knowledge Skill 的 Git-first 状态模型、索引优先检索和受控飞书写入边界。
- 旧 `docs/context/`、根层历史文档和错误编号目录的迁移或删除。
- WaytoAGI 第三方全文继续作为本地忽略内容，只保留脚本、元数据和实验摘要。

## In Progress

- 项目所有者 Review 本次迁移并决定 Commit / Push。
- 依据新 Feishu Map 生成只读对齐与 Write Plan。
- 设计 Git → Feishu 投影、回读和 Drift Detection MVP。

## Not Implemented

- 平台 API / Gateway 与 Agent Runtime。
- Task Contract、Codex Bridge、Result / Execution Tracking。
- 自动 Git → Feishu 发布服务。
- AI Video Workflow 和模型 Adapter。

## Known Limits

- 当前 Git 历史仍可能保留已经从最新树删除的早期私人或过时文件；未执行历史重写。
- 飞书已有目录和页面尚未按新 Git 结构重新对齐。
- Mermaid 需要在具备 `mmdc` 的环境中做渲染级验证。

## Evidence

- 迁移审计：[`MIG-001`](../12-operations/migration/MIG-001-repository-audit-and-migration-2026-07-27.md)
- Skill 验证：`node scripts/validate_bundle.mjs`、`node tests/self-test.mjs`
- 索引：[`docs/_index/`](../_index/)

## Next Actions

1. Review 迁移 Diff、审计报告和敏感信息扫描。
2. Commit / Push 本次迁移。
3. 只读检查飞书当前结构并生成对齐 Write Plan。
4. 实现投影 MVP 前先建立 Contract、幂等和回读验收。

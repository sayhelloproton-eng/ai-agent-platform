# CTX-002 Current State

- Asset ID: `CTX-002`
- Status: `implemented`
- Evidence: `verified`
- Canonical Path: `docs/00-context/CTX-002-current-state.md`
- Updated: `2026-07-27`

## Current Phase

**Knowledge Foundation**。当前正在执行仓库整体调整的 Batch 2，建立公开 Context、Product 与 Architecture 入口，完成后等待 Review。

## Completed

- 根与子目录 `AGENTS.md` 分层规则体系已完成。
- Batch 1 Private Context 边界与 `.gitignore` 已完成并推送。
- Git 已确认为正式项目事实的唯一真源；飞书定位为投影与补充知识层。
- AI Knowledge Skill v1.0.0 已存在并通过既有自检。
- 飞书 CLI、公开 Wiki 读取与导出能力已有验证资产。

## In Progress

- Batch 2：Context、Product、Target Architecture 和 Six-Month Delivery Architecture。
- 知识资产索引、关系、迁移清单与飞书映射对齐。

## Blocked

- 当前无阻塞项。
- 飞书投影迁移需单独 Write Plan 与人工确认，不在本批次执行。

## Current Evidence

- `AGENTS.md` 及目录级规则。
- `docs/_index/` 中的资产与关系索引。
- `docs/09-adr/ADR-002-git-single-source-feishu-projection.md`。
- `skills/ai-knowledge/` 的 Skill、Schema、脚本与测试。
- Batch 1 Git 提交与当前工作树差异。

## Current Commit

Batch 2 执行基线：`4ad7afba1bc20a682f415f611ceae79183d94457` (`chore: add local private context boundary`)。本批次尚未 Commit。

## Next Actions

1. Review Batch 2 新增资产与索引。
2. 获得确认后单独 Commit / Push Batch 2。
3. 再按计划进入后续资产迁移，不提前执行 Batch 3。
4. 另行规划旧飞书状态页面和规则的投影迁移。

## Known Drift

- 旧 `docs/context/**` 尚保留，已不作为新 Canonical Path，后续批次再治理。
- 飞书中的旧项目状态与双源表述可能落后于 ADR-002，当前未同步。
- Agent Runtime、Codex Bridge 和 AI Video Workflow 均尚未实现。
- 长期 Target Architecture 中多数运行组件仍属于 Next 或 Later。

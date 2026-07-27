---
asset_id: MIG-001
asset_type: migration
status: implemented
evidence_level: verified
canonical_path: docs/technical/运维与迁移/migration/MIG-001-repository-audit-and-migration-2026-07-27.md
related_assets: [CTX-002, ADR-002, SOL-003, ENG-001, SKL-001]
---

# MIG-001 Repository Audit and Migration — 2026-07-27

## Audit Findings

1. `docs/` 根层混放设计、任务输入、实验、结果和 XML。
2. `docs/context/` 含 Private 仓库、旧 Commit、双源状态和过时恢复顺序。
3. 旧 `docs/09-adr/` 占用插入 Experiments 后的编号，需要迁移到 `docs/10-adr/`。
4. `docs/research/` 未区分 Research 与 Experiment。
5. AI Knowledge Skill 把飞书 `Project_Status` 写成动态状态规范源，与 ADR-002 冲突。
6. `.private-context` 被整体忽略，README 无法跟踪。
7. 多个长期目录只写在 README 目标表中但实际不存在或没有 README。
8. ZIP 传输导致脚本执行位变化和中文文件名乱码风险；公开交付不应包含 `.git`、`.omo` 和私人正文。

## Migration Performed

- 建立 `03-domain` 至 `13-portfolio`、`07-solutions`、`_archive` 及所有 README。
- 将 ADR 移至 `docs/10-adr/`。
- 将 WaytoAGI 元数据与脚本移至 `docs/08-research/external/`；全文继续忽略。
- 将外部能力结论拆为 `RSH-001`、`EXP-001`、`EXP-002`。
- 将飞书初始化、首页和改名结果整理为 `OPS-001` 至 `OPS-003`。
- 将 Knowledge Skill 设计拆为 `SKL-001` 与 `ARC-004`。
- 新增 Domain、Workflow、Solution、Engineering 和 Portfolio 资产。
- 删除旧 `docs/context/**` 和根层重复源；Git 历史仍可恢复原文。
- 修正 Asset、Relation、Feishu Map、Migration Inventory 与配置路径。
- 将 AI Knowledge Skill 改为 Git `CTX-002` 规范状态源，飞书状态仅是 Projection。
- 修正 `.private-context` README 跟踪规则并补充安全治理。

## Not Performed

- 未改写 Git 历史或 Force Push。
- 未执行飞书写入、权限或公开设置修改。
- 未实现 Gateway、Codex Bridge、投影服务或视频工作流。

## Validation

验收应覆盖：Canonical Path、Asset ID、关系引用、Markdown 链接、敏感信息、Git Ignore、脚本权限和 Skill 测试。外部交付 ZIP 应排除 `.git`、`.omo`、私人正文和第三方全文。

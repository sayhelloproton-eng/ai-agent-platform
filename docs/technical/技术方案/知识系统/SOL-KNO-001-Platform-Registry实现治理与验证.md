# SOL-KNO-001 Platform Registry 实现治理与验证

## 1. 目标与非目标

本方案定义 `platform-registry/` 如何以稳定 ID 管理跨层资产、关系、实现证据、迁移、发布和投影状态，并通过确定性校验持续对齐真实仓库。

非目标：Registry 不保存知识正文，不替代 Git，不充当运行时 Task Store、Execution Store、Evidence Store 或全文搜索数据库，也不自动接受设计或发布外部内容。

## 2. 职责与边界

Platform Registry 是资产身份、关系、状态、实现证据和投影映射的系统真源；正文仍保存在对应 Git 文件中。Registry 只记录可查询的最小结构化事实，不能复制聊天全文、文档正文、Secret、运行缓存或临时任务状态。

## 3. 核心资产模型

| 模型 | 职责 |
|---|---|
| Asset | 稳定 ID、类型、生命周期、证据等级、物化和路径状态 |
| Relation | 使用受控词表连接已登记端点 |
| Release | 记录某个可复审交付批次、实现证据和发布状态 |
| Migration | 记录资产路径迁移的源基线、批次、矩阵和完成状态 |
| Implementation Status | 将能力状态关联到实现资产与真实证据路径 |
| Projection | 记录 Git → Feishu 的发布策略和已发布节点映射 |

## 4. 目录与文件职责

- `assets.yaml`：资产主记录；
- `relations.yaml` 与 `relation-types.yaml`：关系实例与受控类型；
- `releases.yaml`：仓库、知识、视觉和 Skill Release；
- `migrations/current-migration.yaml` 与迁移矩阵：路径迁移状态；
- `implementation-status.yaml`：能力实现与证据；
- `projections.yaml`：单向投影政策和已发布映射；
- `schemas/`：资产、迁移、实现状态、关系、投影和 Release 契约；
- `registries/engineering-insights/`：独立领域 Registry，不并入平台资产正文；
- `generated/`：未来确定性生成索引的边界，当前不保存占位结果。

## 5. Schema 与枚举

Schema 约束必填字段、资产状态、证据等级、迁移状态、发布状态和实现状态。Relation 类型必须来自 `relation-types.yaml`，端点必须先登记；ID 不得重复或复用。新增枚举属于治理变更，不能为绕过校验临时扩张。

## 6. 物化、路径与生命周期语义

`materialized: true` 表示真实资产已经存在，`current_path` 与 `canonical_path` 必须相同且可访问；`materialized: false` 的计划资产不得拥有当前或规范路径，只能记录 `target_path`，且不能使用 accepted、implemented 或 verified 等已落地状态。`migration_state` 只说明路径迁移，`status` 说明领域生命周期，`publication_status` 说明外部发布，三者互不替代。

## 7. 与真实仓库的一致性

Registry 声明不能证明文件存在。每次变更必须同时核对真实路径、唯一 ID、唯一 Canonical Path、关系端点、证据路径和发布边界；正文移动时同步资产路径与受影响链接，删除或替代时保留 `supersedes`、`superseded_by` 或 `merged_into` 语义，不复用旧 ID。

## 8. 校验器范围

`scripts/platform-registry-check.mjs` 当前检查必需文件、字段、Schema 枚举、物化与计划资产路径语义、路径安全与存在性、ID 和 Canonical Path 唯一性、替代引用和循环、Relation 类型与端点、Implementation Status 的实现/证据、Projection 的单向 overwrite 规则、Migration 与矩阵结构、Generated 目录边界，以及关键 Release 不回退。它输出 Asset、Relation、计划、物化和 accepted 数量。

校验器不判断正文质量、关系是否具有业务价值，也不替代人工 Review、Git Diff、真实调用或发布回读。

## 9. Release 与 Migration

Migration 回答“资产从哪里迁到哪里、迁移是否完成”；Release 回答“哪个逻辑批次交付了什么、依据哪个 Commit、Review 与发布状态是什么”。迁移完成不代表正文已接受或已发布，Release 完成也不自动改变 Feishu 状态。

## 10. 与其他资产体系的关系

- Knowledge：正文位于 `docs/knowledge/`，Registry 只保存身份、关系和状态；
- Skills：实现位于 `skills/`，可关联知识解释、Workflow、Eval 和 Release；
- Agents：未来 Profile 物化后登记，不创建空壳资产；
- Knowledge Packs：未来以 Manifest 和来源关系登记，不复制正文；
- Feishu Projection：只登记已发布映射；Git 写入与 Feishu 发布分别授权；
- Engineering Insight Registry：保持独立领域 Schema，Platform Registry 只关联其正式入口资产。

## 11. 变更流程

`固定基线 → 确认资产语义与 Scope → 修改真实文件 → 同步 Asset/Relation/Release/Migration → 运行定向校验 → Review Diff → Commit → 远端回读`。只有语义明确且端点真实时才增加 Relation，不为满足数量制造边。

## 12. 失败与 Drift 处理

路径缺失、重复 ID、非法状态、悬空关系、证据不存在或关键 Release 回退时停止提交并修正真实来源。若代码、测试、Registry 与正文冲突，按代码和测试、Git 证据、Registry、已接受 Contract、Context、正文、历史材料的顺序收敛；不修改 Schema 或测试来掩盖文档错误。

## 13. 当前实现

当前 Registry 已实现资产、关系、受控类型、Release、Migration、Implementation Status、Projection 政策、工程洞见子 Registry、Schema 和根级确定性校验，并已用于知识重构、视觉资产、Skill Release 和实现证据治理。

## 14. 尚未实现

- 自动生成索引；
- 自动影响分析；
- 自动 Registry 更新；
- Task / Evidence 运行时控制面。

## 15. 验证命令

```bash
npm run check:registry
npm run check:repo
npm run check:knowledge
git diff --check
npm run verify
```

## 16. 相关文档

- [Platform Registry README](../../../../platform-registry/README.md)
- [ARC-002 智能体平台知识资产架构](../../../knowledge/05_上下文与知识系统/ARC-002-上下文与知识系统总体架构/README.md)
- [KNO-007 平台资产关联模型](../../../knowledge/05_上下文与知识系统/ARC-005-知识资产治理单一真源与生命周期架构/README.md)
- [ARC-016 能力依赖、多任务并行与分阶段 MVP 路线图](../../../knowledge/04_平台架构/ARC-016-能力依赖多任务并行与分阶段MVP路线图/README.md)
- [GOV-002 文档与知识治理规则](../../治理规则/GOV-002-文档与知识治理规则.md)

## 17. 结论

Platform Registry 的价值不在集中保存所有内容，而在以可验证的最小结构把真实资产连接起来。其可信度来自路径、Schema、关系、证据、Release、Migration、人工 Review 和 Git Commit 的共同闭环。

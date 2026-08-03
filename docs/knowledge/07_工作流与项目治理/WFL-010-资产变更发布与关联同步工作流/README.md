# WFL-010 资产变更、发布与关联同步工作流

> 核心结论：任何正式变更都必须先落到 Canonical Asset，再同步 Registry、关系、测试、Context、Release 和派生发布；派生目标只能被覆盖和回读，不能反向成为真源。

## 1. 文档定位

本文拥有 Change Event、Impact Plan、资产同步顺序、Release Gate、Projection、Migration、Supersede、Archive 和 Drift Closure。

Knowledge、Context 和 Distribution 的语义由 `05` 拥有；本文只定义任务结果如何触发和协调这些能力。

## 2. 资产类型

- **Canonical Asset**：Git 中经过治理的正式代码、知识、Agent、Skill、Workflow、Contract 和配置。
- **Registry Entry**：资产稳定 ID、路径、生命周期、状态和关系。
- **Runtime Artifact**：Task、Execution、Log、Checkpoint、Evidence 等运行记录。
- **Derived Package**：Knowledge Pack、Custom GPT Knowledge、发布包等构建产物。
- **Projection**：Feishu、外部索引或其他派生阅读目标。
- **External Resource**：由工具创建或修改的外部对象。

## 3. Change Event

Change Event 至少包含：

- Asset ID / Path；
- Change Type；
- Old / New Commit；
- Lifecycle；
- Task / Result；
- 直接关系；
- 风险；
- 是否影响 Context、Agent、Skill、Workflow、Evidence、Release 或 Projection；
- 是否需要 Migration。

Git Diff、Registry 生命周期和显式事件共同用于发现变更。未注册的新文件也必须进入范围检查。

## 4. Impact Plan

Impact Plan 分为：

- 确定影响；
- 推测影响；
- 不适用；
- 需要人工决定；
- 明确 Pending。

候选影响包括：

- 正文、README 和导航；
- Context；
- Registry / Relations；
- Agent Profile / Skill；
- Contract / Schema / Tests；
- Knowledge Pack；
- Visual Asset；
- Release / Migration；
- Feishu / Custom GPT / RAG Projection；
- 项目状态和 Roadmap。

目标自动 Impact Analyzer 尚未实现，当前使用人工清单和 Registry 校验。

## 5. 同步顺序

```text
Canonical Asset
  → Registry / Relations
  → Tests / Evidence
  → Context / Navigation
  → Release
  → Derived Package / Projection
  → Readback
  → Drift / Closure
```

原因：

- Canonical Asset 必须先确定；
- Registry 和关系用于识别正式身份与依赖；
- Tests / Evidence 证明变更可接受；
- Context 只吸收已确认事实；
- Release 固定版本；
- 派生包和 Projection 必须来自固定版本；
- Readback 验证目标真实状态。

## 6. Canonical Asset Gate

正式资产进入 Release Candidate 前检查：

- 路径和稳定 ID；
- 事实层级；
- Source / Evidence；
- 链接和 Schema；
- 生命周期；
- 当前与目标实现边界；
- 敏感信息；
- Review；
- 相关 Visual；
- Migration 与 supersede；
- Registry 状态。

Chat、日志、飞书 Native 和执行器摘要默认不是 Canonical Asset。

## 7. Registry、Relations 与 Navigation

资产变更后：

1. 新增或更新 Registry Entry；
2. 校验稳定 ID 唯一；
3. 更新 `depends_on`、`implements`、`governed_by`、`supersedes`、`projects_to` 等关系；
4. 检查关系端点存在；
5. 更新目录 README 和阅读路径；
6. 对删除或迁移保留历史关系和替代目标。

Registry 是机器状态真源，正文不重复维护完整机器清单。

## 8. Release Gate

Release 至少要求：

- 所有 Required Acceptance 满足；
- 测试和 Evidence 可定位；
- 阻断 Review 关闭；
- Git 状态可解释；
- Context / Registry / Migration 已处理或明确 Pending；
- 高风险副作用已批准；
- Commit 和版本明确；
- 发布目标和回读方式明确。

Release 失败不应回滚已经正确写入 Git 的 Canonical Asset；应记录对应 Release / Projection Pending。

## 9. 派生发布

Git 是唯一真源。Knowledge Pack、Feishu、Custom GPT Knowledge 和 RAG 索引都是派生发布。

通用流程：

```text
固定 Git Commit
  → Build / Select
  → Preview
  → Approval
  → Publish / Overwrite
  → Readback
  → Hash / Revision
  → Drift Check
```

派生目标不得做静默双向合并。发现冲突时回到 Git Review。

## 10. Migration、Supersede 与 Archive

删除或迁移前确认：

- 替代资产已存在并验证；
- 入站关系已处理；
- 阅读入口已更新；
- 历史来源可追踪；
- Registry 生命周期正确；
- 外部 Projection 不再指向旧内容；
- Migration 状态可审计。

旧资产可以保留在 Git 历史或正式归档，不继续作为 Canonical 阅读入口。

## 11. Drift

Drift 包括：

- Git 与 Projection 内容不一致；
- Registry 路径与真实文件不一致；
- Release 指向错误 Commit；
- Context 仍引用 Superseded 结论；
- 派生包版本滞后；
- 外部写入成功但 Readback 不一致。

Drift 不能通过自动选择外部版本覆盖 Git。应生成 Repair Task，并保留原因和影响。

## 12. 当前实践与目标

当前使用人工范围清单、Registry 校验、Markdown 链接、Git Review、单 Commit、Push 回读和 Feishu Publisher。目标是实现结构化 Change Event、Impact Analyzer、Release Orchestrator 和多渠道 Drift 检测；本文不声称这些自动能力已完成。

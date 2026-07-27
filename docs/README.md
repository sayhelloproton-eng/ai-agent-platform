# Knowledge Assets

`docs/` 保存 `ai-agent-platform` 的正式知识资产。Git 是唯一正式真源；飞书是 Projection 与 Native 协作层。

## 入口

- 修改规则：[`AGENTS.md`](AGENTS.md)
- 项目恢复：[`00-context/recovery-map.md`](00-context/recovery-map.md)
- 当前状态：[`00-context/CTX-002-current-state.md`](00-context/CTX-002-current-state.md)
- 资产索引：[`_index/assets.yaml`](_index/assets.yaml)
- 关系索引：[`_index/relations.yaml`](_index/relations.yaml)
- 迁移审计：[`12-operations/migration/MIG-001-repository-audit-and-migration-2026-07-27.md`](12-operations/migration/MIG-001-repository-audit-and-migration-2026-07-27.md)

## 目录

| 目录 | 内容边界 |
|---|---|
| `00-context/` | 背景、当前状态、任务、Roadmap、恢复路径 |
| `01-product/` | 产品愿景、用户价值、Portfolio 结果 |
| `02-architecture/` | 系统整体结构、视图、边界和演进 |
| `03-domain/` | 领域概念、聚合、关系和不变量 |
| `04-agent-system/` | Agent、Skill、能力边界和运行契约 |
| `05-workflows/` | 端到端步骤、状态、失败和恢复 |
| `06-knowledge-system/` | 知识资产、检索、投影和 Runtime 边界 |
| `07-solutions/` | 明确工程问题的完整解决方案 |
| `08-research/` | 调研证据、候选能力、外部来源 |
| `09-experiments/` | 实际环境、步骤、结果和限制 |
| `10-adr/` | 已评审决策及后果 |
| `11-engineering/` | 工程规范、模块和实现约束 |
| `12-operations/` | 执行、迁移、发布、事故和历史 |
| `13-portfolio/` | 对外展示、Demo、简历和面试叙事 |
| `governance/` | 人与 Agent 的治理规则 |
| `_index/` | 机器可读资产、关系、飞书和迁移索引 |
| `_templates/` | 正式资产模板 |
| `_archive/` | 仅在当前树仍需保留的废弃材料；多数旧源由 Git 历史保存 |

## 资产演进

```text
Research → Experiment → Solution → ADR → Architecture / Skill / Workflow / Code
```

Research 不等于验证，Experiment 不等于决策，Solution 不等于已采用；状态和证据必须在正文与索引中明确。

## 创建或迁移资产

1. 阅读目录 README 和 `docs/AGENTS.md`。
2. 从 `_templates/` 选择模板并分配唯一 Asset ID。
3. 建立 Canonical Path、状态、证据和关系。
4. 更新 `_index/assets.yaml` 与 `_index/relations.yaml`。
5. 需要飞书投影时更新 `_index/feishu-map.yaml`，但不自动写入。
6. 运行链接、路径、敏感信息与相关测试验证。

# 智能体资产体系

## 目录职责

维护 Agent 角色、Profile、知识与行为、工具权限、Skill、协作、评估、目录和首批专业智能体设计。

## 正式资产

| ID | 主题 |
|---|---|
| AGT-001 | Agent角色体系 |
| AGT-002 | Agent-Profile设计规范 |
| AGT-003 | Agent知识记忆与行为模型 |
| AGT-004 | Agent工具权限与审批边界 |
| AGT-005 | Agent-Skill设计与治理 |
| AGT-006 | 多Agent协作角色模型 |
| AGT-007 | Agent评估测试与发布 |
| AGT-008 | 专业智能体目录 |
| AGT-009 | 需求与产品孵化智能体 |
| AGT-010 | 项目治理与汇报智能体 |

## 仍待迁移的历史资产

`SKL-001 AI Knowledge Skill` 与 `SKL-002 Engineering Insight Distillation Skill` 已有实现和旧路径知识正文。本批不执行路径迁移或删除，后续在独立迁移任务中验证目标内容、旧路径引用和删除范围。

## 维护规则

- `partial` 表示正文已物化但仍待真实 Commit Review；
- Agent Profile、Skill、Knowledge、Tool 和 Task 分别建模；
- 候选专业智能体不宣称已经发布或可自动运行；
- 系统元数据进入 `platform-registry/`；
- 复杂图在正文冻结后生成；
- 本目录内容在全库 Review 前保持 `unpublished`。

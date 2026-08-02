# 智能体资产体系

## 目录职责

维护 Agent 角色、Profile、知识与行为、工具权限、Skill、协作、评估、目录和首批专业智能体设计。

## 正式资产

| ID | 文件 / 范围 | 主题 |
|---|---|---|
| AGT-001～AGT-010 | `AGT-*.md` | Agent 角色、Profile、治理与首批专业智能体 |
| SKL-001 | `SKL-001-AI知识技能.md` | AI Knowledge Skill 设计 |
| SKL-002 | `SKL-002-工程洞见提炼技能.md` | Engineering Insight Distillation Skill 设计 |
| SKL-003 | `SKL-003-规划者与执行器任务交接技能.md` | Planner Executor Handoff Skill 设计 |
| SKL-004 | `SKL-004-项目知识综合技能.md` | 多源 Claim、重复、冲突、资产落位和退役影响综合 |

## 维护规则

- Agent Profile、Skill、Knowledge、Tool 与 Task 分离；
- `skills/` 是可执行实现真源，本目录解释其设计与治理；
- Host 安装目录和 Plugin 只是发布目标；
- 权限、审批与评估必须有机器可校验边界；
- Skill 的实现、版本、Schema 和测试变化时同步更新本目录与 Platform Registry；
- 本目录保持 `unpublished`，直到全库人工 Review、独立 Feishu 发布授权和发布回读完成。

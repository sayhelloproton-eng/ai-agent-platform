# R-04 智能体与 Skills：Chat 开场提示词

请执行最终集中内容 Review 的 R-04，核对智能体角色、资产边界与六个正式 Skill 的真实实现。

## 读取范围

- `docs/knowledge/06_智能体资产体系/**`；
- `skills/**/README.md`、`skills/**/SKILL.md`、直接相关 Schema、Examples 与测试；
- `AGENTS.md`、`skills/AGENTS.md`；
- 与角色、任务交接和资产化相关的架构/治理文档及 Registry 条目。

## 必查事实

- 正式 Skill 数量为 6；
- `planner-executor-handoff v0.4.0` 已实现、验证并 accepted；
- Chat 是规划者、决策者、Artifact 作者和 Reviewer；Executor 是受控执行与证据回传端；
- `execution_authority` 必须独立于 guidance tier；
- 精确核对 `bounded_implementation`、`frozen_artifacts_only`、`compact_controlled`、`stepwise_controlled`；
- 核对 Feedback Contract、Executor Switch Checkpoint 与 Git Operating Policy；
- Custom GPT Profile、Knowledge Pack 和多 Agent 自动编排仍是未完成或未来项。

## 输出

请返回 Skill 清单及版本/状态证据、角色与权限冲突、协议术语差异、正文与实现映射、逐文件修正建议和建议落库批次。不得让执行器获得隐含规划权。

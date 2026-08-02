# project-knowledge-synthesis Skill

把多份项目会话、文档、执行报告和 Registry 证据综合为可 Review 的知识调整方案。

## Purpose

解决普通摘要无法可靠处理的问题：

- 同一事实被多篇文档重复表达；
- 当前实现、目标设计、历史方案和即时状态混写；
- 旧文章应保留、合并、归档还是 supersede 不清楚；
- 正文调整后链接、Registry 和发布影响容易遗漏；
- 长会话中含有私人信息、未经验证推断和临时状态。

## Boundary

本 Skill 只产生综合候选、冲突报告、目标资产建议、退役建议和影响清单。

它不直接：

- 修改正式知识或 Context；
- 决定项目目标和架构；
- 批准生命周期晋升；
- 发布到 Feishu；
- 把会话推断当作事实；
- 替代 Engineering Insight Distillation。

正式写入仍由总控 Planner 生成完整冻结文件，用户进行必要 Review，Executor 负责确定性落库。

## Modes

- `directory_consolidation`：聚合一个知识目录，处理重复、边界和入口结构；
- `project_session`：从长会话和执行报告恢复 Claim、决策和未解决问题；
- `asset_formalization`：把 Draft / Experiment / Technical 候选映射到正式资产。

## Validation

```bash
node skills/project-knowledge-synthesis/scripts/validate-synthesis.mjs request   skills/project-knowledge-synthesis/assets/examples/00-project-entry-request.json

node skills/project-knowledge-synthesis/scripts/validate-synthesis.mjs result   skills/project-knowledge-synthesis/tests/pilots/00-project-entry/synthesis-result.json

node skills/project-knowledge-synthesis/tests/self-test.mjs
```

## Current Status

- Version: `0.1.0`；
- Lifecycle: `in_review`；
- First governed Pilot: `docs/knowledge/00_项目入口/` 聚合；
- 自动 Provider、跨仓库索引、批量 Eval 和直接发布均未实现。

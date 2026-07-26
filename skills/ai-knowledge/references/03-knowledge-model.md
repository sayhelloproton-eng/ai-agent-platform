# Knowledge Model

## Knowledge Item

稳定、可复用、可追踪的知识单元。核心字段：

- `id`、`title`、`type`
- `project`、`domain`、`status`
- `summary`、`keywords`、`relations`
- `source.provider`、`source.url/token`、`source.updated_at`
- `evidence`、`confidence`
- `visibility`、`sensitivity`

类型建议：`context`、`product`、`architecture`、`domain-model`、`agent-design`、`workflow`、`experiment`、`adr`、`learning-path`、`portfolio`、`status`。

## Knowledge Event

触发知识维护的事实事件，而不是任意聊天消息：

- Task 通过验收。
- 实验得到可复现结论。
- 架构决策被用户接受或废弃。
- 项目阶段、阻塞或下一步发生变化。
- 外部知识源被显式导入。

事件必须带来源和证据；详见 Schema。

## Context Package

Agent 为当前任务选择的最小知识集合：

- task / intent
- selected_sources
- facts
- decisions
- current_status
- constraints
- gaps
- token_budget
- confidence

它是任务输入，不是长期存储格式。

## Project Status

字段：phase、objective、completed、in_progress、next、blockers、evidence、updated_at、updated_by。完成项必须有 evidence。

## Write Plan

写入前的受控操作计划：目标、风险、命令类别、幂等键、revision 前置条件、预览文件、验收和回滚说明。

## 生命周期

```text
Raw Source → Normalize → Classify → Review → Store → Index → Retrieve → Evolve / Archive
```

聊天、日志和执行输出默认是 Raw Source；只有经过分类和事实审查才成为 Knowledge Item。

# Context

## What

`context/` 是 `ai-agent-platform` 的项目级最小启动上下文。它与根 `README.md` 一起帮助新的 Codex / Agent 会话在不依赖历史聊天或外部知识平台的情况下恢复项目方向。

## Why

项目需要一个稳定、简短、可顺序读取的 Git 入口，用于回答：

- 项目是什么；
- 为什么存在；
- 当前阶段是什么；
- 架构向哪里演进；
- Git 与 Feishu 如何分工；
- Agent 下一步可以做什么、禁止做什么。

## Contains

- [`project-context.md`](project-context.md)：项目定义、问题与最终目标；
- [`architecture-context.md`](architecture-context.md)：长期分层方向与渐进式建设原则；
- [`current-status.md`](current-status.md)：当前阶段、已完成项和下一步；
- [`roadmap.md`](roadmap.md)：阶段路线图；
- [`knowledge-strategy.md`](knowledge-strategy.md)：Git 唯一真源与 Feishu 单向投影规则。

## Boundary

本目录只保存项目级启动上下文，不保存：

- 业务代码、依赖或运行配置；
- Gateway、MCP、Action、Runtime 的实现；
- Feishu 页面或同步产物；
- 临时讨论、完整执行日志或未经确认的结论；
- 详细设计、实验、ADR 或历史资产。

详细资产继续保留在 `docs/` 与 `skills/`；本目录不在当前任务中迁移或重写这些历史资产。

## Structure

```text
context/
├── README.md
├── project-context.md
├── architecture-context.md
├── current-status.md
├── roadmap.md
└── knowledge-strategy.md
```

## Usage

新会话依次读取：

1. 根 `README.md`；
2. 根 `AGENTS.md`；
3. 本文件；
4. `project-context.md`；
5. `architecture-context.md`；
6. `current-status.md`；
7. `roadmap.md`；
8. `knowledge-strategy.md`。

完成启动后，只按当前任务读取最小必要的详细资料。

## Maintenance

- 项目愿景、阶段、路线图或知识边界发生经人工确认的变化时，同步检查本目录。
- `current-status.md` 只记录已确认的当前事实，不把计划写成完成。
- 本目录与其他 Git 文档冲突时，Agent 不静默选择；应报告 Drift 并等待 Project Owner 决定。
- 修改必须遵守根 `AGENTS.md` 的 Scope Lock、验证和报告要求。

## Related Docs

- [Project Context Root](../README.md)
- [Project Constitution](../AGENTS.md)
- [Existing Detailed Knowledge Assets](../docs/README.md)
- [Existing Agent Skills](../skills/README.md)

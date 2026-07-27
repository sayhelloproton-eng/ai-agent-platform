# AI Agent Platform

`ai-agent-platform` 是面向个人学习、工程实践和求职 Portfolio 的长期 AI Agent 工程平台。本文件是仓库的 **Project Context Root**：新的 Codex / Agent 会话应从这里开始，并继续读取根 [`AGENTS.md`](AGENTS.md) 与 [`context/`](context/)。

## Project Vision

构建一个可持续演进的 AI Agent 工程平台，让人、ChatGPT、Codex、模型、工具、知识与基础设施能够通过清晰边界协作，并把过程沉淀为可运行、可解释、可验证的工程成果。

平台长期保留模型、工具、设备与 Provider 可替换的能力，但不会在当前阶段一次性实现所有模块。

## Project Goal

当前目标是建立 **Knowledge Layer / Context Foundation**：

- 让新会话只读取 Git 仓库即可理解项目；
- 固化项目愿景、架构方向、当前状态、路线图和知识策略；
- 为后续 AI Knowledge Skill 与工程工作流提供稳定上下文；
- 明确 Agent 的工作范围、验证责任与安全边界。

## Architecture Overview

长期架构方向：

```text
User
  ↓
ChatGPT Interface
  ↓
Agent Brain
  ↓
Agent Runtime
  ↓
Tool Layer
  ↓
Knowledge Layer
  ↓
Infrastructure
```

这是演进方向，不代表所有层已经实现。当前只建设 Context Foundation，不实现 Gateway、MCP、Runtime 或业务工作流。详见 [`context/architecture-context.md`](context/architecture-context.md)。

## Source Of Truth

**Git Repository is the only source of truth.**

项目愿景、状态、架构、规则、知识、代码和已验证结论，只有经过 Review 并进入 Git 后，才是正式项目事实。聊天记录、工具输出或外部知识平台不能替代 Git。

## Knowledge Strategy

知识流向是单向的：

```text
Git → Feishu
```

Git 保存正式工程事实；Feishu 只提供便于人阅读的知识投影。禁止 Feishu 自动反写 Git，也禁止双向同步。详见 [`context/knowledge-strategy.md`](context/knowledge-strategy.md)。

## Current Phase

当前阶段：**Phase 1: Knowledge Foundation — 已交付**

已完成：
- Git 唯一真源与四层文档架构（`docs/knowledge/`、`docs/technical/`、`docs/learning/`、`docs/adr/`）
- AI Knowledge Skill v1.2.0（Git → Feishu 受控投影）
- `context/` 项目级 Agent 启动上下文
- 17 个知识页面发布至飞书知识库"智能体工程探索"

当前：仓库一致性修复。下一步见 [`context/current-status.md`](context/current-status.md)。

## Development Rules

所有人类协作者、ChatGPT、Codex 和其他 Agent 必须遵守根 [`AGENTS.md`](AGENTS.md)。

核心要求：

- 开始前读取授权范围与最小必要上下文；
- 修改前锁定允许范围、禁止范围和验收方式；
- 一次只完成一个任务，不顺手扩大范围；
- 不把规划描述为已实现，不把未验证结果描述为已完成；
- 不自动执行删除、权限修改、公开范围变更、Force Push 或历史重写；
- 修改后提供文件清单、Diff 范围与实际验证证据。

## Context Navigation

新会话按以下顺序恢复上下文：

1. [`README.md`](README.md)：项目入口与当前方向；
2. [`AGENTS.md`](AGENTS.md)：Agent 工作规则与安全边界；
3. [`context/README.md`](context/README.md)：Context 目录职责和阅读顺序；
4. [`context/project-context.md`](context/project-context.md)：项目是什么、为何存在；
5. [`context/architecture-context.md`](context/architecture-context.md)：长期架构方向与当前边界；
6. [`context/current-status.md`](context/current-status.md)：当前阶段、完成项和下一步；
7. [`context/roadmap.md`](context/roadmap.md)：后续阶段；
8. [`context/knowledge-strategy.md`](context/knowledge-strategy.md)：Git 与 Feishu 的关系。

`docs/` 和 `skills/` 是现有详细资产；本次 Context Foundation 不迁移、不重构它们。需要执行具体任务时，再按 [`AGENTS.md`](AGENTS.md) 读取最小相关资料。

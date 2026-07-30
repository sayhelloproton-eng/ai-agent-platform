# AI Agent Platform

`ai-agent-platform` 是面向个人学习、工程实践和求职 Portfolio 的长期 AI Agent 工程平台。本文件是仓库的 **Project Context Root**：新的 Codex / Agent 会话应从这里开始，并继续读取根 [`AGENTS.md`](AGENTS.md) 与 [`context/`](context/)。

## Project Vision

构建一个可持续演进的 AI Agent 工程平台，让人、ChatGPT、Codex、模型、工具、知识与基础设施能够通过清晰边界协作，并把过程沉淀为可运行、可解释、可验证的工程成果。

平台长期保留模型、工具、设备与 Provider 可替换的能力，但不会在当前阶段一次性实现所有模块。

## Project Goal

当前目标是进入 **Phase 2: AI Coding Workflow**，在已交付的 Knowledge Foundation 上逐步建立 Task、Gateway / Bridge、执行、验证、Result 与 Git 协作闭环。

当前已建立最小 Monorepo 工程基础、Contracts、Auth 与 Policy 共享包，并打通 Action Gateway → Local Runtime 本地安全 Task 链路；现有知识与 Skill 资产保持稳定。

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

这是演进方向，不代表所有层已经实现。当前完成 Monorepo 根级工程基础、Contracts v1、双层静态 API Key、双层 Capability Policy、Action Gateway → Local Runtime 本地任务链路、两个安全 Capability，以及 Microsoft Dev Tunnels 持久公网入口；尚未实现动态策略、MCP 或业务工作流。详见 [`context/architecture-context.md`](context/architecture-context.md)。

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

当前阶段：**Phase 2: AI Coding Workflow — 进行中**

已完成：
- Git 唯一真源与四层文档架构（`docs/knowledge/`、`docs/technical/`、`docs/learning/`、`docs/adr/`）
- AI Knowledge Skill v1.2.0（Git → Feishu 受控投影）
- `context/` 项目级 Agent 启动上下文
- 17 个知识页面发布至飞书知识库"智能体工程探索"
- Gateway MVP 渐进式实施方案与 npm workspaces 根级工程基础
- `@ai-agent-platform/contracts`：Task / Result / Error Contract v1 与运行时校验
- `@ai-agent-platform/auth`：Bearer 解析、API Key 校验、安全比较与 Header 脱敏
- `@ai-agent-platform/policy`：Capability 级默认拒绝与明确允许决策
- `@ai-agent-platform/action-gateway`：本地公开健康检查和受保护的 `/v1/capabilities`
- `@ai-agent-platform/local-runtime`：Loopback Task 校验、Policy 二次校验、Capability 调度和 `TaskResult`
- Microsoft Dev Tunnels 公网链路：Gateway 仅监听 `127.0.0.1:8787`，Runtime 仅监听 `127.0.0.1:8790`；持久 Dev Tunnel 已建立且 Host 重启前后 URL 一致；公网未认证请求返回 401，已认证 capabilities 返回 200，`runtime.status` 返回 `succeeded`

Action Gateway 保留严格接收完整 Task Contract 的受保护 `POST /v1/tasks`，并新增由服务端构造 `runtime.status` Task 的 Custom GPT 专用 `POST /v1/runtime/status`；两条路径复用同一 Policy 和 Runtime Client 边界。Microsoft Dev Tunnels 持久入口、Builder 解析、Preview 和创建后的正式 Custom GPT 对话调用均已完成真实验证，下一步是审阅并提交 MVP 差异。详见 [`context/current-status.md`](context/current-status.md)。

## Engineering Workspace

仓库使用 npm workspaces 管理后续平台代码，当前预留范围：

```text
apps/*
packages/*
capabilities/*
```

`skills/ai-knowledge` 暂时保持独立，继续使用原生 Node.js `.mjs` 入口，不加入 workspace。

当前有六个真实 workspace：

- `@ai-agent-platform/contracts`：负责 Gateway、Runtime 和 Capability 共享的协议类型与无依赖运行时校验；
- `@ai-agent-platform/auth`：提供无运行时依赖的基础认证原语；
- `@ai-agent-platform/policy`：提供只依赖 Contracts 的 Capability Allow / Deny 决策；
- `@ai-agent-platform/action-gateway`：提供仅监听本地 Loopback 的公开健康检查、受保护 Capability 查询和 Task 转发接口；
- `@ai-agent-platform/local-runtime`：提供仅监听 Loopback、受内部 API Key 保护的 Task Contract 校验、Runtime Policy 二次校验和安全 Capability 执行。
- `@ai-agent-platform/dev-tunnel`：使用官方 Microsoft Dev Tunnels CLI 发布 Gateway 8787，并编排、验证和停止公网开发链路。

当前认证使用本机私有静态 API Key，尚无自动轮换或动态角色权限；公网入口的匿名 Tunnel 访问不替代 Gateway Bearer 认证。

Policy 已实现 Capability 级默认拒绝和明确允许；Local Runtime 已能独立执行 `gateway.ping` 与 `runtime.status` 并返回 Contract v1 `TaskResult`。

Gateway 与 Runtime 使用分离的外部、内部 API Key，并分别执行 Gateway Policy 与 Runtime Policy。Runtime Client 只允许 Loopback HTTP，具有 Timeout、响应大小限制和 `TaskResult` 校验。

本地与 Microsoft Dev Tunnel 公网 `runtime.status` 链路已经打通，Custom GPT Action 的 Builder 配置、Preview 和正式 GPT 对话调用均已完成。

本地链路已经完成公网接入前的结果对应校验、超时映射、请求排空、入站超时、单实例 Rate Limit 和双端并发加固，并可通过前台脚本一键启停。

应用层 Rate Limit 和并发保护已建立；Microsoft Dev Tunnels 仅用于开发期 MVP，不视为生产边缘防护。

本地环境要求 Node.js 20 与 npm 10；推荐使用 `.nvmrc` 中固定的 Node.js 版本。可执行验证命令：

```bash
npm run check:repo
npm run check:knowledge
npm run check:contracts
npm run check:auth
npm run check:policy
npm run check:gateway
npm run check:runtime
npm run check:dev-tunnel
npm run check:local-chain
npm run check:local-stack
npm run local:start
npm run verify
npm run build --workspace @ai-agent-platform/contracts
npm run test --workspace @ai-agent-platform/contracts
```

Custom GPT OpenAPI 模板与本机解析 Schema 已通过 Builder 验证，正式 GPT 对话已完成真实 Action 调用验收。

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

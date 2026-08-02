# AI Agent Platform

`ai-agent-platform` 是面向 AI Agent 工程学习、真实平台建设、知识治理、多 Agent 协作和求职 Portfolio 的长期工程项目。

本仓库不是提示词集合，也不是单一聊天机器人。它同时承载可运行代码、Agent 能力、正式知识、技术方案、架构决策、实验、工程证据和面向人的飞书投影。

## 项目定位

`ai-agent-platform` 是底层平台和当前仓库主体。AI 视频工作流以及未来其他产品，都是依托平台构建的上层实践，不改变当前仓库的平台主体定位。

项目长期按六层理解：

```text
Agent Interface
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

当前实现只是这套长期架构中的最小安全执行链，不代表完整平台已经完成。

## 当前能力

### 执行链

当前已验证：

```text
Custom GPT
  → Microsoft Dev Tunnels
  → Action Gateway
  → Local Runtime
  → gateway.ping / runtime.status
```

已经具备：

- npm workspaces 工程基线；
- `contracts`、`auth`、`policy` 三个共享包；
- `action-gateway`、`local-runtime`、`dev-tunnel` 三个应用；
- 双层 API Key、双层 Capability Policy 和 Loopback 边界；
- Rate Limit、并发限制、Timeout、响应大小限制和安全错误映射；
- Custom GPT Builder 中的 Action 配置与正式自然语言调用链验证。

### 知识与治理

已经具备：

- Git 唯一知识真源；
- Platform Registry；
- Engineering Insight Registry；
- Git → Feishu 单向发布机制；
- `asset://` 正式图片引用和 Feishu 图片 Publisher；
- AI Knowledge、Deterministic Delivery、Custom GPT Actions、Microsoft Dev Tunnels、Engineering Insight Distillation、Planner Executor Handoff 六个正式 Skill；
- `planner-executor-handoff v0.5.1 / accepted`；
- Context 所有权和维护机制。

### 工程验证

已经具备：

- Task / Result / Error Contracts；
- Skill、Knowledge、Registry 和仓库级校验；
- 测试、Scope Lock、确定性交付、单 Commit 与远端回读；
- 正式知识、代码、测试、决策和证据的可追踪关系。

## 当前阶段

当前处于：

```text
Phase 2.5 — Human Content Review and Knowledge Release Closure
```

知识资产重构、Platform Registry、六个正式 Skill、Context 治理和窄链路 MVP 已经完成。当前正在进行用户逐篇人工 Review 与 Chat 第二轮 Review，最终人工内容验收尚未完成。

Feishu 最终发布、发布回读和最终整仓验收尚未开始。

精确状态与当前工作见：

- [`context/current-status.md`](context/current-status.md)
- [`context/roadmap.md`](context/roadmap.md)

## 仓库资产

```text
apps/                可运行应用
packages/            共享代码与领域能力
skills/              程序性 Agent 能力
platform-registry/   跨资产身份、关系、状态和投影
context/             短、小、当前、可信的 Agent 启动上下文
docs/knowledge/      正式知识与飞书唯一发布源
docs/technical/      技术方案、治理、调研、运维和迁移
docs/learning/       学习过程、教程和来源
docs/adr/            正式架构决策
scripts/             工程和验证脚本
```

`agents/` 与 `knowledge-packs/` 只在首批真实角色和知识包准备好时建立，不创建空壳。当前不创建根级 `products/`。

## 协作与 Context 所有权

项目采用三层协作模型：

```text
总控 Planner
  → 负责目标、规划、语义资产、Context 和复审

Executor
  → 负责冻结文件的确定性落盘、验证、Commit 和 Push

用户
  → 负责重要变化审批和最终 Review
```

核心规则：

> Context 由总控 Planner 维护，Executor 只执行，其他 Agent 只报告变化，用户最终确认。

详细规则见：

- [`AGENTS.md`](AGENTS.md)
- [`context/AGENTS.md`](context/AGENTS.md)
- [`docs/knowledge/05_上下文与知识系统/KNO-011-上下文所有权与维护机制.md`](docs/knowledge/05_上下文与知识系统/KNO-011-上下文所有权与维护机制.md)

## Git 与飞书

```text
Git → Feishu
```

Git 是唯一真源。Feishu 只做面向人的覆盖式投影。

发布规则：

- 不读取 Feishu 旧正文；
- 不做 Git 与 Feishu 语义 Diff；
- 不合并；
- 不反向同步；
- 首次按映射文档逐篇 `overwrite`；
- 映射稳定后只覆盖 Git 中发生变化的正式知识文档。

## 尚未完成

- 动态 Task Store；
- Execution / Result 持久化；
- Executor Adapter 与 Execution Lane；
- Approval、Evidence、Side-effect Ledger；
- Health & Recovery；
- 多执行器和多 Agent 自动调度；
- 平台自有 MCP Server、Adapter 与统一治理；
- Agent Profile 与 Knowledge Pack；
- Custom GPT Builder 配置的 Git 资产化与确定性发布；
- AI 视频工作流；
- Portfolio Release；
- Feishu 最终发布、发布回读与最终整仓验收；
- 生产级公网入口。

宿主产品已经提供的 MCP、Memory 或其他能力，不等于 `ai-agent-platform` 已经完成对应平台实现。

## 快速导航

1. [`AGENTS.md`](AGENTS.md)：项目宪法和执行规则；
2. [`context/README.md`](context/README.md)：当前上下文恢复入口；
3. [`context/current-status.md`](context/current-status.md)：当前事实和下一步；
4. [`context/roadmap.md`](context/roadmap.md)：阶段顺序和完成门槛；
5. [`docs/knowledge/README.md`](docs/knowledge/README.md)：正式知识导航；
6. [`docs/technical/README.md`](docs/technical/README.md)：工程执行资料；
7. [`platform-registry/README.md`](platform-registry/README.md)：资产关系、状态与 Feishu 映射；
8. [`skills/README.md`](skills/README.md)：可执行 Skill。

## 验证

```bash
npm run check:repo
npm run check:knowledge
npm run check:insights
npm run verify
```

Microsoft Dev Tunnels 只用于开发期 MVP，不视为生产边缘服务。

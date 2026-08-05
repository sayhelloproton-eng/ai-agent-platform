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

- `SOL-CTL-001` 总控代码 MVP：版本化 Agent Profile、Decision Context、先查后领 Controller Claim、受约束 Controller Command 和 Task / Plan / Event 内存 Fixture；
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
- 文档正文与 SVG / PNG 资源同目录、同分支、同 Commit 管理；
- Human-first、AI-lossless 视觉语义块和本地相对图片 Publisher；
- 六个边界清晰的活跃 Skill：Planner Executor Handoff、Project Knowledge Synthesis、Engineering Document Authoring、Project Knowledge Governance、Engineering Insight Distillation、Custom GPT Actions；
- Deterministic Delivery 已并入 Handoff；Microsoft Dev Tunnels 已回归应用 Runbook；
- `planner-executor-handoff v0.5.1 / accepted`；
- Context 所有权和维护机制。

### 工程验证

已经具备：

- Task / Result / Error Contracts；
- Skill、Knowledge、Registry 和仓库级校验；
- 测试、Scope Lock、Handoff 冻结 Artifact 模式、单 Commit 与远端回读；
- 正式知识、代码、测试、决策和证据的可追踪关系。

## 当前阶段

当前处于：

```text
Phase 2 — 四个核心 MVP 分领域实现与跨领域审计
```

第二阶段方案已收敛为 Controller、Local Control、Task Control 和 Browser Host 四个核心 MVP；手机模型是后置可选 Provider。当前总控 MVP 已形成代码候选和本地 HTTP Fixture 闭环：

```text
Agent Profile
→ Decision Context
→ Controller Claim
→ Controller Command
→ Task + Plan + Event 一致推进
```

这不表示正式 Task Center 已实现。当前 Task Control 仍是 `action-gateway` 内的明确 Fixture；Custom GPT Builder 人工配置和 Preview 实调仍待完成。精确状态与当前工作见：

- [`context/current-status.md`](context/current-status.md)
- [`context/roadmap.md`](context/roadmap.md)

## 仓库资产

```text
apps/                可运行应用
packages/            共享代码与领域能力
agent-profiles/      Custom GPT 公共基线、角色、具体 Profile 与发布记录
skills/              程序性 Agent 能力
platform-registry/   跨资产身份、关系、状态和投影
context/             短、小、当前、可信的 Agent 启动上下文
docs/knowledge/      正式知识与飞书唯一发布源
docs/technical/      技术方案、治理、调研、运维和迁移
docs/learning/       学习过程、教程和来源
docs/adr/            正式架构决策
scripts/             工程和验证脚本
```

`agent-profiles/` 已保存首个真实总控 Profile；禁止创建根级 `agents/`，避免与 Codex、OpenCode 等宿主约定冲突。`knowledge-packs/` 只在首个稳定知识包真实物化时建立。当前不创建根级 `products/`。

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
- [`docs/knowledge/05_上下文与知识系统/KNO-011-上下文运行流转与恢复机制/README.md`](docs/knowledge/05_上下文与知识系统/KNO-011-上下文运行流转与恢复机制/README.md)

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
- Knowledge Pack；
- Custom GPT Builder 配置的自动发布；
- 总控 Profile 的 Builder 人工配置与 Preview 实调；
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
8. [`agent-profiles/README.md`](agent-profiles/README.md)：总控 Profile 配置入口；
9. [`skills/README.md`](skills/README.md)：六个活跃 Skill 与退役映射。

## 验证

```bash
npm run check:repo
npm run check:skills
npm run check:knowledge
npm run check:authoring
npm run check:insights
npm run check:synthesis
npm run check:controller-mvp
npm run verify
```

Microsoft Dev Tunnels 只用于开发期 MVP，不视为生产边缘服务。

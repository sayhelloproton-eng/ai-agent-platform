# AI Agent Platform

`ai-agent-platform` 是面向 AI Agent 工程学习、真实平台建设、知识治理、多 Agent 协作和求职 Portfolio 的长期工程项目。

本仓库不是提示词集合，也不是单一聊天机器人。它同时承载可运行代码、Agent 能力、正式知识、技术方案、架构决策、实验、工程证据和面向人的飞书投影。

## 当前状态

当前处于 **Phase 2.5：AI Coding Workflow 已完成首个端到端 MVP，进入知识资产重构与平台治理阶段**。

实现事实基线：

```text
main
bd31893ddb9bb2efeb3cb38f67f1add66735cd79
```

该提交代表进入知识资产重构前的已验证实现事实，不代表当前知识重构分支已经合并到 `main`。

知识资产重构工作状态：

```text
Branch: knowledge-rebuild-v2
Commit: 以该分支实际 HEAD 为准
Batch 01: 已完成
Batch 01-R1: 已完成
Batch 02: 已完成并通过 Review
Batch 02-R1: 已完成并通过 Review
Current Work: Batch 05 智能体资产与工作流治理正文已物化，等待真实 Commit Review
```

Batch 02 的十一篇项目入口与产品体系正文已经成为 accepted Git 正式知识。CAP-001～CAP-008、THY-001～THY-006、ARC-007～ARC-014、ARC-016 与 KNO-001～KNO-010 已通过真实 Commit Review 并成为 accepted。ARC-017～ARC-018、AGT-001～AGT-010 与 WFL-005～WFL-012 已首次物化为 partial，等待真实 Commit Review。图片、HTML 与飞书发布仍未开始。

已验证链路：

```text
Custom GPT
  → Microsoft Dev Tunnels
  → Action Gateway
  → Local Runtime
  → gateway.ping / runtime.status
```

已实现：

- npm workspaces 工程基线；
- `contracts`、`auth`、`policy` 三个共享包；
- `action-gateway`、`local-runtime`、`dev-tunnel` 三个应用；
- 双层 API Key、双层 Capability Policy、Loopback 边界；
- Rate Limit、并发、Timeout、响应大小和安全错误映射；
- Custom GPT Builder、Preview 和正式自然语言 Action 调用；
- AI Knowledge、Custom GPT Actions、Microsoft Dev Tunnels、Engineering Insight Distillation 四个 Skill；
- Engineering Insight Registry 与首批五条工程洞见。

尚未实现：

- 动态 Task Control；
- 持久任务状态；
- Approval、Evidence、Side-effect Ledger；
- Health & Recovery；
- 多执行器和多 Agent 自动调度；
- MCP；
- AI 视频工作流；
- 生产级公网入口；
- 完整 Agent Profile 和 Knowledge Pack 发布体系。

## 平台目标

平台长期按六层理解：

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

## Git 与飞书

```text
Git → Feishu
```

Git 是唯一真源。飞书只做面向人的覆盖式投影。

发布规则：

- 不读取飞书旧正文；
- 不做 Git 与飞书语义 Diff；
- 不合并；
- 不反向同步；
- 首次按映射文档逐篇 `overwrite`；
- 映射完成后只覆盖 Git 中发生变化的文档。

## 工作方式

当前 Chat 负责目标、架构、正文、任务拆解和复审；Codex / Work 负责真实仓库修改、测试、Commit 和证据。

每个完整逻辑批次单独提交。提交后以远端 Commit SHA 重新审计，不依赖执行报告代替实际 Diff。

## 快速导航

1. [`AGENTS.md`](AGENTS.md)：项目宪法和执行规则；
2. [`context/README.md`](context/README.md)：当前上下文恢复入口；
3. [`context/current-status.md`](context/current-status.md)：当前事实和下一步；
4. [`docs/knowledge/README.md`](docs/knowledge/README.md)：正式知识导航；
5. [`docs/technical/README.md`](docs/technical/README.md)：工程执行资料；
6. [`platform-registry/README.md`](platform-registry/README.md)：资产关系、状态与飞书映射；
7. [`skills/README.md`](skills/README.md)：可执行 Skill。

## 验证

```bash
npm run check:repo
npm run check:knowledge
npm run check:insights
npm run verify
```

Microsoft Dev Tunnels 只用于开发期 MVP，不视为生产边缘服务。

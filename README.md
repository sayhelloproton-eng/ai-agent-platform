# AI Agent Platform

`ai-agent-platform` 是面向 AI Agent 工程学习、真实平台建设、知识治理、多 Agent 协作和求职 Portfolio 的长期工程项目。

本仓库不是提示词集合，也不是单一聊天机器人。它同时承载可运行代码、Agent 能力、正式知识、技术方案、架构决策、实验、工程证据和面向人的飞书投影。

## 当前状态

当前处于 **Phase 2.5 最终内容 Review 准备完成：知识资产重构、执行治理、正式视觉资产和 Batch 10 `main` 集成均已收口**。

当前正式基线：

```text
main
以 origin/main 实际 HEAD 为准
```

`main` 是 Batch 10 合并后的正式代码与知识基线；`knowledge-rebuild-v2` 继续承载 Batch 10 后的控制面与最终内容 Review 收口；`knowledge-assets` 继续保存正式 SVG / PNG 源资产。

知识资产重构工作状态：

```text
Formal Baseline: main
Control Branch: knowledge-rebuild-v2
Batch 01～Batch 10: 已完成
Knowledge Assets: 已完成并保留独立 source branch
Current Work: MIG-002 最终集中内容 Review 控制计划已物化，R-01～R-06 尚未执行
```

Batch 01～Batch 10 的知识资产重构与 `main` 集成已经完成。最终集中内容 Review 将按 MIG-002 的六个域执行，Review 完成后才分别决定 Feishu 单向覆盖发布与最终整仓验收；两者均需独立授权。Git 仍是唯一真源，Feishu 最终发布尚未开始。

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
- AI Knowledge、Deterministic Delivery、Custom GPT Actions、Microsoft Dev Tunnels、Engineering Insight Distillation、Planner Executor Handoff 六个正式 Skill；
- `planner-executor-handoff v0.4.0` 已实现、验证并经 Chat Review 标记为 `accepted`；
- Engineering Insight Registry 与首批五条工程洞见。

尚未实现：

- 动态 Task Control；
- 持久任务状态；
- Approval、Evidence、Side-effect Ledger；
- Health & Recovery；
- 多执行器和多 Agent 自动调度；
- MCP；
- AI 视频工作流；
- Portfolio Release；
- 最终正式内容 Review 与 Feishu 最终发布；
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

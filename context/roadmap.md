# Roadmap

## Current Position

```text
Working Branch:
  main

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2.5 — Knowledge Review Closure and Feishu Publication Preparation

Current Work:
  Control-plane closure, Git verification and publication preparation
```

`docs/knowledge/00～10` 已完成本轮 Canonical 内容 Review 和落库。当前不再按章节继续扩写，主线已经切换为状态、映射、证据和发布控制面的最终收口。

准确 Commit、远端状态和仓库洁净度必须从 Git 实时读取，不在 Roadmap 中长期硬编码。

---

## Phase 1 — Knowledge Foundation

状态：**Completed**

已经形成：

* Git 唯一真源；
* Context 治理；
* 正式知识与技术资料边界；
* Platform Registry；
* Engineering Insight Registry；
* Document Bundle；
* Human-first、AI-lossless 视觉资产；
* Git → Feishu 单向覆盖原则；
* Feishu 本地图片上传与语义镜像规则；
* 六个活跃 Skill；
* Planner–Executor 冻结 Artifact 交付。

Feishu 实际全量投影尚未执行。

---

## Phase 2 — AI Coding Workflow

状态：**MVP Verified / Platform Incomplete**

已经验证：

```text
Custom GPT
→ Dev Tunnels
→ Action Gateway
→ Local Runtime
→ gateway.ping / runtime.status
```

已有 Contracts、Auth、Policy、Gateway、Runtime、开发期 Tunnel、Custom GPT Action 和人工 Planner–Executor Git 闭环。

尚未实现：

* 动态 Task Store；
* Execution / Result 持久化；
* Approval；
* Evidence；
* Side-effect Ledger；
* Safe Continuation；
* 自动 Health Recovery；
* 多角色 Handoff Runtime；
* 多任务依赖和并行 Lane；
* 多执行器 Capability Routing。

---

## Phase 2.5 — Knowledge Review Closure and Publication Preparation

状态：**Canonical Content Completed / Publication Pending**

### 已完成内容范围

* `context/**` 治理模型；
* `docs/knowledge/00_项目入口/**`；
* `docs/knowledge/01_产品体系/**`；
* `docs/knowledge/02_基础产品与能力/**`；
* `docs/knowledge/03_Agent工程架构思想与方法论/**`；
* `docs/knowledge/04_平台架构/**`；
* `docs/knowledge/05_上下文与知识系统/**`；
* `docs/knowledge/06_智能体资产体系/**`；
* `docs/knowledge/07_工作流与项目治理/**`；
* `docs/knowledge/08_实验与复盘/**`；
* `docs/knowledge/09_作品集/**`；
* `docs/knowledge/10_术语与来源/**`。

### 当前 Closure

当前必须完成：

1. 根 README 与 Current Context 同步；
2. Registry、Relations、Migration、Release 和 Implementation Status 闭环；
3. Visual Registry、主 Assets 与 Relations 三方一致；
4. 旧 ARC ID 的当前入口修复；
5. Skill、Experiment 和 Portfolio 证据口径收紧；
6. Node 20 全量验证；
7. Git Commit、Push 和远端回读；
8. 总控 Chat 基于固定 Commit 最终复审。

### 发布门槛

进入 Feishu Preview 前必须满足：

* Worktree、Index、Untracked 干净；
* 本地与远端 SHA 一致；
* `git diff --check` 通过；
* `npm run check:repo` 通过；
* `npm run verify` 通过；
* Registry、Visual、Document Bundle 全部通过；
* 当前知识入口不再指向历史资产；
* Projection Policy 明确；
* 所有资产仍保持 `unpublished`；
* 未伪造 Feishu `node_id`。

Feishu Preview、实际覆盖和 Readback 必须使用独立授权。

---

## Phase 3 — Minimal Trusted Agent Slice

状态：**Next after Publication Closure**

推荐的首个纵向切片：

```text
Minimal Agent Profile
→ Task Contract 引用稳定 Agent / Role ID
→ Gateway / Runtime 解析
→ Scope / Policy
→ Evidence
→ 人工 Approval
→ Result / Checkpoint
```

该切片用于同时验证：

* `05_上下文与知识系统`；
* `06_智能体资产体系`；
* `07_工作流与项目治理`；
* Gateway / Runtime；
* Evidence / Approval。

在该切片出现真实消费者前，不批量创建 Agent Profile、Knowledge Pack 或空目录。

---

## Phase 4 — Product Workflow

状态：**Planned**

完成可信任务闭环后，再推进 AI 视频工作流的最小纵向产品切片。

不得提前把仓库改造成根级多产品总仓。

---

## Phase 5 — Portfolio Release

状态：**In Preparation**

作品集必须连接：

* 真实代码；
* 自动测试；
* 调用证据；
* 实验；
* 架构决策；
* Registry；
* Git Commit；
* Feishu 投影；
* Readback；
* 当前限制和未来路线。

对外表述统一使用：

* 已实现并测试；
* 真实链路已验证；
* 正式设计已接受；
* 计划中；
* 历史归档。

不得把“正式设计已接受”写成“运行能力已验证”。

---

## Deferred

* 批量 Agent Profile；
* 正式 `agents/**`；
* 正式 `knowledge-packs/**`；
* Agent Profile / Knowledge Pack Publisher；
* Agent Eval Release；
* 外部 Knowledge Service / RAG；
* 自动 Memory 晋升；
* 完整多执行器调度；
* 生产级公网入口；
* 通用 Agent SaaS；
* 根级 `products/`。

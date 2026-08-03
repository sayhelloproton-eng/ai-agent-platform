# Roadmap

## Current Position

```text
Working Branch:
  main

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2.5 — Homepage Convergence and Feishu Publication Preparation

Current Work:
  Apply frozen project/product convergence and prepare Feishu reset, pilot and full projection
```

正式知识已完成内容 Review。原 `00_项目入口` 与 `01_产品体系` 已通过 Project Knowledge Synthesis 收敛为 `00_项目与产品`；当前不再继续扩写章节，而是应用冻结正文和图片、形成 Git 基线并完成 Feishu 投影闭环。

准确 Commit、远端状态和仓库洁净度必须从 Git 实时读取，不在 Roadmap 中长期硬编码。

---

## Phase 1 — Knowledge Foundation

状态：**Completed**

已经形成：

* Git 唯一真源；
* Context 治理；
* 正式知识与技术资料边界；
* Platform Registry 和 Engineering Insight Registry；
* Document Bundle；
* Human-first、AI-lossless 视觉资产；
* Git → Feishu 单向覆盖原则；
* 本地图片上传和语义镜像规则；
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

尚未实现：动态 Task Store、持久 Execution / Result、Approval、Evidence、Side-effect Ledger、自动 Recovery、多角色 Runtime、多任务 Lane 和多执行器 Routing。

---

## Phase 2.5 — Knowledge and Feishu Closure

状态：**Homepage and Visuals Frozen / Publication Pending**

### 当前正式内容范围

* `docs/knowledge/00_项目与产品/**`；
* `docs/knowledge/02_基础产品与能力/**`；
* `docs/knowledge/03_Agent工程架构思想与方法论/**`；
* `docs/knowledge/04_平台架构/**`；
* `docs/knowledge/05_上下文与知识系统/**`；
* `docs/knowledge/06_智能体资产体系/**`；
* `docs/knowledge/07_工作流与项目治理/**`；
* `docs/knowledge/08_实验与复盘/**`；
* `docs/knowledge/09_作品集/**`；
* `docs/knowledge/10_术语与来源/**`。

### 本轮冻结内容

1. 合并原 `00_项目入口` 与 `01_产品体系`；
2. 重建 `CTX-001《智能体工程探索录》`；
3. 将 `CTX-001` 设为 Feishu 独立根首页来源；
4. 将其余 CTX、DEC、PRD 页面归入飞书“项目与产品”；
5. 新增务实总揽架构图；
6. 重生成 `VIS-011～VIS-014`；
7. 同步 Registry、Relations、Visual Manifest、Context、Navigation 和 Projection Policy；
8. 通过 Planner–Executor Handoff 交付冻结 ZIP。

### Git Closure 门槛

* 固定 Base Commit；
* Worktree、Index、Untracked 干净；
* 只应用 Manifest 声明的 Overlay / Delete；
* 每个结果文件与冻结文件逐字节一致；
* `git diff --check`、Registry、Visual、Document Bundle 和 `npm run verify` 通过；
* 单 Commit、普通 Push、本地远端 SHA 一致。

### Feishu Closure 顺序

```text
导出现有节点树
→ 保留 Space 和根页面
→ 删除全部旧子页面
→ 覆盖 CTX-001 根首页
→ 创建平台架构栏目并试发布 ARC-001
→ 用户人工确认
→ 全量覆盖和图片上传
→ Readback Verification
→ publication status 独立落库
```

Pilot 和全量发布必须分阶段；Pilot 未经用户确认不得自动继续。

---

## Phase 3 — Minimal Trusted Agent Slice

状态：**Next after Publication Closure**

推荐纵向切片：

```text
Minimal Agent Profile
→ Task Contract 引用稳定 Agent / Role ID
→ Gateway / Runtime 解析
→ Scope / Policy
→ Evidence
→ 人工 Approval
→ Result / Checkpoint
```

在真实消费者出现前，不批量创建 Agent Profile、Knowledge Pack 或空目录。

---

## Phase 4 — Product Workflow

状态：**Planned**

完成可信任务闭环后，再推进 AI 视频工作流的 Story → JSON 最小切片。不得提前把仓库改造成根级多产品总仓。

---

## Phase 5 — Portfolio Release

状态：**In Preparation**

作品集必须连接真实代码、自动测试、调用证据、实验、架构决策、Registry、固定 Commit、Feishu Readback 和当前限制。

对外表述统一使用：已实现并测试、真实链路已验证、正式设计已接受、计划中、历史归档。

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

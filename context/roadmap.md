# Roadmap

## Current Position

```text
Formal Baseline:
  main@374f07b7ede3593400bf8631994fb1e91a4123bd

Working Branch:
  knowledge-rebuild-v2

Last Verified Review Source:
  16a847a7a9df1021a562ac049405fba9d36066a6

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2.5 — Human Content Review and Knowledge Release Closure

Current Review Group:
  docs/knowledge/01_产品体系/**
```

当前已经完成：

- Batch 01～10 的知识资产重构与 `main` 集成；
- Git 唯一真源与 Platform Registry；
- 六个已验证或已接受 Skill；
- Project Knowledge Synthesis v0.1.0 物化及首个目录聚合 Pilot，状态 `in_review`；
- Action Gateway → Local Runtime 窄链路 MVP；
- 正式视觉资产与 `asset://` 发布机制；
- `planner-executor-handoff v0.5.1 / accepted`；
- `context/**` 人工 Review 与治理收口；
- `docs/knowledge/00_项目入口/**` 聚合收口。

当前尚未完成：

- `01_产品体系` 及后续知识目录的人工 Review；
- Project Knowledge Synthesis 的更多真实 Pilot 与接受评审；
- 最终人工内容验收；
- Feishu 最终发布、发布回读和最终整仓验收。

详细 Release 和 Migration 历史见 Platform Registry、迁移计划与 Git Commit。

---

## Phase 1 — Knowledge Foundation

状态：**Completed**

已完成 Git 唯一真源、Context、正式知识与技术文档边界、Platform Registry、Engineering Insight Registry、知识发布机制、`asset://` 和 Feishu 图片 Publisher。

Feishu 最终知识投影尚未执行。

---

## Phase 2 — AI Coding Workflow

状态：**MVP Verified / Platform Incomplete**

已实现 Contracts、Auth、Policy、Action Gateway、Local Runtime、Microsoft Dev Tunnels、Custom GPT `runtime.status`、确定性交付、工程洞见提炼和 Planner / Executor Handoff。

尚未实现动态 Task Store、Execution / Result 持久化、Executor Adapter、Approval、Evidence、Side-effect Ledger、Health & Recovery、多执行器调度和完整自动闭环。

---

## Phase 2.5 — Human Content Review and Knowledge Release Closure

状态：**In Progress**

### Review 方法

```text
用户 Review
→ 总控 Planner 语义复审
→ Project Knowledge Synthesis 去重、冲突与落位
→ Planner 生成冻结完整文件
→ Executor 确定性落库
→ Git / Registry 校验
```

### 已完成目录

- `context/**`；
- `docs/knowledge/00_项目入口/**`。

### 当前目录

- `docs/knowledge/01_产品体系/**`。

### Project Knowledge Synthesis

`project-knowledge-synthesis v0.1.0` 已物化并完成 `00_项目入口` 首个 governed Pilot，当前状态为 `in_review`。当前只支持结构化输入、离线 Contract 校验、综合候选和人工审批后的冻结交付，不具备自动写入或发布权限。

### 本阶段完成门槛

1. 所有正式知识目录完成人工 Review 与必要聚合；
2. 所有确认修改项通过冻结文件包落库；
3. 全量 Git、Knowledge、Registry 和 Skill 校验通过；
4. 最终人工内容验收；
5. 独立授权 Feishu 单向覆盖发布；
6. 发布回读与失败修正；
7. 最终整仓验收；
8. 再评估 fast-forward only 接入 `main`。

---

## Phase 2 Next — Task Control and Trusted Execution

状态：**Planned**

目标包括动态 Task State、Task / Execution / Result Store、Executor Adapter、Execution Lane、Approval、Evidence、Side-effect Ledger、Health Event、Snapshot、Retry / Recovery、多执行器适配、资源与成本治理，以及平台自有 MCP Server / Adapter / Governance。

是否使用当前分支、独立 Branch、Worktree、Push、PR 或 Merge，必须由逐任务 Git Operating Policy 明确授权。

---

## Phase 3 — AI Video Workflow

状态：**Planned / Not Started**

用真实业务验证故事理解、角色场景、分镜、提示词、多模型 Adapter、一致性、质量评估、重试审批、成本和结果归档。

当前不新增根级 `products/`；真实产品进入设计或开发后，再按资产类型建立子目录。

---

## Phase 4 — Portfolio Release

状态：**Planned / Not Started**

正式 Portfolio Release 依赖可运行 Demo、真实业务工作流、代码与测试证据、治理与恢复边界、知识投影展示和敏感信息检查。

---

## Deferred and Placeholder Candidates

- Custom GPT Assetization MVP；
- `agents/` 与 `knowledge-packs/`；
- Agent Profile / Knowledge Pack Publisher；
- 外部 Knowledge Service / RAG；
- Project Knowledge Synthesis 自动 Provider、跨仓库索引和批量 Eval；
- 生产级公网入口。

这些能力只有在出现真实调用方、测试和发布目标后继续物化。

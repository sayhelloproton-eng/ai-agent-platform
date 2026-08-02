# Roadmap

## Current Position

```text
Formal Baseline:
  main@374f07b7ede3593400bf8631994fb1e91a4123bd

Working Branch:
  knowledge-rebuild-v2

Last Verified Review Source:
  c4301368c9af11f2f0c40323871dcb59daa9edda

Current HEAD:
  read from Git at runtime

Current Phase:
  Phase 2.5 — Human Content Review and Knowledge Release Closure

Current Status:
  In Progress
```

当前已经完成：

- Batch 01～10 的知识资产重构与 `main` 集成；
- Git 唯一真源与 Platform Registry；
- 六个正式 Skill；
- Action Gateway → Local Runtime 窄链路 MVP；
- 正式视觉资产与 `asset://` 发布机制；
- `planner-executor-handoff v0.5.1` 已通过 Review 并标记为 `accepted`；
- Codex 仓库级集中扫描与首轮内容修订；
- `SOL-KNO-001`、MIG-002、M-01～M-03 的控制面补齐。

当前尚未完成：

- 用户逐篇人工 Review；
- Chat 第二轮 Review；
- 最终人工内容验收；
- Feishu 最终发布；
- 发布回读；
- 最终整仓验收。

详细 Batch、Release 和 Migration 历史见：

- `platform-registry/releases.yaml`
- `platform-registry/migrations/current-migration.yaml`
- `docs/technical/迁移计划/`
- Git Commit 历史

---

## Phase 1 — Knowledge Foundation

状态：**Completed**

已完成：

- Git 作为唯一知识真源；
- `context/`、`docs/knowledge/`、`docs/technical/`；
- AI Knowledge Skill；
- Platform Registry；
- Engineering Insight Registry；
- 知识治理规则；
- Git → Feishu 单向投影机制；
- `asset://` 图片引用；
- Feishu 图片 Publisher；
- 正式视觉资产双分支治理；
- 确定性交付与内容迁移控制面。

这里的“完成”指知识真源、治理、发布机制和 Publisher 已经建立。

**Feishu 最终知识投影尚未执行。**

---

## Phase 2 — AI Coding Workflow

状态：**MVP Verified / Platform Incomplete**

### 已实现

- Task / Result / Error Contracts；
- Auth；
- Policy；
- Action Gateway；
- Local Runtime；
- Microsoft Dev Tunnels；
- Custom GPT `runtime.status` 正式调用；
- Rate Limit；
- 并发限制；
- Timeout；
- 安全错误映射；
- Engineering Insight Distillation；
- Planner / Executor Handoff v0.4.0。

### 尚未实现

- 动态 Task Store；
- Execution / Result 持久化；
- Executor Adapter；
- Execution Lane；
- Approval；
- Evidence；
- Side-effect Ledger；
- Health & Recovery；
- 多执行器自动调度；
- 完整自动任务闭环。

当前窄链路 MVP 证明了接口、认证、Policy、Runtime 和 Capability 可以工作，但不能描述为完整 Agent Platform 已完成。

---

## Phase 2.5 — Human Content Review and Knowledge Release Closure

状态：**In Progress**

### 已完成

- Batch 01～10；
- `MIG-KNOWLEDGE-V2`；
- `MIG-002` Review 控制面；
- Codex 对 R-01～R-06 六域的集中扫描与首轮修订；
- Platform Registry 技术方案；
- Project Knowledge Synthesis Skill Roadmap 占位；
- Portfolio Release 阶段占位；
- 内容、Registry 和代码全量验证。

### 当前执行

```text
用户逐篇人工 Review
→ Chat 第二轮 Review
→ 按目录或逻辑组冻结修改清单
→ 本地 Codex 集中修改
→ Git / Registry 校验
→ 最终人工内容验收
```

Codex 集中扫描与首轮修订不等于最终人工 Review。

### 本阶段完成门槛

必须依次完成：

1. 所有正式文档的用户人工 Review；
2. Chat 第二轮 Review；
3. 所有确认修改项落库；
4. 全量 Git、Knowledge、Registry 和 Skill 校验；
5. 最终人工内容验收；
6. 独立授权 Feishu 单向覆盖发布；
7. 发布回读和失败项修正；
8. 最终整仓验收；
9. 再评估是否以 fast-forward only 接入 `main`。

在本阶段完成前：

- 不执行 Feishu 发布；
- 不启动 Custom GPT 资产化；
- 不创建 `agents/` 或 `knowledge-packs/`；
- 不实现 Project Knowledge Synthesis Skill；
- 不进入 AI Video Workflow；
- 不执行正式 Portfolio Release。

---

## Phase 2 Next — Task Control and Trusted Execution

状态：**Planned**

目标：

- 动态 Task State；
- Task / Execution / Result Store；
- Executor Adapter；
- Execution Lane；
- Approval；
- Evidence；
- Side-effect Ledger；
- Health Event；
- Pause / Resume / Terminate；
- Task Snapshot；
- Retry 与 Recovery；
- 多执行器适配和切换；
- 资源、配额和成本治理；
- 平台自有 MCP Server / Adapter / Governance。

Git 隔离不采用固定规则。

是否使用当前分支、独立 Branch、Worktree、Push、PR 或 Merge，必须由每个任务的 Git Operating Policy 明确授权。

只有存在真实调用方、测试、证据和工程需求时，才新增代码包或运行时资产。

---

## Phase 3 — AI Video Workflow

状态：**Planned / Not Started**

目标是用真实上层业务验证平台能力，包括：

- 故事和脚本理解；
- 角色与场景；
- 分镜；
- 提示词；
- 图片、视频和音频模型 Adapter；
- 角色与视觉一致性；
- 质量评估；
- 重试与人工审批；
- 成本控制；
- 结果归档；
- 可运行 Demo。

AI Video Workflow 依托 `ai-agent-platform` 构建。

当前不新增根级 `products/`，只有真实产品进入设计或开发阶段后，才按实际资产类型在现有目录下建立产品子目录。

---

## Phase 4 — Portfolio Release

状态：**Planned / Not Started**

知识阶段完成后可以持续积累 Portfolio 证据，但正式 Portfolio Release 需要以下前置条件：

- AI Coding Workflow 达到可展示状态；
- 至少一个真实端到端业务工作流；
- 关键代码、测试和 Commit 证据完整；
- 安全、治理、失败恢复和成本边界可解释；
- Feishu / Knowledge Projection 可展示；
- 对外内容通过敏感信息检查。

正式交付包括：

- 可运行 Demo；
- 项目背景和产品价值；
- 架构与能力边界；
- 关键代码和 Commit；
- 测试结果；
- 真实调用证据；
- 失败与修正；
- 安全与治理；
- Feishu / Knowledge Projection 展示；
- README 展示页；
- 简历项目描述；
- 面试讲解材料；
- Release Tag。

---

## Deferred and Placeholder Candidates

以下内容已经设计或进入 Roadmap，但不属于当前执行队列：

### Custom GPT Assetization MVP

- Agent Profile；
- Instructions 真源；
- Conversation Starters；
- Builder 配置；
- Actions / OpenAPI 引用；
- 通用基础 Knowledge Pack；
- 角色专属 Knowledge Pack；
- 确定性发布包；
- Release 和 Hash。

### Agent and Knowledge Assets

- `agents/`；
- `knowledge-packs/`；
- Agent Profile Schema；
- Knowledge Pack Manifest；
- Agent / Skill / Knowledge Pack 发布关系。

这些目录只在首批真实资产准备好时创建，不建立空壳。

### Project Knowledge Synthesis Skill

状态：**Planned / Future**

依赖：

- 稳定的知识综合流程；
- Registry 查询；
- Source 与 Claim 证据；
- 敏感信息检查；
- 确定性交付；
- Eval。

未来输出：

- 综合候选；
- 冲突报告；
- 目标资产建议；
- Knowledge Pack 构建输入。

### External Knowledge Service

- RAG；
- 共享实时知识；
- 权限过滤；
- 增量索引；
- 外部数据源；
- 知识访问审计。

所有候选项都必须在出现真实需求、调用方、测试和发布目标后再物化。

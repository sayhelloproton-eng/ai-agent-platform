# WFL-006 执行通道、验证复审与集成

> 核心结论：执行器只负责实现已冻结合同；执行质量由隔离环境、确定性验证、语义复审、集成后再验证和真实回读共同保证，而不是由模型自信程度保证。

## 1. 文档定位

本文从 Task 满足执行门开始，到结果完成集成和回读结束。它拥有 Execution Lane、Executor Routing、资源预算、Implementation Loop、Deterministic Verification、Semantic Review、Integration 和 Result Readback。

目标与计划由 `WFL-002` 拥有，Task Contract 由 `WFL-005` 拥有，Task 状态和恢复由 `WFL-007` 拥有，Approval 由 `WFL-009` 拥有。

## 2. Execution Gate

进入执行前必须确认：

- Task ID 和 Version；
- Source Commit；
- Scope、Allowed、Forbidden；
- Git Operating Policy；
- Context 引用可读取；
- Capability 和工具可用；
- 需要的 Approval 已满足或动作尚未到审批点；
- Acceptance 和验证命令明确；
- Workspace 没有无法解释的污染；
- 预算、超时与停止条件明确。

任一关键条件失败，Task 进入 `blocked` 或 `waiting_approval`，不能由 Executor 自行降低要求。

## 3. Execution Lane

Execution Lane 绑定：

- Task / Version；
- Executor；
- Workspace；
- Branch / Worktree；
- Source Commit；
- Lease；
- 环境与工具版本；
- Scope；
- Secret / Permission 引用；
- 预算；
- 日志、结果和副作用。

知识落库必须在 Task Contract 与 Git Operating Policy 明确授权的分支上执行；Branch、Worktree、Remote Branch 和 PR 不是默认步骤，而由 Git Operating Policy 决定。

## 4. Executor Routing

模型和工具按任务的不确定性、风险、能力、成本、时间和验证方式选择，而不是永久按品牌分工。

| 任务类型 | 优先执行者 |
|---|---|
| 架构判断、复杂冲突、语义综合 | 强 Planner / Reviewer |
| 已冻结正文的机械落盘 | Codex、低成本 Executor 或脚本 |
| 路径替换、格式、计数、Schema | Script / CI |
| 本机仓库、浏览器或工具副作用 | 受 Policy 和 Approval 约束的本地 Executor |
| 长流程多次尝试 | 有 Checkpoint、预算与停止条件的 Execution |

ChatGPT、Codex、DeepSeek、Work 和 Script 是当前 Provider / Executor 实例，不是永久角色名。

## 5. 资源与 Token 预算

Token、配额、运行时间、网络和计算资源都属于工程预算。

规则：

1. 强模型用于高不确定性判断，不消耗在可脚本化机械劳动。
2. 每个新 Session 不重复解释整个项目，优先使用稳定 Task Contract 和最小 Context。
3. 大任务拆成语义冻结与确定性执行两个阶段。
4. 已有校验脚本优先，不反复让模型扫描全仓。
5. 结果报告只保留决策、变更、证据、限制和下一动作。
6. 达到重试、时间或成本预算时进入暂停或重新规划，不自动降低质量门。
7. Provider 降级必须满足 Task Capability 和验证要求。

## 6. Implementation Loop

```text
读取 Task / Context
  → 验证 Workspace 与版本
  → 实现最小范围变更
  → 运行局部验证
  → 记录 Result / Evidence / Side Effect
  → 达到阶段门后提交 Reviewer
```

Executor 遇到合同外问题时：

- 停止扩大修改；
- 记录事实和影响；
- 形成 Change Request；
- 等待 Planner 更新 Task Version。

## 7. 确定性验证

确定性验证优先使用：

- 文件存在与路径检查；
- Git Diff / Status / Scope；
- Schema；
- 单元、集成、契约与端到端测试；
- Markdown 链接；
- Registry 端点和生命周期；
- 格式、计数和 Hash；
- Commit、Remote SHA；
- 外部系统 Readback。

测试结果必须记录实际命令、退出码、关键输出和运行环境。不能只写“测试通过”。

## 8. 语义复审

Reviewer 必须检查真实资产，而不是只读 Executor 摘要：

- Goal 与成果是否一致；
- 是否越过 Scope；
- 事实层级是否混淆；
- 架构和领域边界是否改变；
- 文档是否重复、冲突或遗漏；
- 安全、权限和副作用是否合规；
- Registry、Context、Migration 和 Release 是否同步；
- 限制是否被诚实记录。

Review 结论分为：

- Accept；
- Accept with Follow-up；
- Request Changes；
- Reject / Replan。

阻断问题回到对应阶段；非阻断措辞问题可以进入集中 Review，但必须明确记录。

## 9. 并行结果与 Integration

并行 Task 必须有明确 Integrator。Integration 负责：

- 比较各子任务 Source Commit 和版本；
- 识别共享文件和语义冲突；
- 按依赖顺序应用结果；
- 处理 Migration 和 supersede；
- 运行集成后完整验证；
- 生成最终 Diff 和 Result；
- 不静默修改子任务目标。

如果两个窗口都需要修改 Context、Registry、Relations 或导航，应先冻结正文，再在最新共同基线上由一个 Integration Task 统一更新。

## 10. Git 副作用

Commit、Push、PR、Merge 必须同时满足：

- Task Contract 授权；
- Git Operating Policy；
- 需要时的 Approval；
- Scope 和测试通过；
- Workspace 可解释；
- Commit 内容精确；
- Push 后 Remote Readback。

禁止默认 Pull、Merge、Rebase、Force Push 或创建远程功能分支。

## 11. 集成后回读

Integration 后至少验证：

- 当前分支和 Commit；
- 本地与远端 ahead / behind；
- Worktree、Index、Untracked；
- 文件数量和路径；
- Registry、链接、测试；
- Release / Projection 状态；
- 实际远端 SHA。

只有本地成功而没有远端或目标系统回读，不能宣称闭环完成。

## 12. 当前实践与目标

当前已实践固定 SHA、冻结 Artifact、Codex 执行、范围检查、单 Commit、普通 Push、远端回读和 Chat Review。目标是加入结构化 Execution Lane、Lease、自动 Executor Routing 和 Integration Task；当前不采用重型通用编排框架。

# WFL-005 任务合同与多角色协作

> 核心结论：Task Contract 是目标、范围、角色、输入、权限、验收、停止和 Git 行为的版本化承诺；它让 Planner、Executor、Reviewer、Approver 与 Integrator 围绕同一个可验证对象协作。

## 1. 文档定位

本文拥有 Task Aggregate、Task Contract、任务内角色分配、版本变化、Handoff Contract 和 Result Contract。

长期 Role、Agent Profile、Skill、Capability 与权限模型属于 `06_智能体资产体系`；Task Contract 只引用这些资产并形成一次任务内分配。

## 2. Task 与其他对象

- **Task**：有稳定 ID、目标、版本、状态、依赖和完成判定。
- **Workflow Run**：某条工作流为推进 Task 产生的一次运行。
- **Execution**：某个 Executor 在某个 Lane 上执行合同的一次尝试。
- **Session**：宿主对话或工具会话，可丢失、切换或重建。
- **Handoff**：一个角色把明确状态和责任交给另一个角色。
- **Result**：Execution 的输出，不自动等于 Task 完成。

一个 Task 可以跨多个 Session、Execution 和 Executor 持续存在。

## 3. Task Contract Schema

```text
task_id
version
task_type
parent_task_id
goal
source_commit
scope
allowed
forbidden
inputs
dependencies
role_assignments
capability_set
context_refs
approval_requirements
acceptance
evidence_requirements
stop_conditions
failure_policy
git_operating_policy
guidance_tier
execution_authority
budget
report_format
```

字段必须可由机器校验，必要的自然语言说明应保持明确、短小和可验证。

## 4. 核心字段

### Goal

描述任务完成后应出现的可观察结果，不写成“研究一下”“尽量完善”等不可验收表述。

### Scope、Allowed、Forbidden

- Scope 定义可修改和可读取边界。
- Allowed 定义授权动作。
- Forbidden 定义即使工具可用也不得执行的动作。
- 未列出的高风险动作默认不授权。

### Inputs

输入必须带稳定路径、Asset ID、Commit、Hash、版本或外部资源标识；不得仅写“使用之前的内容”。

### Acceptance

验收必须能通过文件、测试、Schema、Diff、回读或人工 Review 判断。

### Stop Conditions

定义何时必须暂停或终止，例如 Scope 漂移、输入版本变化、权限不足、外部状态异常、验证失败达到预算上限。

## 5. 角色分配

| 角色 | 任务内责任 | 不得越界 |
|---|---|---|
| Project Owner | 目标、关键决策、风险接受和最终确认 | 不用自然语言跳过 Evidence |
| Planner | 恢复事实、规划、拆分、冻结候选合同 | 不执行未授权副作用 |
| Executor | 按合同实现、运行命令并报告结果 | 不改目标、Scope 或架构 |
| Reviewer | 检查真实 Diff、文件、测试、证据和边界 | 不只读执行摘要 |
| Approver | 对具体高风险动作作一次决定 | 不永久开放全部权限 |
| Integrator | 合并并行结果、解决冲突、重新验证 | 不静默改变子任务目标 |
| Publisher | 构建派生包、发布并回读 | 不反向修改 Canonical Asset |

低风险任务中一个主体可以承担多个角色，但必须显式记录。高风险写入优先分离 Executor 与 Approver。

## 6. Git Operating Policy

每个会修改仓库的 Task 必须明确：

- 当前分支；
- 目标分支；
- 是否允许新建本地分支；
- 是否允许新建远程分支；
- 是否允许 Worktree；
- 是否允许 Commit；
- Commit 数量和消息；
- 是否允许 Push；
- Push 目标；
- 是否需要 PR；
- 是否允许 Merge；
- Merge 策略；
- 是否允许 Pull、Rebase、Force Push；
- 是否允许删除 Branch、Worktree 或清理远程分支。

“需要 Chat Review”不能自动推导为“创建并 Push 远程功能分支”。

## 7. Guidance Tier 与 Execution Authority

Guidance Tier 描述任务说明的详细度；Execution Authority 描述执行器可做的动作范围。两者必须分开。

- 高不确定性任务需要更强 Guidance 和较窄 Authority。
- 冻结 Artifact 的机械落盘可以减少 Guidance，但 Authority 仍必须精确。
- Authority 不因模型能力强而扩大。

## 8. 版本与失效

以下变化必须生成新 Task Version：

- Goal；
- Scope、Allowed 或 Forbidden；
- Source Commit 或关键输入；
- 角色和权限；
- Acceptance；
- Evidence Requirement；
- Git Operating Policy；
- 高风险目标或发布目标。

新版本产生后：

- 旧 Approval 默认失效；
- 旧 Lease 必须重新确认；
- 未提交结果必须重新比较；
- Reviewer 必须知道结果基于哪个版本；
- Handoff 必须引用最新版本。

## 9. Handoff Contract

Handoff 至少包含：

- Task ID / Version；
- 当前状态；
- Source Commit 和 Workspace 状态；
- 已完成与未完成；
- 当前 Execution Point；
- Context、Evidence、Approval 和 Side Effect 引用；
- 已知错误与风险；
- 下一动作；
- 接收条件；
- 发送方和接收方；
- Receipt。

接收方必须执行 Accept、Reject 或 Request Clarification。没有 Receipt 的单向消息不算完成移交。

## 10. Result Contract

Executor 结果至少包含：

- 实际变更；
- 实际命令与返回；
- 测试和验证；
- 产生的 Evidence；
- Side Effects；
- 与合同的偏差；
- 限制和未完成项；
- 建议下一状态；
- Commit / Push / PR 结果；
- 远端或外部 Readback。

Result 只能建议 Task 状态，不能自行宣告最终完成。

## 11. Completion Contract

Task Closeout 由 Task Control、Reviewer / Evidence 和必要的 Owner / Approver 共同决定。完成时写入：

- 终态；
- 接受的 Result；
- 满足的 Acceptance；
- 关键 Evidence；
- Side-effect Readback；
- Release / Migration / Projection；
- 未完成项与后续 Task；
- Context / Knowledge Feedback；
- 最终 Source Commit。

## 12. 当前实现与目标

当前 `planner-executor-handoff`、冻结 ZIP、固定 SHA、精确 Scope、单 Commit、普通 Push 和回读验证已经实践合同化协作。目标是把这些字段进入机器 Contract 和 Task Store；本文不声称自动 Task Store、动态调度和 Approval Store 已经实现。

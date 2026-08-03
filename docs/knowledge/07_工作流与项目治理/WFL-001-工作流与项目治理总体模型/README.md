# WFL-001 工作流与项目治理总体模型

> 核心结论：工作流不是任务步骤列表，而是平台用稳定角色、版本化契约、受控状态、验证证据和副作用治理，把目标转化为正式成果的运行体系。

## 1. 文档定位

平台架构已经定义了 Task Control、Execution Orchestration、Context & Knowledge、Agent Governance、Evidence & Safety、Publishing & Registry 和 Product Domain 的位置。本文不重新划分这些领域，而是说明它们如何围绕同一个目标形成可运行闭环。

本文拥有：

- 工作流类型和调用关系；
- 目标、任务、状态与证据三条线；
- 平台主工作流；
- 横切控制与治理反馈；
- 全局不变量和完成定义。

本文不拥有具体 Task Schema、Context Schema、Agent Profile、Evidence 方法或产品业务规则。

## 2. 核心概念

### 2.1 Workflow

Workflow 是跨角色、跨阶段的受控协作路径。它定义触发条件、输入、阶段、状态引用、角色、门禁、输出、失败路由和退出条件。

### 2.2 Task

Task 是承载目标、版本、范围、依赖、状态和验收的受治理工作单元。Workflow 可以创建、推进和关闭 Task，但 Task 的状态由 Task Control 拥有。

### 2.3 Process 与 SOP

Process 描述较稳定的业务过程；SOP 描述人在固定场景下的操作步骤。它们可以被 Workflow 调用，但不能替代任务状态、权限、Evidence 和恢复机制。

### 2.4 Orchestration

Orchestration 负责协调多个阶段、角色和能力。当前阶段采用轻量应用服务和明确合同，不以重型通用 Workflow Engine 为前提。

## 3. 工作流拓扑

```text
目标入口
  ↓
WFL-002 目标进入、决策规划与任务分解
  ↓
WFL-005 任务合同与多角色协作
  ↓
WFL-006 执行通道、验证复审与集成
  ↓
WFL-010 资产变更、发布与关联同步
  ↓
WFL-012 项目状态、阶段复审与基线治理
```

横切控制：

```text
WFL-007 Task Control & Continuity
  包裹运行中的 Task，管理状态、Lease、Checkpoint、暂停恢复和终止

WFL-009 Approval & Side-effect Governance
  在高风险或外部写入动作前后提供一次性审批、Ledger 和回读
```

专项扩展：

```text
WFL-011 Product Incubation & Specialized Workflow
  在产品决策后进入 WFL-002；
  执行时复用 WFL-005/006/007/009/010，不复制平台控制面
```

## 4. 三条必须分开的线

### 4.1 目标与决策线

由 Project Owner 和 Planner 主导，记录目标、约束、问题、候选方案、决策和 Plan Freeze。它回答“为什么做”和“做什么”。

### 4.2 任务与执行线

从 Task Contract 开始，记录执行范围、角色、能力、环境、实现、验证、Review 和 Integration。它回答“谁如何完成”。

### 4.3 状态与证据线

由 Task Control、Evidence 和 Side-effect Record 支撑，记录 Task 当前状态、执行点、验证结果、审批、副作用和 Readback。它回答“实际发生了什么”。

自然语言摘要可以引用三条线，但不能取代它们的正式记录。

## 5. 平台主工作流阶段

| 阶段 | 主要 Owner | 主要输入 | 主要输出 | 退出门 |
|---|---|---|---|---|
| Intake | Planner | 目标、问题、机会或变更请求 | Intake Record | 入口信息足够或明确进入补充 |
| Context Recovery | Context & Knowledge | Source Commit、知识与 Registry 引用 | Context Package / Instance | 来源、版本和缺口可见 |
| Decision & Plan | Owner / Planner | 事实、约束、候选方案 | Decision、Plan | 用户或授权 Owner 确认 |
| Task Freeze | Task Control / Planner | 已确认 Plan | Task Contract vN | 范围、验收、Policy 完整 |
| Execution | Execution Orchestration | Task、Context、Capability | Result、Diff、Logs | 执行完成或进入受控中断 |
| Verification & Review | Reviewer / Evidence | Result、真实文件和测试 | Evidence、Review Decision | 阻断问题关闭 |
| Integration | Integrator | 已通过结果 | Integrated Result | 集成后重新验证 |
| Release & Projection | Publishing & Registry | Canonical Asset | Release、Projection、Readback | 单一真源与派生目标一致 |
| Closeout | Task Control / Governance | 全部结果与证据 | Terminal State、Status Feedback | 完成定义满足 |

## 6. 状态所有权

- Task 目标、版本、依赖、状态和完成判定属于 Task Control。
- Execution、Lane、Lease、Workspace 和 Executor 运行状态属于 Execution Orchestration。
- Context Package、Context Instance、Knowledge Ref 属于 Context & Knowledge。
- Role、Agent Profile、Capability 和长期权限属于 Agent Governance。
- Evidence、Approval、Side-effect Record 和 Recovery Snapshot 属于 Evidence & Safety。
- Canonical Asset、Registry Entry、Release、Projection 属于 Publishing & Registry。
- Story、Character、Scene、Shot 等业务状态属于产品领域。

Workflow 只协调这些状态，不通过共享表或自然语言“统一拥有”。

## 7. 全局不变量

1. 未冻结的方案不得进入有副作用执行。
2. Task Version 变化后，旧 Approval、Lease 和未集成结果必须重新校验。
3. 执行器不得扩大 Scope、修改总体架构或绕过 Git Operating Policy。
4. Context 只提供任务需要的事实和引用，不保存 Task 运行状态。
5. Approval 是绑定具体动作、目标、版本和期限的一次决定，不是永久权限。
6. Side Effect 必须可关联 Task、Executor、Approval、时间、目标和 Readback。
7. Provider 变化不得改变合同和完成判定。
8. 失败、暂停、取消、终止与完成是不同终态或控制态。
9. Derived Package 和 Projection 不得反向覆盖 Git Canonical Asset。
10. 项目汇报只能生成状态候选，不能直接把执行者声明写成正式事实。

## 8. 完成定义

Task 进入 `succeeded` 至少需要：

- Task Version 未漂移；
- Scope、Allowed、Forbidden 和 Git Policy 未越界；
- Required Acceptance 全部满足；
- 确定性验证具有真实命令与结果；
- 语义复审通过或有明确豁免；
- 高风险副作用已经登记和回读；
- 并行结果完成集成后重新验证；
- 受影响 Registry、Context、Release 或 Migration 已处理，或形成显式 Pending；
- 限制、风险与未完成项被记录；
- Task Control 写入终态，而不是仅由执行器口头报告。

## 9. 当前、目标与非目标

### 当前已实践

- 用户决策与 Chat Planner；
- 固定 Source Commit；
- 冻结 Artifact；
- `planner-executor-handoff`；
- Codex 机械落库；
- 范围与确定性校验；
- Commit、Push 和远端 SHA 回读；
- 人工 Review 与基线归档。

### 目标设计

- 结构化 Task Store；
- Task State Machine 与 Lease；
- Execution Lane 与 Executor Adapter；
- Approval Store 与 Side-effect Ledger；
- 自动 Impact Plan；
- Project Status Governance。

### 当前非目标

- 通用 Agent SaaS；
- 无限并行和集群调度；
- 以 LangGraph 或通用 Workflow Engine 作为架构中心；
- 让执行器自行重规划并扩展范围；
- 把模型品牌写成永久流程角色；
- 让上层产品反向定义平台控制面。

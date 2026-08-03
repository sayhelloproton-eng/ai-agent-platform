# WFL-011 产品孵化与专项业务工作流框架

> 核心结论：产品机会必须先经过问题、用户、价值、证据和决策门；被接受的专项业务流程只定义自己的业务状态，并通过接入合同复用平台 Task、Context、Execution、Approval、Evidence、Recovery 和 Release。

## 1. 文档定位

本文拥有 Opportunity Intake、产品候选、Product Decision Gate、Asset Plan 和 Specialized Workflow Plug-in Contract。

产品愿景、用户、需求和业务对象属于 `00_项目与产品`；平台通用控制能力属于其他 WFL 文档。本文不直接创建未立项产品的代码目录，也不把单一技术功能自动升级为产品。

## 2. 核心对象

- **Opportunity**：值得进一步调查的问题或机会。
- **Product Candidate**：具备用户、场景、价值、假设和验证方案的候选产品。
- **Product Decision**：继续、补证据、暂停或拒绝。
- **Product Asset Plan**：进入产品设计后需要生成的受控资产。
- **Specialized Workflow**：属于具体产品领域的业务流程。
- **Delivery Task**：由平台 Task Contract 承载的具体执行工作。

## 3. 产品孵化流程

```text
Opportunity Intake
  → Evidence Collection
  → Problem / User / Scenario
  → Value / Assumptions / Constraints
  → Concept Options
  → Capability Gap
  → Experiment Request
  → Product Decision Gate
  → Product Asset Plan
  → WFL-002 目标规划与任务分解
```

## 4. 入口资格

至少说明：

- 问题来源；
- 受影响用户；
- 发生场景；
- 期望结果；
- 已知约束；
- 为什么现在值得调查；
- 已有证据和未知项。

纯技术冲动、模型发布或单一功能想法可以记录为 Opportunity，但不能直接成为产品需求。

## 5. Evidence 与假设

产品候选必须区分：

- 用户事实；
- 市场或生态事实；
- 工程能力事实；
- 假设；
- 需要实验验证的风险；
- 个人偏好；
- 当前资源限制。

实验设计和 Evidence 质量由 `08_实验与证据` 定义；本文只生成 Experiment Request 和使用结果做决策。

## 6. Product Decision Gate

Project Owner 评估：

- 战略匹配；
- 用户价值；
- 可验证性；
- 能力缺口；
- 时间和成本；
- 风险；
- 机会成本；
- 是否适合作为平台真实验证场景。

决定：

- Continue；
- Evidence Needed；
- Pause；
- Reject。

Decision 必须进入 Registry 或项目历史，不因聊天结束而丢失。

## 7. Product Asset Plan

根据阶段生成：

- Product Brief；
- 用户与场景；
- 领域词汇；
- 需求和非目标；
- Capability Gap；
- Experiment；
- ADR；
- Roadmap；
- 最小纵向切片；
- Specialized Workflow；
- Acceptance。

未进入设计或开发阶段时，不创建空代码包、大规模知识目录或根级 `products/`。

## 8. Specialized Workflow Plug-in Contract

专项业务流程至少声明：

```text
workflow_type
product_id
domain
entry_criteria
business_inputs
business_outputs
business_state_owner
platform_task_mapping
context_requirements
capability_requirements
approval_requirements
evidence_requirements
budget_and_retry
stop_and_recovery
release_target
platform_capabilities_reused
```

专项流程拥有自己的业务对象和状态，但不得重复实现：

- Task Version；
- Lease；
- Checkpoint；
- Approval Store；
- Evidence Store；
- Side-effect Ledger；
- Executor Routing；
- Release / Projection 控制。

## 9. 专项流程与平台主线

```text
产品业务事件
  → Specialized Workflow 判断业务状态
  → 创建或更新 Platform Task
  → WFL-005 冻结合同
  → WFL-006 执行和验证
  → WFL-007 控制状态和恢复
  → WFL-009 管理高风险副作用
  → WFL-010 发布资产或业务结果
  → 回写产品领域状态
```

平台不理解所有产品细节；产品流程不绕过平台控制面。

## 10. AI 视频示例边界

AI 视频可以包含 Story、Character、Scene、Shot、Prompt、Generation、Evaluation 等业务对象和流程。详细内容由 `00_项目与产品` 的 AI 视频资产及未来真实实现拥有。

`07` 只规定：

- AI 视频业务步骤如何形成 Task；
- 如何请求模型、媒体工具和外部服务；
- 哪些动作需要审批；
- 如何保存 Evidence、Checkpoint 和成本；
- 如何暂停、恢复和重试；
- 生成结果如何验收、发布和回读。

因此旧 `WFL-003 AI 视频工作流` 不再作为平台通用 Canonical 工作流。

## 11. 多产品目录原则

`ai-agent-platform` 是底层平台和当前仓库主体。AI 视频及未来其他产品依托平台构建，当前不新增根级 `products/`，也不提前改成多产品总仓。

当产品真正进入设计或开发阶段时，再根据实际资产类型，在现有相关目录下创建产品子目录，并同步 Registry 和关系。

## 12. 当前实践与目标

AI 视频概念已经 accepted，但完整孵化、实验和开发纵向切片尚未完成。当前由用户与 Chat 人工推进产品决策。目标是以 AI 视频或下一个真实机会试运行本流程，并评估产品治理 Agent 能否稳定生成高质量候选资产。

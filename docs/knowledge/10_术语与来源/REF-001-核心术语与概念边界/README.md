# REF-001 核心术语与概念边界

> 核心结论：术语表的价值不是收集更多名词，而是让同一个概念只有一个主名称、一个明确语义边界和一个状态所有者，避免 Agent、Task、Context、Knowledge、Evidence 与产品名在跨文档协作中互相替代。

## 1. 文档定位

本文是 `ai-agent-platform` 的统一语言入口，负责：

- 核心概念的主名称和简明定义；
- 容易混淆概念的非等价关系；
- 术语所属领域和状态所有权；
- 中文与英文名称的统一使用方式。

本文不替代 Contract、Schema、Registry、状态机或领域正文。若本文与代码 Contract、已接受架构或 Registry 冲突，应报告 Drift 并由对应 Owner 修正，而不是把术语表当作更高优先级真源。

## 2. 命名规则

1. 首次出现采用“中文（English）”，后续使用固定主名称。
2. 稳定资产使用注册 ID，例如 `ARC-001`、`AGT-001`、`WFL-001`。
3. 产品、模型和 Provider 名只描述实现或宿主，不替代 Planner、Executor、Reviewer 等稳定角色。
4. 相同词在不同 Bounded Context 中语义不同时，必须带领域限定。
5. 已被替代的历史名称只用于迁移、审计和历史叙述，不重新进入当前正文。

## 3. 项目与资产

| 术语 | 定义 | 主要所有者 |
|---|---|---|
| Git 唯一真源（Git Truth） | 经过 Review、Commit 和必要回读的正式代码、知识与治理资产 | Git / Project Governance |
| Canonical Asset | 在 Git 中拥有稳定 ID、明确路径和正式生命周期的源资产 | 对应领域 + Platform Registry |
| Derived Asset | 从 Canonical Asset 构建的 Knowledge Pack、发布包或外部配置 | Publishing / Distribution |
| Runtime Artifact | Task、Execution、Log、Checkpoint、Evidence 等运行期记录 | 对应运行领域 |
| Document Bundle | `Document-ID-title/README.md + assets/` 的文档与资源原子单元 | Knowledge Governance |
| Visual Asset | 与目标 Document Bundle 共置、在 Visual Registry 登记的正式图像 | 目标文档 Owner + Visual Registry |
| Registry | 管理资产 ID、生命周期、路径、关系和发布元数据的机器控制面 | Publishing & Registry |
| Relation | 两个已注册资产之间的稳定语义关系 | Platform Registry |
| Release | 固定一组资产版本、证据和发布状态的治理记录 | Release Governance |
| Migration | 资产路径、身份或生命周期从旧状态迁移到新状态的可审计过程 | Migration Governance |
| Projection | 从 Git Canonical Asset 生成的 Feishu、Host 配置或其他外部阅读形态 | Distribution / Publisher |

## 4. 目标、任务与执行

| 术语 | 定义 | 主要所有者 |
|---|---|---|
| Goal | 希望达成的可解释结果，尚未必具备可执行边界 | Project Owner / Planner |
| Plan | 基于事实、约束和决策形成的执行方案 | Planner |
| Task | 具有稳定 ID、版本、目标、范围、依赖、状态和完成判定的工作对象 | Task Control |
| Task Contract | 冻结 Goal、Scope、Inputs、Roles、Policy、Acceptance、Evidence 和 Git 行为的版本化合同 | Planner / Task Control |
| Task Version | Task Contract 发生实质变化后的版本标识 | Task Control |
| Workflow | 跨角色、跨阶段推进目标或 Task 的受控协作路径 | Workflow Governance |
| Workflow Run | 某条 Workflow 为推进一个 Task 产生的一次运行记录 | Workflow Runtime |
| Session | 一次对话、终端或工具宿主会话；可以丢失和重建 | Host |
| Execution | 某个 Executor 按指定 Task Version 进行的一次执行尝试 | Execution Orchestration |
| Execution Lane | 绑定 Task、Executor、Workspace、Lease、Policy 和预算的受控执行通道 | Execution Orchestration |
| Executor | 实际运行命令、工具或模型调用并产生 Result 的主体 | Execution Orchestration |
| Result | Execution 的结构化输出，不自动等于 Task 完成 | Execution Orchestration |
| Planner | 恢复事实、形成计划、拆分任务并冻结任务候选的角色 | Planning |
| Reviewer | 检查真实文件、Diff、测试、Evidence 和边界的角色 | Review Governance |
| Approver | 对特定 Task Version、动作、目标和期限作一次治理决定的角色 | Approval Governance |
| Integrator | 集成并行结果、解决冲突并重新验证的角色 | Integration |
| Publisher | 构建派生资产、执行发布并回读目标状态的角色 | Distribution |

## 5. 连续性与副作用

| 术语 | 定义 | 主要所有者 |
|---|---|---|
| Task State | Task 整体在规划、运行、验证、暂停或终态中的正式状态 | Task Control |
| Execution State | 某次执行尝试、进程或工具调用的状态 | Execution Orchestration |
| Checkpoint | 在稳定执行点保存的可恢复状态快照和引用集合 | Task Control / Recovery |
| Handoff | 发送方将明确状态、责任和下一动作交给接收方并获得 Receipt 的过程 | Task Control |
| Lease | Executor 在限定 Task Version、Workspace 和期限内拥有执行权的记录 | Task Control / Execution |
| 幂等键（Idempotency Key） | 用于识别重复请求并避免重复副作用的稳定标识 | Side-effect Governance |
| Side Effect | 对 Git、外部系统、用户环境或业务状态产生的变化 | 对应 Adapter + Side-effect Governance |
| Readback | 执行动作后从目标系统重新读取真实状态 | Reviewer / Publisher / Adapter |
| Retry | 在明确可重试错误、预算和幂等条件下重新执行 | Task Control |
| Cancel | 因任务不再需要而进行有序停止 | Task Control |
| Terminate | 因风险或失控而强制终止，并保留最终快照和影响 | Task Control |

## 6. 上下文、知识与记忆

| 术语 | 定义 | 主要所有者 |
|---|---|---|
| Context | 面向当前主体和任务的短小、受版本约束的事实入口 | Context System |
| Context Source | 可被上下文编译器读取的正式来源及其版本引用 | Context System |
| Context Package | 针对角色、任务或 Host 编译的可分发上下文包 | Context Compilation |
| Context Instance | 某个 Consumer 在某次运行中实际使用的上下文实例 | Context Runtime |
| Knowledge Asset | 面向长期理解、经过治理并进入 Git 的正式知识 | Knowledge Governance |
| Knowledge Pack | 从 Git 知识派生、面向特定角色和 Host 的发布包 | Knowledge Distribution |
| Memory | Host 或用户层的个性化记忆，不是项目真源，也不是 Task State | Host / User Memory |
| Feedback | 从运行、实验、Review 或用户使用返回的候选改进信号 | Feedback Governance |
| Source Commit | Context、Task、Result 或 Release 所绑定的 Git 版本 | Git / Task Contract |

## 7. Agent、Skill 与能力

| 术语 | 定义 | 主要所有者 |
|---|---|---|
| Role | 一组稳定责任、权限边界和协作期望 | Agent Governance |
| Agent | 在特定 Host 中组合 Role、Profile、Context、Skill、Tool 和 Policy 的执行配置 | Agent Governance |
| Agent Profile | Agent 的版本化静态配置资产 | Agent Governance |
| Skill | 可复用、可触发、包含流程、边界、资源和验证的 Agent 能力资产 | Skill Governance |
| Capability | 可被 Contract、Policy 和 Runtime 判断与调用的最小能力 | Capability Registry / Runtime |
| Tool | 承载具体外部调用或本地操作的接口 | Tool Adapter |
| Script | 以确定性程序完成校验、转换或机械操作的实现 | Engineering |
| Policy | 根据主体、任务、能力、环境和风险决定是否允许动作的规则 | Policy Domain |
| Permission | 主体原则上是否具备使用某能力的资格 | Agent / Security Governance |
| Approval | 对一次具体高风险动作的有限授权，不是长期 Permission | Approval Governance |
| Provider | 模型、云服务、工具产品或外部系统的供应方实现 | Adapter Layer |
| Adapter | 在稳定 Port 与外部 Provider、协议或产品之间进行转换的实现 | Adapter Layer |

## 8. DDD 与架构

| 术语 | 定义 |
|---|---|
| 统一语言（Ubiquitous Language） | 在明确模型边界内由业务与工程共同使用的精确语言 |
| 限界上下文（Bounded Context） | 某个领域模型保持内部一致、拥有独立语言、规则和状态的边界 |
| 上下文映射（Context Map） | 描述不同限界上下文之间上游、下游、契约和防腐关系的视图 |
| 聚合（Aggregate） | 作为单一一致性单元处理的一组领域对象，由聚合根保护不变量 |
| 领域事件（Domain Event） | 已经发生且对领域有意义的业务事实 |
| Port | 应用核心以领域语言定义的稳定交互契约 |
| Guardrail | 在输入、执行、输出或副作用阶段阻止越权和失控的约束 |
| Control Plane | 负责 Policy、Task、Approval、Registry 和治理决策的控制能力集合 |
| Execution Plane | 实际运行 Executor、Tool、Adapter 和业务能力的执行区域 |

## 9. 实验、证据与复盘

| 术语 | 定义 |
|---|---|
| Experiment | 为回答明确问题而设计、执行并记录条件与结果的验证活动 |
| Evidence | 能够被定位、复核或回放的测试、Hash、日志、Diff、外部回执或真实资产引用 |
| Observation | 实验或运行中直接观察到的现象，不自动包含解释 |
| Finding | 从一个或多个 Observation 中提炼、且仍受条件限制的发现 |
| Conclusion | 在明确 Evidence 和限制范围内接受的判断 |
| Limitation | 影响结论适用范围、可靠性或外推能力的限制 |
| Incident | 已经造成异常、失败、安全或流程影响的事件 |
| Retrospective | 对目标、过程、结果、失败和改进的结构化复盘 |
| Improvement Action | 从复盘结论产生、具有 Owner 和验收的改进行动 |

## 10. 生命周期与发布状态

| 术语 | 定义 |
|---|---|
| accepted | 正式内容和关系已经通过 Review，可作为当前知识使用 |
| superseded | 资产已被新资产或新模型替代，只保留历史与迁移语义 |
| archived | 资产保留在归档路径，不再作为当前阅读主线 |
| materialized | Registry 中登记的 Canonical / Current Path 已真实存在 |
| unpublished | 尚未发布到 Feishu 或其他派生目标 |
| published | 已发布且具备目标系统回读记录 |
| verified | 某项能力或结论在指定环境、时间和 Commit 上有可复核 Evidence |

状态词只在对应 Registry、Contract 或领域状态中使用，不能用“已完成”“已经支持”等自然语言替代精确状态。

## 11. 关键非等价关系

```text
Task ≠ Session ≠ Execution
Agent ≠ Model ≠ Provider
Context ≠ Knowledge ≠ Memory ≠ Task State
Task Contract ≠ Context Package
Permission ≠ Policy ≠ Approval ≠ Lease
Result ≠ Evidence ≠ Conclusion
Release ≠ Projection
Workflow ≠ SOP ≠ Script
Index ≠ Registry Truth
accepted design ≠ implemented ≠ verified ≠ released
```

## 12. 维护边界

新增术语前必须检查：

- 是否已经存在同义主名称；
- 是否属于目标文档而非全局术语；
- 是否有明确状态 Owner；
- 是否需要 Contract 或 Schema，而不是只加一句定义；
- 是否会把产品名、Provider 或临时流程固化为领域概念。

## 13. 关联资产

- [THY-004 DDD 与 Agent 系统边界建模](../../03_Agent工程架构思想与方法论/THY-004-DDD与Agent系统边界建模/README.md)
- [ARC-001 平台总体架构与执行路径](../../04_平台架构/ARC-001-ai-agent-platform总体架构/README.md)
- [ARC-002 上下文与知识系统总体架构](../../05_上下文与知识系统/ARC-002-上下文与知识系统总体架构/README.md)
- [AGT-001 智能体资产体系总体架构](../../06_智能体资产体系/AGT-001-智能体资产体系总体架构/README.md)
- [WFL-001 工作流与项目治理总体模型](../../07_工作流与项目治理/WFL-001-工作流与项目治理总体模型/README.md)

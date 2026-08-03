# AGT-003 Agent 知识、上下文、记忆与行为装配

## 1. 文档定位

本文回答：

> Agent Profile 如何声明稳定行为、知识依赖和上下文需求，并在运行时与 Task State、Memory、Evidence 和 Feedback 组合，而不发生信息串线和真源混乱？

`05_上下文与知识系统` 拥有知识治理、Context 编译、运行连续性、分发和记忆学习；本文只定义 Agent 资产如何声明、消费和反馈这些能力。

## 2. 行为装配模型

```text
Role Mission
+ Behavior Policy / Instructions
+ Skill Selection
+ Knowledge Pack
+ Context Package
+ Task State View
+ Capability Snapshot
+ Approval View
+ Feedback / Evidence
= 本次 Agent 行为输入
```

其中只有 Role、Profile、Skill 引用、Knowledge Pack 引用和策略引用属于长期 Agent 资产。Context Package、Task State、Approval、Evidence 和 Session 都是运行时输入。

## 3. 信息分层

| 层 | 典型内容 | 生命周期 | 所有者 |
|---|---|---|---|
| Behavior Policy | 行为原则、停止条件、输出风格 | Profile 版本 | Agent Governance |
| Common Knowledge Pack | 项目愿景、术语、架构、安全底线 | Pack 版本 | Knowledge Distribution |
| Role Knowledge Pack | 专业标准、方法、案例、Rubric | Pack 版本 | Knowledge Distribution |
| External Knowledge View | 实时共享知识、受权限查询 | 查询时 | Knowledge Service |
| Context Package | 当前 Task / Role / Phase 的最小输入 | 短期 | Context Runtime |
| Task State View | 状态、依赖、阶段、审批和 Checkpoint | 动态 | Task Control |
| User Memory | 低风险长期偏好 | 长期但可撤回 | User / Memory System |
| Agent Experience | 候选经验和模式 | 待治理 | Memory & Learning |
| Evidence View | Diff、测试、日志、Hash、结果 | 执行后 | Evidence Domain |

## 4. 两层内置知识

每个专有 Custom GPT 或专业 Agent 应默认采用：

### 4.1 Common Knowledge Pack

所有角色需要掌握的稳定共识：

- 项目目标和产品边界；
- 核心术语；
- 平台高层架构；
- Git 唯一真源；
- Context、Task、Evidence 与权限边界；
- 安全底线；
- 角色目录和协作规则。

### 4.2 Role Knowledge Pack

只服务当前角色：

- 专业方法；
- 评价标准；
- 输出模板；
- 正反案例；
- 常见错误；
- 领域专属术语；
- 与该角色直接相关的 Skill 和 Workflow。

两层 Pack 都由 Git 正式知识派生。Custom GPT Knowledge 只是 Host 发布形态，不成为新真源。

## 5. Context Requirements

Profile 不保存 Context Package，而是声明需求：

```yaml
context_requirements:
  required_sources:
    - governance
    - project_architecture
    - task_definition
    - role_profile
  optional_sources:
    - retrieved_knowledge
    - prior_evidence
  forbidden_sources:
    - unrelated_user_memory
    - other_task_private_context
  freshness:
    runtime_snapshot: realtime
    project_context: current_commit
  token_budget: 24000
  sensitivity: internal
  output_contract_ref: contract.architecture-review@1
```

Context Builder 根据 Consumer、Task、Role、Phase、权限和预算生成实际 Context Package。

## 6. 行为决策边界

模型可以：

- 理解目标；
- 选择已授权 Skill；
- 提出 Action；
- 标记信息不足；
- 生成候选结果；
- 请求审批或补充证据。

模型不能仅凭自然语言：

- 修改 Task 真相；
- 扩大 Tool Scope；
- 复用过期 Approval；
- 把 Memory 当成项目事实；
- 把检索命中当成正式证据；
- 把一次成功经验晋升为正式 Knowledge。

实际 Tool Action 必须经过 Task、Policy、Capability、Approval 和 Runtime Enforcement。

## 7. Context 漂移与失效

以下变化触发 Context 失效或刷新：

- Task Version 改变；
- Role / Agent Profile 改变；
- Source Commit 更新；
- Approval 过期或撤销；
- Runtime Capability 改变；
- Execution Lane / Worktree 改变；
- Evidence 推翻先前判断；
- Session 压缩、切换或丢失。

Agent 不得把旧 Session 中的结论静默带入新 Task。无法确认有效性时标记 `unknown` 并重新读取权威来源。

## 8. Handoff 与恢复

Agent 跨角色或跨 Session 移交时，传递：

- Task / Version；
- 当前 Role / Phase；
- 已接受决定；
- 已完成和未完成项；
- Source / Profile / Pack 版本；
- Evidence 引用；
- 阻塞和风险；
- 下一步合同；
- 安全续跑点。

不传递隐藏推理、整段聊天或未审查 Memory。`KNO-011` 负责 Context Instance、Delta、Checkpoint、Resume 与防串线机制。

## 9. Feedback 回流

运行结果可以形成：

| 结果 | 回流目标 |
|---|---|
| 任务完成 / 失败 | Task State 与 Evidence |
| Context 缺失或噪声 | Context Profile / Builder 策略候选 |
| Skill 触发错误 | Skill Eval 与版本修订候选 |
| 权限阻断 | Policy / Tool Binding 修订候选 |
| 重复成功模式 | Experience / Insight Candidate |
| 用户纠正 | Feedback Record；必要时 Memory Candidate |

任何反馈都不能自动修改正式 Profile、Skill、Knowledge Pack 或 Policy，必须经过 Review。

## 10. P0 落地

首个 Agent Profile 必须至少验证：

1. Common Pack + Role Pack 的双层装配；
2. Task / Context / Profile 的版本绑定；
3. 不同 Session 能从 Checkpoint 恢复；
4. 与其他 Task 的 Context 不串线；
5. Memory 不覆盖 Git 事实；
6. 运行结果能生成结构化 Feedback 和 Evidence。

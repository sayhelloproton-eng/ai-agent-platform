# AGT-002 角色、Agent Profile 与组合模型

## 1. 文档定位

本文回答：

> 一个稳定角色如何被定义，并通过 Agent Profile 组合为可在不同 Host 与 Executor 上发布的专业智能体？

Role 决定“为什么存在、负责什么、能决定什么”；Profile 决定“使用哪些资产、以什么输入输出和策略工作”；Host 决定“在哪里运行”。三者必须分开。

## 2. 概念边界

| 概念 | 定义 | 不等于 |
|---|---|---|
| Role | 稳定职责与判断合同 | 模型、Tool、Prompt |
| Agent Profile | 角色的版本化资产组合 | 当前 Session、Host 页面配置 |
| Agent Release | 某 Profile 在某 Host 的已验证发布 | Profile 本身 |
| Runtime Instance | 某 Task / Session 中的实际运行实例 | 长期 Agent 资产 |
| Executor | 真实执行动作的模型、CLI、脚本或 Runtime | Role |
| Model / Provider | 推理能力供应方 | Agent 身份 |

## 3. Role Definition

### 3.1 建议字段

```yaml
role_id: role.knowledge-governor
version: 1.0.0
name: 知识治理角色
mission: <角色存在的唯一使命>
responsibilities: []
non_responsibilities: []
decision_rights: []
forbidden_actions: []
required_inputs: []
required_outputs: []
quality_criteria: []
escalation_policy_ref: policy.agent-escalation.v1
separation_of_duties: []
status: draft
```

### 3.2 角色族

| 角色族 | 主要职责 | 典型角色 |
|---|---|---|
| 治理 | 目标、优先级、授权和阶段决策 | Project Owner、总控 Planner |
| 规划 | 任务拆解、依赖、范围和验收 | Planner、Workflow Designer |
| 专业 | 领域判断和专业产物 | Product、Architect、Research、Knowledge Curator |
| 执行 | 在冻结范围内调用工具 | Code Executor、Publisher、Migration Executor |
| 评审 | 独立检查质量、边界和证据 | Reviewer、Security Reviewer、Content Reviewer |
| 健康与恢复 | 监测、停止、快照和恢复建议 | Health Agent、Recovery Agent |

角色族不是固定组织图。一个低风险 Task 可以合并多个角色，但 Task Contract 必须显式说明；高风险任务必须优先分离提案、批准、执行和验收。

## 4. Agent Profile 作为组合根

### 4.1 建议字段

```yaml
agent_id: agent.knowledge-governor
profile_version: 0.1.0
role_ref: role.knowledge-governor@1.0.0
mission_override: null
input_contract_ref: contract.knowledge-review-input@1
output_contract_ref: contract.knowledge-review-output@1
skill_refs: []
knowledge_pack_refs: []
capability_refs: []
tool_bindings: []
policy_refs: []
context_requirements_ref: context-profile.knowledge-governor@1
evaluation_ref: eval.agent.knowledge-governor@0.1
host_targets: []
release_status: draft
compatibility: {}
owner: project-owner
```

### 4.2 组合原则

- Profile 只引用正式资产，不复制其完整正文；
- Profile 不包含动态 Task、Session、Approval 或 Secret；
- 同一 Role 可以有多个 Profile，例如低成本版、严格评审版或不同 Host 版；
- 同一 Profile 可发布到多个 Host，但每个 Host 有独立 Release Manifest；
- 执行器或模型可替换，只要 Profile 的能力和 Eval 合同仍满足；
- Instructions 是 Publisher 生成结果，不是 Profile 真源。

## 5. Profile 依赖图

```text
RoleDefinition
   ↓
AgentProfile
   ├── Skill refs
   ├── Common / Role Knowledge Pack refs
   ├── Capability refs
   ├── Tool bindings
   ├── Policy / Approval refs
   ├── Context Requirements ref
   └── Eval Suite ref
          ↓
Host Release Manifest
```

Profile 发布时必须冻结完整依赖图。只改变模型名称但保持其他配置不变，也可能影响 Eval，不能视为无意义配置变更。

## 6. 版本与兼容性

### 6.1 需要新 Profile 版本的变化

- 使命或职责变化；
- 输入输出 Contract 破坏性变化；
- Skill 主版本变化；
- Knowledge Pack 重大更新；
- Tool / Capability 权限变化；
- Policy 或审批等级变化；
- 关键 Eval 门禁变化。

### 6.2 可仅创建新 Host Release 的变化

- 同一 Profile 发布到新 Host；
- Host 格式转换；
- 不改变语义的排版或字段映射；
- 在兼容声明允许范围内替换模型或 Provider，但仍需回归 Eval。

## 7. Host 投影

| Host | 典型派生内容 | 必须保留的证据 |
|---|---|---|
| Custom GPT | Instructions、Knowledge 文件、Actions、能力开关 | Source Commit、Builder Preview、配置快照、Eval、回滚版本 |
| Codex / Work | AGENTS、任务模板、Skill、工具权限 | Profile 版本、Handoff Contract、执行证据 |
| Runtime Agent | JSON/YAML 配置、Tool Adapter、Policy | 部署版本、健康、能力快照、审计 |
| Plugin / App | Manifest、Instructions、Tool schema | 发布版本、权限、兼容性、回读 |
| Local Model | System Prompt、Tool schema、Knowledge cache | 模型版本、量化、设备、Eval、资源限制 |

Host Publisher 必须从 Git Profile 生成配置，不允许在 Builder UI 中长期维护另一套职责、知识和权限。

## 8. 当前角色映射

| 当前实践 | 目标角色 | 说明 |
|---|---|---|
| 当前 Chat | 总控 Planner + Semantic Reviewer | 当前是人工 / Host 绑定实践，尚未 Profile 化 |
| 用户 | Project Owner / Approver | 最终目标、重要变更和副作用授权 |
| Codex | Executor | 负责真实仓库动作和证据回传，不拥有规划语义 |
| DeepSeek / OpenCode | Alternate Executor | 可替换执行器，指导档位不同 |
| Registry / 校验脚本 | Programmatic Reviewer | 不是 Agent，但提供确定性门禁 |

## 9. Profile 设计检查表

- 是否只有一个清晰使命；
- 是否明确非职责和禁止动作；
- 是否区分 Role、Profile、Host、Executor；
- 是否只引用正式 Skill 和 Knowledge Pack；
- 是否声明 Context Requirements；
- 是否声明 Capability、Tool 和 Policy；
- 是否有 Eval 与发布状态；
- 是否存在真实调用方；
- 是否能在更换模型或 Host 后保留身份；
- 是否避免创建“全能超级 Agent”。

## 10. P0 输出

P0 阶段只需要：

1. 一份 Role Schema；
2. 一份 Agent Profile Schema；
3. 一份 Catalog Schema；
4. 一份真实 Role；
5. 一份真实 Agent Profile；
6. 一次 Host Release；
7. 一套最小 Eval 与回滚记录。

不在没有真实使用证据时批量生成十几个 Profile。

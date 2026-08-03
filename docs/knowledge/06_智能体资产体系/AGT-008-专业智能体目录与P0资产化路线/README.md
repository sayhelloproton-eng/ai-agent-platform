# AGT-008 专业智能体目录与 P0 资产化路线

## 1. 文档定位

本文回答：

> 平台需要哪些专业智能体，哪些只是候选名称，哪些应优先资产化，以及每个 Agent 在什么证据条件下才能进入 Pilot 或 Released？

目录用于控制数量、职责重叠、成熟度和实施顺序，不是宣传页。

## 2. 目录条目模型

每个条目至少记录：

```text
agent_id
name
role_ref
problem_owned
target_users
inputs / outputs
skill_refs
knowledge_pack_refs
capability_refs
tool / policy refs
eval_ref
host_targets
owner
status
evidence_refs
supersedes / replaced_by
```

目录机器视图应由 Registry 生成；本文提供人类可读解释。

## 3. 准入规则

新增 Agent 前必须回答：

1. 是否存在重复且高价值的真实任务；
2. 该问题是否不能仅靠已有 Skill 或 Workflow 解决；
3. 是否有清晰角色边界和独立验收标准；
4. 是否有稳定知识和工具依赖；
5. 是否值得维护 Profile、Pack、Eval 和 Release；
6. 是否会与现有 Agent 大量重叠；
7. 是否有真实 Host 和使用者。

如果只是一次任务、一个 Prompt 模板或一个工作流步骤，不应创建独立 Agent。

## 4. P0 角色组合

P0 不是一次创建所有专业 Agent，而是先形成最小闭环：

```text
Project Owner
  ↓
总控 Planner / Reviewer
  ↓
一个首批专业 Agent
  ↓
Executor
  ↓
Programmatic Checks + Human Review
```

### P0-A：总控 Planner / Reviewer

- 当前实践：由本 Chat 承担；
- 核心问题：恢复项目事实、选择目标、冻结范围、组织专业 Agent、复审执行证据；
- 状态建议：`designing`，已有大量人工实践但尚无正式 Profile；
- 重要性：所有专有 GPT 和 Task 流转的总入口；
- 风险：不能把总控做成拥有所有 Tool 权限的超级 Agent。

### P0-B：知识治理智能体

- 核心问题：正式知识应如何落位、去重、审阅、注册、发布和退役；
- 依赖：Project Knowledge Synthesis、Engineering Document Authoring、Project Knowledge Governance、Handoff；
- Knowledge Pack：知识治理、Context、Registry、Document Bundle、Feishu 投影；
- 首选原因：当前项目已有大量真实任务、Skill、文档和验证证据；
- 状态建议：首个 `pilot` 候选。

### P0-C：架构智能体

- 核心问题：把目标、DDD、运行路径、信任边界和实现映射转化为可落地架构；
- 依赖：平台架构、DDD、工程文档编写、Review 规则；
- 状态建议：`candidate → designing`；
- 前置：先定义与总控、Workflow Agent 和 Code Reviewer 的边界。

### P0-D：工作流与项目治理智能体

- 核心问题：把目标转换为有阶段门、Handoff、审批、证据和恢复点的工作流；
- 依赖：`07_工作流与项目治理`、Handoff Skill、Task Control；
- 状态建议：等待 `07` 正式收口后进入 designing；
- 旧 `AGT-010` 项目治理与汇报职责可作为其只读子角色或独立 Profile 变体。

### P0-E：代码复审智能体

- 核心问题：基于原任务 Contract、Diff、测试和架构约束识别缺陷、越界和风险；
- 依赖：代码与测试证据、Git、Review Rubric；
- 状态建议：candidate；
- 边界：不直接重写代码，不只依赖 Executor 自述。

## 5. 后续专业 Agent 候选

| 候选 | 拥有的问题 | 当前状态 | 进入设计的前提 |
|---|---|---|---|
| 需求与产品孵化 Agent | 从问题、证据和假设形成受控产品机会 | candidate | 有真实产品机会与 WFL-011 |
| 技术调研 Agent | 有来源、时间和适用边界的技术比较 | candidate | 明确调研 Contract 与来源门禁 |
| 测试 Agent | 生成和执行可重复验证方案 | candidate | Task / Env / Evidence 接口稳定 |
| 健康与恢复 Agent | 监测、暂停、快照和安全续跑 | candidate | Health Event、Snapshot、Recovery 实现 |
| 工程洞见 Agent | 从证据事件提炼有边界的复用洞见 | candidate | 现有 Skill 继续验证其是否值得 Agent 化 |
| 发布 Agent | 机械发布、回读和回滚 | candidate | Publisher、Approval、Release Registry 稳定 |
| AI 视频领域 Agent | 服务首个上层产品工作流 | deferred | Phase 3 进入真实设计 / 开发 |

## 6. 哪些不应该创建 Agent

- 每个 Skill 一个 Agent；
- 每个 Tool 一个 Agent；
- 每个文档类型一个 Agent；
- 只改一两个文件的临时执行者；
- 没有独立决策和验收标准的工作流步骤；
- 仅用于转发消息的“Agent”；
- 通过增加名称掩盖职责重叠的角色；
- 尚无真实输入、输出、Eval 或 Host 的空壳 Profile。

## 7. P0 资产化顺序

```text
P0-0 冻结资产模型与六篇 Canonical 文档
→ P0-1 创建 Role / Profile / Catalog 最小 Schema
→ P0-2 物化总控角色与知识治理 Agent Profile
→ P0-3 构建 Common Pack + Knowledge Governance Role Pack
→ P0-4 绑定现有 Skills、Capability、Tool 和 Policy
→ P0-5 建立 Fixture / Scenario / Boundary / Recovery Eval
→ P0-6 发布到一个真实 Host 并回读
→ P0-7 用真实知识治理任务执行 Pilot
→ P0-8 根据证据决定 released、revised 或停止
→ P0-9 再资产化第二个专业 Agent，验证复用
```

## 8. P0 最小仓库资产候选

只有进入真实实施时再创建：

```text
agents/
├── schemas/
├── roles/
├── profiles/
├── catalog.yaml
├── evals/
└── releases/

knowledge-packs/
├── common/
└── roles/
```

具体结构以首个真实 Profile 的资产需要为准，不预建空目录和空 Profile。

## 9. 完成门槛

`06_智能体资产体系` 文档收口不等于 P0 资产化完成。P0 完成至少需要：

- 一份真实 Role；
- 一份真实 Profile；
- Common + Role 两层 Knowledge Pack；
- 至少一个 Skill 和一个 Tool / Capability 绑定；
- 默认拒绝 Policy 与审批测试；
- 一套 Eval；
- 一个 Host Release；
- 一次真实 Pilot；
- 一份回读和回滚证据；
- Registry 与 Catalog 可追踪。

在达到上述门槛前，目录状态保持 `designing` 或 `pilot`，不宣称已发布专业智能体。

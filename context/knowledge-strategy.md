# Knowledge Strategy

## Core Decision

**Git Repository is the only source of truth.**

只有已经物化到 Git、具备明确来源和状态的资产，才能成为正式项目事实。

正式项目事实包括：

- 代码与测试；
- Context；
- 正式知识；
- 技术方案与治理规则；
- ADR；
- Platform Registry；
- Engineering Insight Registry；
- Skills；
- Release、Migration 与发布记录；
- 未来正式物化的 Agent Profile 与 Knowledge Pack。

Feishu、Custom GPT Knowledge、外部知识服务和其他发布目标，都是从 Git 派生的使用或投影形态，不成为新的知识真源。

## Asset and State Boundaries

| 资产或机制 | 职责 |
|---|---|
| `context/` | 项目共享启动上下文，保存短、小、当前、可信的项目摘要 |
| `docs/knowledge/` | 面向人的正式长期知识 |
| `docs/technical/` | 技术方案、治理规则、迁移与工程控制资料 |
| `docs/adr/` | 已接受的重要架构决策 |
| `platform-registry/` | Asset、Relation、Release、Migration、状态与路径的机器控制面 |
| `skills/` | 可执行方法、流程、工具契约和治理资产 |
| 未来 `agents/` | Agent Profile、Instructions、权限、工具和发布配置 |
| 未来 `knowledge-packs/` | 从正式知识中按角色与用途派生的发布知识包 |
| Task Store / Checkpoint | 当前任务的执行状态、进度、证据和恢复信息 |
| ChatGPT Memory | 用户个性化偏好，不是正式项目知识 |
| 外部 Knowledge Service / RAG | 实时、共享、按权限检索的外部知识能力 |

必须明确：

```text
ChatGPT Memory
≠ Project Knowledge
≠ Knowledge Pack
≠ Context
≠ Task State
```

`context/` 只保存项目级共享摘要，不承载某个 Custom GPT 的完整 Instructions、角色配置、长期知识库或任务状态。

## Context Ownership

`context/**` 由总控 Planner 负责语义维护。专业 Agent 和 Executor 只能报告可能过期的原因与证据；Executor 默认只读，只有在获得精确 `write_approved` 授权并收到 Planner 提供的完整覆盖文件后，才可以机械落盘。重要目标、架构、阶段、Roadmap 和治理变化由用户最终确认。

正式机制见：

`docs/knowledge/05_上下文与知识系统/KNO-011-上下文所有权与维护机制.md`

## Knowledge Lifecycle

```text
Raw Sources
  → Learning / Research / Experiment
  → Review and Evidence Check
  → Reviewed Knowledge / Technical Solution / ADR
  → Derived Knowledge Assets / Agent Configuration / Skills
  → Runtime Use and Evidence
  → New Insight
  → Review and Revision
```

原始资料、实验记录和模型生成内容，必须经过：

- 来源核验；
- 人工 Review；
- 事实与证据检查；
- 敏感信息检查；
- 必要的 Registry 登记；

才能进入正式知识或发布资产。

未经 Review 的内容不能直接成为正式知识，也不能直接发布到 Feishu 或 Custom GPT Knowledge。

## Derived Assets and Executable Assets

Reviewed Knowledge、Technical Solution 和 ADR 可以支持三类不同资产：

```text
Reviewed Knowledge / Technical Solution / ADR
  ├─ Derived Knowledge Assets
  │    └─ Knowledge Pack
  ├─ Agent Configuration Assets
  │    └─ Agent Profile / Instructions
  └─ Executable Capability Assets
       └─ Skill
```

三者职责不同：

- **Knowledge Pack**：从正式知识中裁剪、组合和构建的发布知识资产；
- **Agent Profile**：角色、Instructions、权限、工具、Knowledge Pack 引用和发布配置；
- **Skill**：可执行的方法、流程、工具契约和治理资产。

Skill 不是普通知识包，也不应与 Agent Profile、Knowledge Pack 混为同一种派生产物。

## Platform Registry

`platform-registry/` 负责：

- 稳定 Asset ID；
- Canonical Path；
- Current Path 与 Target Path；
- 实现与生命周期状态；
- Asset Relation；
- Evidence 入口；
- Release；
- Migration；
- Feishu Projection 状态；
- 变更影响与一致性检查。

知识正文不再保存大段系统 Front Matter。Registry 负责机器控制面，正文负责面向人的解释。

Registry 不是：

- 正式知识正文；
- Runtime Task Store；
- 执行日志；
- 用户 Memory；
- 外部向量数据库。

## Engineering Insights

工程洞见采用三层结构：

- `skills/engineering-insight-distillation/`：洞见提炼方法；
- `platform-registry/registries/engineering-insights/`：成熟度、生命周期、Occurrence 和 Relation 的机器真源；
- `docs/knowledge/.../INS-*`：面向人的综合解释。

Runtime、实验和执行过程产生的新观察，不能直接写成正式洞见；必须经过提炼、证据关联、Review 和状态升级。

## Custom GPT and Agent Knowledge

每个专有 Custom GPT 或未来 Agent 使用两层稳定知识：

1. **通用基础知识包**
   - 项目愿景；
   - 核心术语；
   - 平台高层架构；
   - Git 唯一真源；
   - 安全底线；
   - 通用治理规则。

2. **角色专属知识包**
   - 角色方法；
   - 专业标准；
   - 评估规则；
   - 领域案例；
   - 专属工具和工作流知识。

Git 是知识真源，Knowledge Pack 是派生发布资产；外部 Knowledge Service 负责实时、共享和按权限检索。

当前状态：

- 两层知识原则已经确定；
- `docs/knowledge/` 和 Registry 已实现；
- Agent Profile 尚未正式物化；
- `knowledge-packs/` 尚未创建；
- Custom GPT 资产化 MVP 尚未实现；
- Project Knowledge Synthesis Skill 仍为 `planned / future`；
- 外部 Knowledge Service / RAG 尚未实现。

不得把这些未来资产描述为当前已完成能力。

## Feishu Projection

允许的正式方向：

```text
Git docs/knowledge/
  → asset:// 解析
  → knowledge-assets 媒体提取
  → Feishu 文档与图片投影
```

发布规则：

- overwrite；
- one-way；
- one-to-one mapping；
- zero pre-read；
- no semantic diff；
- no merge；
- no reverse write。

首次迁移按映射文档逐篇覆盖。映射稳定后，只覆盖 Git 中发生变化的正式知识文档。

Feishu 发布必须同时满足：

1. 正式内容已完成人工 Review；
2. Git 变更已经提交并通过验证；
3. 已获得独立 Feishu 发布授权；
4. 发布前已完成敏感信息检查。

发布后只验证 API、revision、正文、图片、映射和失败项，不读取 Feishu 全文后与 Git 合并。

## Retrieval

Agent 默认采用索引优先和最小必要上下文：

1. 当前任务状态优先从 Task Store、Checkpoint 或执行证据获取；
2. 读取 `context/` 恢复项目共享状态；
3. 查询 Platform Registry；
4. 读取与任务直接相关的少量完整文档；
5. 读取相关代码、测试和 Evidence；
6. 需要实时或共享信息时，再查询外部 Knowledge Service。

不默认扫描全部仓库或全部 Feishu，也不从长期知识文档中推断当前任务状态。

## Review, Security, and Publication Gates

正式知识和发布资产必须经过：

- 来源与 Claim 检查；
- 人工 Review；
- 证据关联；
- 路径与 Registry 校验；
- Secret、Token、Cookie、隐私和敏感配置检查；
- Git 提交和验证；
- 发布目标的独立授权。

外部 Knowledge Service、Knowledge Pack 和 Custom GPT Knowledge 必须按角色与权限裁剪，不得把完整仓库、敏感资料或无关上下文直接暴露给所有 Agent。

## Current Implementation Status

### Implemented

- Git 唯一真源；
- `context/`；
- `docs/knowledge/`；
- `docs/technical/`；
- Platform Registry；
- Engineering Insight Registry；
- 六个正式 Skill；
- `asset://` 正式图片引用与 Feishu Publisher 支持；
- Git → Feishu 单向投影规则；
- 知识与 Registry 校验。

### Planned or Not Yet Materialized

- Agent Profile；
- `agents/`；
- Knowledge Pack；
- `knowledge-packs/`；
- Custom GPT 资产化 MVP；
- Project Knowledge Synthesis Skill；
- 外部 Knowledge Service / RAG；
- 完整 Runtime Task Store、Checkpoint 与自动知识回写。

这些未来能力只能作为设计或 Roadmap 项存在，不能写成当前实现。

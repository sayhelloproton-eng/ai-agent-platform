# 智能体资产体系

## 目录定位

本目录定义 `ai-agent-platform` 如何把角色、专业方法、知识、工具、权限和评估组合成可注册、可发布、可替换、可回滚的智能体资产。

它是平台的 P0 能力之一。MVP 只能验证一条链路是否可行；智能体资产体系决定平台能否持续创建专业 Agent，而不是每次重新写一套 Instructions、上传一批文件、手工配置工具并依赖某个固定模型。

## 核心结论

```text
Role Definition
+ Agent Profile
+ Skill References
+ Knowledge Pack References
+ Capability / Tool Bindings
+ Policy / Approval References
+ Eval Suite
+ Host Release Manifest
= 可治理的 Agent Asset
```

Agent 资产不保存当前 Task、Session、Context Package、Evidence、Secret 或 Runtime 状态。上述运行时事实由其他领域拥有，Agent Profile 通过稳定契约引用。

## Canonical 文档

| ID | 文档 | 核心问题 |
|---|---|---|
| `AGT-001` | 智能体资产体系总体架构 | 平台中的 Agent 资产由什么组成，各资产由谁拥有并如何协作？ |
| `AGT-002` | 角色、Agent Profile 与组合模型 | 如何把稳定角色组合成版本化、可发布的 Agent Profile？ |
| `AGT-003` | Agent 知识、上下文、记忆与行为装配 | Agent 如何获得知识和上下文，同时不把 Memory、State 与正式知识混在一起？ |
| `AGT-005` | Skill、Capability、Tool、Permission 与 Policy 资产治理 | Agent 能做什么、怎么做、用什么工具以及谁允许执行，如何保持边界清晰？ |
| `AGT-007` | Agent 评估、发布与生命周期治理 | Agent 如何从候选进入 Pilot、Release、回归、回滚和退役？ |
| `AGT-008` | 专业智能体目录与 P0 资产化路线 | 哪些专业 Agent 值得优先资产化，何时才能称为可用？ |

## 资产边界

| 资产 | 所有权 | 不保存什么 |
|---|---|---|
| Role Definition | Agent Governance | 模型、Host、动态任务状态 |
| Agent Profile | Agent Governance | 正文副本、Secret、会话历史 |
| Skill | `skills/**` | 角色使命、项目知识正文、单次任务 |
| Knowledge Pack | `knowledge-packs/**`（目标） | Task State、审批、运行日志 |
| Capability | Platform Registry / Runtime 能力模型 | 具体工具凭证 |
| Tool Binding | Agent Profile + Runtime Adapter | 角色决策权 |
| Policy / Approval Reference | Policy / Approval 领域 | 自然语言“默认全放开” |
| Eval Suite | Agent Eval 资产 | 生产状态本身 |
| Host Release | Publisher / Release Registry | Git 正式真源的替代品 |
| Context Package | `05` Context Runtime | 长期 Agent 配置 |
| Task / Evidence | Task / Evidence 领域 | Agent Profile 配置 |

## 当前状态

当前已有：

- Chat 作为总控 Planner / Reviewer 的人工角色实践；
- Codex、OpenCode / DeepSeek、脚本和 Runtime 等执行器实践；
- 6 个活跃 Skill 及其测试或验证证据；
- Git Knowledge、Context、Registry、Handoff 与冻结 Artifact 交付；
- Custom GPT Actions 窄链路实验。

当前尚无：

- 正式 `agents/` 目录；
- Role / Agent Profile Schema；
- 可发布的 Knowledge Pack；
- Agent Eval 数据集和 Release Registry；
- Host Publisher；
- 已达到 `released` 状态的专业 Agent。

因此现阶段的专业 Agent 都是 `candidate` 或人工角色实践，不得写成已发布产品。

## 阅读顺序

```text
AGT-001 总体架构
→ AGT-002 角色与 Profile
→ AGT-003 知识与行为装配
→ AGT-005 Skill、能力、工具和权限
→ AGT-007 评估与发布
→ AGT-008 专业目录与 P0 路线
```

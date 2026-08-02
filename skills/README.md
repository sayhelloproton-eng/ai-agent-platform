# Skills

`skills/` 保存经过边界治理、可重复使用并可验证的 Agent 能力。数量不是目标；精确触发、渐进披露和职责不重叠才是目标。

## 活跃 Skill

| Skill | 唯一核心问题 | 状态 |
|---|---|---|
| [`planner-executor-handoff`](planner-executor-handoff/SKILL.md) | Planner 如何把普通实施或冻结 Artifact 安全交给 Executor，并接收证据、复审和续跑？ | accepted |
| [`project-knowledge-synthesis`](project-knowledge-synthesis/SKILL.md) | 多源项目材料中哪些是事实、重复、冲突，目标知识结构应该是什么？ | in_review |
| [`engineering-document-authoring`](engineering-document-authoring/SKILL.md) | 已确认内容如何写成 Human-first、AI-lossless 的正式工程文档？ | in_review |
| [`project-knowledge-governance`](project-knowledge-governance/SKILL.md) | 正式项目知识如何落位、登记、校验、检索和单向发布？ | in_review |
| [`engineering-insight-distillation`](engineering-insight-distillation/SKILL.md) | 有证据的工程事件能否提炼为有边界、可执行的复用洞见？ | verified / explicit trigger |
| [`custom-gpt-actions`](custom-gpt-actions/SKILL.md) | Custom GPT Action 如何保持 Builder 兼容和服务端安全边界？ | verified |

## 已退出独立 Skill

- `deterministic-delivery`：能力并入 `planner-executor-handoff` 的 `apply_frozen_artifacts` 模式；
- `ai-knowledge`：被职责更窄的 `project-knowledge-governance` 取代；
- `microsoft-dev-tunnels`：降级为 [`apps/dev-tunnel`](../apps/dev-tunnel/README.md) 的应用 Runbook，不再作为通用 Agent Skill。

## 共同规则

- 修改前读取根 [`AGENTS.md`](../AGENTS.md) 与 [`skills/AGENTS.md`](AGENTS.md)；
- `SKILL.md` 只保留运行时必要规则，详细内容按需进入 `references/`；
- 正式设计、知识和项目事实仍进入 `docs/`、`context/` 与 Platform Registry；
- Skill 不因生成候选结果而自动获得写入、Commit、Push 或外部发布权限。

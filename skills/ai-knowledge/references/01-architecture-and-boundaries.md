# 架构与边界

## Canonical Architecture

```text
Git Repository
├── context/          Agent Runtime Context
├── docs/knowledge/   Human Knowledge and only Projection Source
├── docs/technical/   Engineering Documentation
├── docs/learning/    Learning Assets
├── docs/adr/         Architecture Decisions
└── skills/           Executable Capabilities
```

Git Repository 是唯一真源。Feishu 不在 Canonical Layer 中。

允许的发布方向只有：

```text
Git docs/knowledge/
        ↓
Feishu Knowledge Projection
```

## 使用者

Skill 的直接使用者是 `ai-agent-platform` 中的 Agent，不是普通 Feishu 用户，也不是 Codex 本身。

```text
Human / Chat
      ↓
Agent（理解目标、组织内容、做决策）
      ↓
AI Knowledge Skill（Git 知识生命周期）
      ↓
Git Files / Index / Review
      ↓ optional and separately authorized
Projection Publisher
      ↓
Feishu Provider
```

Feishu Provider 不是 Git 的对等知识源。外部 Feishu 内容只能作为证据或导入候选，必须经过分类、Git Draft 和 Review 才能成为项目事实。

## 角色职责

### Chat / 上游 Agent

- 维护项目全局语义上下文。
- 生成或审核正式 Git 内容。
- 决定技术决策、项目阶段和公开表述。
- 把执行任务结构化交给 Codex。

### Codex / 执行 Agent

- 从 `context/` 和任务相关 Git 资产读取最小上下文。
- 按授权范围修改 Git、运行校验并产出结果。
- 不在缺少依据时自行宣布完成、接受决策或改变阶段。

### AI Knowledge Skill

- 按 Git Layer 路由查询和 Draft。
- 组装 Context Package。
- 生成 Git Change Plan、Draft、关系和验证要求。
- 只为 `docs/knowledge/` 生成 Projection Plan。
- 检测 Drift，但不自动合并 Git 与 Feishu。

### Feishu Provider

- 解析 Wiki/Doc 资源和执行受控 I/O。
- 读取外部资料时返回证据，不宣布项目事实。
- 发布时只接收来自 `docs/knowledge/` 的已审查内容。
- 不决定知识类型、项目状态或 Canonical 内容。

## Provider-neutral

上层能力使用 Knowledge Item、Context Package、Knowledge Event、Project State、Change Plan 和 Projection Plan。Feishu token 只能出现在 Provider 元数据，不得侵入领域模型。

## 非目标

- 替代官方 Feishu 工具 Skill。
- 把 Skill 做成 Feishu CRUD 包装器。
- 自动吸收聊天或 Feishu 内容。
- 从 Feishu 覆盖 Git 或执行双向同步。
- 将 Technical、Learning、ADR 或 Context 默认发布。
- 在规则合同中提前实现脚本或 API 行为。

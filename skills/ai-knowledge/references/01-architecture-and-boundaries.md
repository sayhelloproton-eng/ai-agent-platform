# 架构与边界

## 使用者

Skill 的直接使用者是 `ai-agent-platform` 中的 Agent，不是普通飞书用户，也不是 Codex 本身。

```text
Human / Chat
      ↓
Agent（理解目标、组织内容、做决策）
      ↓
AI Knowledge Skill（知识生命周期工作流）
      ↓
Knowledge Provider Port
      ↓
Feishu / Git / Local / Web Adapter
      ↓
lark-cli / OpenAPI / 文件系统
```

## 角色职责

### Chat / 上游 Agent

- 维护项目全局语义上下文。
- 生成或审核正式知识内容。
- 决定技术决策、项目阶段和公开表述。
- 把执行任务结构化交给 Codex。

### Codex / 执行 Agent

- 读取本地仓库和任务输入。
- 调用脚本、lark-cli、运行校验并产出结果。
- 不在缺少依据时自行宣布项目完成、决策或目标变化。

### AI Knowledge Skill

- 确定何时需要长期知识。
- 选择最小相关来源，组装 Context Package。
- 将已确认结果转为知识草稿、Write Plan 和索引更新。
- 管理知识生命周期和治理规则。

### Feishu Provider

- 解析 Wiki/Doc URL 和 token。
- 读取目录、outline、section、Markdown。
- 受控创建或更新文档。
- 不决定知识类型、内容结论或项目阶段。

## Provider-neutral

上层能力使用统一概念：Knowledge Item、Context Package、Knowledge Event、Project Status、Write Plan。Feishu token 只能出现在 Provider 元数据，不得侵入领域模型。

## 非目标

- 替代飞书官方 `lark-doc`、`lark-wiki` 等工具 Skill。
- 做成通用 CMS、数据库或搜索引擎。
- 自动吸收未经审查的所有聊天内容。
- 在 v1 中实现向量数据库或复杂 RAG 基础设施。

# ai-agent-platform Project Profile

机器配置：[`../assets/ai-agent-platform.json`](../assets/ai-agent-platform.json)。该配置属于后续配置层对齐范围；本文件定义当前规则合同。

## Git Canonical Entry

- Project Context：`context/project-context.md`
- Current State：`context/current-status.md`
- Roadmap：`context/roadmap.md`
- Knowledge Projection Source：`docs/knowledge/`
- Technical Documentation：`docs/technical/`
- Learning Assets：`docs/learning/`
- ADR：`docs/adr/`
- Asset / Relation Index：`docs/technical/元数据/`
- Skill Design：`docs/knowledge/Agent与能力/Skill设计/SKL-001-ai-knowledge.md`

## Layer Rules

- `context/`：Agent Runtime Context，禁止 Feishu Projection。
- `docs/knowledge/`：Human Knowledge，唯一允许的 Feishu Projection Source。
- `docs/technical/`：工程技术文档，默认不发布。
- `docs/learning/`：学习资产，不发布。
- `docs/adr/`：架构决策，不作为知识库正文。
- `skills/`：可执行能力，不是发布源。

## Feishu Role

Feishu 是 Human Readable Knowledge Projection 和可选外部证据 Provider。目录 Token 是 Provider 配置，不是领域事实。

Feishu 页面不能覆盖 Git。Feishu 人工修改如果有价值，只能形成 Git Change Proposal，经 Review 后进入相应 Git Layer。

## Current Phase

执行时始终读取 Git `context/current-status.md`；本参考文件不硬编码动态进度。

# Retrieval and Token Policy

## Order

1. L0：`context/` 中的项目状态、任务、约束和规则。
2. L1：`docs/technical/元数据/` 中的 Asset / Relation Index。
3. L2：目标 Git Layer 的文档结构或局部段落。
4. L3：最多 3 篇高相关完整正文。
5. External Provider：仅在 Git 证据不足且任务需要时读取，不作为真源。

## Routing

- 当前项目、状态和执行约束：`context/`。
- 面向人类的项目、架构、Agent、Workflow、实验和 Portfolio：`docs/knowledge/`。
- Runtime、Provider、Adapter、技术方案、调研、规范和 Operations：`docs/technical/`。
- 学习路线和学习笔记：`docs/learning/`。
- 决策、备选和后果：`docs/adr/`。
- Skill 运行合同与实现：`skills/ai-knowledge/`。

## Source Priority

1. Git Canonical Content。
2. Git 中已验证的索引和证据。
3. 获得授权的外部 Provider 证据。

Feishu 页面不能因为更新更晚而覆盖 Git。发现差异时标记 Drift，不自动合并。

默认候选 8、完整正文 3、正文预算 12,000 字符。Private Context 只有任务必要且公开资产不足时才读取。

# Retrieval and Token Policy

## Order

1. L0：项目配置、Current State、Current Task。
2. L1：Asset / Relation Index。
3. L2：目标文档结构或局部段落。
4. L3：最多 3 篇高相关完整正文。

## Routing

- 定位：`00-context` + `01-product`。
- 系统修改：`02-architecture` + `03-domain` + `10-adr`。
- Agent / Skill：`04-agent-system` + `06-knowledge-system` + `skills/`。
- 工作流：`05-workflows` + 对应 Solution / ADR。
- 调研与证据：`08-research` + `09-experiments`。
- 当前进度：只读 Git `CTX-002`，必要时补充 Operations 证据。

默认候选 8、完整正文 3、正文预算 12,000 字符。Private Context 只有任务必要且公开资产不足时才读取。

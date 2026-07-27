# 示例：查询项目上下文

目标：为 Gateway 修改先读取 `context/current-status.md`，再按需读取 `docs/knowledge/` 中的 ARC-001、ARC-003、DOM-001 和 Workflow，以及 `docs/adr/` 中的相关决策；输出最小 Context Package，不默认读取 Feishu 或 Private Context。

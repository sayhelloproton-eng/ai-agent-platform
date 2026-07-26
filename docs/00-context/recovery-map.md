# Recovery Map

新 Agent 应按以下顺序恢复项目上下文：

1. [`AGENTS.md`](../../AGENTS.md)
2. [`README.md`](../../README.md)
3. [`CTX-001 Project Context`](CTX-001-project-context.md)
4. [`CTX-002 Current State`](CTX-002-current-state.md)
5. [`Current Task`](current-task.md)
6. [`CTX-003 Project Outline`](CTX-003-project-outline.md)
7. [`ARC-001 Platform Target Architecture`](../02-architecture/ARC-001-platform-target-architecture.md)
8. [`ARC-003 Six-Month Delivery Architecture`](../02-architecture/ARC-003-six-month-delivery-architecture.md)
9. [`Asset Index`](../_index/assets.yaml)
10. 当前任务在 Asset Index 和 Relation Index 中关联的资产。

只有在公开资产不足以完成任务、任务明确需要私人背景且访问权限允许时，才读取相关 `.private-context/` 文件。不得默认扫描或复制私人上下文。

# Pilot: 00 项目入口聚合

## Scope

输入为 `docs/knowledge/00_项目入口/` 的 README 和六篇正式文章，真值对照 Context、Platform Registry、代码与测试。

## Findings

- `CTX-001` 与 `PRD-001` 重复拥有“为什么建设、长期愿景、成功标准”；
- `CTX-005` 与 `CTX-007` 重复拥有“当前实现、能力边界和目标差距”；
- `CTX-006` 的导航、证据优先级和文档边界应由知识库根 README、目录 README 和治理文档维护；
- 多篇文章含有“最终 Review 已完成”、旧 Handoff 版本和过期下一步。

## Decision

正式入口收敛为：

1. `CTX-001-项目总览.md`；
2. `CTX-005-当前能力与演进差距.md`；
3. `DEC-001-架构决策演进摘要.md`。

`PRD-001`、`CTX-006`、`CTX-007` 转入技术归档并保留稳定 ID / superseded 关系。产品细节归 `01_产品体系`，完整目标架构归 `ARC-001`，阅读导航归 README。

## Governance

本 Pilot 只证明 Contract、方法和真实目录聚合可用。Skill 生命周期保持 `in_review`；正式文件由总控 Planner 编写并由用户确认，Executor 只做冻结落库。

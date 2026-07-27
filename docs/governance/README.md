# Project Governance

## What

`docs/governance/` 保存项目宪法之下的详细治理和操作规范。

## Why

根 `AGENTS.md` 只保留稳定、最高层规则。治理文档承载需要解释、示例和执行步骤的规范，避免所有 Agent 在每次任务中无条件加载全部细节。

## Contains

- [`agent-working-protocol.md`](agent-working-protocol.md)：角色、任务读取、Scope Lock、计划、停止、验证和交付协议；
- [`git-feishu-governance.md`](git-feishu-governance.md)：Git 唯一真源、Feishu Projection / Native、晋升、发布、冲突和安全边界；
- [`documentation-rules.md`](documentation-rules.md)：README、正式知识资产、Asset ID、命名、状态、归档、链接和索引规范。

## Boundary

本目录解释“如何执行治理规则”，不保存：

- 项目完整大纲；
- Current State 或单次任务步骤；
- 具体仓库迁移方案；
- 飞书 Token 或租户配置；
- Skill 运行时实现；
- 业务代码和测试。

## Structure

规则优先级：

1. 用户当前明确任务指令；
2. 根 [`AGENTS.md`](../../AGENTS.md)；
3. 目录级 [`docs/AGENTS.md`](../AGENTS.md) 或 [`skills/AGENTS.md`](../../skills/AGENTS.md)；
4. 本目录中的详细治理文档。

下层规则只能细化，不得推翻上层安全、事实和决策边界。

## Usage

- 所有 Agent：任务涉及仓库修改时按需读取工作协议；
- 文档或知识 Agent：读取文档规则和 Git / Feishu 治理；
- Skill 开发者：结合 `skills/AGENTS.md` 读取相关治理；
- Project Owner：评审治理变化、高风险操作和例外。

## Maintenance

当项目级执行流程、正式事实边界、飞书职责或文档标准改变时更新。改变根宪法级规则时，必须先由 Project Owner 确认，并检查是否需要 ADR。

## Related Docs

- [项目宪法](../../AGENTS.md)
- [文档目录规则](../AGENTS.md)
- [Skill 工程规则](../../skills/AGENTS.md)
- [Git 唯一真源 ADR](../10-adr/ADR-002-git-single-source-feishu-projection.md)
- [Knowledge Asset Architecture](../06-knowledge-system/ARC-002-knowledge-asset-architecture.md)

---
asset_id: SOL-001
asset_type: solution
status: implemented
evidence_level: verified
canonical_path: docs/07-solutions/knowledge-system/SOL-001-feishu-wiki-initialization.md
related_assets: [RSH-001, OPS-001, OPS-002, OPS-003]
---

# SOL-001 Feishu Wiki Initialization

## Problem

为项目创建可供人阅读和 Agent 查询的飞书知识空间，同时避免重复创建、权限扩大、凭据泄漏和不可回滚操作。

## Recommended Solution

1. 使用官方 `lark-cli` 和用户身份。
2. 创建前按名称列出并精确查重。
3. 先 dry-run 验证 Space 和 Node Schema。
4. 创建 Space 时使用 `open_sharing: closed`。
5. 按冻结顺序创建 15 个根级 `docx` Node，不猜测 token。
6. 创建后只读回查 Space、节点数量、标题、父节点和对象类型。
7. 将执行结果写入 Operations；正式项目内容仍以 Git 为准。

## Security and Failure Handling

- 不自动公开互联网分享。
- 不把 `visibility: public` 误解为互联网公开。
- 创建接口无幂等键；重复执行前必须查重。
- CLI 不支持的 Space 元数据更新不得通过猜测内部接口实现。

## Validation

初始化和 15 个一级节点已经验证，见 [`OPS-001`](../../12-operations/feishu/OPS-001-knowledge-base-initialization.md)。首页见 [`OPS-002`](../../12-operations/feishu/OPS-002-homepage-publication.md)。

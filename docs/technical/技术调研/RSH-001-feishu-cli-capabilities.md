---
asset_id: RSH-001
asset_type: research
status: validated
evidence_level: verified
canonical_path: docs/technical/技术调研/RSH-001-feishu-cli-capabilities.md
related_assets: [EXP-001, EXP-002, SOL-001]
---

# RSH-001 Feishu CLI Capabilities

## Scope

基于官方 `lark-cli 1.0.77` 帮助、Schema 和只读探测，评估 Wiki / Docs 的创建、读取、导出和公开设置能力。

## Findings

- 有效 user 或 bot identity 可通过官方 OpenAPI 跨租户读取允许访问的公开 Wiki 节点。
- `docx` 可读取 outline 和 Markdown；`sheet`、`bitable` 需要对应工具与格式路由。
- “网页公开”“OpenAPI 可读”“匿名可读”是不同状态。
- `open_sharing` 与 `visibility` 不同；已有 Space 的互联网公开状态在当前 CLI Schema 中不能更新。
- Space / Node 创建可 dry-run，但 Node 创建缺少幂等键，真实执行前必须查重。
- CLI 不支持的 Space 名称/描述更新不能通过猜测内部接口实现。

## Implications

上层 Skill 应使用 Provider-neutral Knowledge Port；Feishu Adapter 负责身份、对象类型路由、分页和错误。外部全文默认只保留本地镜像，公开仓库保存摘要、脚本和证据。

## Sources

- [`EXP-001`](../../knowledge/08_实验与复盘/EXP-001-公开飞书知识库读取实验/README.md)
- [`EXP-002`](../../knowledge/08_实验与复盘/EXP-002-公开飞书知识库递归导出实验/README.md)
- [`external/waytoagi-feishu-cli-export/`](./external/waytoagi-feishu-cli-export)

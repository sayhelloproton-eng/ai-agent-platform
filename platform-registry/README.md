# Platform Registry

`platform-registry/` 是 `ai-agent-platform` 的跨资产身份、关系、状态、实现证据、投影和发布记录真源。它同时记录当前真实资产和已经批准的目标，但计划资产不等于已经落库、Review 或发布的正式资产。

## Contains

- `assets.yaml`：资产主记录；
- `relations.yaml`：跨资产关系；
- `relation-types.yaml`：受控关系词表；
- `projections.yaml`：Git → Feishu 映射；
- `implementation-status.yaml`：实现能力与证据；
- `releases.yaml`：发布记录；
- `migrations/`：迁移状态；
- `registries/engineering-insights/`：工程洞见领域 Registry；
- `schemas/`：机器校验契约；
- `generated/`：未来由确定性脚本生成的索引；当前不提交空占位索引。

## Boundary

正文服务人的理解，Registry 服务系统查询、关系、状态、投影和变更影响。

Registry 不保存聊天全文、Secret、运行缓存或飞书正文副本。

路径和状态规则：

- `canonical_path` 只指向当前有效且真实存在的仓库路径；
- `current_path` 记录当前已物化资产位置；
- `target_path` 可以记录尚未落库的迁移目标；
- `materialized: false` 的计划资产不得拥有 `canonical_path`；
- 只有正文已生成并通过 Review 后，文档资产才能进入 `accepted`；
- 计划资产必须保持 `unpublished`，不得拥有飞书节点映射。

## Migration Closure

Batch 07 将既有资产的 `migration_state` 收口为 `complete`；后续物化资产也必须按真实路径登记。`materialized` 描述资产是否存在，`status` 描述领域生命周期，`migration_state` 只描述路径迁移是否完成，三者不能混用。

完整实现治理与校验说明见 [`SOL-KNO-001`](../docs/technical/技术方案/知识系统/SOL-KNO-001-Platform-Registry实现治理与验证.md)。

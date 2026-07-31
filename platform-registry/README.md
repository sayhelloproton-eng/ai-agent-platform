# Platform Registry

`platform-registry/` 是 `ai-agent-platform` 的跨资产身份、关系、状态、实现证据、投影和发布记录真源。

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
- `generated/`：由脚本生成的索引，禁止人工编辑。

## Boundary

正文服务人的理解，Registry 服务系统查询、关系、状态、投影和变更影响。

Registry 不保存聊天全文、Secret、运行缓存或飞书正文副本。

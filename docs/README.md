# Knowledge Assets

`docs/` 保存 `ai-agent-platform` 的正式知识资产、索引、模板和迁移期历史材料。Git 是项目正式事实的唯一真源。

## 规则与治理入口

- [`AGENTS.md`](AGENTS.md)：修改 `docs/**` 时必须遵守的目录级规则；
- [`governance/README.md`](governance/README.md)：详细治理文档导航；
- [`governance/agent-working-protocol.md`](governance/agent-working-protocol.md)：Agent 执行、验证和交付流程；
- [`governance/git-feishu-governance.md`](governance/git-feishu-governance.md)：Git 与飞书知识边界；
- [`governance/documentation-rules.md`](governance/documentation-rules.md)：README、正式资产、状态、链接和索引规范。

## 当前正式入口

- [`00-context/`](00-context/)：项目背景、当前状态、当前任务、恢复路径和 Roadmap；
- [`01-product/`](01-product/)：平台愿景与 Portfolio 结果；
- [`02-architecture/`](02-architecture/)：长期目标架构与六个月交付架构；
- [`_index/assets.yaml`](_index/assets.yaml)：按稳定 Asset ID 检索正式资产。

## 资产类型与目录

| 目录 | 资产 |
|---|---|
| `00-context/` | 项目背景、当前状态、Roadmap |
| `01-product/` | 产品愿景、目标和非目标 |
| `02-architecture/` | 总体架构、视图与图源 |
| `03-domain/` | DDD 领域模型 |
| `04-agent-system/` | Agent 与 Skill 设计 |
| `05-workflows/` | Workflow 设计 |
| `06-knowledge-system/` | Knowledge Layer 与知识治理 |
| `07-research/` | 证据化调研 |
| `08-experiments/` | 可复现实验结论 |
| `09-adr/` | 正式架构决策 |
| `10-engineering/` | 工程规范 |
| `11-operations/` | 运行、事故与复盘 |
| `12-portfolio/` | 成果展示 |
| `_index/` | Agent 检索入口与映射 |
| `_templates/` | 正式资产模板 |
| `_archive/` | 已废弃但需保留的历史 |

迁移期间，既有 `docs/context/` 和根层历史文档继续保留，但新的 Context Canonical Path 已指向 `docs/00-context/`。后续资产迁移必须经过资产盘点，不做批量移动或删除。

## 生命周期

```text
Capture → Classify → Draft → Review → Accepted → Implemented
        → Validated → Published → Superseded / Archived
```

资产状态：

- `draft`
- `proposed`
- `accepted`
- `implemented`
- `validated`
- `superseded`
- `archived`

证据等级：

- `hypothesis`
- `observed`
- `verified`
- `decided`

## 创建正式资产

1. 从 `docs/_templates/` 选择模板。
2. 分配稳定 `asset_id`。
3. 填写状态、证据等级、Canonical Path 和关系。
4. 更新 `docs/_index/assets.yaml`。
5. 更新 `docs/_index/relations.yaml`。
6. 完成人工 Review 后再接受决策或合并正式结论。
7. 如需飞书阅读版，根据 `docs/_index/feishu-map.yaml` 生成投影并回读验收。

## 飞书规则

- `mirror`：一个 Git 文档对应一个飞书文档。
- `projection`：飞书页面由多个 Git 资产汇总。
- `index`：飞书仅显示目录、摘要和链接。
- `native`：仅在飞书维护，且不是正式项目事实。
- `capture`：临时捕获，后续晋升、转 Native 或归档。

Git 与飞书投影冲突时，以 Git 为准；有价值的飞书修改应转换为 Git Change Proposal，而不是自动反写。

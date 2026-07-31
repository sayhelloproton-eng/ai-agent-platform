# Assets

本目录保存 `engineering-insight-distillation` 的结构化 Schema 和无业务绑定模板。

## Schemas

- `experience-candidate.schema.json`：具体工程事件候选输入；
- `screening-result.schema.json`：低成本筛选结果；
- `engineering-insight.schema.json`：成功提炼后的工程洞见；
- `distillation-result.schema.json`：每次运行的统一结果包，支持成功、待补证据和拒绝。

## Templates

- `experience-candidate.yaml`；
- `screening-result.yaml`；
- `engineering-insight.yaml`；
- `distillation-result.yaml`。

## Boundary

- Schema 和模板不得包含真实项目结论、私有 URL、Token、账户信息或运行数据；
- 模板只提供占位结构，不制造默认根因或默认成熟度结论；
- 具体案例进入 `tests/fixtures/` 或受治理的项目知识资产；
- Schema 变化必须同步更新模板、测试说明、Manifest 和 Changelog。

## Usage

1. 使用 Candidate Schema 整理事件；
2. 不确定是否值得沉淀时先输出 Screening Result；
3. 只有 `proceed_full` 或明确完整请求才执行 Full；
4. Full 每次输出 Distillation Result；
5. 只有 `result_status: insight_proposed` 时才包含 Engineering Insight；
6. `needs_evidence` 和 `rejected` 必须保持 `insight: null`。

成熟度和生命周期是两个独立字段：

- `maturity_level`：candidate → provisional → validated → repeated → established；
- `lifecycle_status`：active | revised | deprecated。

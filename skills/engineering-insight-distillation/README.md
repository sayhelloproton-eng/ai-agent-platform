# Engineering Insight Distillation

## What

`engineering-insight-distillation` 是一个领域无关的工程经验提炼 Skill。它把证据支持的具体事件加工为可复用、可追溯、带适用边界的工程判断、模式、反模式、启发式规则和检查项。

## Why

工程事件本身通常绑定具体项目、产品、供应商和临时实现。如果只保留事故流水账，后续任务难以复用；如果直接提炼成口号，又容易失真和过度泛化。本 Skill 提供一套稳定流程，在保留证据和边界的前提下，把具体经验转化为能够指导下一次行动的工程洞见。

## Problem

本 Skill 主要解决以下问题：

- 具体故障或返工记录无法跨场景复用；
- 单个案例被错误升级为绝对规则；
- 相似经验反复创建，缺少查重和演进；
- 经验只有结论，没有机制、适用条件和防复发动作；
- 事实、根因推断、建议和正式规则混在一起；
- 经验随着项目推进失效，却没有修订和废弃记录。

## Boundary

本 Skill 是**经验加工方法**，不是经验库、项目复盘、聊天摘要工具或自动学习系统。

它负责：

- 检查经验候选的事实与证据完整性；
- 识别底层机制并控制抽象层级；
- 形成判断、模式、反模式、启发式或检查项；
- 明确适用条件、排除条件、证据强度和成熟度；
- 识别重复、冲突、修订和经验演进；
- 给出可执行资产与下游落位建议。

它不负责：

- 还原完整项目时间线；
- 自动补写缺失根因或证据；
- 自动批准成熟度升级；
- 自动修改 ADR、技术方案、工程规范或其他 Skill；
- 自动持久化长期记忆；
- 直接写入外部知识平台。

## Inputs

最小输入是一条 `experience candidate`，应尽量包含：

- 预期结果；
- 实际事件及影响；
- 当时的假设；
- 证据和来源；
- 根因分析及不确定性；
- 解决动作；
- 验证结果；
- 候选经验表述。

输入可来自人工整理，也可来自可选上游 `project-knowledge-synthesis` 等事实综合流程。上游名称不构成强依赖。

## Modes

- `screening`：先判断是否值得完整提炼，输出 `proceed_full | needs_evidence | reject`；
- `full`：对通过筛选或已明确完整的事件执行七个 Checkpoint；
- `auto`：根据用户目标、输入完整度和批量规模选择模式。

两级模式避免对一次性小错误和证据不足事件生成昂贵的完整洞见。

## Outputs

每次运行首先输出符合 Schema 的 `distillation result`。只有关键质量门通过时，结果中才包含 `engineering insight`，至少包括：

- 通用问题与底层机制；
- 原则和主类型；
- 适用场景、前置条件和排除条件；
- 建议动作和防复发检查；
- 证据强度、成熟度、生命周期和治理状态；
- 来源引用、关联洞见和修订历史。

输出可以建议进入工程规范、测试策略、任务规划、架构决策、复盘或知识系统，但写入和升级必须由外部受控流程执行。

## Structure

- [`SKILL.md`](SKILL.md)：面向 Agent 的稳定执行内核；
- [`references/`](references/README.md)：证据、抽象、边界、查重、成熟度和质量门；
- [`assets/schemas/`](assets/README.md)：经验候选、Screening、洞见和统一 Full 结果 Schema；
- [`assets/templates/`](assets/README.md)：无业务绑定的输入输出模板；
- [`tests/fixtures/`](tests/README.md)：正向、负向、重复和冲突评测案例；
- [`tests/evals/`](tests/evals/README.md)：Trigger、Rubric、Pilot 和 Screening 回归资产；
- [`scripts/eval.mjs`](scripts/README.md)：不调用模型的离线契约与回归 Harness；
- [`agents/openai.yaml`](agents/openai.yaml)：Agent 界面元数据；
- [`CHANGELOG.md`](CHANGELOG.md)：Skill 版本演进记录；
- [`MANIFEST.json`](MANIFEST.json)：Skill 包清单和能力边界。

## Usage

最小流程：

1. 将工程事件整理为 `experience candidate`；
2. 不确定价值时先执行 `screening`；
3. 对 `proceed_full` 的事件执行七个 Checkpoint；
4. 对照质量门完成 Full 输出；
5. 由人工确认洞见、成熟度和下游落位；
6. 将真实失败补充为 Eval，再迭代 Skill。

## Registry

通过治理的洞见保存于 Git 工程洞见注册表，而不是 Skill 本体。推荐主归属为 `docs/technical/元数据/engineering-insights/`。Skill 在任务前检索相关洞见，在问题解决后筛选、提炼、查重并更新 Occurrence。

## Current Version

`0.2.0` 在 Screening / Full / Auto 与 Eval Harness 基础上增加正式工程洞见注册表协议、Registry Schema 和离线注册表验证。当前版本仍不调用模型、不自动写入、不自动升级成熟度，也不把具体项目经验写入 Skill 内核。

## Maintenance

以下情况需要更新本 Skill：

- 真实案例暴露了错误抽象或遗漏边界；
- 查重、冲突或成熟度规则无法处理新情况；
- 输出无法转化为可执行动作；
- 新增或修改 Schema、模板、Fixture 或质量门；
- Skill 与上游、下游能力的协作边界变化。

更新时必须同步检查 README、SKILL、References、Schema、Template、Fixture、Manifest 和 Changelog，不得只修改单一文件。

## Related

- 可选上游：`project-knowledge-synthesis`；
- 可能下游：`ai-knowledge`、工程规范、架构决策、测试策略、任务规划、代码复审和项目复盘；
- 详细协作边界见 [`references/08-上下游协作边界.md`](references/08-上下游协作边界.md)。

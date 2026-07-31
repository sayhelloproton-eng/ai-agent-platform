# Changelog

    ## 0.2.0 - 2026-07-31

    - 增加正式工程洞见注册表协议。
    - 增加 Engineering Insight Registry JSON Schema。
    - 增加 `validate-insight` 与 `validate-registry` 离线验证命令。
    - 明确任务前检索、任务后提炼、Occurrence 更新和冲突修订闭环。
    - 明确 Registry 位于 Git 技术元数据层，不属于 Skill 内核和 Feishu 发布源。
    - 增加可记录的技术复核委托机制，但不扩大删除、权限、公开和历史重写授权。
    - 首批工程洞见数据保持在 Registry，不写入 Skill 核心规则。

    ## 0.1.2 - 2026-07-31

    - 基于第一轮真实 Pilot Eval 增加 `screening`、`full`、`auto` 三种运行选择。
    - 增加 `screening-result` Schema 和模板，支持 `proceed_full`、`needs_evidence` 与 `reject`。
    - 增加运行模式、成本控制和触发边界参考文档。
    - 增加无外部依赖的 `scripts/eval.mjs` Harness。
    - 增加 Trigger Eval、固定 Rubric、Pilot 01 和 Screening Pilot 02。
    - 增加离线 Manifest、Schema、结果状态、成熟度和核心领域无关检查。
    - 收窄 Skill Description，减少普通排错、实现、翻译、总结和状态查询误触发。
    - 当前版本仍不调用模型、不自动写入正式知识资产、不自动升级成熟度。

    ## 0.1.1 - 2026-07-31

    - 增加统一 `distillation-result` Schema 和模板，正式承载 `insight_proposed`、`needs_evidence` 与 `rejected`。
    - 将成熟度等级与生命周期状态拆分，避免把 `revised`、`deprecated` 当作成熟度。
    - 增加 occurrence 结构，确保 repeated / established 有独立事件证据。
    - 增加质量门、未解决不确定性、缺失证据和下游落位建议的结构化输出。
    - 增加治理状态一致性约束和成熟度条件校验。
    - 增加成熟度与生命周期分离的回归 Fixture。
    - Candidate Schema 增加可选 comparison context，避免无索引时声称唯一性。

    ## 0.1.0 - 2026-07-31

- 建立领域无关的工程经验候选模型与工程洞见模型。
- 建立输入资格、事实分类、证据强度和根因不确定性规则。
- 建立从具体事件到底层机制、原则和可执行资产的抽象流程。
- 建立判断、模式、反模式、启发式和检查清单分类。
- 建立适用边界、排除条件和错误泛化控制。
- 建立查重、冲突、关系、修订和历史保留机制。
- 建立候选到正式规则的成熟度与人工审批边界。
- 建立输出契约、质量门和首批真实案例评测夹具。
- 当前版本不包含自动化脚本、经验数据库、自动写入或无人监督的成熟度升级。

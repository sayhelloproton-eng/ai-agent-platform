---
asset_id: CTX-004
asset_type: roadmap
title: Six-Month Roadmap
status: accepted
evidence_level: decided
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/00-context/CTX-004-roadmap-6-months.md
related_assets: [CTX-003, ARC-003]
---

# CTX-004 Six-Month Roadmap

## Month 1–2: Knowledge Foundation

### Objectives

- 建立公开项目上下文、资产模型和恢复入口。
- 固化 Git 唯一真源与 Feishu Projection 边界。
- 验证 AI Knowledge Skill 的索引优先、最小上下文只读能力。

### Deliverables

- Context、Product、Architecture、ADR、Research、Experiment 和 Solution 的正式入口。
- Asset / Relation / Feishu Map / Migration Inventory。
- 可安装、可验证的 AI Knowledge Skill。

### Validation

- 链接、索引、Canonical Path、敏感信息和 Skill 自检通过。
- 新 Agent 能依据 Recovery Map 找到当前任务和证据。

### Risks

- 历史文档与飞书页面漂移。
- 过度整理而缺少运行验证。
- 第三方内容或私人上下文越界进入公开仓库。

### Exit Criteria

- 核心知识资产可检索、可追踪、可恢复。
- Git / Feishu 治理经过 Review。
- 只读查询有可重复验证结果。

## Month 3–4: AI Coding Workflow

### Objectives

- 建立 ChatGPT → Task → Codex → Git 的最薄闭环。
- 让任务输入、执行状态、结果和验收可追踪。

### Deliverables

- Task / Result Schema 与示例。
- Gateway / Bridge MVP。
- Codex Adapter 与 Execution / Result Tracking。
- 最小安全门禁、日志、重试和回归测试。

### Validation

- 使用真实小任务完成从结构化输入到可 Review Git diff 的闭环。
- 失败可定位、可重试，未经授权的高风险操作被阻止。

### Risks

- Codex 可编程入口和产品能力变化。
- Bridge 过早承担复杂推理。
- 权限、日志或凭证处理不当。

### Exit Criteria

- 至少一类工程任务可稳定重复执行。
- 输入、输出和错误契约明确。
- 执行证据能支持 Review 与恢复。

## Month 5–6: AI Video Workflow MVP + Portfolio

### Objectives

- 用真实业务链路验证领域与 Workflow 架构。
- 形成可演示、可解释的 Portfolio。

### Deliverables

- Story → Character / Scene → Shot / Prompt 的 MVP。
- 至少一个视频生成 Provider Adapter。
- 一致性检查、局部重试和成本记录。
- Demo、架构说明、ADR、实验报告和面试叙事。

### Validation

- 使用固定样例端到端生成可审阅结果。
- 记录质量、耗时、调用次数、失败与重试等实际指标。

### Risks

- 云端视频能力成本和稳定性。
- 输出质量缺少统一评估标准。
- 业务范围扩张导致 MVP 延迟。

### Exit Criteria

- MVP 可运行且结果可复现。
- Planned 与 Delivered 清晰区分。
- Portfolio 中的每项成果可由仓库证据支撑。

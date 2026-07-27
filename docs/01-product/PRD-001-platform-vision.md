---
asset_id: PRD-001
asset_type: product
title: Platform Vision
status: accepted
evidence_level: decided
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/01-product/PRD-001-platform-vision.md
related_assets: [CTX-001, ARC-001, PRD-002]
---

# PRD-001 Platform Vision

## 平台价值

把 AI 讨论、知识、决策和工程执行连接成可恢复、可追踪、可替换的长期系统，减少上下文丢失、重复解释、无效推理和昂贵生成调用。

## 主要用户

- 需要持续学习并建设 AI Agent 工程能力的项目维护者。
- 在明确权限和上下文下执行任务的 Coding Agent。
- 未来通过 Workflow 生产内容的个人创作者。

## AI 原生协作模式

ChatGPT 负责需求澄清、分析和任务定义；AI Knowledge Skill 提供最小必要上下文；Gateway / Bridge 校验任务并路由；Codex 形成可 Review 的 Git 变更；Git 保存正式事实和执行证据。

## Knowledge Foundation

- Git 作为唯一真源。
- 飞书作为阅读投影与补充知识层。
- Asset ID、关系索引、证据等级和恢复路径。
- 索引优先、最小上下文、只读优先和受控写入。

## AI Coding Workflow

- 结构化 Task / Result 契约。
- 薄 Gateway / Bridge 与 Codex Adapter。
- Execution 状态、日志、错误、重试和验收。
- 结果以 Git diff、测试和证据进入 Review。

## AI Video Workflow

- Story、Character、Scene、Shot、Prompt、Asset 等领域。
- 结构化拆解、一致性检查、生成、局部重试和结果评估。
- 本地轻量能力承担前处理，昂贵 Provider 用于高价值生成。

## 可替换性

领域和 Application Service 依赖 Capability Port，不依赖具体模型、工具、设备或 Provider。Feishu、Git、Local File、Web、Codex、视频模型等均属于 Adapter。

## 不做什么

- 不做绑定飞书的 CRUD 平台。
- 不做只有向量检索的简单 RAG 包装。
- 不在当前阶段承诺完整 Runtime、多 Agent 自治或生产级视频平台。
- 不以未经验证的产品能力、指标或未来计划宣传为已交付功能。

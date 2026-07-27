---
asset_id: ARC-002
asset_type: architecture
title: AI Agent Platform Knowledge Asset Architecture
status: accepted
evidence_level: decided
owners:
  - project-owner
created_at: 2026-07-26
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/06-knowledge-system/ARC-002-knowledge-asset-architecture.md
feishu:
  mode: mirror
  logical_path: 07_Knowledge_System/Knowledge Asset Architecture
related_assets:
  - ADR-002
  - SKL-001
  - CTX-001
  - CTX-002
tags:
  - knowledge-assets
  - governance
  - architecture
---

# AI Agent Platform Knowledge Asset Architecture

## What

这是 `ai-agent-platform` 的知识资产治理架构。它定义正式事实、飞书投影、补充知识、Runtime Evidence、资产关系、生命周期和 Agent 维护边界。

## Why

项目需要让新 Agent、新设备和新成员不依赖历史 Chat 即可恢复上下文，同时避免 Git 与飞书各自维护一份正式事实。知识治理必须与项目的 DDD、API First 和 Adapter Pattern 保持一致。

## Architecture Drivers

- 正式事实可审计、可回滚；
- Agent 可以索引优先、最小上下文检索；
- Feishu、Git、Local File、Web 可作为可替换 Provider；
- 聊天、推测、观察、验证和决策不能混为一体；
- 协作体验不能以牺牲权威边界为代价；
- 删除、权限、公开分享和自动接受决策必须有严格安全边界。

## System Context

```text
ChatGPT / Codex / Agent / Human
                │
                ▼
Knowledge Asset Governance
分类、模板、状态、关系、审核、晋升
         ┌──────┴─────────┐
         ▼                ▼
Git Canonical Layer   Feishu Native Layer
项目唯一真源           协作与补充知识
         │                │
         ▼                │ 正式结论晋升
Feishu Projection ◄───────┘
阅读、展示、查询投影
```

## Layers

### Git Canonical Layer

保存项目背景、状态、Roadmap、架构、领域模型、ADR、Skill、Workflow、Schema、Contract、Prompt、已验证研究、正式实验、工程规范、代码、测试和配置。

### Feishu Projection

由 Git 生成的阅读镜像、汇总页、索引页、项目首页、状态看板、ADR 索引和 Portfolio。它不是独立事实源。

### Feishu Native

保存临时讨论、会议、学习笔记、外部资料、评审批注、想法和展示看板。每个页面应标记：

- `Source Mode: Feishu Native`
- `Canonical Project Asset: No`
- `Promotion Status: Not Required / Candidate / Promoted`

### Runtime Evidence

全量 Agent 日志、Trace、模型调用、监控指标和大型生成文件进入日志系统、数据库或对象存储。Git 仅保留索引、摘要、可复现实验配置、关键证据和正式复盘。

## Knowledge Asset Model

正式资产必须包含：

- 稳定 `asset_id`；
- `asset_type`；
- 生命周期 `status`；
- `evidence_level`；
- `canonical_path`；
- owner、时间、标签与关系；
- 可选 Feishu 同步模式和逻辑路径。

状态：

```text
draft → proposed → accepted → implemented → validated
      → published → superseded / archived
```

证据等级：

```text
hypothesis → observed → verified → decided
```

## Asset Relations

关系使用明确语义：

- `implements`
- `explains`
- `depends_on`
- `decided_by`
- `validated_by`
- `derived_from`
- `supersedes`
- `published_as`
- `related_to`

关系索引位于 `docs/_index/relations.yaml`。

## Synchronization Modes

| Mode | 说明 | 典型资产 |
|---|---|---|
| `mirror` | 一个 Git 文档对应一个飞书文档 | ADR、Architecture、Context |
| `projection` | 多个 Git 资产生成一个飞书页面 | 首页、Skill 总览、状态看板 |
| `index` | 仅展示目录、摘要和链接 | 代码、Schema、测试、大量实验 |
| `native` | 只在飞书维护，非正式事实 | 学习、会议、评审 |
| `capture` | 临时收集，等待分类 | Capture Inbox |

Git 与飞书投影不同，以 Git 为准。飞书修改有价值时，生成 Git Change Proposal；禁止无审核反写。

## Retrieval Flow

```text
任务
  ↓
读取 docs/_index/assets.yaml
  ↓
按类型、关系、状态和证据筛选
  ↓
读取最多量必要正文
  ↓
生成带来源的 Context Package
```

禁止每次读取整个仓库或整个知识库。

## Knowledge Lifecycle

```text
Capture
  ↓
Classify
  ↓
Draft
  ↓
Review
  ↓
Accepted
  ↓
Implemented
  ↓
Validated
  ↓
Published
  ↓
Superseded / Archived
```

Feishu Native 形成正式决策、架构调整、接口变化、Skill 变化、Roadmap 变化或最终实验结论时，必须创建 Git Draft 并经过人工 Review。

## AI Knowledge Skill

领域能力：

- `query_context`
- `package_context`
- `propose_asset`
- `capture_knowledge`
- `record_decision`
- `record_experiment`
- `promote_feishu_content`
- `publish_to_feishu`
- `detect_drift`
- `validate_relations`
- `update_project_state`

Provider 层处理文件和飞书的低层读写。Skill 不成为 Feishu CRUD Wrapper。

## Security Boundaries

Agent 不得：

- 直接向主分支写入正式资产并跳过 Review；
- 自动接受 ADR；
- 自动覆盖 Feishu Native；
- 把飞书评论直接视为项目事实；
- 静默处理冲突；
- 自动删除、移动、改权限或公开；
- 删除旧决策历史。

Agent 可以生成草稿、建议分类、创建 PR、检查模板和关系、检测 Drift、生成投影和提醒晋升。

## Evolution Strategy

1. 已完成：治理配置、Context、Architecture、Domain、Skill、Workflow、Solution、Research、Experiment、ADR 与 Operations 迁移。
2. Next：生成 Feishu 对齐 Write Plan，并实现单资产 Git → Feishu Projection MVP。
3. Later：加入 Drift 调度、Runtime Evidence 外部存储和跨 Provider 检索。

## Acceptance Criteria

- 每个正式资产有稳定 Asset ID；
- 每个正式结论可追溯到 Git；
- Skill 同时拥有设计资产和工程资产；
- 飞书页面可识别 Source Mode；
- Feishu Native 有明确晋升流程；
- Git / 飞书冲突没有职责歧义；
- 新 Agent 不依赖历史 Chat 即可恢复项目；
- ADR 保留方案变化历史；
- 实验包含问题、方法、证据、结果和限制。

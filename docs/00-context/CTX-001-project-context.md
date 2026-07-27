---
asset_id: CTX-001
asset_type: context
title: Project Context
status: accepted
evidence_level: decided
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/00-context/CTX-001-project-context.md
related_assets: [PRD-001, ARC-001, ADR-002]
---

# CTX-001 Project Context

## What

`ai-agent-platform` 是面向学习、工程实践和求职 Portfolio 的长期 AI Agent 工程平台。项目通过可验证的知识资产、任务契约、Agent 协作和 Workflow，逐步构建模型、工具、设备与 Provider 可替换的智能应用基础。

## Why

AI 正在改变软件研发方式。项目需要把零散讨论、实验与工具调用转化为可恢复的上下文、可审计的决策和可运行的工程成果，使 Agent 能在最小必要上下文下持续协作。

## Background

项目从 AI Agent、内容创作和多端协作探索起步，逐渐明确三条递进主线：先建立 Git 与飞书之间受治理的 Knowledge Foundation，再打通 ChatGPT 到 Codex 的工程任务闭环，最后以 AI Video Workflow 验证平台的业务承载能力。

## Problem

- 长期讨论容易散失，Agent 接手成本高。
- 知识、决策、代码和执行状态缺少稳定关联。
- 模型与工具变化快，业务不能绑定单一实现。
- 昂贵推理与生成调用需要通过分层、缓存、验证和局部重试控制成本。
- 学习成果需要转化为可运行、可解释、可验证的 Portfolio。

## Target Users

- 项目维护者与学习者。
- 执行明确工程任务的 Coding Agent。
- 查询项目最小必要上下文的 AI Agent。
- 未来使用 Agent Workflow 完成内容生产的个人创作者。

## Goals

- 建立 Git 唯一真源和飞书阅读投影。
- 建立 AI Knowledge Skill、索引和上下文恢复机制。
- 定义 `Task → Execution → Result` 的可追踪协作契约。
- 构建薄 Gateway / Bridge 并接入 Codex Adapter。
- 以 AI Video Workflow MVP 验证领域、工作流和 Provider 抽象。
- 沉淀架构、ADR、实验、测试和可复现证据。

## Non-Goals

- 当前不交付完整生产级 Agent Runtime。
- 当前不实现通用飞书 CRUD 封装或无治理双向同步。
- 不绑定单一模型、设备、云服务或知识 Provider。
- 不把长期目标或计划描述为已实现能力。
- 不把未经授权的第三方全文或私人材料作为公开项目资产。

## Core Principles

- Git 是正式项目事实的唯一真源，飞书是投影与补充知识层。
- 业务与模型、设备、工具和 Provider 解耦。
- API 与契约优先，执行过程可追踪、可验证、可恢复。
- 索引优先、最小上下文、只读优先。
- 规则和轻量能力先行，复杂智能按真实需求演进。
- 事实、假设、决策和计划明确区分。

## Constraints

- 当前平台服务、Bridge 和视频工作流尚未实现。
- 飞书写入必须预览并经人工确认。
- 不自动删除、移动、改权限、公开分享、Force Push 或改写历史。
- 当前工程以 Markdown、Schema、Skill 和本地 CLI 资产为主。
- 外部产品能力必须依据官方资料或真实测试。

## Success Criteria

- 新 Agent 能按恢复路径快速定位当前事实和任务。
- 正式资产具有稳定 Asset ID、Canonical Path、关系和证据状态。
- Git 与飞书职责清晰且投影可追溯。
- 六个月内形成 Knowledge Foundation、Coding Workflow 和 Video Workflow MVP 的分阶段证据。
- Portfolio 能展示可运行 Demo、工程质量、架构判断、实验与量化验证。

## Related Assets

- [CTX-002 Current State](CTX-002-current-state.md)
- [CTX-003 Project Outline](CTX-003-project-outline.md)
- [CTX-004 Six-Month Roadmap](CTX-004-roadmap-6-months.md)
- [PRD-001 Platform Vision](../01-product/PRD-001-platform-vision.md)
- [ARC-001 Platform Target Architecture](../02-architecture/ARC-001-platform-target-architecture.md)
- [ADR-002 Git Single Source of Truth](../10-adr/ADR-002-git-single-source-feishu-projection.md)

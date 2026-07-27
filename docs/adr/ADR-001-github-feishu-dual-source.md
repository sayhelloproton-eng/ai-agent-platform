---
asset_id: ADR-001
asset_type: adr
title: GitHub 与飞书双源事实架构
status: superseded
evidence_level: decided
owners:
  - project-owner
created_at: 2026-07-26
updated_at: 2026-07-27
canonical_source: git
canonical_path: docs/adr/ADR-001-github-feishu-dual-source.md
superseded_by: ADR-002
related_assets:
  - ADR-002
  - ARC-002
tags:
  - knowledge-governance
  - github
  - feishu
---

# ADR-001 GitHub 与飞书双源事实架构

- Status: Superseded
- Date: 2026-07-26
- Superseded By: ADR-002

## Context

项目早期的讨论上下文主要存在于 ChatGPT，会话、本地工程资产和飞书知识之间尚未形成稳定的恢复路径。Git 适合版本化工程资产，飞书适合阅读和协作，因此最初需要先建立远程闭环。

## Decision

当时决定采用 GitHub + Feishu 双源事实架构：

- GitHub 作为工程资产事实源；
- Feishu 作为知识与认知上下文事实源；
- ChatGPT Project 作为协作和设计入口；
- 两端通过 URI、Commit、文件路径、文档 Token 和更新时间关联。

## Reasons

- Git 支持代码、Schema、Diff、回滚和审计；
- 飞书支持知识阅读、协作和远程访问；
- Chat 历史不适合作为唯一长期事实源；
- Provider 抽象可以避免系统强绑定飞书。

## Trade-offs

双事实源可以快速建立闭环，但也引入了权威边界模糊、内容漂移和冲突处理成本。架构、状态和 ADR 可能同时在 Git 与飞书独立演进，Agent 难以确定应信任哪一份。

## Consequences

该模型完成了首次 GitHub / Feishu 关联验证，但不再作为当前治理规则。历史保留用于说明架构演进。

## Supersession

ADR-002 将 Git 设为项目正式事实的唯一真源，并将飞书重新定义为阅读投影、协作空间和 Feishu Native 补充层。

## Evidence

- `Git history: legacy Feishu projection source`
- Historical per-asset Feishu projection table（已由 Task 003-C 删除）
- Initial Git / Feishu synchronization task result

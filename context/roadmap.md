# Roadmap

本 Roadmap 描述阶段顺序，不代表后续能力已经实现。每一阶段必须在上一阶段通过验收并获得人工确认后再开始。

## Phase 1: Context + Knowledge

建立 Project Context Root、项目级 Context、Git 唯一真源和 Knowledge Strategy，使新 Agent 能从仓库恢复项目方向和当前任务。

当前状态：**Completed**

> Task 001（Context Foundation）、Task 002（知识资产组织）、Task 003-A/B/C（知识配置 v3.0、Project Profile、治理规则对齐）已完成。当前进入 Knowledge System Redesign v3.0 迁移阶段（详见 `repository-analysis.md`）。

## Phase 2: AI Knowledge Skill

建立面向 Agent 的知识能力，用于最小上下文检索、知识组织、状态维护和受控知识生命周期。

当前状态：**Completed / Delivered**

> `skills/ai-knowledge/` v1.2.0 已完成交付并通过 `validate_bundle.mjs` 和 `self-test.mjs` 验证。当前活动：Knowledge Foundation 仓库一致性修复。

## Phase 3: ChatGPT Action + Gateway

建立 ChatGPT 到平台的受控任务入口、契约与 Gateway 边界。

当前状态：**Not Started**

## Phase 4: Coding Agent Workflow

建立 ChatGPT → Task → Codex → Git 的可追踪工程闭环，包括执行、验证、结果与 Review。

当前状态：**Not Started**

## Phase 5: AI Video Workflow

以真实复杂业务验证 Agent、Tool、Knowledge、Workflow 与 Provider 的组合能力。

当前状态：**Not Started**

## Roadmap Rules

- 当前一次只执行一个 Phase 内的一个明确任务；
- 不因长期架构存在而提前实现未来模块；
- 阶段完成必须有实际交付物与验证证据；
- 阶段顺序、目标或架构方向的变化由 Project Owner 确认；
- 计划中的能力不得描述为已实现。

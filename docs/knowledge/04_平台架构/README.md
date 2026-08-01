# 平台架构

## 目录职责

维护总体架构、领域蓝图、Task Control、Execution Lane、隔离、审批、证据、健康、实现映射、产品治理和多 Host 适配。

## 正式资产

| ID | 主题 |
|---|---|
| ARC-001 | ai-agent-platform 总体架构 |
| DOM-001 | 核心领域模型 |
| ARC-007 | 多窗口、多角色与多任务并行 |
| ARC-008 | DDD 领域蓝图 |
| ARC-009 | 轻量 Task Control |
| ARC-010 | Execution Lane |
| ARC-011 | Git Branch / Worktree 隔离 |
| ARC-012 | Agent Profile 与 Skills 资产化 |
| ARC-013 | Approval、Evidence 与 Side-effect Ledger |
| ARC-014 | Health 与 Recovery |
| ARC-015 | 多平台执行器与 Usher 适配 |
| ARC-016 | 架构能力与仓库实现映射 |
| ARC-017 | 产品孵化与需求治理 |
| ARC-018 | 项目治理与汇报架构 |

ARC-003 已被 PRD-005 与 DEC-001 取代，并迁入 `docs/technical/归档/历史资产/`。

## 维护规则

- 当前实现与目标架构必须分开；
- 第三方工具只能位于 Adapter；
- 复杂架构图在正文冻结后生成正式 SVG / PNG；
- 系统状态和关系进入 `platform-registry/`；
- 全库 Review 已完成；本目录仍保持 `unpublished`，直到独立授权 Feishu 发布并回读。

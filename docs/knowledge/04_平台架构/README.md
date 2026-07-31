# 平台架构

## 目录职责

维护总体架构、领域蓝图、Task Control、Execution Lane、隔离、审批、证据、健康、产品孵化、项目治理和实现映射。

## 正式资产

| ID | 主题 |
|---|---|
| ARC-007 | 多窗口、多角色与多任务并行 |
| ARC-008 | DDD 领域蓝图 |
| ARC-009 | 轻量 Task Control |
| ARC-010 | Execution Lane |
| ARC-011 | Git Branch / Worktree 隔离 |
| ARC-012 | Agent Profile 与 Skills 资产化 |
| ARC-013 | Approval、Evidence 与 Side-effect Ledger |
| ARC-014 | Health 与 Recovery |
| ARC-016 | 架构能力与仓库实现映射 |
| ARC-017 | 产品孵化与需求治理 |
| ARC-018 | 项目治理与汇报 |

`ARC-015 多平台执行器与 Usher 适配架构` 仍为 `candidate`，在完成产品事实核验和真实适配需求前不物化。

历史 ARC-001、ARC-003 和 DOM-001 保留原路径与演进证据，不因新目录物化而删除。

## 维护规则

- 当前实现与目标架构必须分开；
- 正文首次物化为 `partial`，真实 Commit Review 后再接受；
- 复杂架构图在正文冻结后生成正式 SVG / PNG；
- 系统状态和关系进入 `platform-registry/`；
- 本目录内容在全库 Review 前保持 `unpublished`。

# 平台架构

## 目录职责
维护总体架构、DDD 蓝图、Task Control、Execution Lane、Git 隔离、Agent Profile、Approval、Evidence、Health 与实现映射。

## 正式资产
`ARC-007、ARC-008、ARC-009、ARC-010、ARC-011、ARC-012、ARC-013、ARC-014、ARC-016`

历史 ARC-001、ARC-003 和 DOM-001 保留原路径与演进证据。

## 维护规则
- 当前实现与目标架构分开；
- 首次物化为 `partial`，真实 Commit Review 后接受；
- 复杂图在正文冻结后生成正式 SVG / PNG；
- 系统状态和关系进入 `platform-registry/`；
- 全库 Review 前保持 `unpublished`。

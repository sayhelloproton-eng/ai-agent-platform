---
asset_id: SOL-002
asset_type: solution
status: adopted
evidence_level: decided
canonical_path: docs/technical/技术方案/知识系统/SOL-002-git-feishu-projection.md
related_assets: [ADR-002, ARC-002, ARC-004, WFL-001]
---

# SOL-002 Git → Feishu Projection

## Problem

Git 与飞书分别可编辑时会产生状态、架构和 ADR 漂移，需要保留飞书阅读体验但只有一个正式真源。

## Recommended Solution

- Git Asset 使用稳定 ID、Canonical Path、状态、证据和关系。
- Feishu Map 记录逻辑路径、模式、目标 token、最后同步 Commit / Hash 和状态。
- Projection Plan 负责编译阅读树：`CTX-001` 覆盖根首页，其他 CTX / DEC / PRD 合并到“项目与产品”，目录 README 不单独发布。
- 发布只允许 Git → Feishu；Feishu Native 通过 Change Proposal 晋升到 Git。
- 写入前生成 Write Plan，包含目标、Diff、风险、幂等线索和验收。
- 写入后回读并比较标题、revision、正文摘要和 Hash。
- Drift 时停止自动覆盖，生成报告，由 Project Owner 处理。

## Interfaces

`publish_projection(asset_id, commit, content_hash)`、`verify_projection(asset_id)`、`detect_drift(asset_id)` 是未来 Capability Port；Feishu Token 属于 Adapter 配置。

## Implementation Plan

1. 先生成确定性页面树和单资产 dry-run；保留根节点，验证 `CTX-001` 首页特殊映射。
2. 再实现指定节点更新和回读。
3. 最后实现批量索引页、状态看板和 Drift 定时检查。

## Status

模型已被 ADR-002 接受；自动投影服务尚未实现。

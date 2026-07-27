---
asset_id: WFL-003
asset_type: workflow
status: proposed
evidence_level: hypothesis
canonical_path: docs/05-workflows/WFL-003-ai-video-workflow.md
related_assets: [ARC-003, DOM-001, PRD-001, PRD-002]
---

# WFL-003 AI Video Workflow

## Target Flow

```text
Source Text → Story Analysis → Character / Scene Bible → Shot Plan
→ Prompt Package → Model Adapter → Generation → Evaluation / Retry
→ Cost and Evidence → Demo Result
```

## Design Principles

- 业务对象与视频模型解耦。
- 本地低成本模型承担结构化、检查和路由；昂贵生成调用集中在高价值步骤。
- Character、Scene 和 Shot 保持一致性标识。
- 每次生成保存 Provider、参数、成本、重试原因和结果评价。

## Status

Phase 3 计划资产，尚无可运行实现。第一版以单条可演示短视频为 MVP，不宣称通用影视生产平台。

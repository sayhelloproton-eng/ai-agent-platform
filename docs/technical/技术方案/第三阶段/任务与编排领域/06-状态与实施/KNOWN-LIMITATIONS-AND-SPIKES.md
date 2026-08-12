---
docId: TASK-LIMITATIONS
title: 任务与编排领域｜待确认项、限制与 Spike
docType: limitations
authority: normative
lifecycle: active
domain: task-orchestration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜待确认项、限制与 Spike

## 状态规则

```text
TODO = 正确目标和实施方法已经确定，但尚未完成
PENDING_SPIKE = 外部行为或关键假设尚未通过真实验证
KNOWN_LIMITATION = 已知限制，必须有当前 fallback / operator action
FUTURE = 不属于 v1 当前范围
```

任何 `PENDING_SPIKE` 都不得成为没有 fallback 的 correctness dependency。只有真实 E2E/实验通过，并确认不破坏 ownership / contract / recovery 后，才可提升为正式主路径。

## 当前状态

Task Domain 当前没有阻断性架构未决项。以下项目不改变当前模型：

### TASK-FUTURE-001｜并行调度
- Type: `FUTURE`
- v1 fallback: 串行 Node。
- Trigger: 一个 Node 出现真实多 Worker 并行需求。

### TASK-FUTURE-002｜跨 Task 检索
- Type: `FUTURE`
- v1 fallback: TaskDocument + Git/显式文档读取。
- Trigger: 出现跨 Task embedding/retrieval 的稳定业务需求。

### TASK-FUTURE-003｜多机调度
- Type: `FUTURE`
- v1 fallback: repo-local SQLite + 单实例串行推进。
- Trigger: 多 host / 多 scheduler 成为真实约束。

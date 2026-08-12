---
docId: TASK-ORCHESTRATION-TODO-TASK-MIGRATION-RUNNER
title: '`task-migration-runner` TODO'
docType: todo
authority: operational
lifecycle: active
domain: task-orchestration
boundedContext: task-orchestration
moduleRef: task-migration-runner
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
- TASK-DOC-05-02
---
# `task-migration-runner` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### TASK-MIG-001

```yaml
id: TASK-MIG-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-migration-runner
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
- TASK-DOC-05-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 定义 migration discovery/order/version metadata
scope:
  allow:
  - packages/task-migration-runner/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-MIG-002

```yaml
id: TASK-MIG-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-migration-runner
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
- TASK-DOC-05-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现幂等 apply/status/verify 和失败停止语义
scope:
  allow:
  - packages/task-migration-runner/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-MIG-003

```yaml
id: TASK-MIG-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-migration-runner
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
- TASK-DOC-05-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 提供 Deployment 可调用的公开 migration primitive
scope:
  allow:
  - packages/task-migration-runner/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-MIG-004

```yaml
id: TASK-MIG-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-migration-runner
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
- TASK-DOC-05-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成 fresh DB / sequential upgrade / interrupted migration tests
scope:
  allow:
  - packages/task-migration-runner/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

## Stop Rules

- `implementationReadiness != READY_TO_IMPLEMENT` 时，Codex/Agent 不得把 TODO 当作自动施工队列；先完成实施编排。
- 不得通过 TODO 创造新 Domain/Bounded Context/Service。
- 不得 deep import 其他领域内部实现或直接读写其他领域 Store。
- `PENDING_SPIKE` 不转成 IMPLEMENTATION 任务，除非先完成验证并更新正式状态。
- 发现正式文档内部冲突时停止实现，先修 Contract/Design。

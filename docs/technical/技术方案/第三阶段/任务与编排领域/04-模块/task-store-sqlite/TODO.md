---
docId: TASK-ORCHESTRATION-TODO-TASK-STORE-SQLITE
title: '`task-store-sqlite` TODO'
docType: todo
authority: operational
lifecycle: active
domain: task-orchestration
boundedContext: task-orchestration
moduleRef: task-store-sqlite
subdomain: null
subdomains:
- task-lifecycle
- task-chain
- node-workflow
- task-documents
- message-event-audit
provides: []
requires: []
contractRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
---
# `task-store-sqlite` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### TASK-STORE-001

```yaml
id: TASK-STORE-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-store-sqlite
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 建立 task_groups/tasks/nodes/node_execution_history/task_documents/task_messages/task_events/idempotency_records/schema_migrations
  schema
scope:
  allow:
  - packages/task-store-sqlite/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-STORE-002

```yaml
id: TASK-STORE-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-store-sqlite
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 transaction + optimistic version + constraint/index
scope:
  allow:
  - packages/task-store-sqlite/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-STORE-003

```yaml
id: TASK-STORE-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-store-sqlite
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 repository ports，不泄漏 SQLite 给业务层
scope:
  allow:
  - packages/task-store-sqlite/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-STORE-004

```yaml
id: TASK-STORE-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-store-sqlite
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 启用 WAL、busy timeout 与 crash/reopen integrity tests
scope:
  allow:
  - packages/task-store-sqlite/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-STORE-005

```yaml
id: TASK-STORE-005
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-store-sqlite
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 验证 idempotency fingerprint conflict 与并发写冲突
scope:
  allow:
  - packages/task-store-sqlite/**
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

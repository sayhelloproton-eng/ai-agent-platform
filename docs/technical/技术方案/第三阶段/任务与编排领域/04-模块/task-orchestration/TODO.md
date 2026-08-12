---
docId: TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION
title: '`task-orchestration` TODO'
docType: todo
authority: operational
lifecycle: active
domain: task-orchestration
boundedContext: task-orchestration
moduleRef: task-orchestration
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
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
---
# `task-orchestration` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### TASK-ORCH-001

```yaml
id: TASK-ORCH-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: CONTRACT
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 冻结并实现 Public Contract / runtime schema / unified error envelope
scope:
  allow:
  - packages/task-orchestration/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-ORCH-002

```yaml
id: TASK-ORCH-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 Task/Plan/Node 状态机与合法 transition guard
scope:
  allow:
  - packages/task-orchestration/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-ORCH-003

```yaml
id: TASK-ORCH-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 TaskRoleBinding one-time/idempotent 绑定与 startNode 自动 Worker 解析
scope:
  allow:
  - packages/task-orchestration/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-ORCH-004

```yaml
id: TASK-ORCH-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 TaskDocument metadata/Git path contract 与 required input/output 校验
scope:
  allow:
  - packages/task-orchestration/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-ORCH-005

```yaml
id: TASK-ORCH-005
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 reopenNode/runNo/history preserved 语义
scope:
  allow:
  - packages/task-orchestration/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-ORCH-006

```yaml
id: TASK-ORCH-006
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 actorRef/idempotencyKey/expectedVersion 的 Command 边界
scope:
  allow:
  - packages/task-orchestration/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### TASK-ORCH-007

```yaml
id: TASK-ORCH-007
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: task-orchestration
  boundedContext: task-orchestration
  moduleRef: task-orchestration
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
qualityRefs:
- TASK-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成 Task↔Agent/Execution cross-domain contract tests 与主链 E2E
scope:
  allow:
  - packages/task-orchestration/**
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

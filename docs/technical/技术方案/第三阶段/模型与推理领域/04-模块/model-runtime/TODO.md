---
docId: MODEL-REASONING-TODO-MODEL-RUNTIME
title: '`model-runtime` TODO'
docType: todo
authority: operational
lifecycle: active
domain: model-reasoning
boundedContext: model-reasoning
moduleRef: model-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
---
# `model-runtime` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### MODEL-RT-001

```yaml
id: MODEL-RT-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 FAST/REASON/AUTO 路由与单 Lane business/background queue
scope:
  allow:
  - packages/model-runtime/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-RT-002

```yaml
id: MODEL-RT-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 Provider Adapter + capability verification
scope:
  allow:
  - packages/model-runtime/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-RT-003

```yaml
id: MODEL-RT-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 ReasoningSpec prompt assembly、structured validation、bounded repair
scope:
  allow:
  - packages/model-runtime/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-RT-004

```yaml
id: MODEL-RT-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现最多一次 Capability Proposal 与 caller maxRounds contract
scope:
  allow:
  - packages/model-runtime/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-RT-005

```yaml
id: MODEL-RT-005
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 queueTimeout/inferenceTimeout/cancel/restart semantics
scope:
  allow:
  - packages/model-runtime/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-RT-006

```yaml
id: MODEL-RT-006
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 READY/DEGRADED/UNAVAILABLE health 与资源观测
scope:
  allow:
  - packages/model-runtime/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-RT-007

```yaml
id: MODEL-RT-007
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-runtime
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成真实 FAST→uncertain→REASON、Vision、稳定性/热负载回归
scope:
  allow:
  - packages/model-runtime/**
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

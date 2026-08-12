---
docId: MODEL-REASONING-TODO-MODEL-CONTRACTS
title: '`model-contracts` TODO'
docType: todo
authority: operational
lifecycle: active
domain: model-reasoning
boundedContext: model-reasoning
moduleRef: model-contracts
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- MODEL-REASONING-TECH-MODEL-CONTRACTS
- MODEL-DOC-02-01
- MODEL-DOC-02-02
---
# `model-contracts` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### MODEL-CON-001

```yaml
id: MODEL-CON-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: CONTRACT
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-contracts
sourceRefs:
- MODEL-REASONING-TECH-MODEL-CONTRACTS
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 冻结 infer()/getRuntimeStatus() TypeScript contract 与 runtime schema
scope:
  allow:
  - packages/model-contracts/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-CON-002

```yaml
id: MODEL-CON-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: CONTRACT
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-contracts
sourceRefs:
- MODEL-REASONING-TECH-MODEL-CONTRACTS
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 冻结 ReasoningSpec/InferenceMode/CapabilityProfile/Proposal/Error 类型
scope:
  allow:
  - packages/model-contracts/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### MODEL-CON-003

```yaml
id: MODEL-CON-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: model-reasoning
  boundedContext: model-reasoning
  moduleRef: model-contracts
sourceRefs:
- MODEL-REASONING-TECH-MODEL-CONTRACTS
- MODEL-DOC-02-01
- MODEL-DOC-02-02
qualityRefs:
- MODEL-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成 provider/consumer contract compatibility tests
scope:
  allow:
  - packages/model-contracts/**
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

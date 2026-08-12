---
docId: AGENT-RUNTIME-COLLABORATION-TODO-AGENT-PRODUCT
title: '`agent-product` TODO'
docType: todo
authority: operational
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-product
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
- AGENT-DOC-02-03
---
# `agent-product` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### AGT-PROD-001

```yaml
id: AGT-PROD-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: CONTRACT
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-product
sourceRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
- AGENT-DOC-02-03
qualityRefs:
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 冻结 package.json Agent metadata / Instructions / carrier requirements
scope:
  allow:
  - packages/agent-product/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-PROD-002

```yaml
id: AGT-PROD-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-product
sourceRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
- AGENT-DOC-02-03
qualityRefs:
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 生成静态 Actions OpenAPI 与创建/更新 Web 指引
scope:
  allow:
  - packages/agent-product/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-PROD-003

```yaml
id: AGT-PROD-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-product
sourceRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
- AGENT-DOC-02-03
qualityRefs:
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 验证 pre-Task 产品 Worker → createTask identity 传递
scope:
  allow:
  - packages/agent-product/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-PROD-004

```yaml
id: AGT-PROD-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-product
sourceRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
- AGENT-DOC-02-03
qualityRefs:
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成真实 GPT behavior/Actions/auth E2E
scope:
  allow:
  - packages/agent-product/**
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

---
docId: PLATFORM-HOST-TODO
title: '`platform-host` TODO'
docType: todo
authority: operational
lifecycle: active
domain: platform
moduleRef: platform-host
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
---
# `platform-host` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### HOST-001

```yaml
id: HOST-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: platform
  boundedContext: null
  moduleRef: platform-host
sourceRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
qualityRefs:
- PLATFORM-DOC-03-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 建立独立 `@ai-agent-platform/platform-host` package 与 composition root。
scope:
  allow:
  - packages/platform-host/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- Domain packages 无反向依赖；host 无业务 persistence。
verification: []
evidence: []
```

### HOST-002

```yaml
id: HOST-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: INTEGRATION
owner:
  domain: platform
  boundedContext: null
  moduleRef: platform-host
sourceRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
qualityRefs:
- PLATFORM-DOC-03-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 装配 Task/Agent in-process packages 与 Execution/Model public clients。
scope:
  allow:
  - packages/platform-host/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- 依赖只通过公开 package exports/contracts。
verification: []
evidence: []
```

### HOST-003

```yaml
id: HOST-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: platform
  boundedContext: null
  moduleRef: platform-host
sourceRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
qualityRefs:
- PLATFORM-DOC-03-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 local transport、startup/shutdown、health aggregation。
scope:
  allow:
  - packages/platform-host/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- dependency failure typed 暴露；无 global state mirror。
verification: []
evidence: []
```

### HOST-004

```yaml
id: HOST-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: platform
  boundedContext: null
  moduleRef: platform-host
sourceRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
qualityRefs:
- PLATFORM-DOC-03-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成 composition/dependency direction/restart integration tests。
scope:
  allow:
  - packages/platform-host/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- 启停顺序、失败隔离与恢复满足平台公共约定。
verification: []
evidence: []
```

## Stop Rules

- `implementationReadiness != READY_TO_IMPLEMENT` 时，Codex/Agent 不得把 TODO 当作自动施工队列；先完成实施编排。
- 不得通过 TODO 创造新 Domain/Bounded Context/Service。
- 不得 deep import 其他领域内部实现或直接读写其他领域 Store。
- `PENDING_SPIKE` 不转成 IMPLEMENTATION 任务，除非先完成验证并更新正式状态。
- 发现正式文档内部冲突时停止实现，先修 Contract/Design。

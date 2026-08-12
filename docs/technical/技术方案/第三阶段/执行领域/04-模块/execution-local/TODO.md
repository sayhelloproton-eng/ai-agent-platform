---
docId: EXECUTION-TODO-EXECUTION-LOCAL
title: '`execution-local` TODO'
docType: todo
authority: operational
lifecycle: active
domain: execution
boundedContext: execution
moduleRef: execution-local
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
---
# `execution-local` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### EXE-LOCAL-001

```yaml
id: EXE-LOCAL-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-local
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
qualityRefs:
- EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 projectRoot canonical boundary 与 .ai-agent-platform protected rules
scope:
  allow:
  - packages/execution-local/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### EXE-LOCAL-002

```yaml
id: EXE-LOCAL-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-local
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
qualityRefs:
- EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 typed fs/git/code/package/dependency/build-test capabilities
scope:
  allow:
  - packages/execution-local/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### EXE-LOCAL-003

```yaml
id: EXE-LOCAL-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-local
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
qualityRefs:
- EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 process one-shot/managed-process 与 stdout/stderr artifact capture
scope:
  allow:
  - packages/execution-local/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### EXE-LOCAL-004

```yaml
id: EXE-LOCAL-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-local
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
qualityRefs:
- EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 deterministic network：localhost/LAN/exact URL/authenticated HTTP/probe
scope:
  allow:
  - packages/execution-local/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### EXE-LOCAL-005

```yaml
id: EXE-LOCAL-005
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-local
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
qualityRefs:
- EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 shell escape hatch 的 FAST/policy/approval guard
scope:
  allow:
  - packages/execution-local/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### EXE-LOCAL-006

```yaml
id: EXE-LOCAL-006
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: execution
  boundedContext: execution
  moduleRef: execution-local
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
qualityRefs:
- EXECUTION-DOC-05-02
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成 symlink/path traversal/secret redaction/security tests
scope:
  allow:
  - packages/execution-local/**
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

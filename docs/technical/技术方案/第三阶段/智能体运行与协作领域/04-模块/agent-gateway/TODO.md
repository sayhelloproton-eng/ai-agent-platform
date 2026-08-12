---
docId: AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY
title: '`agent-gateway` TODO'
docType: todo
authority: operational
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-gateway
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
---
# `agent-gateway` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### AGT-GW-001

```yaml
id: AGT-GW-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现公网 Action ingress、Bearer auth、role resolution 与 runtime validation
scope:
  allow:
  - packages/agent-gateway/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-GW-002

```yaml
id: AGT-GW-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 GPT-facing body/path/query → internal canonical DTO normalization
scope:
  allow:
  - packages/agent-gateway/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-GW-003

```yaml
id: AGT-GW-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 45s/<100k/429/5xx transport hard guards
scope:
  allow:
  - packages/agent-gateway/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-GW-004

```yaml
id: AGT-GW-004
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 openaiFileIdRefs object-array normalization 与 bounded input validation
scope:
  allow:
  - packages/agent-gateway/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-GW-005

```yaml
id: AGT-GW-005
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 实现 openaiFileResponse inline/URL serializer、relay TTL/token/scope/SSRF guards
scope:
  allow:
  - packages/agent-gateway/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-GW-006

```yaml
id: AGT-GW-006
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 为每个 Action operation 固定 x-openai-isConsequential 并做 schema conformance
scope:
  allow:
  - packages/agent-gateway/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### AGT-GW-007

```yaml
id: AGT-GW-007
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: VALIDATION
owner:
  domain: agent-runtime-collaboration
  boundedContext: agent-runtime-collaboration
  moduleRef: agent-gateway
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
qualityRefs:
- AGENT-DOC-05-01
- AGENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成真实 Custom GPT Preview/Actions/File Bridge E2E
scope:
  allow:
  - packages/agent-gateway/**
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

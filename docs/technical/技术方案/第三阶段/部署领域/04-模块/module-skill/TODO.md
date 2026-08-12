---
docId: DEPLOYMENT-GOVERNANCE-TODO-MODULE-SKILL
title: '`module-skill` TODO'
docType: todo
authority: operational
lifecycle: active
domain: deployment-governance
boundedContext: deployment-governance
moduleRef: module-skill
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- DEPLOYMENT-GOVERNANCE-TECH-MODULE-SKILL
---
# `module-skill` TODO

> 本文件是该 Module 的当前实施 backlog。`Status: READY` 保留原任务事实，表示任务已进入当前 backlog；`implementationReadiness: PLANNED` 表示**尚未冻结自动施工顺序**。Priority、dependsOn、逐任务 acceptance/verification 不允许由文档整理工具推断；没有可直接追溯的冻结依据时，分别保持 `PENDING_DECISION`、`NOT_FROZEN`、`ACCEPTANCE_NOT_FROZEN` / `verification: []`。

## Implementation Tasks
### DPL-SKILL-001

```yaml
id: DPL-SKILL-001
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: deployment-governance
  boundedContext: deployment-governance
  moduleRef: module-skill
sourceRefs:
- DEPLOYMENT-GOVERNANCE-TECH-MODULE-SKILL
qualityRefs:
- DEPLOYMENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 定义 AI/Codex 读取 Module requirements/contract/config/verify 的 Skill
scope:
  allow:
  - packages/module-skill/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### DPL-SKILL-002

```yaml
id: DPL-SKILL-002
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: deployment-governance
  boundedContext: deployment-governance
  moduleRef: module-skill
sourceRefs:
- DEPLOYMENT-GOVERNANCE-TECH-MODULE-SKILL
qualityRefs:
- DEPLOYMENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 确保 Skill 只辅助理解/实施，不成为第二业务 Runtime
scope:
  allow:
  - packages/module-skill/**
  forbid:
  - 其他 Domain 的业务 Store/Repository
  - 其他领域内部实现的 deep import
  - 任何未经 Contract Change 的 Domain/Bounded Context/Service/Public Contract 变更
acceptance:
- ACCEPTANCE_NOT_FROZEN
verification: []
evidence: []
```

### DPL-SKILL-003

```yaml
id: DPL-SKILL-003
status: READY
implementationReadiness: PLANNED
priority: PENDING_DECISION
type: IMPLEMENTATION
owner:
  domain: deployment-governance
  boundedContext: deployment-governance
  moduleRef: module-skill
sourceRefs:
- DEPLOYMENT-GOVERNANCE-TECH-MODULE-SKILL
qualityRefs:
- DEPLOYMENT-DOC-05-03
dependencyState: NOT_FROZEN
dependsOn: []
goal: 完成 dependency/permission/conformance 提示与安全 stop rules
scope:
  allow:
  - packages/module-skill/**
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

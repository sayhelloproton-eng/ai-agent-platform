---
docId: TASK-ORCHESTRATION-MODULE-TASK-STORE-SQLITE
title: '`task-store-sqlite` Module'
docType: module-index
authority: normative
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

# `task-store-sqlite` Module

## Identity

```text
Domain: task-orchestration
Bounded Context: task-orchestration
moduleRef: task-store-sqlite
package: @ai-agent-platform/task-store-sqlite
kind: library
service: none
process/deployment: none / determined by Deployment kind
```

## Purpose

本 README 是该 Module 的导航入口；正式业务与工程事实由本 Module 技术设计及所属领域 Contract/Flow 共同定义，不维护第二套重复事实。

## Canonical technical docs

- [00-Service与npm模块设计.md](../00-Service与npm模块设计.md)
- [03-数据模型与SQLite-DDL.md](../../03-流程与数据/03-数据模型与SQLite-DDL.md)
- [02-事务-版本-幂等与恢复.md](../../03-流程与数据/02-事务-版本-幂等与恢复.md)
- [02-实施顺序与验收门禁.md](../../05-质量与部署/02-实施顺序与验收门禁.md)

## Public Contract / Dependencies

- 使用本领域 `02-契约/` 的 Public Contract。
- 跨域只通过 Public Contract / logical Provides-Requires。
- 禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## Runtime / Lifecycle

- `library` 的真实 lifecycle 由 Module 自身声明并由 Deployment Domain 治理。
- Library 不伪造 start/stop。
- Service/Process 的启动、关闭、health、recovery 以对应 TECHNICAL-DESIGN 与 Deployment requirements 为准。

## Testing

见本领域 `05-质量与部署/` 和本 Module `TODO.md` 的 acceptance/verification。

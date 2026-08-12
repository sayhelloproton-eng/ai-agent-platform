---
docId: TASK-ORCHESTRATION-MODULE-TASK-ORCHESTRATION
title: '`task-orchestration` Module'
docType: module-index
authority: normative
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

# `task-orchestration` Module

## Identity

```text
Domain: task-orchestration
Bounded Context: task-orchestration
moduleRef: task-orchestration
package: @ai-agent-platform/task-orchestration
kind: library/in-process runtime
service: none
process/deployment: none / determined by Deployment kind
```

## Purpose

本 README 是该 Module 的导航入口；正式业务与工程事实由本 Module 技术设计及所属领域 Contract/Flow 共同定义，不维护第二套重复事实。

## Canonical technical docs

- [00-Service与npm模块设计.md](../00-Service与npm模块设计.md)
- [01-Public-API-契约.md](../../02-契约/01-Public-API-契约.md)
- [01-关键流程与状态转换.md](../../03-流程与数据/01-关键流程与状态转换.md)
- [02-实施顺序与验收门禁.md](../../05-质量与部署/02-实施顺序与验收门禁.md)

## Public Contract / Dependencies

- 使用本领域 `02-契约/` 的 Public Contract。
- 跨域只通过 Public Contract / logical Provides-Requires。
- 禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## Runtime / Lifecycle

- `library/in-process runtime` 的真实 lifecycle 由 Module 自身声明并由 Deployment Domain 治理。
- Library 不伪造 start/stop。
- Service/Process 的启动、关闭、health、recovery 以对应 TECHNICAL-DESIGN 与 Deployment requirements 为准。

## Testing

见本领域 `05-质量与部署/` 和本 Module `TODO.md` 的 acceptance/verification。

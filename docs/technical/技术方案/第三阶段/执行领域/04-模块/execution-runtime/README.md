---
docId: EXECUTION-MODULE-EXECUTION-RUNTIME
title: '`execution-runtime` Module'
docType: module-index
authority: normative
lifecycle: active
domain: execution
boundedContext: execution
moduleRef: execution-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN
- EXECUTION-DOC-02-01
- EXECUTION-DOC-02-02
- EXECUTION-DOC-03-01
- EXECUTION-DOC-03-03
---

# `execution-runtime` Module

## Identity

```text
Domain: execution
Bounded Context: execution
moduleRef: execution-runtime
package: @ai-agent-platform/execution-runtime
kind: service
service: execution-runtime
process/deployment: execution-runtime-process
```

## Purpose

本 README 是该 Module 的导航入口；正式业务与工程事实由本 Module 技术设计及所属领域 Contract/Flow 共同定义，不维护第二套重复事实。

## Canonical technical docs

- [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md)
- [01-Execution-Record-持久化-幂等-状态.md](../../03-流程与数据/01-Execution-Record-持久化-幂等-状态.md)
- [02-Policy-FAST-REASON-Human-Effect-Approval.md](../../03-流程与数据/02-Policy-FAST-REASON-Human-Effect-Approval.md)
- [03-Result-Evidence-UNKNOWN与恢复.md](../../03-流程与数据/03-Result-Evidence-UNKNOWN与恢复.md)

## Public Contract / Dependencies

- 使用本领域 `02-契约/` 的 Public Contract。
- 跨域只通过 Public Contract / logical Provides-Requires。
- 禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## Runtime / Lifecycle

- `service` 的真实 lifecycle 由 Module 自身声明并由 Deployment Domain 治理。
- Library 不伪造 start/stop。
- Service/Process 的启动、关闭、health、recovery 以对应 TECHNICAL-DESIGN 与 Deployment requirements 为准。

## Testing

见本领域 `05-质量与部署/` 和本 Module `TODO.md` 的 acceptance/verification。

---
docId: AGENT-RUNTIME-COLLABORATION-MODULE-AGENT-RUNTIME
title: '`agent-runtime` Module'
docType: module-index
authority: normative
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME
- AGENT-DOC-02-01
- AGENT-DOC-03-01
- AGENT-DOC-03-03
- AGENT-DOC-03-05
---

# `agent-runtime` Module

## Identity

```text
Domain: agent-runtime-collaboration
Bounded Context: agent-runtime-collaboration
moduleRef: agent-runtime
package: @ai-agent-platform/agent-runtime
kind: library/in-process runtime
service: none
process/deployment: none / determined by Deployment kind
```

## Purpose

本 README 是该 Module 的导航入口；正式业务与工程事实由本 Module 技术设计及所属领域 Contract/Flow 共同定义，不维护第二套重复事实。

## Canonical technical docs

- [01-数据存储目录与包模块设计.md](../01-数据存储目录与包模块设计.md)
- [01-Role-Registry与认证.md](../../03-流程与数据/01-Role-Registry与认证.md)
- [03-Collaboration-Message-Center.md](../../03-流程与数据/03-Collaboration-Message-Center.md)
- [01-失败恢复版本安全与验收.md](../../05-质量与部署/01-失败恢复版本安全与验收.md)

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

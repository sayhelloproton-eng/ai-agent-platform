---
docId: AGENT-RUNTIME-COLLABORATION-MODULE-AGENT-PRODUCT
title: '`agent-product` Module'
docType: module-index
authority: normative
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

# `agent-product` Module

## Identity

```text
Domain: agent-runtime-collaboration
Bounded Context: agent-runtime-collaboration
moduleRef: agent-product
package: @ai-agent-platform/agent-product
kind: agent-package
service: none
process/deployment: none / determined by Deployment kind
```

## Purpose

本 README 是该 Module 的导航入口；正式业务与工程事实由本 Module 技术设计及所属领域 Contract/Flow 共同定义，不维护第二套重复事实。

## Canonical technical docs

- [00-Agent-Package与Custom-GPT-Carrier规范.md](../00-Agent-Package与Custom-GPT-Carrier规范.md)
- [06-产品前置工作流与Carrier身份.md](../../03-流程与数据/06-产品前置工作流与Carrier身份.md)
- [03-角色Action静态权限矩阵.md](../../02-契约/03-角色Action静态权限矩阵.md)

## Public Contract / Dependencies

- 使用本领域 `02-契约/` 的 Public Contract。
- 跨域只通过 Public Contract / logical Provides-Requires。
- 禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## Runtime / Lifecycle

- `agent-package` 的真实 lifecycle 由 Module 自身声明并由 Deployment Domain 治理。
- Library 不伪造 start/stop。
- Service/Process 的启动、关闭、health、recovery 以对应 TECHNICAL-DESIGN 与 Deployment requirements 为准。

## Testing

见本领域 `05-质量与部署/` 和本 Module `TODO.md` 的 acceptance/verification。

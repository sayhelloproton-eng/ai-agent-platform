---
docId: AGENT-RUNTIME-COLLABORATION-MODULE-AGENT-GATEWAY
title: '`agent-gateway` Module'
docType: module-index
authority: normative
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

# `agent-gateway` Module

## Identity

```text
Domain: agent-runtime-collaboration
Bounded Context: agent-runtime-collaboration
moduleRef: agent-gateway
package: @ai-agent-platform/agent-gateway
kind: service
service: agent-gateway
process/deployment: agent-gateway-process
```

## Purpose

本 README 是该 Module 的导航入口；正式业务与工程事实由本 Module 技术设计及所属领域 Contract/Flow 共同定义，不维护第二套重复事实。

## Canonical technical docs

- [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md)
- [01-Public-API与跨领域接口矩阵.md](../../02-契约/01-Public-API与跨领域接口矩阵.md)
- [02-Custom-GPT-官方能力与v1约束.md](../../02-契约/02-Custom-GPT-官方能力与v1约束.md)
- [01-失败恢复版本安全与验收.md](../../05-质量与部署/01-失败恢复版本安全与验收.md)

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

---
docId: PLATFORM-HOST-COMPOSITION-ROOT
title: '`@ai-agent-platform/platform-host` Application Composition Root'
docType: module-design
authority: normative
lifecycle: frozen
domain: platform
moduleRef: platform-host
canonicalFor:
- platform-host.boundary
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
---

# `@ai-agent-platform/platform-host` Application Composition Root

## Boundary

`platform-host` 是独立 npm package，但不是第六业务领域。它只负责：

```text
instantiate
Dependency Injection
local transport
startup / shutdown
light health aggregation
```

禁止拥有：

```text
Task workflow facts
Role/Worker facts
Execution Record/Effect/Evidence
Model routing business facts
Deployment Plan
```

Task Runtime、Agent Runtime 等被装配能力必须自身先是独立 npm package；领域 package 不反向依赖 platform-host。

## Runtime Relationship

```text
agent-gateway → platform-host local public transport
platform-host → task-orchestration + agent-runtime
platform-host → execution/model clients or public transports
```

Execution Runtime、Model Runtime、Agent Gateway 仍是独立 service/process/deployment unit；Browser Extension 独立部署。

## TODO

Composition/wiring 实施必须发生在所有被装配 Domain package 的 Public Contract 已冻结之后；host 测试只验证 wiring、startup/shutdown、transport 与 dependency health aggregation，不替代领域业务测试。

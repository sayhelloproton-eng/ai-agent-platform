---
docId: PLATFORM-HOST-INDEX
title: '`platform-host` Module'
docType: module-index
authority: normative
lifecycle: active
domain: platform
moduleRef: platform-host
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
---

# `platform-host` Module

## Identity

```text
moduleRef: platform-host
package: @ai-agent-platform/platform-host
kind: application-composition-root
service/process: platform-host / platform-host-process
```

## Purpose

`platform-host` 是本地 Application Composition Root：装配独立的 Task/Agent package，注入 Execution/Model client，提供本地 transport、startup/shutdown 与轻量 health aggregation。

## Boundary

- 不拥有任何 Domain business fact。
- 不保存 Task/Agent/Execution/Model 的第二份状态。
- Domain package 不得反向依赖 platform-host。
- 只有已经是独立 npm package 的能力才能被 host 装配；禁止把匿名业务源码塞入 host。

## Documents

- [TECHNICAL-DESIGN.md](TECHNICAL-DESIGN.md)
- [SERVICE-RUNTIME.md](SERVICE-RUNTIME.md)
- [TODO.md](TODO.md)

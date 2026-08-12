---
docId: EXECUTION-BROWSER-EXTENSION-RUNTIME
title: '`execution-browser-extension` Runtime'
docType: runtime
authority: normative
lifecycle: active
domain: execution
boundedContext: execution
moduleRef: execution-browser-extension
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN
- EXECUTION-DOC-02-01
- EXECUTION-DOC-02-02
---

# `execution-browser-extension` Runtime

## Runtime surfaces

- background/service worker：binding、command dispatch、recovery/heartbeat。
- content/page adapter：真实页面观察与受控 interaction。
- side panel：只读 status/diagnostic，不推进业务。

## Identity

`roleRef + workerRef` 是稳定逻辑身份；tab/window/content-script id 只用于当前浏览器会话定位。

## Serialization

v1 Browser write 全局串行；read-only observer 低优先级，不抢占业务写。

## Reload / Disconnect

startup/reload/reconnect 只执行一次 Recovery Scan。effect_started 后断线先验证页面/对话现实，再决定 SUCCEEDED/FAILED/UNKNOWN；禁止机械重发 submit。

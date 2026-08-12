---
docId: PLATFORM-HOST-SERVICE-RUNTIME
title: '`platform-host` Service Runtime'
docType: service-runtime
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

# `platform-host` Service Runtime

## Startup

```text
load config
→ construct Task/Agent packages
→ construct Execution/Model clients
→ validate dependency availability
→ expose local transport
→ READY only when required composed capabilities are usable
```

## Shutdown

停止接收新本地请求 → drain 当前同步调用 → 关闭 host-owned transport → 释放 host 资源。不得直接修改各 Domain durable state 以“强行清理”。

## Health

区分：

```text
process alive
host transport healthy
dependency availability
domain/module readiness
platform readiness
```

host 只聚合，不覆盖 owner health semantics。

## Recovery

进程重启后重新构建 composition graph，并查询 owner Module 当前现实状态；不从 host 缓存恢复业务事实。

---
docId: PLATFORM-CONVENTIONS-README
title: 平台架构与公共约定
docType: platform-index
authority: normative
lifecycle: frozen
domain: platform
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 平台架构与公共约定

> 这里保存跨五领域的唯一公共规则：Ownership、dependency direction、Contract、version、package/module boundary、testing、composition 与文档治理。领域内部事实不得在这里复制第二份。

## 阅读顺序

1. `01-架构/01-领域边界与依赖约定.md`
2. `01-架构/02-platform-host-Composition-Root.md`
3. `01-架构/03-External-Resource-Modules.md`
4. `02-契约`
5. `03-工程`
6. `04-治理`
7. `05-平台模块/platform-host`

## 不变量

```text
五个业务领域固定：Task / Agent / Execution / Model / Deployment
platform-host = composition root，不是第六领域
cross-domain only through public contracts
no shared DB / repository / internal adapter / deep import
one mutable fact → one owner
Package != Module != Service != Process != Deployment Unit
```

## 机器导航

- `../DOCUMENT-INDEX.json`
- `../MODULE-REGISTRY.json`
- `../EXTERNAL-RESOURCE-REGISTRY.json`

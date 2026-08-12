---
docId: PLATFORM-IMPLEMENTATION-NAV
title: Phase 3 实施导航与 TODO 分层
docType: implementation-governance
authority: operational
lifecycle: active
domain: platform
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# Phase 3 实施导航与 TODO 分层

## 1. TODO 层级

```text
Platform TODO
→ 只处理跨域 wiring / cross-domain E2E / release gate

Domain TODO
→ 只处理跨 Module / Domain Contract / Domain freeze

Module TODO
→ Codex 实际实现任务主真源
```

`PENDING_SPIKE` 不属于 TODO；Spike 验证前不能变成没有 fallback 的实现依赖。

## 2. 推荐实施顺序

1. Public Contracts / runtime schemas。
2. Domain packages / stores / runtime modules。
3. Execution / Model 独立 Runtime。
4. platform-host composition。
5. agent-gateway / Custom GPT Actions Carrier。
6. Browser Extension 实链。
7. Deployment conformance / plan / verify。
8. Cross-domain real E2E / fault / stability gate。

真正的领域内顺序以各 Domain `05-质量与部署/*实施顺序*` 为准，本页不覆盖它们。

## 3. Codex 最小上下文

每个 Module 任务只加载：

```text
Domain Charter
→ relevant Contract
→ relevant Flow/Recovery
→ Module README/TECHNICAL-DESIGN
→ Module TODO
→ relevant Testing
```

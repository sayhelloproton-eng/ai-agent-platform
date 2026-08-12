---
docId: EXECUTION-MODULE-REGISTRY
title: 执行领域｜Module Registry
docType: module-registry
authority: normative
lifecycle: frozen
domain: execution
canonicalFor:
- execution.module-registry
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 执行领域｜Module Registry

> 这里建立 **Bounded Context → Module → Package / Service / Process / Deployment Unit** 的工程映射。Module 是治理/实现单元，不自动等于 Service 或 Process。

| moduleRef | package | kind | service | process/deployment | technical docs |
|---|---|---|---|---|---|
| `execution-contracts` | `@ai-agent-platform/execution-contracts` | library | — | — | [execution-contracts](./execution-contracts/README.md) |
| `execution-runtime` | `@ai-agent-platform/execution-runtime` | service | execution-runtime | execution-runtime-process | [execution-runtime](./execution-runtime/README.md) |
| `execution-local` | `@ai-agent-platform/execution-local` | library | — | — | [execution-local](./execution-local/README.md) |
| `execution-browser-extension` | `@ai-agent-platform/execution-browser-extension` | browser-extension | — | chrome-extension | [execution-browser-extension](./execution-browser-extension/README.md) |

## 规则

- 正式跨域依赖只指向 Module 的 Public Provides/Contract。
- Library 不伪造 start/stop。
- Service 只有真实长期 runtime 时才存在。
- Deployment Unit 的真实生命周期由 Deployment Domain 治理。
- Module 文档通过链接引用领域级 canonical Contract / Flow / Persistence，不为“模板完整”复制第二套正式事实。

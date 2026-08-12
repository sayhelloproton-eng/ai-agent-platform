---
docId: AGENT-RUNTIME-COLLABORATION-MODULE-REGISTRY
title: 智能体运行与协作领域｜Module Registry
docType: module-registry
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
canonicalFor:
- agent-runtime-collaboration.module-registry
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Module Registry

> 这里建立 **Bounded Context → Module → Package / Service / Process / Deployment Unit** 的工程映射。Module 是治理/实现单元，不自动等于 Service 或 Process。

| moduleRef | package | kind | service | process/deployment | technical docs |
|---|---|---|---|---|---|
| `agent-runtime` | `@ai-agent-platform/agent-runtime` | library/in-process runtime | — | — | [agent-runtime](./agent-runtime/README.md) |
| `agent-gateway` | `@ai-agent-platform/agent-gateway` | service | agent-gateway | agent-gateway-process | [agent-gateway](./agent-gateway/README.md) |
| `agent-product` | `@ai-agent-platform/agent-product` | agent-package | — | — | [agent-product](./agent-product/README.md) |
| `agent-controller-dev` | `@ai-agent-platform/agent-controller-dev` | agent-package | — | — | [agent-controller-dev](./agent-controller-dev/README.md) |
| `agent-test-ops` | `@ai-agent-platform/agent-test-ops` | agent-package | — | — | [agent-test-ops](./agent-test-ops/README.md) |

## 规则

- 正式跨域依赖只指向 Module 的 Public Provides/Contract。
- Library 不伪造 start/stop。
- Service 只有真实长期 runtime 时才存在。
- Deployment Unit 的真实生命周期由 Deployment Domain 治理。
- Module 文档通过链接引用领域级 canonical Contract / Flow / Persistence，不为“模板完整”复制第二套正式事实。

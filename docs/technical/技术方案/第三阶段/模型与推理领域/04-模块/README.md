---
docId: MODEL-REASONING-MODULE-REGISTRY
title: 模型与推理领域｜Module Registry
docType: module-registry
authority: normative
lifecycle: frozen
domain: model-reasoning
canonicalFor:
- model-reasoning.module-registry
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 模型与推理领域｜Module Registry

> 这里建立 **Bounded Context → Module → Package / Service / Process / Deployment Unit** 的工程映射。Module 是治理/实现单元，不自动等于 Service 或 Process。

| moduleRef | package | kind | service | process/deployment | technical docs |
|---|---|---|---|---|---|
| `model-contracts` | `@ai-agent-platform/model-contracts` | library | — | — | [model-contracts](./model-contracts/README.md) |
| `model-runtime` | `@ai-agent-platform/model-runtime` | service | model-runtime | model-runtime-process | [model-runtime](./model-runtime/README.md) |

## 规则

- 正式跨域依赖只指向 Module 的 Public Provides/Contract。
- Library 不伪造 start/stop。
- Service 只有真实长期 runtime 时才存在。
- Deployment Unit 的真实生命周期由 Deployment Domain 治理。
- Module 文档通过链接引用领域级 canonical Contract / Flow / Persistence，不为“模板完整”复制第二套正式事实。

---
docId: DEPLOYMENT-GOVERNANCE-MODULE-REGISTRY
title: 部署领域｜Module Registry
docType: module-registry
authority: normative
lifecycle: frozen
domain: deployment-governance
canonicalFor:
- deployment-governance.module-registry
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 部署领域｜Module Registry

> 这里建立 **Bounded Context → Module → Package / Service / Process / Deployment Unit** 的工程映射。Module 是治理/实现单元，不自动等于 Service 或 Process。

| moduleRef | package | kind | service | process/deployment | technical docs |
|---|---|---|---|---|---|
| `module-contract` | `@ai-agent-platform/module-contract` | library | — | — | [module-contract](./module-contract/README.md) |
| `module-template` | `@ai-agent-platform/module-template` | library | — | — | [module-template](./module-template/README.md) |
| `deployment-conformance` | `@ai-agent-platform/deployment-conformance` | library/cli | — | — | [deployment-conformance](./deployment-conformance/README.md) |
| `platform-cli` | `@ai-agent-platform/platform-cli` | cli-app | — | platform-cli | [platform-cli](./platform-cli/README.md) |
| `module-skill` | `@ai-agent-platform/module-skill` | agent-skill | — | — | [module-skill](./module-skill/README.md) |

## 规则

- 正式跨域依赖只指向 Module 的 Public Provides/Contract。
- Library 不伪造 start/stop。
- Service 只有真实长期 runtime 时才存在。
- Deployment Unit 的真实生命周期由 Deployment Domain 治理。
- Module 文档通过链接引用领域级 canonical Contract / Flow / Persistence，不为“模板完整”复制第二套正式事实。

---
docId: TASK-ORCHESTRATION-MODULE-REGISTRY
title: 任务与编排领域｜Module Registry
docType: module-registry
authority: normative
lifecycle: frozen
domain: task-orchestration
canonicalFor:
- task-orchestration.module-registry
subdomain: null
subdomains:
- task-lifecycle
- task-chain
- node-workflow
- task-documents
- message-event-audit
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜Module Registry

> 这里建立 **Bounded Context → Module → Package / Service / Process / Deployment Unit** 的工程映射。Module 是治理/实现单元，不自动等于 Service 或 Process。

| moduleRef | package | kind | service | process/deployment | technical docs |
|---|---|---|---|---|---|
| `task-orchestration` | `@ai-agent-platform/task-orchestration` | library/in-process runtime | — | — | [task-orchestration](./task-orchestration/README.md) |
| `task-store-sqlite` | `@ai-agent-platform/task-store-sqlite` | library | — | — | [task-store-sqlite](./task-store-sqlite/README.md) |
| `task-migration-runner` | `@ai-agent-platform/task-migration-runner` | cli/library | — | — | [task-migration-runner](./task-migration-runner/README.md) |

## 规则

- 正式跨域依赖只指向 Module 的 Public Provides/Contract。
- Library 不伪造 start/stop。
- Service 只有真实长期 runtime 时才存在。
- Deployment Unit 的真实生命周期由 Deployment Domain 治理。
- Module 文档通过链接引用领域级 canonical Contract / Flow / Persistence，不为“模板完整”复制第二套正式事实。

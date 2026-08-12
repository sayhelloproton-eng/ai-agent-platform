---
docId: MODEL-RUNTIME-INTERNAL-COMPONENTS
title: model-runtime 内部组件
docType: internal-component-map
authority: normative
lifecycle: frozen
domain: model-reasoning
boundedContext: model-reasoning
moduleRef: model-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
---

# model-runtime 内部组件

> 这些是 `model-runtime` 内部源码模块，**不是独立 Service，也不是自动升级为正式 Module / Bounded Context**。

```text
Inference API
├── Reasoning Spec Resolver
└── Prompt Renderer
Resource Coordinator
Reasoning Router
API Provider Adapter
Output Validator
Health & Observability
```

详细行为分别见：

- `03-流程与数据/01-Reasoning-Spec与Small-Model-First规范.md`
- `03-流程与数据/02-Model-Capability-Profile与Provider适配.md`
- `03-流程与数据/03-路由-单Lane-队列-超时-取消.md`
- `03-流程与数据/06-Runtime-Health与推理可观测性.md`
- `04-模块/model-runtime/TECHNICAL-DESIGN.md`

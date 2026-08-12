---
docId: MODEL-REASONING-CHARTER
title: 模型与推理领域｜领域宪章与 Bounded Context Map
docType: domain-charter
authority: normative
lifecycle: frozen
domain: model-reasoning
boundedContext: model-reasoning
canonicalFor:
- model-reasoning.boundary
- model-reasoning.bounded-context-map
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 模型与推理领域｜领域宪章与 Bounded Context Map

## 1. Purpose

提供受 ReasoningSpec、typed input/output、runtime validation 和有限升级约束的认知计算。

## 2. Owns

- infer contract
- ReasoningSpec
- FAST/REASON/AUTO logical roles
- Provider adapter
- single inference lane
- Output validation/repair
- Model health/resource observability

## 3. Does Not Own

- Task workflow
- Role/Worker
- 真实 Effect
- Effect Approval
- Deployment materialization
- 其他领域业务 DB

## 4. 主 Bounded Context

```text
model-reasoning
```

正式文档冻结 2 包/1 服务/6 内部模块，但没有冻结多个 Model Boundary；六个内部模块属于 model-runtime 内部工程结构，不提升为 Bounded Context。

当前文档体系特别禁止：

```text
package == Bounded Context
service == Bounded Context
folder == Bounded Context
```

## 5. 现有能力/问题分组

- Inference Contract
- Reasoning Spec
- Routing/Resource Coordination
- Provider Adaptation
- Validation/Repair
- Health/Observability

这些分组用于阅读和 Module 映射，不代表已经新增多个业务模型边界。

## 6. Bounded Context → Module

| `model-contracts` | `@ai-agent-platform/model-contracts` | library | — | — |
| `model-runtime` | `@ai-agent-platform/model-runtime` | service | model-runtime | model-runtime-process |

## 7. Public Boundary

Provides：
- infer
- getRuntimeStatus

Requires：
- Deployment-resolved model.provider.api External Resource Module

跨域依赖必须经过 Public Contract；禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## 8. 详细模型与边界正文

本文件只冻结 DDD 导航边界，不重写原高密度技术正文。详细定义继续由本领域 `01-领域/02-*`、`01-领域/03-*` 和 `02-契约/*` 承载。

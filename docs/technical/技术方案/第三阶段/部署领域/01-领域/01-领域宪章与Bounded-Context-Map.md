---
docId: DEPLOYMENT-GOVERNANCE-CHARTER
title: 部署领域｜领域宪章与 Bounded Context Map
docType: domain-charter
authority: normative
lifecycle: frozen
domain: deployment-governance
boundedContext: deployment-governance
canonicalFor:
- deployment-governance.boundary
- deployment-governance.bounded-context-map
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 部署领域｜领域宪章与 Bounded Context Map

## 1. Purpose

统一 Module Contract、依赖图、Plan/Apply、生命周期调用、Verify/Doctor、Manifest 与升级治理。

## 2. Owns

- Module governance
- Module Contract/Template
- Deployment Plan/Apply
- Conformance
- Verify/Doctor aggregation
- Deployment Manifest
- ACTION_REQUIRED
- Upgrade/template migration

## 3. Does Not Own

- Task workflow
- Agent Role/Worker
- Execution effect policy/result
- Model reasoning semantics
- 其他领域业务健康真源

## 4. 主 Bounded Context

```text
deployment-governance
```

当前设计围绕一个统一 Module Governance 模型工作，五个 package 是工程实现分工而非五个业务模型边界，因此保持一个主 BC。

当前文档体系特别禁止：

```text
package == Bounded Context
service == Bounded Context
folder == Bounded Context
```

## 5. 现有能力/问题分组

- Module Contract
- Template
- Conformance
- Platform CLI
- External Resource Governance
- Upgrade/Verification

这些分组用于阅读和 Module 映射，不代表已经新增多个业务模型边界。

## 6. Bounded Context → Module

| `module-contract` | `@ai-agent-platform/module-contract` | library | — | — |
| `module-template` | `@ai-agent-platform/module-template` | library | — | — |
| `deployment-conformance` | `@ai-agent-platform/deployment-conformance` | library/cli | — | — |
| `platform-cli` | `@ai-agent-platform/platform-cli` | cli-app | — | platform-cli |
| `module-skill` | `@ai-agent-platform/module-skill` | agent-skill | — | — |

## 7. Public Boundary

Provides：
- module governance contract
- deployment plan/apply
- status/verify/doctor/manifest

Requires：
- all formal Module descriptors
- External Resource observable/configurable/verify surfaces

跨域依赖必须经过 Public Contract；禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## 8. 详细模型与边界正文

本文件只冻结 DDD 导航边界，不重写原高密度技术正文。详细定义继续由本领域 `01-领域/02-*`、`01-领域/03-*` 和 `02-契约/*` 承载。

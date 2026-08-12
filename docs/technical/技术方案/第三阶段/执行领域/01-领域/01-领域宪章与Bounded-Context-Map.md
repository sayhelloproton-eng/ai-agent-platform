---
docId: EXECUTION-CHARTER
title: 执行领域｜领域宪章与 Bounded Context Map
docType: domain-charter
authority: normative
lifecycle: frozen
domain: execution
boundedContext: execution
canonicalFor:
- execution.boundary
- execution.bounded-context-map
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 执行领域｜领域宪章与 Bounded Context Map

## 1. Purpose

把 Intent 转换为受控真实 Effect，并生成 Result + Evidence；负责不确定副作用恢复。

## 2. Owns

- Execution Record
- Execution status
- sideEffectState
- Effect policy enforcement
- Effect Approval semantics
- Result/Evidence
- Browser Execution
- Local Execution
- UNKNOWN_SIDE_EFFECT

## 3. Does Not Own

- Task workflow
- Role/Worker ownership
- Model business judgment ownership
- Deployment lifecycle

## 4. 主 Bounded Context

```text
execution
```

当前设计以统一 Effect Plane 和一套 Execution Record/Policy/Evidence 语义为中心，没有冻结多个独立模型边界；Browser/Local 是执行载体与 Module，而不是自动拆成 BC。

当前文档体系特别禁止：

```text
package == Bounded Context
service == Bounded Context
folder == Bounded Context
```

## 5. 现有能力/问题分组

- Execution Runtime
- Local Execution
- Browser Execution
- Policy/Approval
- Evidence/Recovery

这些分组用于阅读和 Module 映射，不代表已经新增多个业务模型边界。

## 6. Bounded Context → Module

| `execution-contracts` | `@ai-agent-platform/execution-contracts` | library | — | — |
| `execution-runtime` | `@ai-agent-platform/execution-runtime` | service | execution-runtime | execution-runtime-process |
| `execution-local` | `@ai-agent-platform/execution-local` | library | — | — |
| `execution-browser-extension` | `@ai-agent-platform/execution-browser-extension` | browser-extension | — | chrome-extension |

## 7. Public Boundary

Provides：
- executeCapability
- getExecution
- readExecutionOutput
- cancelExecution

Requires：
- Task opaque refs/context when needed
- Agent Role/Worker facts
- Model infer for bounded cognition
- Deployment module/config

跨域依赖必须经过 Public Contract；禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## 8. 详细模型与边界正文

本文件只冻结 DDD 导航边界，不重写原高密度技术正文。详细定义继续由本领域 `01-领域/02-*`、`01-领域/03-*` 和 `02-契约/*` 承载。

---
docId: AGENT-RUNTIME-COLLABORATION-CHARTER
title: 智能体运行与协作领域｜领域宪章与 Bounded Context Map
docType: domain-charter
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
canonicalFor:
- agent-runtime-collaboration.boundary
- agent-runtime-collaboration.bounded-context-map
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜领域宪章与 Bounded Context Map

## 1. Purpose

管理 Agent Package、Role/Worker Carrier identity、Agent Gateway 与跨角色逻辑协作。

## 2. Owns

- Agent Package
- Role Registry
- Role credential binding semantics
- Worker/Conversation identity semantics
- Collaboration Thread/Message
- Agent Gateway OpenAI protocol adaptation

## 3. Does Not Own

- Task workflow/TaskRoleBinding
- Browser Extension real effect
- Local file/git/shell effect
- Model inference ownership
- Deployment plan/external resource lifecycle

## 4. 主 Bounded Context

```text
agent-runtime-collaboration
```

Agent v1 保持一个主 `agent-runtime-collaboration` Bounded Context。Gateway、Role Registry、Collaboration 与各 Agent Package 是该 Context 下的 Module/能力，不机械提升为独立 Bounded Context；只有未来出现独立领域模型、独立语言和明确边界时才允许新增 BC。

当前文档体系特别禁止：

```text
package == Bounded Context
service == Bounded Context
folder == Bounded Context
```

## 5. 现有能力/问题分组

- Agent Package & Carrier
- Role/Worker Identity
- Collaboration
- Gateway/Actions

这些分组用于阅读和 Module 映射，不代表已经新增多个业务模型边界。

## 6. Bounded Context → Module

| `agent-runtime` | `@ai-agent-platform/agent-runtime` | library/in-process runtime | — | — |
| `agent-gateway` | `@ai-agent-platform/agent-gateway` | service | agent-gateway | agent-gateway-process |
| `agent-product` | `@ai-agent-platform/agent-product` | agent-package | — | — |
| `agent-controller-dev` | `@ai-agent-platform/agent-controller-dev` | agent-package | — | — |
| `agent-test-ops` | `@ai-agent-platform/agent-test-ops` | agent-package | — | — |

## 7. Public Boundary

Provides：
- Role Registry Public API
- Collaboration Public API
- Custom GPT Action Gateway

Requires：
- Task Public binding/context
- Execution Browser/Local real effects
- Model infer when cognitive compute is needed
- Deployment External Resource/Module governance

跨域依赖必须经过 Public Contract；禁止读取其他领域 DB、Repository、内部 Adapter 或 deep import。

## 8. 详细模型与边界正文

本文件只冻结 DDD 导航边界，不重写原高密度技术正文。详细定义继续由本领域 `01-领域/02-*`、`01-领域/03-*` 和 `02-契约/*` 承载。

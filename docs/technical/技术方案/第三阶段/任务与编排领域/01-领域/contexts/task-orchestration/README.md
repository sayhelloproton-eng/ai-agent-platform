---
docId: TASK-ORCHESTRATION-BC-README
title: '`task-orchestration` Bounded Context'
docType: bounded-context
authority: normative
lifecycle: frozen
domain: task-orchestration
boundedContext: task-orchestration
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
# `task-orchestration` Bounded Context

## Identity

| Field | Value |
|---|---|
| Parent Domain | `task-orchestration` |
| Context Ref | `task-orchestration` |
| Subdomain | `task-lifecycle`, `task-chain`, `node-workflow`, `task-documents`, `message-event-audit` |
| Language Scope | TaskGroup、Task、Plan/PlanVersion、Node/runNo、TaskRoleBinding、TaskDocument、TaskMessage、TaskEvent、IdempotencyRecord。 |

本 BC 同时承载五个正式 Subdomain；它们共享一个模型边界，不额外拆 BC。

## Purpose

持久化长期工作事实、校验 Task/Node 合法推进并提供稳定查询。

## Model Boundary

该 Context 是当前领域正式模型和 Ubiquitous Language 的适用边界。内部 Module 可以有独立工程职责，但不得自行建立第二套领域事实、状态机或跨域 Ownership。

## Owns / Does Not Own

权威边界见 [领域宪章](../../01-领域宪章与Bounded-Context-Map.md)。

## Upstream

Agent Public Worker/Role facts；Execution/Browser 调用时提供的合法 actor/worker/task context；Deployment 提供已物化的 Module/config 运行条件。

只允许通过对应 Public Contract / logical Requires 获取上游事实；禁止读取其他领域 DB、Repository 或内部 Adapter。

## Downstream

Agent Runtime/Gateway、Execution Runtime/Browser Task Driver、平台查询与管理界面通过 Task Public Contract 消费 Task/Node/Document facts。

下游只能通过本 Context/Domain Public Contract 使用能力，不得 deep import 内部 Module。

## Ubiquitous Language / Model

见 [领域模型/当前设计规则](../../02-统一语言与领域模型.md)。

## Public Surface

见 [Public Contract](../../../02-契约/01-Public-API-契约.md)。本 README 不复制 DTO、状态或 error 的第二份 normative 定义。

## Key Flows / Persistence / Recovery

见 [关键流程](../../../03-流程与数据/01-关键流程与状态转换.md) 以及同目录 `03-流程与数据/` 下的持久化、并发、恢复文档。

## Modules

见 [Module Registry](../../../04-模块/README.md)。

## Testing / Acceptance / TODO

见 [质量与验收](../../../05-质量与部署/02-实施顺序与验收门禁.md) 与各 Module `TODO.md`。

---
docId: AGENT-RUNTIME-COLLABORATION-BC-README
title: '`agent-runtime-collaboration` Bounded Context'
docType: bounded-context
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---
# `agent-runtime-collaboration` Bounded Context

## Identity

| Field | Value |
|---|---|
| Parent Domain | `agent-runtime-collaboration` |
| Context Ref | `agent-runtime-collaboration` |
| Subdomain | v1 未进一步拆分正式 Subdomain |
| Language Scope | AgentPackageRef、RoleRef、WorkerRef、RegisteredRole、RoleCredential、CollaborationThread、CollaborationMessage、DeliveryState/ReceiptRef、Carrier/Gateway protocol。 |

v1 未进一步冻结独立 Subdomain；Role Registry、Collaboration、Gateway、Agent Package 是同一 BC 下的 Module/能力，不机械提升为 Subdomain 或 BC。

## Purpose

管理 Agent Package、Role/Worker Carrier identity、Agent Gateway 与跨角色逻辑协作。

## Model Boundary

该 Context 是当前领域正式模型和 Ubiquitous Language 的适用边界。内部 Module 可以有独立工程职责，但不得自行建立第二套领域事实、状态机或跨域 Ownership。

## Owns / Does Not Own

权威边界见 [领域宪章](../../01-领域宪章与Bounded-Context-Map.md)。

## Upstream

Task Public Contract 提供 task/participant/binding facts；Execution 提供 Browser/Local typed capabilities；Deployment 提供 public ingress、Carrier readiness 与配置。

只允许通过对应 Public Contract / logical Requires 获取上游事实；禁止读取其他领域 DB、Repository 或内部 Adapter。

## Downstream

Task 使用 Worker/Role identity；Execution 使用 Role/Worker/Collaboration target facts；Custom GPT 通过 agent-gateway 使用角色化 Actions。

下游只能通过本 Context/Domain Public Contract 使用能力，不得 deep import 内部 Module。

## Ubiquitous Language / Model

见 [领域模型/当前设计规则](../../02-统一语言与领域模型.md)。

## Public Surface

见 [Public Contract](../../../02-契约/01-Public-API与跨领域接口矩阵.md)。本 README 不复制 DTO、状态或 error 的第二份 normative 定义。

## Key Flows / Persistence / Recovery

见 [关键流程](../../../03-流程与数据/03-Collaboration-Message-Center.md) 以及同目录 `03-流程与数据/` 下的持久化、并发、恢复文档。

## Modules

见 [Module Registry](../../../04-模块/README.md)。

## Testing / Acceptance / TODO

见 [质量与验收](../../../05-质量与部署/01-失败恢复版本安全与验收.md) 与各 Module `TODO.md`。

---
docId: EXECUTION-BC-README
title: '`execution` Bounded Context'
docType: bounded-context
authority: normative
lifecycle: frozen
domain: execution
boundedContext: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---
# `execution` Bounded Context

## Identity

| Field | Value |
|---|---|
| Parent Domain | `execution` |
| Context Ref | `execution` |
| Subdomain | v1 未进一步拆分正式 Subdomain |
| Language Scope | Execution Request/Record、Capability、PolicyDecision、Approval、ExecutionStatus、SideEffectState、Result、Evidence、UNKNOWN、reality reconciliation。 |

v1 未进一步冻结独立 Subdomain；Browser、Local、Contracts、Runtime 是同一 Effect Plane 下的 Module，不拆成独立 BC。

## Purpose

把 Intent 转换为受控真实 Effect，并生成 Result + Evidence；负责不确定副作用恢复。

## Model Boundary

该 Context 是当前领域正式模型和 Ubiquitous Language 的适用边界。内部 Module 可以有独立工程职责，但不得自行建立第二套领域事实、状态机或跨域 Ownership。

## Owns / Does Not Own

权威边界见 [领域宪章](../../01-领域宪章与Bounded-Context-Map.md)。

## Upstream

Task/Agent Public facts 提供业务身份与 scope；Model Public Contract 提供受约束认知判断；Deployment 提供合法配置与运行资源。

只允许通过对应 Public Contract / logical Requires 获取上游事实；禁止读取其他领域 DB、Repository 或内部 Adapter。

## Downstream

Task/Agent/Gateway 消费 Result/Evidence；Browser/Local executors 由 Execution Runtime 统一调度。

下游只能通过本 Context/Domain Public Contract 使用能力，不得 deep import 内部 Module。

## Ubiquitous Language / Model

见 [领域模型/当前设计规则](../../02-领域职责边界与非目标.md)。

## Public Surface

见 [Public Contract](../../../02-契约/01-Public-Contract与TypeScript类型规范.md)。本 README 不复制 DTO、状态或 error 的第二份 normative 定义。

## Key Flows / Persistence / Recovery

见 [关键流程](../../../03-流程与数据/03-Result-Evidence-UNKNOWN与恢复.md) 以及同目录 `03-流程与数据/` 下的持久化、并发、恢复文档。

## Modules

见 [Module Registry](../../../04-模块/README.md)。

## Testing / Acceptance / TODO

见 [质量与验收](../../../05-质量与部署/02-测试验收-E2E-故障注入.md) 与各 Module `TODO.md`。

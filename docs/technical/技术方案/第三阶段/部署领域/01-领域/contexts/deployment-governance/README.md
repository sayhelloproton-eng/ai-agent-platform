---
docId: DEPLOYMENT-GOVERNANCE-BC-README
title: '`deployment-governance` Bounded Context'
docType: bounded-context
authority: normative
lifecycle: frozen
domain: deployment-governance
boundedContext: deployment-governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---
# `deployment-governance` Bounded Context

## Identity

| Field | Value |
|---|---|
| Parent Domain | `deployment-governance` |
| Context Ref | `deployment-governance` |
| Subdomain | v1 未进一步拆分正式 Subdomain |
| Language Scope | ModuleDescriptor、ModuleProvide/Require、ModuleRequirement、ConfigSlot、Deployment Plan/Step、ACTION_REQUIRED、VerificationResult、Manifest、Platform READY。 |

v1 未进一步冻结独立 Subdomain；五个 npm package 是工程职责分工，不是五个业务 Subdomain/BC。

## Purpose

统一 Module Contract、依赖图、Plan/Apply、生命周期调用、Verify/Doctor、Manifest 与升级治理。

## Model Boundary

该 Context 是当前领域正式模型和 Ubiquitous Language 的适用边界。内部 Module 可以有独立工程职责，但不得自行建立第二套领域事实、状态机或跨域 Ownership。

## Owns / Does Not Own

权威边界见 [领域宪章](../../01-领域宪章与Bounded-Context-Map.md)。

## Upstream

各 Domain Module 声明 requirements/provides/requires/config/lifecycle/verification；External Resource Adapter 提供可观察能力与操作边界。

只允许通过对应 Public Contract / logical Requires 获取上游事实；禁止读取其他领域 DB、Repository 或内部 Adapter。

## Downstream

platform-cli、conformance、template、module-skill 以及各 Module lifecycle/verify/doctor 调用方消费 Deployment governance facts。

下游只能通过本 Context/Domain Public Contract 使用能力，不得 deep import 内部 Module。

## Ubiquitous Language / Model

见 [领域模型/当前设计规则](../../03-当前设计原则与不变量.md)。

## Public Surface

见 [Public Contract](../../../02-契约/01-跨领域Deployment-Matrix与Composition-Root边界.md)。本 README 不复制 DTO、状态或 error 的第二份 normative 定义。

## Key Flows / Persistence / Recovery

见 [关键流程](../../../03-流程与数据/01-Deployment-Plan-Apply-ACTION_REQUIRED与恢复.md) 以及同目录 `03-流程与数据/` 下的持久化、并发、恢复文档。

## Modules

见 [Module Registry](../../../04-模块/README.md)。

## Testing / Acceptance / TODO

见 [质量与验收](../../../05-质量与部署/02-测试门禁与真实验收.md) 与各 Module `TODO.md`。

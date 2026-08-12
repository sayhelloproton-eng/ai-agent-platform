---
docId: MODEL-REASONING-BC-README
title: '`model-reasoning` Bounded Context'
docType: bounded-context
authority: normative
lifecycle: frozen
domain: model-reasoning
boundedContext: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---
# `model-reasoning` Bounded Context

## Identity

| Field | Value |
|---|---|
| Parent Domain | `model-reasoning` |
| Context Ref | `model-reasoning` |
| Subdomain | v1 未进一步拆分正式 Subdomain |
| Language Scope | ReasoningSpec、InferenceMode(FAST/REASON/AUTO)、CapabilityProfile、CapabilityProposal、Inference Result、RuntimeStatus、Provider Adapter。 |

v1 未进一步冻结独立 Subdomain；2 packages / 1 runtime service / 6 internal components 属于工程结构，不自动形成 Subdomain/BC。

## Purpose

提供受 ReasoningSpec、typed input/output、runtime validation 和有限升级约束的认知计算。

## Model Boundary

该 Context 是当前领域正式模型和 Ubiquitous Language 的适用边界。内部 Module 可以有独立工程职责，但不得自行建立第二套领域事实、状态机或跨域 Ownership。

## Owns / Does Not Own

权威边界见 [领域宪章](../../01-领域宪章与Bounded-Context-Map.md)。

## Upstream

调用方提供已组装的 typed context；Deployment 提供 Provider/moduleRef/credential/capability 配置。

只允许通过对应 Public Contract / logical Requires 获取上游事实；禁止读取其他领域 DB、Repository 或内部 Adapter。

## Downstream

Execution、Agent 以及少量明确场景下的 Task 通过 Model Public Contract 消费认知结果；Model 不反向读取业务事实。

下游只能通过本 Context/Domain Public Contract 使用能力，不得 deep import 内部 Module。

## Ubiquitous Language / Model

见 [领域模型/当前设计规则](../../03-当前设计原则与不变量.md)。

## Public Surface

见 [Public Contract](../../../02-契约/01-Public-Contract与TypeScript类型规范.md)。本 README 不复制 DTO、状态或 error 的第二份 normative 定义。

## Key Flows / Persistence / Recovery

见 [关键流程](../../../03-流程与数据/01-Reasoning-Spec与Small-Model-First规范.md) 以及同目录 `03-流程与数据/` 下的持久化、并发、恢复文档。

## Modules

见 [Module Registry](../../../04-模块/README.md)。

## Testing / Acceptance / TODO

见 [质量与验收](../../../05-质量与部署/02-测试验收-M1到M4.md) 与各 Module `TODO.md`。

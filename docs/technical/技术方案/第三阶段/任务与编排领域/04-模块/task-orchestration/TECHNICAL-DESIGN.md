---
docId: TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
title: '`task-orchestration` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: task-orchestration
boundedContext: task-orchestration
moduleRef: task-orchestration
subdomain: null
subdomains:
- task-lifecycle
- task-chain
- node-workflow
- task-documents
- message-event-audit
provides: []
requires: []
contractRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
---

# `task-orchestration` Technical Design Index

## Responsibility

负责 Task/TaskGroup/Node/TaskRoleBinding/TaskDocument 的 Domain/Application Services；详细设计分布在领域模型、Public API、流程与 Service/npm 模块设计。

## Existing detailed sources

- [00-Service与npm模块设计.md](../00-Service与npm模块设计.md)
- [01-Public-API-契约.md](../../02-契约/01-Public-API-契约.md)
- [01-关键流程与状态转换.md](../../03-流程与数据/01-关键流程与状态转换.md)
- [02-实施顺序与验收门禁.md](../../05-质量与部署/02-实施顺序与验收门禁.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

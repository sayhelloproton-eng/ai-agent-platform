---
docId: TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
title: '`task-store-sqlite` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: task-orchestration
boundedContext: task-orchestration
moduleRef: task-store-sqlite
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
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
---

# `task-store-sqlite` Technical Design Index

## Responsibility

负责 Task Domain SQLite repository/store、transaction、version/idempotency 持久化；不拥有业务状态机定义。

## Existing detailed sources

- [00-Service与npm模块设计.md](../00-Service与npm模块设计.md)
- [03-数据模型与SQLite-DDL.md](../../03-流程与数据/03-数据模型与SQLite-DDL.md)
- [02-事务-版本-幂等与恢复.md](../../03-流程与数据/02-事务-版本-幂等与恢复.md)
- [02-实施顺序与验收门禁.md](../../05-质量与部署/02-实施顺序与验收门禁.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

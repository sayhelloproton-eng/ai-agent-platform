---
docId: TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
title: '`task-migration-runner` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: task-orchestration
boundedContext: task-orchestration
moduleRef: task-migration-runner
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- TASK-ORCHESTRATION-TECH-TASK-MIGRATION-RUNNER
- TASK-DOC-05-02
---

# `task-migration-runner` Technical Design Index

## Responsibility

负责 schema migration discovery/order/version/re-entry/verification；不承担 Task runtime。

## Existing detailed sources

- [00-Service与npm模块设计.md](../00-Service与npm模块设计.md)
- [03-数据模型与SQLite-DDL.md](../../03-流程与数据/03-数据模型与SQLite-DDL.md)
- [02-实施顺序与验收门禁.md](../../05-质量与部署/02-实施顺序与验收门禁.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

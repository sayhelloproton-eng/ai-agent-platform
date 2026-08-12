---
docId: AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME
title: '`agent-runtime` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME
- AGENT-DOC-02-01
- AGENT-DOC-03-01
- AGENT-DOC-03-03
- AGENT-DOC-03-05
---

# `agent-runtime` Technical Design Index

## Responsibility

platform-host 进程内装配的 Agent Domain runtime，承载 Role Registry、Role credential domain service、Collaboration Message Center 与 Agent Public API。

## Existing detailed sources

- [01-数据存储目录与包模块设计.md](../01-数据存储目录与包模块设计.md)
- [01-Role-Registry与认证.md](../../03-流程与数据/01-Role-Registry与认证.md)
- [03-Collaboration-Message-Center.md](../../03-流程与数据/03-Collaboration-Message-Center.md)
- [01-失败恢复版本安全与验收.md](../../05-质量与部署/01-失败恢复版本安全与验收.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

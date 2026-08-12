---
docId: AGENT-RUNTIME-COLLABORATION-TECH-AGENT-CONTROLLER-DEV
title: '`agent-controller-dev` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-controller-dev
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-CONTROLLER-DEV
- AGENT-DOC-02-03
---

# `agent-controller-dev` Technical Design Index

## Responsibility

总控/研发 Role Agent Package；载体与权限要求由 Agent Package/Action matrix 约束。

## Existing detailed sources

- [00-Agent-Package与Custom-GPT-Carrier规范.md](../00-Agent-Package与Custom-GPT-Carrier规范.md)
- [03-角色Action静态权限矩阵.md](../../02-契约/03-角色Action静态权限矩阵.md)
- [03-实施顺序与落库门禁.md](../../05-质量与部署/03-实施顺序与落库门禁.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

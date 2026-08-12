---
docId: AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
title: '`agent-product` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-product
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT
- AGENT-DOC-02-03
---

# `agent-product` Technical Design Index

## Responsibility

产品 Role Agent Package；包含 Custom GPT 创建材料、Instructions/Knowledge/Actions requirements 与 role registration 管理。

## Existing detailed sources

- [00-Agent-Package与Custom-GPT-Carrier规范.md](../00-Agent-Package与Custom-GPT-Carrier规范.md)
- [06-产品前置工作流与Carrier身份.md](../../03-流程与数据/06-产品前置工作流与Carrier身份.md)
- [03-角色Action静态权限矩阵.md](../../02-契约/03-角色Action静态权限矩阵.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

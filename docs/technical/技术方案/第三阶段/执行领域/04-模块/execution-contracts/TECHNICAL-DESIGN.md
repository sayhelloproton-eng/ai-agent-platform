---
docId: EXECUTION-TECH-EXECUTION-CONTRACTS
title: '`execution-contracts` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: execution
boundedContext: execution
moduleRef: execution-contracts
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-TECH-EXECUTION-CONTRACTS
- EXECUTION-DOC-02-01
- EXECUTION-DOC-02-02
---

# `execution-contracts` Technical Design Index

## Responsibility

薄 Public Contract Module，只包含 TS DTO/schema/error/ref/version 等公共合同，不承担 Runtime。

## Existing detailed sources

- [01-Public-Contract与TypeScript类型规范.md](../../02-契约/01-Public-Contract与TypeScript类型规范.md)
- [00-总体架构-包-服务-运行拓扑.md](../00-总体架构-包-服务-运行拓扑.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

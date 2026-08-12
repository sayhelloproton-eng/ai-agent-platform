---
docId: DEPLOYMENT-GOVERNANCE-TECH-MODULE-SKILL
title: '`module-skill` Technical Design Index'
docType: module-design-index
authority: normative
lifecycle: active
domain: deployment-governance
boundedContext: deployment-governance
moduleRef: module-skill
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- DEPLOYMENT-GOVERNANCE-TECH-MODULE-SKILL
---

# `module-skill` Technical Design Index

## Responsibility

AI 开发辅助 Module/Skill，用 Contract/Template/Conformance 帮助创建与升级 Module；不是 Runtime 或部署控制面。

## Existing detailed sources

- [00-五包架构与Module治理模型.md](../00-五包架构与Module治理模型.md)
- [01-INSTALL与AI-native部署.md](../../05-质量与部署/01-INSTALL与AI-native部署.md)
- [03-新仓库实施顺序-停止门与非目标.md](../../05-质量与部署/03-新仓库实施顺序-停止门与非目标.md)

## Boundary Rule

本文件只定义该 Module 的工程落点，不复制 Domain / Bounded Context 的 canonical facts。若实现需要引入当前 normative Contract 未定义的新算法语义、状态、持久化事实或跨域 Contract，必须先完成对应设计与 Contract Change；不得由 TODO/Codex 自行补全。

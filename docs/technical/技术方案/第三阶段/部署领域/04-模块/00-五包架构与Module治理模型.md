---
docId: DEPLOYMENT-DOC-04-00
title: 五包架构与 Module 治理模型
docType: module-map
authority: normative
lifecycle: frozen
domain: deployment-governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 五包架构与 Module 治理模型

## 1. 五包职责

### `module-contract`

规则真源。定义 Module identity/kind/version、Provides/Requires、Requirements、Config Slots、Lifecycle、Verification、Effects、结构化 Result/Error、compatibility。

### `module-template`

标准工程起点和持续治理基线。按 Module Kind Profile 生成最小正确结构，并记录 `templateVersion`。

### `deployment-conformance`

强制门。用于本地测试、CI、发布/升级前 gate，验证 Module 能否被平台稳定管理。

### `platform-cli`

唯一平台级确定性部署应用。读取目标 Module Set，生成 dependency graph 与 plan，apply，调用 lifecycle，汇总 verify/doctor/manifest。

### `module-skill`

AI 开发辅助。使用 Contract/Template/Conformance 创建与维护 Module，不能自创新规范。

## 2. Module 分类

```ts
type ModuleKind =
  | "library"
  | "service"
  | "cli"
  | "browser-extension"
  | "agent-package"
  | "external-resource";
```

Kind 只决定默认工程 profile 和可接受 lifecycle shape，不决定业务领域。

## 3. 三个不同层级

```text
Module
= 统一治理身份

Module Package
= 承载实现/Adapter/Contract 的 npm package

Deployment Unit
= 具备真实部署/运行生命周期的 Module
```

例：`execution-contracts` 是 Module + npm package，但不是 Deployment Unit；Browser Extension 是 Module + Deployment Unit；远端模型 API 是 External Resource Module，其 Adapter 是 npm package。

## 4. 治理链

```text
Create / Adopt
→ Template
→ Descriptor
→ Conformance
→ Package/Adapter Release
→ Platform Plan
→ Apply
→ Verify
→ Manifest
→ Upgrade / Template Migration
→ Re-Conformance
```

整个生命周期都使用同一套 Contract。

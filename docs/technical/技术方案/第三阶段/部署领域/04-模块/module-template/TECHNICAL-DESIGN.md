---
docId: DEPLOYMENT-MODULE-TEMPLATE-TECH-DESIGN
title: '`module-template` 详细技术方案'
docType: module-design
authority: normative
lifecycle: frozen
domain: deployment-governance
moduleRef: module-template
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- DEPLOYMENT-MODULE-TEMPLATE-TECH-DESIGN
---

# `module-template` 详细技术方案

## 1. 定位

Template 是所有新 Module 的标准工程起点，也是已有 Module 的持续治理版本基线。

> Template 负责“默认正确”，Contract + Conformance 负责“持续必须正确”。

## 2. Module Kind Profile

v1 一个 Template Package 支持六种 Profile：

```text
library
service
cli
browser-extension
agent-package
external-resource
```

不维护六套彼此漂移的独立模板。

## 3. 共同生成内容

```text
package.json
src/
tests/
deployment/
  descriptor.ts
  requirements.ts
  verification.ts
conformance config
```

只生成 Kind 真正需要的文件。

### library

无伪造 `start/stop`。

### service

增加 lifecycle adapter、status、start/stop/restart 测试。

### cli

增加标准 structured JSON CLI entry。

### browser-extension

增加 extension build/package metadata、browser-specific status/verify adapter。

### agent-package

增加 Agent package deployment descriptor、GPT 创建/注册所需说明与 ACTION_REQUIRED integration。

### external-resource

增加 resource adapter、config/status/verify/doctor、可选 lifecycle。

## 4. Template Version

每个 Module 记录 `templateVersion`。

Template 版本升级不会自动强迫所有 Module 当天迁移；只有出现：

- contract incompatibility；
- platform compatibility 不满足；
- mandatory security/engineering requirement；

才形成 migration requirement。

迁移后必须重新 Conformance。

## 5. TypeScript 工程基线

- TypeScript first；
- Node 20.20.1；
- `tsx` 运行；
- `tsc --noEmit` type gate；
- public boundary runtime validation；
- 禁止 `any` 漂移；
- structured JSON output。

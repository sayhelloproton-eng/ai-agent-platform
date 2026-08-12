---
docId: PLATFORM-HOST-TECH-DESIGN
title: '`platform-host` Technical Design'
docType: module-design
authority: normative
lifecycle: frozen
domain: platform
moduleRef: platform-host
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-COMPOSITION-ROOT
---

# `platform-host` Technical Design

## Composition

```text
platform-host
├─ @ai-agent-platform/task-orchestration
├─ @ai-agent-platform/agent-runtime
├─ Execution public client/contracts
└─ Model public client/contracts
```

## Responsibilities

1. 创建 composition root 与 dependency injection graph。
2. 建立本地 transport/router，把请求交给 owner package。
3. 按依赖顺序启动/停止 host 内组件。
4. 聚合轻量 liveness/readiness，但不发明领域 READY。
5. 将配置对象注入各 Module；配置 schema/owner 仍在对应 Module/Deployment。

## Forbidden

- Task/Agent business repository。
- Execution Effect implementation。
- Model provider implementation。
- Deployment plan/apply logic。
- cross-domain state mirror/global cache。

## Failure Isolation

某个依赖 Module unavailable 时，host 返回 typed dependency/readiness 状态；不得篡改该领域业务状态。restart 后由 owner Module 自己执行其恢复规则。

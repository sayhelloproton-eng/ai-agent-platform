---
docId: PLATFORM-EXTERNAL-RESOURCE-MODULES
title: Phase 3 External Resource Modules
docType: external-resource-map
authority: normative
lifecycle: frozen
domain: platform
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# Phase 3 External Resource Modules

所有进入真实运行链的外部资源都必须进入 Deployment Module Graph；外部资源本身不一定是 npm package，但必须有对应 Module Adapter/Descriptor。

| Resource | Owner/Governance | 典型能力 | 不能假装拥有的 lifecycle |
|---|---|---|---|
| ChatGPT Web / Custom GPT Carrier | Deployment governance + Agent Carrier contract | Actions、File Bridge、Code Interpreter/Web Search requirements、Role behavior verify | CLI 不能假装完全自动创建/编辑 GPT；可能 `ACTION_REQUIRED_WEB` |
| Chrome Runtime | Deployment governance + Execution Browser use | Extension load/runtime/page access | 不虚构平台不能控制的浏览器生命周期 |
| Microsoft Dev Tunnel | Deployment External Resource Module | public ingress / bind / status / verify | 只声明真实 CLI/account 支持的 lifecycle |
| Model Provider API | Deployment External Resource Module + Model Provider Adapter | `model.provider.api` | 远端 API 不伪造 start/stop |

具体治理规则见部署领域 `04-模块/external-resources/统一治理.md`。

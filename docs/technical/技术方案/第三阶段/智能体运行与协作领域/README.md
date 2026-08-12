---
docId: AGENT-DOMAIN-README
title: 智能体运行与协作领域
docType: domain-index
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域

> Agent Package、Role/Worker identity、Collaboration Message Center 与 Custom GPT Gateway。本目录同时表达 DDD 领域边界和真实工程实现路径。

## 推荐阅读顺序

1. `01-领域/01-领域宪章与Bounded-Context-Map.md`
2. `01-领域` 其余领域模型/不变量文档
3. `02-契约`
4. `03-流程与数据`
5. `04-模块`
6. `05-质量与部署`
7. `06-状态与实施`

## Modules

- [agent-runtime](04-模块/agent-runtime/README.md)
- [agent-gateway](04-模块/agent-gateway/README.md)
- [agent-product](04-模块/agent-product/README.md)
- [agent-controller-dev](04-模块/agent-controller-dev/README.md)
- [agent-test-ops](04-模块/agent-test-ops/README.md)

## 文档职责

- `01-领域`：Why、Ownership、Ubiquitous Language、Bounded Context、当前设计不变量。
- `02-契约`：Public Contract、Provides/Requires、跨域 ACL。
- `03-流程与数据`：状态、流程、持久化、并发、幂等、失败恢复。
- `04-模块`：Module → npm package/service/process/deployment unit 技术设计。
- `05-质量与部署`：安全、测试、E2E、实施/停止门、部署 requirements。
- `06-状态与实施`：明确待确认项、PENDING_SPIKE、Known Limitation 与 Domain TODO。

## 实施原则

其他领域只能依赖本领域 Public Contract / logical capability；禁止 direct DB read、internal repository/adapter、deep import 或状态镜像。Module TODO 不得重新定义领域模型。

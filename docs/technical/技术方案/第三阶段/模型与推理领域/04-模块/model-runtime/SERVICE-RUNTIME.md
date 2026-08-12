---
docId: MODEL-RUNTIME-SERVICE-RUNTIME
title: '`model-runtime` Service Runtime'
docType: service-runtime
authority: normative
lifecycle: active
domain: model-reasoning
boundedContext: model-reasoning
moduleRef: model-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
---

# `model-runtime` Service Runtime

## Process
独立 Model Runtime Service；内部包含 Provider Adapter、Spec、Router、Lane/Queue、Validation/Repair、Health/Observability 六类组件。

## Startup
加载 provider/config/specs → capability verification → 初始化单 Lane queue → 暴露 `infer/getRuntimeStatus` → READY/DEGRADED/UNAVAILABLE。

## Runtime
请求 runtime validate → 路由 FAST/REASON/AUTO → 串行 lane → provider inference → structured validation → 最多一次 repair → typed result。

## Timeout / Cancel
queueTimeout 与 inferenceTimeout 分离。cancel 只对可安全取消阶段生效；provider 现实不确定时返回明确错误，不伪造 completion。

## Restart
queue/active 不持久化；restart 使 queued/running 请求失败，caller 根据自己的业务幂等语义决定是否重试。

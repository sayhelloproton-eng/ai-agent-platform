---
docId: AGENT-GATEWAY-SERVICE-RUNTIME
title: '`agent-gateway` Service Runtime'
docType: service-runtime
authority: normative
lifecycle: active
domain: agent-runtime-collaboration
boundedContext: agent-runtime-collaboration
moduleRef: agent-gateway
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
---

# `agent-gateway` Service Runtime

## Process
独立 backend process，公网只暴露 Custom GPT Actions 所需入口；内部只调用公开 Domain contracts。

## Startup
加载 Role credential/config → 校验 OpenAI Action schema/transport config → 建立 downstream clients → 启动 HTTPS/public ingress → health/ready。

## Request lifecycle
Authenticate → role resolve → unknown/runtime validation → OpenAI adapter normalize → route to owner contract → serialize response/file relay → emit typed HTTP status。

## Timeouts
Action round-trip 必须受 45s ceiling 约束；长业务工作使用 quick accept/ref，不在 Gateway 同步等待完成。File relay/fetch 有独立更短 timeout。

## Health/Readiness
process alive、public ingress、credential store、required downstream contracts、relay capability 分开检查；任一 blocking dependency 缺失时不得宣称 READY。

## Recovery
Gateway restart 不重放业务 mutation。请求结果不确定时由 owner idempotency/事实查询决定后续动作；transient relay 可重新生成但不能改变 owner artifact identity。

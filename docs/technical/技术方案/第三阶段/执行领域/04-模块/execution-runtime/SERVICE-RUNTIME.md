---
docId: EXECUTION-RUNTIME-SERVICE-RUNTIME
title: '`execution-runtime` Service Runtime'
docType: service-runtime
authority: normative
lifecycle: active
domain: execution
boundedContext: execution
moduleRef: execution-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN
- EXECUTION-DOC-02-01
- EXECUTION-DOC-02-02
- EXECUTION-DOC-03-01
- EXECUTION-DOC-03-03
---

# `execution-runtime` Service Runtime

## Process
唯一 backend Execution Service，持有 execution orchestration/policy/record/evidence lifecycle；local/browser 是 executor，不是独立业务服务。

## Startup
加载 config/store → 恢复 durable running/unknown records 的可观察状态 → 注册 executors → 启动 public API → health/ready。

## Runtime
`executeCapability` 进入 scope/policy/idempotency → 必要 FAST/REASON/Human → persist effect intent → executor → result/evidence。Effect 不确定进入 UNKNOWN，禁止 blind retry。

## Concurrency
遵守 v1 bounded queue/serialization；Browser writes 全局串行；同一 idempotency identity 不并发执行不同 fingerprint。

## Shutdown/Restart
停止接收新 effect → 对可安全 drain 的工作等待 → 对已 started 但未确认的 effect 保留 durable reality-check 状态。restart 后查询现实，不把 restart 自动等同失败或成功。

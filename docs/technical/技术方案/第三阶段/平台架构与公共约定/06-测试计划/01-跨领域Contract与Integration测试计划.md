---
docId: TP-PLATFORM-01
title: 跨领域 Contract 与 Integration 测试计划
docType: test-plan
authority: normative
lifecycle: frozen
domain: platform
subdomain: null
subdomains: []
boundedContext: null
moduleRef: null
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- PLATFORM-DOC-03-02
- PLATFORM-DOC-01-01
- PLATFORM-DOC-02-01
---

# 跨领域 Contract 与 Integration 测试计划

## 1. 目标

证明五领域只通过 Public Contract 协作，Owner 事实不漂移、不 deep import、不读取其他领域 DB，也不把 Runtime collaboration call graph 误当 Deployment/package dependency graph。

## 2. 强制 Contract Pairs

| Pair | Provider 证明 | Consumer 证明 | Integration 证明 |
|---|---|---|---|
| Task ↔ Agent | TaskRoleBinding/Task/Node facts 与版本语义 | Agent opaque 使用，不复制 binding | Worker provisioning、same-Task reuse、terminal/reopen |
| Task ↔ Execution | Task 只拥有 progress facts | Execution 只返回 Result/Evidence，不完成 Node | Effect/Evidence 回到 Task owner 后才 formal transition |
| Execution ↔ Model | Model 返回 structured cognition/proposal | Execution 重新做 policy/approval/effect legality | FAST/REASON/Human 不越过 hard rule |
| Agent ↔ Execution | Agent 只表达逻辑 delivery/intent | Execution 拥有 Browser physical effect | Collaboration physical delivery + uncertain recovery |
| Deployment ↔ Modules | Module 声明真实 lifecycle/verify | CLI 只调用支持 primitive | current reality + verify/doctor/manifest |
| Agent Gateway ↔ Task/Execution | Gateway 只 transport/auth/normalize | Owner 做业务 validation/idempotency | 45s timeout 不等同业务失败/重放 |

## 3. Required Scenario Families

- Provider schema 正确、Consumer schema 正确、版本不兼容明确失败。
- Consumer 不得依赖 provider internal repository/DB/adapter。
- 同一个事实只有 Owner 持久化真源；其他领域只存 opaque ref 或自身业务 fact。
- transport failure 与 business failure 分层；重试必须使用 owner 的 idempotency/version 语义。
- owner/contract/state/effect/approval/recovery 任一变化必须触发受影响跨域回归。

## 4. Cross-domain STOP

出现任何以下情况停止接线：需要直接读其他领域 DB；需要复制状态机；需要用 transient browser locator 作为 durable ref；需要让 Gateway/host 保存第二业务真源；需要 consumer 修改 provider-owned state。

## 5. Evidence

Provider/Consumer Contract test report、runtime-schema result、integration trace、Owner state snapshot/ref、必要的 Execution Evidence。只显示 HTTP 200/进程存活不构成 PASS。

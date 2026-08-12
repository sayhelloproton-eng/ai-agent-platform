---
docId: TP-MODEL-REASONING-README
title: Model & Reasoning｜测试计划导航
docType: test-plan
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
boundedContext: model-reasoning
moduleRef: null
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- MODEL-DOC-05-02
- MODEL-DOC-05-03
testPlanAuthoringOrder: 3
---

# Model & Reasoning｜开发前测试计划

> Test Plan Authoring Order：**3**  
> 本目录新增于 FINAL FROZEN DDD/SDD 之后；不修改领域文档，只把已有规范转成开发前验证合同。

## 阅读顺序

1. [00-领域测试总计划](00-领域测试总计划.md)
2. Module Plans：
- [model-contracts](modules/model-contracts.md) — Wave 2
- [model-runtime](modules/model-runtime.md) — Wave 2

## Frozen Quality Sources

- [`MODEL-DOC-05-02`](../05-质量与部署/02-测试验收-M1到M4.md)
- [`MODEL-DOC-05-03`](../05-质量与部署/03-新仓库实现顺序与停止门.md)

## 原则

Domain Test Plan 不重新定义状态/API/DDL/Package；Module Test Plan 也不把 TODO 的 `PENDING_DECISION / NOT_FROZEN / PLANNED` 自动改成实施依赖。测试计划只冻结可从现有规范证明的 Test Objective 与 Gate。

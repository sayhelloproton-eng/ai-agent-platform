---
docId: TP-PLATFORM-README
title: Phase 3 开发前测试计划｜导航
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
testPlanAuthoringOrder: 0
---

# Phase 3 开发前测试计划

> 状态：**FINAL_FROZEN**  
> 作用：这是 Codex 正式大规模开发前的最后一道验证设计门。它只新增测试计划，不修改 `69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875` 对应的 FINAL FROZEN DDD/SDD 文档。

## 1. 三个阶段

```text
开发前：Test Plan
→ 冻结“必须证明什么”

开发中：TDD
→ 选一个已冻结行为，Test → RED → minimal implementation → GREEN → Refactor

开发后：Test Cases + Test Execution + Evidence
→ 再落具体 fixture / exact steps / command / actual result / evidence
```

本目录只负责第一部分。**不在此提前创建开发后 `08-测试用例与验证/` 空壳。**

## 2. 阅读顺序

1. [00-Phase3测试总计划](00-Phase3测试总计划.md)
2. [01-跨领域Contract与Integration测试计划](01-跨领域Contract与Integration测试计划.md)
3. [02-真实E2E与故障恢复测试计划](02-真实E2E与故障恢复测试计划.md)
4. [03-安全边界与稳定性测试计划](03-安全边界与稳定性测试计划.md)
5. [04-证据与停止门](04-证据与停止门.md)
6. [05-实施Wave与测试Gate](05-实施Wave与测试Gate.md)
7. [platform-host Module Test Plan](modules/platform-host.md)

## 3. Domain Test Plan

- [Deployment](../../部署领域/07-测试计划/README.md)
- [Task & Orchestration](../../任务与编排领域/07-测试计划/README.md)
- [Model & Reasoning](../../模型与推理领域/07-测试计划/README.md)
- [Execution](../../执行领域/07-测试计划/README.md)
- [Agent Runtime & Collaboration](../../智能体运行与协作领域/07-测试计划/README.md)

## 4. 真源规则

测试计划只从 FINAL FROZEN 文档中的 normative/operational rules 推导 `Risk → Test Objective → Required Scenario → Evidence`。如果源文档不足以定义验证目标，标记 `SPEC_GAP / PENDING_DECISION / PENDING_SPIKE`，不得补成“行业通常如此”。

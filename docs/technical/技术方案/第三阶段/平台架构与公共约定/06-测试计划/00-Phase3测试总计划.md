---
docId: TP-PLATFORM-00
title: Phase 3 测试总计划
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
- PLATFORM-DOC-04-01
- PLATFORM-IMPLEMENTATION-NAV
testPlanAuthoringOrder: 0
---

# Phase 3 测试总计划

## 1. 目标

在 Codex 写正式 Phase 3 新实现之前，冻结每个 Domain/Module **必须证明的行为、风险、测试层、真实依赖边界、Evidence 与 STOP 条件**。本计划不设计业务，不替代 FINAL FROZEN DDD/SDD。

## 2. Source Baseline

```text
第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
SHA-256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
```

公共测试真源：

- [`PLATFORM-DOC-03-02`](../03-工程/02-测试与验收约定.md)
- [`PLATFORM-DOC-04-01`](../04-治理/01-约定变更机制.md)
- [`PLATFORM-IMPLEMENTATION-NAV`](../04-治理/02-实施导航与TODO分层.md)

## 3. 统一测试层级

```text
Unit
→ Domain Behavior
→ Contract
→ Persistence / Adapter Real Integration
→ Module Integration
→ Module Conformance
→ Cross-domain Integration
→ Real E2E
→ Fault / Recovery
→ Performance / Stability
→ Evidence / Freeze
```

各层证明边界沿用 FINAL FROZEN `PLATFORM-DOC-03-02`：Unit 不证明 Contract；Conformance 不证明业务；Mock E2E 不替代真实 Browser/Carrier/Local/Model 验收。

## 4. Test Plan 与 Test Case 边界

Test Plan 必须定义：

- Source Spec / Rule；
- 风险；
- Test Objective；
- Required Scenario family；
- 测试层；
- Real vs Fake boundary；
- PASS 所需 Evidence 类型；
- STOP / Spec Change condition。

Test Plan **不提前定义**开发后才能稳定落地的 exact fixture、精确命令、实现内部函数名、实际返回快照位置。

## 5. 开发中 TDD 规则

对每一个已被 Test Plan 冻结的行为：

```text
从 Source Spec 选择一个行为
→ 写最小 executable test
→ RED（确认因缺实现失败）
→ minimal implementation
→ GREEN
→ Refactor（行为不变）
→ 下一行为
```

禁止：先写实现，再把测试修改成当前实现的样子；禁止为绿灯修改 Domain/Contract 语义。

## 6. Spec Change Gate

若 RED 无法被正确表达，或真实证据表明冻结规格不可实现：

```text
STOP
→ 标记 SPEC_GAP / CONTRACT_CONFLICT / EXTERNAL_BEHAVIOR_MISMATCH
→ 进入正式 Contract/Design Change
→ 更新 SDD + Test Plan
→ 再继续 TDD
```

Codex 不能自行改变 DDD/SDD。

## 7. Test Plan 编写顺序

```text
0 Platform Test Strategy
1 Deployment
2 Task & Orchestration
3 Model & Reasoning
4 Execution
5 Agent Runtime & Collaboration
6 platform-host
7 Cross-Domain / Full E2E
```

这是测试计划的**编写/冻结顺序**，不是把 Domain 改成 runtime dependency graph。

## 8. 开发前全局 Freeze Gate

Codex 大规模实现前至少要求：

- 20 个正式 Module 都有开发前 Module Test Plan；
- 每个冻结 TODO Goal 在对应 Module Plan 中有覆盖关系；
- 每个 Public Contract 都有 Provider/Consumer Contract Test 责任；
- 所有真实副作用都有 success/timeout/duplicate/lost-result/unknown/recovery 计划；
- Browser/Carrier、Local Effect、手机模型、External Resource 的真实环境验收边界明确；
- PENDING_SPIKE 不被 Mock 提升为平台保证；
- 每个 Module 有 STOP 条件和 Evidence 要求；
- 任何 SPEC_GAP 若会阻断正确实现，则不允许进入对应 Wave。

## 9. 不使用覆盖率百分比作为架构质量代理

当前冻结资料没有给出统一 statement/branch coverage 百分比阈值，因此本计划不发明数值。测试充分性优先以 **Domain invariant / Contract / failure / recovery / real effect / risk coverage** 判断。后续若真实仓库需要覆盖率数字，走 Test Governance 增量裁决。

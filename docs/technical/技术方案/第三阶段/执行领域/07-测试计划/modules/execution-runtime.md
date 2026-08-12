---
docId: TP-MODULE-EXECUTION-RUNTIME
title: execution-runtime｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
boundedContext: execution
moduleRef: execution-runtime
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN
- EXECUTION-DOC-03-01
- EXECUTION-DOC-03-02
- EXECUTION-DOC-03-03
- EXECUTION-DOC-05-02
- EXECUTION-RUNTIME-SERVICE-RUNTIME
implementationWave: Wave 3
---

# `execution-runtime` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 3**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`](../../04-模块/execution-runtime/TECHNICAL-DESIGN.md)
- [`EXECUTION-DOC-03-01`](../../03-流程与数据/01-Execution-Record-持久化-幂等-状态.md)
- [`EXECUTION-DOC-03-02`](../../03-流程与数据/02-Policy-FAST-REASON-Human-Effect-Approval.md)
- [`EXECUTION-DOC-03-03`](../../03-流程与数据/03-Result-Evidence-UNKNOWN与恢复.md)
- [`EXECUTION-DOC-05-02`](../../05-质量与部署/02-测试验收-E2E-故障注入.md)
- [`EXECUTION-RUNTIME-SERVICE-RUNTIME`](../../04-模块/execution-runtime/SERVICE-RUNTIME.md) — execution-runtime Service Runtime

## 2. 风险定位

Runtime 是真实 Effect 控制面；persist-before-effect、Approval、UNKNOWN 与 recovery 任何错误都可能导致重复副作用。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Domain Behavior
- Contract
- Module Integration
- Fault/Recovery
- Cross-domain Integration

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Domain Behavior | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Contract / Runtime Schema | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Persistence | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Generated Artifact / Package Conformance | **NOT_APPLICABLE** | 该 Module 不生成 template/package/skill artifact，不增加此类测试层。 |
| Module Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Cross-Domain Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Process Lifecycle | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Concurrency / Idempotency | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：核心状态/幂等可真实本地持久化；E5 与 browser/local executor 最终真实联调。

**允许的隔离方式**：Policy/Model/Executor 可用于故障注入 fake，但不能用 Mock 证明真实 Effect 已经 applied。

## 5. Critical Proofs

- [ ] **CP-EXE-RT-01** — Execution Record lifecycle、durability selection、idempotency fingerprint 与 same-key-different-fingerprint conflict 可恢复。
- [ ] **CP-EXE-RT-02** — Policy hard rule 优先于 FAST/REASON；mandatory Human/Approval 不被模型 ALLOW 覆盖。
- [ ] **CP-EXE-RT-03** — 真实副作用 Intent 在 effect 前 durable；effect_started 后 lost response 先 reality reconciliation，禁止 blind retry。
- [ ] **CP-EXE-RT-04** — UNKNOWN 仅在 reality 无法确定时产生，并可被后续 verifier 收敛到 APPLIED/NOT_APPLIED。
- [ ] **CP-EXE-RT-05** — 大 output/evidence 落盘并通过摘要+ref 返回，Evidence 可下钻且 secret redacted。
- [ ] **CP-EXE-RT-06** — execution-local 与 browser executor 由一个 backend service 统一路由，不产生第二 Execution truth。
- [ ] **CP-EXE-RT-07** — queue/concurrency/timeouts/cancel/restart 有 typed semantics；disconnect/lost response/duplicate/unknown side effect fault injection 不产生 duplicate Effect。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `EXE-RT-001` | 实现 Execution Record lifecycle、durability selection、idempotency fingerprint | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-001` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-01` | Execution Record lifecycle、durability selection、idempotency fingerprint | Execution Record lifecycle、durability selection、idempotency fingerprint 与 same-key-different-fingerprint conflict 可恢复。 |
| `EXE-RT-002` | 实现 Policy→FAST/REASON/Human→Effect 决策管线 | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-002` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-02` | Policy→FAST/REASON/Human→Effect 决策管线 | Policy hard rule 优先于 FAST/REASON；mandatory Human/Approval 不被模型 ALLOW 覆盖。 |
| `EXE-RT-003` | 实现 Approval、Effect intent pre-persist、UNKNOWN/reality recovery | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-003` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-03`<br>`CP-EXE-RT-04` | Approval、Effect intent pre-persist、UNKNOWN/reality recovery | 真实副作用 Intent 在 effect 前 durable；effect_started 后 lost response 先 reality reconciliation，禁止 blind retry。；UNKNOWN 仅在 reality 无法确定时产生，并可被后续 verifier 收敛到 APPLIED/NOT_APPLIED。 |
| `EXE-RT-004` | 实现 output/evidence 落盘、摘要+ref 返回 | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-004` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-05` | output/evidence 落盘、摘要+ref 返回 | 大 output/evidence 落盘并通过摘要+ref 返回，Evidence 可下钻且 secret redacted。 |
| `EXE-RT-005` | 接入 execution-local 与 browser executor，保持一个 backend service | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-005` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-06` | execution-local 与 browser executor，保持一个 backend service | execution-local 与 browser executor 由一个 backend service 统一路由，不产生第二 Execution truth。 |
| `EXE-RT-006` | 实现 queue/concurrency/timeouts/cancel/restart failure semantics | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-006` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-07` | queue/concurrency/timeouts/cancel/restart failure semantics | queue/concurrency/timeouts/cancel/restart 有 typed semantics；disconnect/lost response/duplicate/unknown side effect fault injection 不产生 duplicate Effect。 |
| `EXE-RT-007` | 完成 fault injection：disconnect/lost response/duplicate/unknown side effect | `EXECUTION-TODO-EXECUTION-RUNTIME` § `EXE-RT-007` | `EXECUTION-EXECUTION-RUNTIME-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02`<br>`EXECUTION-DOC-03-01`<br>`EXECUTION-DOC-03-03` | `CP-EXE-RT-03`<br>`CP-EXE-RT-04`<br>`CP-EXE-RT-07` | fault injection：disconnect/lost response/duplicate/unknown side effect | 真实副作用 Intent 在 effect 前 durable；effect_started 后 lost response 先 reality reconciliation，禁止 blind retry。；UNKNOWN 仅在 reality 无法确定时产生，并可被后续 verifier 收敛到 APPLIED/NOT_APPLIED。；queue/concurrency/timeouts/cancel/restart 有 typed semantics；disconnect/lost response/duplicate/unknown side effect fault injection 不产生 duplicate Effect。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-EXE-RT-01** — Execution Record durability/idempotency fingerprint/restart 恢复错误
- [ ] **RF-EXE-RT-02** — Policy hard rule 被 FAST/REASON ALLOW 覆盖，mandatory Human/Approval 被绕过
- [ ] **RF-EXE-RT-03** — effect_started 后 lost response/disconnect 发生 blind retry
- [ ] **RF-EXE-RT-04** — UNKNOWN 在 reality 可判定时产生或无法由 verifier 收敛
- [ ] **RF-EXE-RT-05** — 大 output/evidence 丢失、不可下钻或泄漏 secret
- [ ] **RF-EXE-RT-06** — local/browser executor 形成第二 Execution truth
- [ ] **RF-EXE-RT-07** — queue/timeout/cancel/restart/duplicate fault 导致 duplicate Effect




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-EXE-RT-01** — pre-effect durable Execution Record
- **EV-EXE-RT-02** — ExecutionStatus/SideEffectState/idempotency fingerprint
- **EV-EXE-RT-03** — Policy/FAST/REASON/Human/Approval decision trace
- **EV-EXE-RT-04** — executor Result + Evidence artifact/ref
- **EV-EXE-RT-05** — UNKNOWN/reality reconciliation record
- **EV-EXE-RT-06** — queue/timeout/cancel/restart structured result
- **EV-EXE-RT-07** — fault injection 前后真实 Effect count / duplicate absence
- **EV-EXE-RT-08** — backend routing/public-client trace：local/browser executor 共用单一 Execution truth

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-EXE-RT-01` | `Domain Behavior`<br>`Persistence`<br>`Failure / Recovery`<br>`Concurrency / Idempotency` | `RF-EXE-RT-01` | `EV-EXE-RT-01`<br>`EV-EXE-RT-02` |
| `CP-EXE-RT-02` | `Domain Behavior`<br>`Module Integration`<br>`Security / Boundary` | `RF-EXE-RT-02` | `EV-EXE-RT-03` |
| `CP-EXE-RT-03` | `Persistence`<br>`Cross-Domain Integration`<br>`Failure / Recovery` | `RF-EXE-RT-03` | `EV-EXE-RT-01`<br>`EV-EXE-RT-04`<br>`EV-EXE-RT-07` |
| `CP-EXE-RT-04` | `Domain Behavior`<br>`Failure / Recovery` | `RF-EXE-RT-04` | `EV-EXE-RT-05` |
| `CP-EXE-RT-05` | `Persistence`<br>`Security / Boundary` | `RF-EXE-RT-05` | `EV-EXE-RT-04` |
| `CP-EXE-RT-06` | `Module Integration`<br>`Cross-Domain Integration` | `RF-EXE-RT-06` | `EV-EXE-RT-08` |
| `CP-EXE-RT-07` | `Process Lifecycle`<br>`Failure / Recovery`<br>`Concurrency / Idempotency` | `RF-EXE-RT-07` | `EV-EXE-RT-06`<br>`EV-EXE-RT-07` |

## 8.2 Codex TDD Handoff

当 Implementation Wave/Gate 允许某个 Frozen TODO 开工时：

1. 从 §6 选择该 TODO 已绑定的 Critical Proof；**本 Test Plan 不推导 TODO priority 或 dependsOn**。
2. 依据 §8.1，在能够忠实证明该 Proof 的最早 `REQUIRED` 可执行层先写测试，并先观察预期 **RED**；RED 必须来自行为尚未实现，而不是 fixture/环境本身坏掉。
3. **GREEN** 只实现对应 §5 Critical Proof / §6 Test Plan Acceptance 所需的最小行为，不扩展 Frozen Spec。
4. Fake/adapter 可以证明较低层行为，但不能替代 §3/§8.1 标为 REQUIRED 的 Real Local / Real External / Persistence / Process 等真实层。
5. Refactor 只能在相关测试保持 GREEN 下进行；若无法从 Frozen SDD 得到可执行断言、必要 Evidence 不可观察、或必须新增/改变 Public API/Owner/State 才能测试，立即按 §10 `STOP → SPEC_GAP / PENDING_DECISION / PENDING_SPIKE`。

## 9. Module GO

进入 Codex TDD 前，本 Module 的 Test Plan 只在以下条件全部满足时 GO：

- §6 每个 Frozen TODO 都有 Frozen Anchor、Normative Rule Refs、Critical Proof、Scenario Family 和 Test Plan Acceptance；
- §3 所有 `REQUIRED` 层都有可执行验证路径，`NOT_APPLICABLE` 不被强行补测；
- §7 的 Module-specific failure/boundary family 都能在不改变 Frozen Spec 的前提下表达为测试；
- §8 的 Evidence 类型在目标环境中可观察；真实 External E2E 若属于后续 Wave，只要求路径已定义，不伪造实际 PASS；
- 不存在阻断实现的 `SPEC_GAP / PENDING_SPIKE`；不得靠放宽测试或修改冻结 Contract 消除失败。

当前必须控制的 Module 风险：**Runtime 是真实 Effect 控制面；persist-before-effect、Approval、UNKNOWN 与 recovery 任何错误都可能导致重复副作用。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Runtime 是真实 Effect 控制面；persist-before-effect、Approval、UNKNOWN 与 recovery 任何错误都可能导致重复副作用。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


---
docId: TP-MODULE-MODEL-RUNTIME
title: model-runtime｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
boundedContext: model-reasoning
moduleRef: model-runtime
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
- MODEL-DOC-05-02
- MODEL-DOC-05-03
- MODEL-RUNTIME-SERVICE-RUNTIME
implementationWave: Wave 2
---

# `model-runtime` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 2**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`MODEL-MODEL-RUNTIME-TECH-DESIGN`](../../04-模块/model-runtime/TECHNICAL-DESIGN.md)
- [`MODEL-DOC-02-01`](../../02-契约/01-Public-Contract与TypeScript类型规范.md)
- [`MODEL-DOC-02-02`](../../02-契约/02-跨领域接口依赖矩阵.md)
- [`MODEL-DOC-05-02`](../../05-质量与部署/02-测试验收-M1到M4.md)
- [`MODEL-DOC-05-03`](../../05-质量与部署/03-新仓库实现顺序与停止门.md)
- [`MODEL-RUNTIME-SERVICE-RUNTIME`](../../04-模块/model-runtime/SERVICE-RUNTIME.md) — model-runtime Service Runtime

## 2. 风险定位

路由、队列、Provider 能力与结构化输出若不可靠，会把错误认知决策传给 Execution/Agent，并造成资源竞争。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Contract
- Module Integration
- M2 Real Capability
- M3 Scenario Regression
- M4 Stability

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Domain Behavior | **NOT_APPLICABLE** | 该 Module 不拥有独立领域状态机/业务规则；不为模板完整性制造 Domain Behavior 层。 |
| Contract / Runtime Schema | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Persistence | **NOT_APPLICABLE** | 该 Module 不拥有 persistence implementation；持久化正确性由对应 owner Module 的真实集成门证明。 |
| Generated Artifact / Package Conformance | **NOT_APPLICABLE** | 该 Module 不生成 template/package/skill artifact，不增加此类测试层。 |
| Module Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Cross-Domain Integration | **NOT_APPLICABLE** | 该 Module 的本地正确性不要求直接跨域；跨域主链由相关 owner 与 Wave 7 验证。 |
| Process Lifecycle | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立 trust/effect boundary；不从通用 checklist 新增安全产品需求。 |
| Concurrency / Idempotency | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Stability / Performance | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |

## 4. Real / Fake Boundary

**Real requirement**：M2/M3/M4 必须使用部署配置的真实模型 API；Vision 声明必须真实验证。

**允许的隔离方式**：M1/队列/failure injection 可 fake Provider；不能用 fake 把模型能力提升为 VERIFIED。

## 5. Critical Proofs

- [ ] **CP-MODEL-RT-01** — FAST/REASON/AUTO 遵守 ReasoningSpec；AUTO 只在 Spec 允许时升级，FAST/REASON 不静默替换。
- [ ] **CP-MODEL-RT-02** — 单 Lane 保证 business/background 排队与真实串行；background 让路，queueTimeout 与 inferenceTimeout 可区分。
- [ ] **CP-MODEL-RT-03** — Provider Adapter 做 capability verification；声明与实测不符时 role/health 不得假 READY。
- [ ] **CP-MODEL-RT-04** — Prompt 由 versioned ReasoningSpec + typed payload 组装；结构化输出失败只 bounded repair。
- [ ] **CP-MODEL-RT-05** — Capability Proposal 一次最多一个，caller maxRounds 在调用方边界生效；Model 不执行工具/Effect。
- [ ] **CP-MODEL-RT-06** — cancel/restart 对 queued/running request 有明确失败结果，不持久化业务 inference DB。
- [ ] **CP-MODEL-RT-07** — READY/DEGRADED/UNAVAILABLE 含 provider/resource/queue 可诊断信息。
- [ ] **CP-MODEL-RT-08** — M2 真实能力 + M3 场景回归 + M4 单 Lane sustained/latency/role-switching 共同作为真实模型门。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `MODEL-RT-001` | 实现 FAST/REASON/AUTO 路由与单 Lane business/background queue | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-001` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-01`<br>`CP-MODEL-RT-02` | FAST/REASON/AUTO 路由与单 Lane business/background queue | FAST/REASON/AUTO 遵守 ReasoningSpec；AUTO 只在 Spec 允许时升级，FAST/REASON 不静默替换。；单 Lane 保证 business/background 排队与真实串行；background 让路，queueTimeout 与 inferenceTimeout 可区分。 |
| `MODEL-RT-002` | 实现 Provider Adapter + capability verification | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-002` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-03` | Provider Adapter + capability verification | Provider Adapter 做 capability verification；声明与实测不符时 role/health 不得假 READY。 |
| `MODEL-RT-003` | 实现 ReasoningSpec prompt assembly、structured validation、bounded repair | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-003` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-04` | ReasoningSpec prompt assembly、structured validation、bounded repair | Prompt 由 versioned ReasoningSpec + typed payload 组装；结构化输出失败只 bounded repair。 |
| `MODEL-RT-004` | 实现最多一次 Capability Proposal 与 caller maxRounds contract | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-004` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-05` | 最多一次 Capability Proposal 与 caller maxRounds contract | Capability Proposal 一次最多一个，caller maxRounds 在调用方边界生效；Model 不执行工具/Effect。 |
| `MODEL-RT-005` | 实现 queueTimeout/inferenceTimeout/cancel/restart semantics | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-005` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-02`<br>`CP-MODEL-RT-06` | queueTimeout/inferenceTimeout/cancel/restart semantics | 单 Lane 保证 business/background 排队与真实串行；background 让路，queueTimeout 与 inferenceTimeout 可区分。；cancel/restart 对 queued/running request 有明确失败结果，不持久化业务 inference DB。 |
| `MODEL-RT-006` | 实现 READY/DEGRADED/UNAVAILABLE health 与资源观测 | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-006` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-07` | READY/DEGRADED/UNAVAILABLE health 与资源观测 | READY/DEGRADED/UNAVAILABLE 含 provider/resource/queue 可诊断信息。 |
| `MODEL-RT-007` | 完成真实 FAST→uncertain→REASON、Vision、稳定性/热负载回归 | `MODEL-REASONING-TODO-MODEL-RUNTIME` § `MODEL-RT-007` | `MODEL-MODEL-RUNTIME-TECH-DESIGN`<br>`MODEL-DOC-02-01`<br>`MODEL-DOC-02-02` | `CP-MODEL-RT-08` | 真实 FAST→uncertain→REASON、Vision、稳定性/热负载回归 | M2 真实能力 + M3 场景回归 + M4 单 Lane sustained/latency/role-switching 共同作为真实模型门。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-MODEL-RT-01** — FAST/REASON/AUTO 路由或 AUTO 升级违反 ReasoningSpec
- [ ] **RF-MODEL-RT-02** — single Lane/business-background 排队、queueTimeout 与 inferenceTimeout 语义混淆
- [ ] **RF-MODEL-RT-03** — Provider capability 声明与实测不符仍报告 READY
- [ ] **RF-MODEL-RT-04** — structured output invalid 后出现无界 repair
- [ ] **RF-MODEL-RT-05** — Capability Proposal/maxRounds 边界被突破或 Model 直接执行 Effect
- [ ] **RF-MODEL-RT-06** — cancel/restart 对 queued/running request 结果不明确
- [ ] **RF-MODEL-RT-07** — health 不区分 READY/DEGRADED/UNAVAILABLE 或缺 provider/resource/queue 诊断
- [ ] **RF-MODEL-RT-08** — 真实 M2/M3/M4 能力、稳定性或 role-switching 回归失败




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-MODEL-RT-01** — infer result + selected FAST/REASON/AUTO mode
- **EV-MODEL-RT-02** — queue order/queueTimeout/inferenceTimeout observation
- **EV-MODEL-RT-03** — Provider capability/status verification
- **EV-MODEL-RT-04** — structured validation + bounded repair trace
- **EV-MODEL-RT-05** — Capability Proposal count/contents
- **EV-MODEL-RT-06** — cancel/restart queued/running outcome
- **EV-MODEL-RT-07** — READY/DEGRADED/UNAVAILABLE health diagnostics
- **EV-MODEL-RT-08** — M2/M3/M4 real-model capability/stability observations

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-MODEL-RT-01` | `Unit`<br>`Contract / Runtime Schema`<br>`Module Integration` | `RF-MODEL-RT-01` | `EV-MODEL-RT-01` |
| `CP-MODEL-RT-02` | `Module Integration`<br>`Failure / Recovery`<br>`Concurrency / Idempotency`<br>`Stability / Performance` | `RF-MODEL-RT-02` | `EV-MODEL-RT-02` |
| `CP-MODEL-RT-03` | `Module Integration`<br>`Real External E2E`<br>`Failure / Recovery` | `RF-MODEL-RT-03` | `EV-MODEL-RT-03` |
| `CP-MODEL-RT-04` | `Unit`<br>`Contract / Runtime Schema`<br>`Failure / Recovery` | `RF-MODEL-RT-04` | `EV-MODEL-RT-04` |
| `CP-MODEL-RT-05` | `Contract / Runtime Schema`<br>`Module Integration` | `RF-MODEL-RT-05` | `EV-MODEL-RT-05` |
| `CP-MODEL-RT-06` | `Process Lifecycle`<br>`Failure / Recovery` | `RF-MODEL-RT-06` | `EV-MODEL-RT-06` |
| `CP-MODEL-RT-07` | `Process Lifecycle`<br>`Failure / Recovery` | `RF-MODEL-RT-07` | `EV-MODEL-RT-07` |
| `CP-MODEL-RT-08` | `Real External E2E`<br>`Concurrency / Idempotency`<br>`Stability / Performance` | `RF-MODEL-RT-08` | `EV-MODEL-RT-08` |

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

当前必须控制的 Module 风险：**路由、队列、Provider 能力与结构化输出若不可靠，会把错误认知决策传给 Execution/Agent，并造成资源竞争。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“路由、队列、Provider 能力与结构化输出若不可靠，会把错误认知决策传给 Execution/Agent，并造成资源竞争。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


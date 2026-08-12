---
docId: TP-MODULE-MODULE-CONTRACT
title: module-contract｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: deployment-governance
subdomain: null
subdomains: []
boundedContext: deployment-governance
moduleRef: module-contract
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN
- DEPLOYMENT-DOC-05-02
- DEPLOYMENT-DOC-05-03
implementationWave: Wave 0
---

# `module-contract` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 0**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN`](../../04-模块/module-contract/TECHNICAL-DESIGN.md)
- [`DEPLOYMENT-DOC-05-02`](../../05-质量与部署/02-测试门禁与真实验收.md)
- [`DEPLOYMENT-DOC-05-03`](../../05-质量与部署/03-新仓库实施顺序-停止门与非目标.md)

## 2. 风险定位

Module contract/schema 漂移会让所有后续 Module、Deployment Planner 与 Conformance 失去统一结构真源。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Contract
- Runtime Schema
- Compatibility

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Domain Behavior | **NOT_APPLICABLE** | 该 Module 不拥有独立领域状态机/业务规则；不为模板完整性制造 Domain Behavior 层。 |
| Contract / Runtime Schema | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Persistence | **NOT_APPLICABLE** | 该 Module 不拥有 persistence implementation；持久化正确性由对应 owner Module 的真实集成门证明。 |
| Generated Artifact / Package Conformance | **NOT_APPLICABLE** | 该 Module 不生成 template/package/skill artifact，不增加此类测试层。 |
| Module Integration | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立组件集成门；其行为由更贴近的 Contract/Role/Conformance 层证明。 |
| Cross-Domain Integration | **NOT_APPLICABLE** | 该 Module 的本地正确性不要求直接跨域；跨域主链由相关 owner 与 Wave 7 验证。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **NOT_APPLICABLE** | 该 Module 不拥有 durable/runtime recovery 语义；负向行为由其 Contract/Conformance 层覆盖。 |
| Security / Boundary | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立 trust/effect boundary；不从通用 checklist 新增安全产品需求。 |
| Concurrency / Idempotency | **NOT_APPLICABLE** | 该 Module 不拥有共享可变状态、串行调度或幂等写入 Contract。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：纯 contract/schema 行为可自动化；不需要真实外部资源。

**允许的隔离方式**：不需要 Mock 业务领域；使用合法/非法 descriptor fixture 与 runtime-schema 输入。

## 5. Critical Proofs

- [ ] **CP-DPL-CON-01** — 类型与 runtime schema 对 Module/Provides/Requires/Requirement/ConfigSlot/Lifecycle/Verify/Doctor 的表达一致；无 `any` 边界。
- [ ] **CP-DPL-CON-02** — `external-resource`、`moduleRef`、`secretRef` 等 kind/type 可以被 runtime validation 区分并拒绝非法组合。
- [ ] **CP-DPL-CON-03** — Requirement 查询保持零副作用。
- [ ] **CP-DPL-CON-04** — Library / 不可控 External Resource 不因统一接口而被迫声明虚假 start/stop。
- [ ] **CP-DPL-CON-05** — 兼容性判断可区分 compatible 与 breaking schema 变化。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `DPL-CON-001` | 冻结 Module/Provides/Requires/ConfigSlot/Lifecycle/Verify/Doctor schema | `DEPLOYMENT-GOVERNANCE-TODO-MODULE-CONTRACT` § `DPL-CON-001` | `DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN` | `CP-DPL-CON-01` | Module/Provides/Requires/ConfigSlot/Lifecycle/Verify/Doctor schema | 类型与 runtime schema 对 Module/Provides/Requires/Requirement/ConfigSlot/Lifecycle/Verify/Doctor 的表达一致；无 `any` 边界。 |
| `DPL-CON-002` | 覆盖 external-resource/moduleRef/secretRef 等 kind/type | `DEPLOYMENT-GOVERNANCE-TODO-MODULE-CONTRACT` § `DPL-CON-002` | `DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN` | `CP-DPL-CON-02`<br>`CP-DPL-CON-04` | external-resource/moduleRef/secretRef 等 kind/type | `external-resource`、`moduleRef`、`secretRef` 等 kind/type 可以被 runtime validation 区分并拒绝非法组合。；Library / 不可控 External Resource 不因统一接口而被迫声明虚假 start/stop。 |
| `DPL-CON-003` | 完成 schema validation 与 backward compatibility tests | `DEPLOYMENT-GOVERNANCE-TODO-MODULE-CONTRACT` § `DPL-CON-003` | `DEPLOYMENT-MODULE-CONTRACT-TECH-DESIGN` | `CP-DPL-CON-01`<br>`CP-DPL-CON-05` | schema validation 与 backward compatibility tests | 类型与 runtime schema 对 Module/Provides/Requires/Requirement/ConfigSlot/Lifecycle/Verify/Doctor 的表达一致；无 `any` 边界。；兼容性判断可区分 compatible 与 breaking schema 变化。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-DPL-CON-01** — 缺失/非法 ModuleDescriptor、Config、Lifecycle、Verification 输入
- [ ] **RF-DPL-CON-02** — external-resource/moduleRef/secretRef 非法 kind/type 组合
- [ ] **RF-DPL-CON-03** — Requirement 查询出现副作用或统一接口强迫 Library/External Resource 声明虚假 lifecycle
- [ ] **RF-DPL-CON-04** — 兼容性判断把 breaking schema 误判为 compatible




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-DPL-CON-01** — runtime schema 正/负向 validation result
- **EV-DPL-CON-02** — Module/Provides/Requires/Config/Lifecycle fixture 的 typed parse/reject 结果
- **EV-DPL-CON-03** — Requirement 查询前后副作用观察
- **EV-DPL-CON-04** — compatible/breaking schema compatibility result

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-DPL-CON-01` | `Unit`<br>`Contract / Runtime Schema` | `RF-DPL-CON-01` | `EV-DPL-CON-01`<br>`EV-DPL-CON-02` |
| `CP-DPL-CON-02` | `Unit`<br>`Contract / Runtime Schema` | `RF-DPL-CON-02` | `EV-DPL-CON-01`<br>`EV-DPL-CON-02` |
| `CP-DPL-CON-03` | `Unit`<br>`Contract / Runtime Schema` | `RF-DPL-CON-03` | `EV-DPL-CON-03` |
| `CP-DPL-CON-04` | `Unit`<br>`Contract / Runtime Schema` | `RF-DPL-CON-03` | `EV-DPL-CON-02`<br>`EV-DPL-CON-03` |
| `CP-DPL-CON-05` | `Unit`<br>`Contract / Runtime Schema` | `RF-DPL-CON-04` | `EV-DPL-CON-04` |

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

当前必须控制的 Module 风险：**Module contract/schema 漂移会让所有后续 Module、Deployment Planner 与 Conformance 失去统一结构真源。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Module contract/schema 漂移会让所有后续 Module、Deployment Planner 与 Conformance 失去统一结构真源。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


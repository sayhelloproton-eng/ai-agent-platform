---
docId: TP-MODULE-DEPLOYMENT-CONFORMANCE
title: deployment-conformance｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: deployment-governance
subdomain: null
subdomains: []
boundedContext: deployment-governance
moduleRef: deployment-conformance
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN
- DEPLOYMENT-DOC-05-02
- DEPLOYMENT-DOC-05-03
implementationWave: Wave 0
---

# `deployment-conformance` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 0**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN`](../../04-模块/deployment-conformance/TECHNICAL-DESIGN.md)
- [`DEPLOYMENT-DOC-05-02`](../../05-质量与部署/02-测试门禁与真实验收.md)
- [`DEPLOYMENT-DOC-05-03`](../../05-质量与部署/03-新仓库实施顺序-停止门与非目标.md)

## 2. 风险定位

Conformance 若误把结构 PASS 当业务 PASS，或不能拒绝错误 Module，会让平台治理失效。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Contract
- Static Conformance
- Package Conformance
- Behavior Conformance

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **NOT_APPLICABLE** | 该 Module 的冻结门以静态/角色/Conformance 行为为最小证明单元，没有独立 pure-unit Gate。 |
| Domain Behavior | **NOT_APPLICABLE** | 该 Module 不拥有独立领域状态机/业务规则；不为模板完整性制造 Domain Behavior 层。 |
| Contract / Runtime Schema | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Persistence | **NOT_APPLICABLE** | 该 Module 不拥有 persistence implementation；持久化正确性由对应 owner Module 的真实集成门证明。 |
| Generated Artifact / Package Conformance | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Module Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Cross-Domain Integration | **NOT_APPLICABLE** | 该 Module 的本地正确性不要求直接跨域；跨域主链由相关 owner 与 Wave 7 验证。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **NOT_APPLICABLE** | 该 Module 不拥有 durable/runtime recovery 语义；负向行为由其 Contract/Conformance 层覆盖。 |
| Security / Boundary | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立 trust/effect boundary；不从通用 checklist 新增安全产品需求。 |
| Concurrency / Idempotency | **NOT_APPLICABLE** | 该 Module 不拥有共享可变状态、串行调度或幂等写入 Contract。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：C1/C2/C3 以真实生成 package + 可控 fake resource；真实外部资源可用性留给 Deployment verify。

**允许的隔离方式**：Behavior Gate 可使用 fake external resource 注入错误；不能用 fake 声称真实 Carrier/Chrome 可用。

## 5. Critical Proofs

- [ ] **CP-DPL-CONF-01** — C1 Static Contract 能拒绝缺字段、非法版本/Config/Lifecycle/Verification contract。
- [ ] **CP-DPL-CONF-02** — C2 Package Gate 校验 package metadata/exports/entry/version 与 Module contract 一致。
- [ ] **CP-DPL-CONF-03** — C3 Behavior Gate 只证明声明的行为合同，不越权证明真实外部资源可用性。
- [ ] **CP-DPL-CONF-04** — GPT Actions/File Bridge conformance 覆盖 consequential、45s/100k、文件 count/size/aggregate、relay header/token/scope/TTL/SSRF 与 typed errors。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `DPL-CONF-001` | 实现 Static Contract Gate | `DEPLOYMENT-GOVERNANCE-TODO-DEPLOYMENT-CONFORMANCE` § `DPL-CONF-001` | `DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN` | `CP-DPL-CONF-01` | Static Contract Gate | C1 Static Contract 能拒绝缺字段、非法版本/Config/Lifecycle/Verification contract。 |
| `DPL-CONF-002` | 实现 Package Gate | `DEPLOYMENT-GOVERNANCE-TODO-DEPLOYMENT-CONFORMANCE` § `DPL-CONF-002` | `DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN` | `CP-DPL-CONF-02` | Package Gate | C2 Package Gate 校验 package metadata/exports/entry/version 与 Module contract 一致。 |
| `DPL-CONF-003` | 实现 Behavior Gate 与 external resource verification | `DEPLOYMENT-GOVERNANCE-TODO-DEPLOYMENT-CONFORMANCE` § `DPL-CONF-003` | `DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN` | `CP-DPL-CONF-03` | Behavior Gate 与 external resource verification | C3 Behavior Gate 只证明声明的行为合同，不越权证明真实外部资源可用性。 |
| `DPL-CONF-004` | 实现 GPT Actions schema/consequential/File Bridge hard-limit conformance | `DEPLOYMENT-GOVERNANCE-TODO-DEPLOYMENT-CONFORMANCE` § `DPL-CONF-004` | `DEPLOYMENT-DEPLOYMENT-CONFORMANCE-TECH-DESIGN` | `CP-DPL-CONF-04` | GPT Actions schema/consequential/File Bridge hard-limit conformance | GPT Actions/File Bridge conformance 覆盖 consequential、45s/100k、文件 count/size/aggregate、relay header/token/scope/TTL/SSRF 与 typed errors。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-DPL-CONF-01** — C1 未拒绝非法/缺失 Contract
- [ ] **RF-DPL-CONF-02** — C2 package metadata/exports/entry/version 与 Module Contract 漂移
- [ ] **RF-DPL-CONF-03** — C3 把 fake behavior PASS 错判为真实 External Resource 可用
- [ ] **RF-DPL-CONF-04** — GPT Actions/File Bridge hard-limit/consequential/SSRF/typed-error conformance 失效




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-DPL-CONF-01** — C1/C2/C3 structured gate result
- **EV-DPL-CONF-02** — 非法 Contract fixture rejection detail
- **EV-DPL-CONF-03** — 真实生成 package 的 metadata/exports/entry/version inspection
- **EV-DPL-CONF-04** — GPT Actions/File Bridge hard-limit/consequential/SSRF conformance result

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-DPL-CONF-01` | `Contract / Runtime Schema` | `RF-DPL-CONF-01` | `EV-DPL-CONF-01`<br>`EV-DPL-CONF-02` |
| `CP-DPL-CONF-02` | `Generated Artifact / Package Conformance`<br>`Module Integration` | `RF-DPL-CONF-02` | `EV-DPL-CONF-01`<br>`EV-DPL-CONF-03` |
| `CP-DPL-CONF-03` | `Module Integration` | `RF-DPL-CONF-03` | `EV-DPL-CONF-01` |
| `CP-DPL-CONF-04` | `Contract / Runtime Schema`<br>`Module Integration` | `RF-DPL-CONF-04` | `EV-DPL-CONF-04` |

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

当前必须控制的 Module 风险：**Conformance 若误把结构 PASS 当业务 PASS，或不能拒绝错误 Module，会让平台治理失效。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Conformance 若误把结构 PASS 当业务 PASS，或不能拒绝错误 Module，会让平台治理失效。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


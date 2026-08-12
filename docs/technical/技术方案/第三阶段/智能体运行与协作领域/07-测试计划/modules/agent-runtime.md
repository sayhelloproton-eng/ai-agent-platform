---
docId: TP-MODULE-AGENT-RUNTIME
title: agent-runtime｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
boundedContext: agent-runtime-collaboration
moduleRef: agent-runtime
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- AGENT-DOC-02-01
- AGENT-DOC-05-01
- AGENT-CROSS-DOMAIN-INTEGRATION-CHECKLIST
implementationWave: Wave 4
---

# `agent-runtime` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 4**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`AGENT-DOC-02-01`](../../02-契约/01-Public-API与跨领域接口矩阵.md)
- [`AGENT-DOC-05-01`](../../05-质量与部署/01-失败恢复版本安全与验收.md)
- [`AGENT-CROSS-DOMAIN-INTEGRATION-CHECKLIST`](../../05-质量与部署/02-跨领域一致性验收清单.md)

## 2. 风险定位

Agent Runtime 若复制 Task binding、身份校验宽松或 Collaboration 顺序错误，会产生跨角色错投与第二事实真源。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Domain Behavior
- Persistence/Restart
- Contract
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
| Module Integration | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立组件集成门；其行为由更贴近的 Contract/Role/Conformance 层证明。 |
| Cross-Domain Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Concurrency / Idempotency | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：Role Registry/credential/persistence/restart 使用真实本地 store；Task/Execution 通过 contract integration。

**允许的隔离方式**：Task/Execution 可用 public-contract fake；不能 fake authenticatedRoleRef/Worker identity 规则本身。

## 5. Critical Proofs

- [ ] **CP-AGT-RUNTIME-01** — Role Registry list/get/register/delete 保持 one-package-one-current-role；ROLE_IN_USE delete zero mutation。
- [ ] **CP-AGT-RUNTIME-02** — one Role → one credential；key rotation 不改变 roleRef；secret 不进入 logs/docs/browser injected text。
- [ ] **CP-AGT-RUNTIME-03** — Worker identity validate/resolve 不复制 TaskRoleBinding；涉及 Task 的 Action 校验 authenticatedRoleRef+taskId+workerRef+owner facts。
- [ ] **CP-AGT-RUNTIME-04** — askPeer/replyPeer 带 idempotency，严格 one unanswered question；Reply physical DELIVERED 后才允许下一问。
- [ ] **CP-AGT-RUNTIME-05** — Task terminal 后 no new ask/reply/wake；missing participant/duplicate message fail-safe。
- [ ] **CP-AGT-RUNTIME-06** — 与 Task/Execution 的 integration 只走 Public Contract，不 direct DB/deep import。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `AGT-RUNTIME-001` | 实现 Role Registry list/get/register/delete local management boundary | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-RUNTIME` § `AGT-RUNTIME-001` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-03-01`<br>`AGENT-DOC-03-03`<br>`AGENT-DOC-03-05` | `CP-AGT-RUNTIME-01` | Role Registry list/get/register/delete local management boundary | Role Registry list/get/register/delete 保持 one-package-one-current-role；ROLE_IN_USE delete zero mutation。 |
| `AGT-RUNTIME-002` | 实现 roleRef↔credential 安全绑定与 key rotation | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-RUNTIME` § `AGT-RUNTIME-002` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-03-01`<br>`AGENT-DOC-03-03`<br>`AGENT-DOC-03-05` | `CP-AGT-RUNTIME-02` | roleRef↔credential 安全绑定与 key rotation | one Role → one credential；key rotation 不改变 roleRef；secret 不进入 logs/docs/browser injected text。 |
| `AGT-RUNTIME-003` | 实现 Worker identity validate/resolve，不复制 Task binding | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-RUNTIME` § `AGT-RUNTIME-003` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-03-01`<br>`AGENT-DOC-03-03`<br>`AGENT-DOC-03-05` | `CP-AGT-RUNTIME-03` | Worker identity validate/resolve，不复制 Task binding | Worker identity validate/resolve 不复制 TaskRoleBinding；涉及 Task 的 Action 校验 authenticatedRoleRef+taskId+workerRef+owner facts。 |
| `AGT-RUNTIME-004` | 实现 Collaboration Message Center 与 askPeer/replyPeer 串行状态 | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-RUNTIME` § `AGT-RUNTIME-004` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-03-01`<br>`AGENT-DOC-03-03`<br>`AGENT-DOC-03-05` | `CP-AGT-RUNTIME-04` | Collaboration Message Center 与 askPeer/replyPeer 串行状态 | askPeer/replyPeer 带 idempotency，严格 one unanswered question；Reply physical DELIVERED 后才允许下一问。 |
| `AGT-RUNTIME-005` | 实现 terminal Task / missing participant / duplicate message 防御 | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-RUNTIME` § `AGT-RUNTIME-005` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-03-01`<br>`AGENT-DOC-03-03`<br>`AGENT-DOC-03-05` | `CP-AGT-RUNTIME-05` | terminal Task / missing participant / duplicate message 防御 | Task terminal 后 no new ask/reply/wake；missing participant/duplicate message fail-safe。 |
| `AGT-RUNTIME-006` | 完成与 Task/Execution 的 contract integration tests | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-RUNTIME` § `AGT-RUNTIME-006` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-RUNTIME`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-03-01`<br>`AGENT-DOC-03-03`<br>`AGENT-DOC-03-05` | `CP-AGT-RUNTIME-06` | 与 Task/Execution 的 contract integration tests | 与 Task/Execution 的 integration 只走 Public Contract，不 direct DB/deep import。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-AGT-RUNTIME-01** — Role Registry one-package-one-current-role 或 ROLE_IN_USE delete 发生错误 mutation
- [ ] **RF-AGT-RUNTIME-02** — credential rotation 改变 roleRef 或 secret 泄漏
- [ ] **RF-AGT-RUNTIME-03** — Worker identity 校验复制 TaskRoleBinding/信任错误身份事实
- [ ] **RF-AGT-RUNTIME-04** — askPeer/replyPeer idempotency/one-unanswered/DELIVERED 顺序失效
- [ ] **RF-AGT-RUNTIME-05** — terminal Task、missing participant、duplicate message 未 fail-safe
- [ ] **RF-AGT-RUNTIME-06** — Task/Execution integration 绕过 Public Contract 直接 DB/deep import




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-AGT-RUNTIME-01** — Role Registry before-after state
- **EV-AGT-RUNTIME-02** — credential rotation result + secret-redaction observation
- **EV-AGT-RUNTIME-03** — Worker identity validation/resolve result
- **EV-AGT-RUNTIME-04** — Collaboration thread/message state + idempotency
- **EV-AGT-RUNTIME-05** — physical delivery receipt/ref 与 one-unanswered state
- **EV-AGT-RUNTIME-06** — terminal/missing/duplicate rejection
- **EV-AGT-RUNTIME-07** — Task/Execution Public Contract integration trace

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-AGT-RUNTIME-01` | `Unit`<br>`Domain Behavior`<br>`Persistence` | `RF-AGT-RUNTIME-01` | `EV-AGT-RUNTIME-01` |
| `CP-AGT-RUNTIME-02` | `Domain Behavior`<br>`Persistence`<br>`Security / Boundary` | `RF-AGT-RUNTIME-02` | `EV-AGT-RUNTIME-02` |
| `CP-AGT-RUNTIME-03` | `Contract / Runtime Schema`<br>`Cross-Domain Integration`<br>`Security / Boundary` | `RF-AGT-RUNTIME-03` | `EV-AGT-RUNTIME-03` |
| `CP-AGT-RUNTIME-04` | `Domain Behavior`<br>`Cross-Domain Integration`<br>`Failure / Recovery`<br>`Concurrency / Idempotency` | `RF-AGT-RUNTIME-04` | `EV-AGT-RUNTIME-04`<br>`EV-AGT-RUNTIME-05` |
| `CP-AGT-RUNTIME-05` | `Domain Behavior`<br>`Cross-Domain Integration`<br>`Failure / Recovery` | `RF-AGT-RUNTIME-05` | `EV-AGT-RUNTIME-06` |
| `CP-AGT-RUNTIME-06` | `Contract / Runtime Schema`<br>`Cross-Domain Integration` | `RF-AGT-RUNTIME-06` | `EV-AGT-RUNTIME-07` |

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

当前必须控制的 Module 风险：**Agent Runtime 若复制 Task binding、身份校验宽松或 Collaboration 顺序错误，会产生跨角色错投与第二事实真源。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Agent Runtime 若复制 Task binding、身份校验宽松或 Collaboration 顺序错误，会产生跨角色错投与第二事实真源。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


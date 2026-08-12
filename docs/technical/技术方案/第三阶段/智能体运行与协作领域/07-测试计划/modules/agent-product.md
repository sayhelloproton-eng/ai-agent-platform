---
docId: TP-MODULE-AGENT-PRODUCT
title: agent-product｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
boundedContext: agent-runtime-collaboration
moduleRef: agent-product
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- AGENT-DOC-04-00
- AGENT-DOC-02-03
- AGENT-DOC-03-06
- AGENT-DOC-05-03
implementationWave: Wave 4
---

# `agent-product` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 4**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`AGENT-DOC-04-00`](../../04-模块/00-Agent-Package与Custom-GPT-Carrier规范.md)
- [`AGENT-DOC-02-03`](../../02-契约/03-角色Action静态权限矩阵.md)
- [`AGENT-DOC-03-06`](../../03-流程与数据/06-产品前置工作流与Carrier身份.md)
- [`AGENT-DOC-05-03`](../../05-质量与部署/03-实施顺序与落库门禁.md)

## 2. 风险定位

产品 Carrier 在 Task 创建前工作；若 Worker identity 或 Actions surface 不可靠，会从第一步污染 Task 参与者事实。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Static Package/Contract
- Role Behavior
- Real Custom GPT E2E
- Cross-domain Integration

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **NOT_APPLICABLE** | 该 Module 的冻结门以静态/角色/Conformance 行为为最小证明单元，没有独立 pure-unit Gate。 |
| Domain Behavior | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Contract / Runtime Schema | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Persistence | **NOT_APPLICABLE** | 该 Module 不拥有 persistence implementation；持久化正确性由对应 owner Module 的真实集成门证明。 |
| Generated Artifact / Package Conformance | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Module Integration | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立组件集成门；其行为由更贴近的 Contract/Role/Conformance 层证明。 |
| Cross-Domain Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Failure / Recovery | **NOT_APPLICABLE** | 该 Module 不拥有 durable/runtime recovery 语义；负向行为由其 Contract/Conformance 层覆盖。 |
| Security / Boundary | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Concurrency / Idempotency | **NOT_APPLICABLE** | 该 Module 不拥有共享可变状态、串行调度或幂等写入 Contract。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：真实 Custom GPT Web/Preview + Browser 获取 c-id + Gateway auth；不能只靠 package fixture。

**允许的隔离方式**：静态 package/OpenAPI 可自动化；pre-Task workerRef/c-id correctness 必须真实 Browser/Carrier。

## 5. Critical Proofs

- [ ] **CP-AGT-PROD-01** — package metadata/Instructions/Knowledge/carrier requirements 角色职责固定且不包含动态 Task 文档。
- [ ] **CP-AGT-PROD-02** — Actions OpenAPI 静态、版本化、仅暴露产品角色允许能力；不使用 dynamic schema/capability catalog。
- [ ] **CP-AGT-PROD-03** — pre-Task 产品 Conversation 的 workerRef/c-id 由真实 Browser reality 获取/核验；不可猜测、不可复用旧 Task worker。
- [ ] **CP-AGT-PROD-04** — createTask 传入 product role+worker 与 dev/test role requirements；产品 Worker 可以先于 Task 存在。
- [ ] **CP-AGT-PROD-05** — 真实 GPT behavior/Actions/auth E2E 证明 package→Web materialization 后行为与角色边界一致。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `AGT-PROD-001` | 冻结 package.json Agent metadata / Instructions / carrier requirements | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-PRODUCT` § `AGT-PROD-001` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT`<br>`AGENT-DOC-02-03` | `CP-AGT-PROD-01` | package.json Agent metadata / Instructions / carrier requirements | package metadata/Instructions/Knowledge/carrier requirements 角色职责固定且不包含动态 Task 文档。 |
| `AGT-PROD-002` | 生成静态 Actions OpenAPI 与创建/更新 Web 指引 | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-PRODUCT` § `AGT-PROD-002` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT`<br>`AGENT-DOC-02-03` | `CP-AGT-PROD-02` | 静态 Actions OpenAPI 与创建/更新 Web 指引 | Actions OpenAPI 静态、版本化、仅暴露产品角色允许能力；不使用 dynamic schema/capability catalog。 |
| `AGT-PROD-003` | 验证 pre-Task 产品 Worker → createTask identity 传递 | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-PRODUCT` § `AGT-PROD-003` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT`<br>`AGENT-DOC-02-03` | `CP-AGT-PROD-03`<br>`CP-AGT-PROD-04` | pre-Task 产品 Worker → createTask identity 传递 | pre-Task 产品 Conversation 的 workerRef/c-id 由真实 Browser reality 获取/核验；不可猜测、不可复用旧 Task worker。；createTask 传入 product role+worker 与 dev/test role requirements；产品 Worker 可以先于 Task 存在。 |
| `AGT-PROD-004` | 完成真实 GPT behavior/Actions/auth E2E | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-PRODUCT` § `AGT-PROD-004` | `AGENT-RUNTIME-COLLABORATION-TECH-AGENT-PRODUCT`<br>`AGENT-DOC-02-03` | `CP-AGT-PROD-05` | 真实 GPT behavior/Actions/auth E2E | 真实 GPT behavior/Actions/auth E2E 证明 package→Web materialization 后行为与角色边界一致。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-AGT-PROD-01** — package metadata/Instructions/Knowledge/carrier requirements 漂移或混入动态 Task docs
- [ ] **RF-AGT-PROD-02** — Actions OpenAPI 非静态/非版本化或暴露超出产品角色的能力
- [ ] **RF-AGT-PROD-03** — pre-Task workerRef/c-id 未由真实 Browser reality 获取、猜测/复用旧 Task worker
- [ ] **RF-AGT-PROD-04** — createTask 产品 role+worker/dev-test requirement identity 传递错误
- [ ] **RF-AGT-PROD-05** — 真实 GPT behavior/Actions/auth 与 package 角色边界不一致




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-AGT-PROD-01** — package metadata/Instructions/Knowledge/carrier requirement artifact/hash
- **EV-AGT-PROD-02** — 静态 Actions OpenAPI +角色 allowlist conformance
- **EV-AGT-PROD-03** — Browser observed product c-id/workerRef
- **EV-AGT-PROD-04** — createTask participant identity input/result
- **EV-AGT-PROD-05** — 真实 GPT behavior/Actions/auth result

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-AGT-PROD-01` | `Domain Behavior`<br>`Generated Artifact / Package Conformance`<br>`Security / Boundary` | `RF-AGT-PROD-01` | `EV-AGT-PROD-01` |
| `CP-AGT-PROD-02` | `Contract / Runtime Schema`<br>`Generated Artifact / Package Conformance`<br>`Security / Boundary` | `RF-AGT-PROD-02` | `EV-AGT-PROD-02` |
| `CP-AGT-PROD-03` | `Cross-Domain Integration`<br>`Real External E2E` | `RF-AGT-PROD-03` | `EV-AGT-PROD-03` |
| `CP-AGT-PROD-04` | `Contract / Runtime Schema`<br>`Cross-Domain Integration` | `RF-AGT-PROD-04` | `EV-AGT-PROD-04` |
| `CP-AGT-PROD-05` | `Real External E2E`<br>`Security / Boundary` | `RF-AGT-PROD-05` | `EV-AGT-PROD-05` |

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

当前必须控制的 Module 风险：**产品 Carrier 在 Task 创建前工作；若 Worker identity 或 Actions surface 不可靠，会从第一步污染 Task 参与者事实。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“产品 Carrier 在 Task 创建前工作；若 Worker identity 或 Actions surface 不可靠，会从第一步污染 Task 参与者事实。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


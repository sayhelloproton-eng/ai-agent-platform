---
docId: TP-MODULE-EXECUTION-BROWSER-EXTENSION
title: execution-browser-extension｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
boundedContext: execution
moduleRef: execution-browser-extension
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN
- EXECUTION-DOC-05-02
- AGENT-CROSS-DOMAIN-INTEGRATION-CHECKLIST
implementationWave: Wave 5
---

# `execution-browser-extension` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 5**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`](../../04-模块/execution-browser-extension/TECHNICAL-DESIGN.md)
- [`EXECUTION-DOC-05-02`](../../05-质量与部署/02-测试验收-E2E-故障注入.md)
- [`AGENT-CROSS-DOMAIN-INTEGRATION-CHECKLIST`](../../../智能体运行与协作领域/05-质量与部署/02-跨领域一致性验收清单.md)

## 2. 风险定位

Browser/Carrier 是最不确定的真实环境边界；stale ONLINE、身份漂移、permission、reload 或 uncertain submit 都可能触发重复操作。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Browser Protocol Integration
- Real Chrome+ChatGPT E2E
- Fault/Recovery
- Cross-domain Integration

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Domain Behavior | **NOT_APPLICABLE** | 该 Module 不拥有独立领域状态机/业务规则；不为模板完整性制造 Domain Behavior 层。 |
| Contract / Runtime Schema | **NOT_APPLICABLE** | 该 Module 不发布独立 Public Contract/runtime schema；只消费 owner Contract。 |
| Persistence | **NOT_APPLICABLE** | 该 Module 不拥有 persistence implementation；持久化正确性由对应 owner Module 的真实集成门证明。 |
| Generated Artifact / Package Conformance | **NOT_APPLICABLE** | 该 Module 不生成 template/package/skill artifact，不增加此类测试层。 |
| Module Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Cross-Domain Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Concurrency / Idempotency | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：E3/E4 必须真实 Chrome + ChatGPT Web；纯 mock 不能宣称 Browser PASS。

**允许的隔离方式**：协议 helper/unit 可 fake Chrome API；identity/page state/write/recovery/permission 的最终门必须真实环境。

## 5. Critical Proofs

- [ ] **CP-EXE-BR-01** — roleRef+workerRef 为稳定身份，tab/window/content instance 只作 transient locator；stale instance 不复活。
- [ ] **CP-EXE-BR-02** — CREATE/RESTORE/WAKE 精确区分；existing worker 优先 RESTORE，不 duplicate CREATE；c-id 只从真实 URL/page reality 取得。
- [ ] **CP-EXE-BR-03** — WAKE 只注入最小 identity/trigger，不传完整 Task docs；WAKE success 不等于 Node/Effect success。
- [ ] **CP-EXE-BR-04** — IDLE/BUSY/BLOCKED/UNKNOWN 与 Progress Gap/Runtime Stall 有可观测判据。
- [ ] **CP-EXE-BR-05** — Always Allow 未验证/失效时 permission fallback 可恢复；screenshot/Vision Evidence 可下钻；Side Panel 只读。
- [ ] **CP-EXE-BR-06** — Browser write 全局串行；Collaboration physical delivery 成功后才更新 logical delivery，不承诺端到端 exactly-once。
- [ ] **CP-EXE-BR-07** — reload/reconnect 执行 bounded Recovery Scan；effect_started 后先 reality verification，WAKE/submit 不盲重放。
- [ ] **CP-EXE-BR-08** — 真实 Chrome+ChatGPT E2E/fault injection 覆盖 reload/navigation/restart/connection loss/result lost。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `EXE-BR-001` | 实现 roleRef+workerRef binding 与 transient tab/window/content identity | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-001` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-01` | roleRef+workerRef binding 与 transient tab/window/content identity | roleRef+workerRef 为稳定身份，tab/window/content instance 只作 transient locator；stale instance 不复活。 |
| `EXE-BR-002` | 实现 CREATE/RESTORE/WAKE 精确语义与真实 c-id URL 解析 | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-002` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-02`<br>`CP-EXE-BR-03` | CREATE/RESTORE/WAKE 精确语义与真实 c-id URL 解析 | CREATE/RESTORE/WAKE 精确区分；existing worker 优先 RESTORE，不 duplicate CREATE；c-id 只从真实 URL/page reality 取得。；WAKE 只注入最小 identity/trigger，不传完整 Task docs；WAKE success 不等于 Node/Effect success。 |
| `EXE-BR-003` | 实现 page IDLE/BUSY/BLOCKED/UNKNOWN、Progress Gap/Runtime Stall | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-003` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-04` | page IDLE/BUSY/BLOCKED/UNKNOWN、Progress Gap/Runtime Stall | IDLE/BUSY/BLOCKED/UNKNOWN 与 Progress Gap/Runtime Stall 有可观测判据。 |
| `EXE-BR-004` | 实现 permission fallback、screenshot/vision evidence 与 Side Panel read-only observability | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-004` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-05` | permission fallback、screenshot/vision evidence 与 Side Panel read-only observability | Always Allow 未验证/失效时 permission fallback 可恢复；screenshot/Vision Evidence 可下钻；Side Panel 只读。 |
| `EXE-BR-005` | 实现 Browser write 全局串行与 physical Collaboration delivery | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-005` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-06` | Browser write 全局串行与 physical Collaboration delivery | Browser write 全局串行；Collaboration physical delivery 成功后才更新 logical delivery，不承诺端到端 exactly-once。 |
| `EXE-BR-006` | 实现 reload/reconnect Recovery Scan 与 effect_started reality reconciliation | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-006` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-07` | reload/reconnect Recovery Scan 与 effect_started reality reconciliation | reload/reconnect 执行 bounded Recovery Scan；effect_started 后先 reality verification，WAKE/submit 不盲重放。 |
| `EXE-BR-007` | 完成真实 Chrome + ChatGPT E2E / fault injection / no-blind-retry tests | `EXECUTION-TODO-EXECUTION-BROWSER-EXTENSION` § `EXE-BR-007` | `EXECUTION-EXECUTION-BROWSER-EXTENSION-TECH-DESIGN`<br>`EXECUTION-DOC-02-01`<br>`EXECUTION-DOC-02-02` | `CP-EXE-BR-07`<br>`CP-EXE-BR-08` | 真实 Chrome + ChatGPT E2E / fault injection / no-blind-retry tests | reload/reconnect 执行 bounded Recovery Scan；effect_started 后先 reality verification，WAKE/submit 不盲重放。；真实 Chrome+ChatGPT E2E/fault injection 覆盖 reload/navigation/restart/connection loss/result lost。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-EXE-BR-01** — 稳定 roleRef+workerRef 与 transient tab/window/content identity 混淆或 stale instance 复活
- [ ] **RF-EXE-BR-02** — CREATE/RESTORE/WAKE 混淆、duplicate create、c-id 非真实 URL/page reality
- [ ] **RF-EXE-BR-03** — WAKE 传完整 Task docs 或把 WAKE success 误当 Node/Effect success
- [ ] **RF-EXE-BR-04** — IDLE/BUSY/BLOCKED/UNKNOWN 与 Progress Gap/Runtime Stall 不可观测
- [ ] **RF-EXE-BR-05** — permission fallback/screenshot/Vision/Side Panel 边界失败
- [ ] **RF-EXE-BR-06** — Browser write 非全局串行或 physical delivery 未成功就更新 logical delivery
- [ ] **RF-EXE-BR-07** — reload/reconnect Recovery Scan 盲重放 effect_started WAKE/submit
- [ ] **RF-EXE-BR-08** — 真实 Chrome/ChatGPT reload/navigation/restart/connection/result-lost 故障回归失败




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-EXE-BR-01** — roleRef/workerRef 与真实 URL/c-id observation
- **EV-EXE-BR-02** — transient tab/window/content instance identity
- **EV-EXE-BR-03** — page IDLE/BUSY/BLOCKED/UNKNOWN / Progress Gap observation
- **EV-EXE-BR-04** — permission fallback + screenshot/Vision evidence
- **EV-EXE-BR-05** — Browser write/physical delivery observation
- **EV-EXE-BR-06** — bounded Recovery Scan trace
- **EV-EXE-BR-07** — effect_started reality verification result
- **EV-EXE-BR-08** — 真实 Chrome+ChatGPT reload/navigation/restart/connection/result-lost E2E evidence
- **EV-EXE-BR-09** — WAKE injected identity/trigger payload 与 Node/Effect completion 分离 trace

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-EXE-BR-01` | `Unit`<br>`Module Integration`<br>`Security / Boundary` | `RF-EXE-BR-01` | `EV-EXE-BR-01`<br>`EV-EXE-BR-02` |
| `CP-EXE-BR-02` | `Module Integration`<br>`Cross-Domain Integration`<br>`Real External E2E` | `RF-EXE-BR-02` | `EV-EXE-BR-01`<br>`EV-EXE-BR-02` |
| `CP-EXE-BR-03` | `Module Integration`<br>`Cross-Domain Integration` | `RF-EXE-BR-03` | `EV-EXE-BR-09` |
| `CP-EXE-BR-04` | `Module Integration`<br>`Real External E2E` | `RF-EXE-BR-04` | `EV-EXE-BR-03` |
| `CP-EXE-BR-05` | `Real External E2E`<br>`Failure / Recovery`<br>`Security / Boundary` | `RF-EXE-BR-05` | `EV-EXE-BR-04` |
| `CP-EXE-BR-06` | `Cross-Domain Integration`<br>`Real External E2E`<br>`Concurrency / Idempotency` | `RF-EXE-BR-06` | `EV-EXE-BR-05` |
| `CP-EXE-BR-07` | `Real External E2E`<br>`Failure / Recovery` | `RF-EXE-BR-07` | `EV-EXE-BR-06`<br>`EV-EXE-BR-07` |
| `CP-EXE-BR-08` | `Real External E2E`<br>`Failure / Recovery` | `RF-EXE-BR-08` | `EV-EXE-BR-08` |

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

当前必须控制的 Module 风险：**Browser/Carrier 是最不确定的真实环境边界；stale ONLINE、身份漂移、permission、reload 或 uncertain submit 都可能触发重复操作。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Browser/Carrier 是最不确定的真实环境边界；stale ONLINE、身份漂移、permission、reload 或 uncertain submit 都可能触发重复操作。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


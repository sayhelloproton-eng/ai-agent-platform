---
docId: TP-MODULE-PLATFORM-HOST
title: platform-host｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: platform
subdomain: null
subdomains: []
boundedContext: null
moduleRef: platform-host
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- PLATFORM-HOST-TECH-DESIGN
- PLATFORM-HOST-SERVICE-RUNTIME
- PLATFORM-HOST-COMPOSITION-ROOT
- PLATFORM-DOC-03-02
implementationWave: Wave 6
---

# `platform-host` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 6**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`PLATFORM-HOST-TECH-DESIGN`](../../05-平台模块/platform-host/TECHNICAL-DESIGN.md)
- [`PLATFORM-HOST-SERVICE-RUNTIME`](../../05-平台模块/platform-host/SERVICE-RUNTIME.md)
- [`PLATFORM-HOST-COMPOSITION-ROOT`](../../01-架构/02-platform-host-Composition-Root.md)
- [`PLATFORM-DOC-03-02`](../../03-工程/02-测试与验收约定.md)

## 2. 风险定位

Composition Root 若吸收业务逻辑、持久化事实或反转依赖，会把五领域重新耦合成“大核心”。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Composition Integration
- Startup/Shutdown
- Health/Failure Isolation
- Restart Integration

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
| Process Lifecycle | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立 trust/effect boundary；不从通用 checklist 新增安全产品需求。 |
| Concurrency / Idempotency | **NOT_APPLICABLE** | 该 Module 不拥有共享可变状态、串行调度或幂等写入 Contract。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：使用真实 package composition 与本地 transport；Execution/Model 可用 public client fake 做 fault injection，最终再接真实 service。

**允许的隔离方式**：允许 fake public clients 注入 unavailable/restart；不得 fake package dependency direction 或 host-owned persistence 检查。

## 5. Critical Proofs

- [ ] **CP-HOST-01** — `@ai-agent-platform/platform-host` 只装配已经独立存在的 Task/Agent packages 与 Execution/Model public clients。
- [ ] **CP-HOST-02** — 任何 Domain package 不反向依赖 platform-host；host 不持久化业务事实、不镜像业务 state。
- [ ] **CP-HOST-03** — local transport、startup/shutdown、drain 与依赖初始化顺序可重复。
- [ ] **CP-HOST-04** — health aggregation 只返回 typed dependency/readiness，不把某 Domain unavailable 改写为业务状态。
- [ ] **CP-HOST-05** — restart 后 owner Module 各自执行恢复，host 不强行清理 durable state。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `HOST-001` | 建立独立 `@ai-agent-platform/platform-host` package 与 composition root。 | `PLATFORM-HOST-TODO` § `HOST-001` | `PLATFORM-HOST-TECH-DESIGN`<br>`PLATFORM-HOST-COMPOSITION-ROOT` | `CP-HOST-01`<br>`CP-HOST-02` | 独立 `@ai-agent-platform/platform-host` package 与 composition root | `@ai-agent-platform/platform-host` 只装配已经独立存在的 Task/Agent packages 与 Execution/Model public clients。；任何 Domain package 不反向依赖 platform-host；host 不持久化业务事实、不镜像业务 state。 |
| `HOST-002` | 装配 Task/Agent in-process packages 与 Execution/Model public clients。 | `PLATFORM-HOST-TODO` § `HOST-002` | `PLATFORM-HOST-TECH-DESIGN`<br>`PLATFORM-HOST-COMPOSITION-ROOT` | `CP-HOST-01`<br>`CP-HOST-02` | 装配 Task/Agent in-process packages 与 Execution/Model public clients | `@ai-agent-platform/platform-host` 只装配已经独立存在的 Task/Agent packages 与 Execution/Model public clients。；任何 Domain package 不反向依赖 platform-host；host 不持久化业务事实、不镜像业务 state。 |
| `HOST-003` | 实现 local transport、startup/shutdown、health aggregation。 | `PLATFORM-HOST-TODO` § `HOST-003` | `PLATFORM-HOST-TECH-DESIGN`<br>`PLATFORM-HOST-COMPOSITION-ROOT` | `CP-HOST-03`<br>`CP-HOST-04` | local transport、startup/shutdown、health aggregation | local transport、startup/shutdown、drain 与依赖初始化顺序可重复。；health aggregation 只返回 typed dependency/readiness，不把某 Domain unavailable 改写为业务状态。 |
| `HOST-004` | 完成 composition/dependency direction/restart integration tests。 | `PLATFORM-HOST-TODO` § `HOST-004` | `PLATFORM-HOST-TECH-DESIGN`<br>`PLATFORM-HOST-COMPOSITION-ROOT` | `CP-HOST-01`<br>`CP-HOST-02`<br>`CP-HOST-03`<br>`CP-HOST-04`<br>`CP-HOST-05` | composition/dependency direction/restart integration tests | `@ai-agent-platform/platform-host` 只装配已经独立存在的 Task/Agent packages 与 Execution/Model public clients。；任何 Domain package 不反向依赖 platform-host；host 不持久化业务事实、不镜像业务 state。；local transport、startup/shutdown、drain 与依赖初始化顺序可重复。；health aggregation 只返回 typed dependency/readiness，不把某 Domain unavailable 改写为业务状态。；restart 后 owner Module 各自执行恢复，host 不强行清理 durable state。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-HOST-01** — Composition Root 吸收业务逻辑/持久化事实或 Domain package 反向依赖 host
- [ ] **RF-HOST-02** — local transport/startup/shutdown/drain/依赖初始化顺序不可重复
- [ ] **RF-HOST-03** — health aggregation 把 dependency unavailable 改写为业务状态或 fake READY
- [ ] **RF-HOST-04** — restart 后 host 越权清理/恢复 owner durable state




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-HOST-01** — package/composition dependency graph
- **EV-HOST-02** — DI wiring / public client binding observation
- **EV-HOST-03** — local transport request-response
- **EV-HOST-04** — startup/shutdown/drain order log
- **EV-HOST-05** — typed dependency/readiness health aggregation
- **EV-HOST-06** — restart integration 前后 owner state observation
- **EV-HOST-07** — host 无业务 persistence 的 filesystem/store inspection

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-HOST-01` | `Module Integration`<br>`Cross-Domain Integration` | `RF-HOST-01` | `EV-HOST-01`<br>`EV-HOST-02` |
| `CP-HOST-02` | `Module Integration`<br>`Cross-Domain Integration` | `RF-HOST-01` | `EV-HOST-01`<br>`EV-HOST-07` |
| `CP-HOST-03` | `Process Lifecycle`<br>`Module Integration` | `RF-HOST-02` | `EV-HOST-03`<br>`EV-HOST-04` |
| `CP-HOST-04` | `Module Integration`<br>`Cross-Domain Integration`<br>`Failure / Recovery` | `RF-HOST-03` | `EV-HOST-05` |
| `CP-HOST-05` | `Process Lifecycle`<br>`Cross-Domain Integration`<br>`Failure / Recovery` | `RF-HOST-04` | `EV-HOST-06` |

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

当前必须控制的 Module 风险：**Composition Root 若吸收业务逻辑、持久化事实或反转依赖，会把五领域重新耦合成“大核心”。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Composition Root 若吸收业务逻辑、持久化事实或反转依赖，会把五领域重新耦合成“大核心”。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


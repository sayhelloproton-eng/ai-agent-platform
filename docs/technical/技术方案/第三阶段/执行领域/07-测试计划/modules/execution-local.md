---
docId: TP-MODULE-EXECUTION-LOCAL
title: execution-local｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
boundedContext: execution
moduleRef: execution-local
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
- EXECUTION-DOC-05-02
implementationWave: Wave 3
---

# `execution-local` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 3**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`](../../04-模块/execution-local/TECHNICAL-DESIGN.md)
- [`EXECUTION-DOC-02-01`](../../02-契约/01-Public-Contract与TypeScript类型规范.md)
- [`EXECUTION-DOC-05-02`](../../05-质量与部署/02-测试验收-E2E-故障注入.md)

## 2. 风险定位

Local executor 直接接触真实文件/Git/process/network；路径、secret、重试或 shell 边界错误会造成不可逆本机副作用。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Contract
- Real Local Integration
- Security Boundary
- Fault/Recovery

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
| Real Local Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Concurrency / Idempotency | **NOT_APPLICABLE** | 该 Module 不拥有共享可变状态、串行调度或幂等写入 Contract。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：E2 必须在真实临时 Git 项目运行，关键 fs/git/process/network 行为不得全 Mock。

**允许的隔离方式**：Unit 可 fake filesystem helper；最终 Local Gate 必须真实临时目录/进程/endpoint。

## 5. Critical Proofs

- [ ] **CP-EXE-LOCAL-01** — canonical projectRoot、`..`、absolute/symlink escape 与 `.ai-agent-platform` protected rules fail-closed。
- [ ] **CP-EXE-LOCAL-02** — fs/git/code/package/dependency/build-test 能力使用 typed request/result，不退化为任意 shell。
- [ ] **CP-EXE-LOCAL-03** — one-shot 与 managed process 区分生命周期；stdout/stderr 大输出通过 bounded artifact/ref；timeout/cancel 清理 process tree。
- [ ] **CP-EXE-LOCAL-04** — network 仅 localhost/LAN/exact URL/authenticated engineering HTTP/probe，不扩展为通用 public research。
- [ ] **CP-EXE-LOCAL-05** — shell 只作为 escape hatch，hard policy/approval 先于真实执行；sudo/system destructive case DENY。
- [ ] **CP-EXE-LOCAL-06** — secret redaction 与 env 最小继承可证明；write/commit response interruption 可通过 hash/HEAD reality recover。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `EXE-LOCAL-001` | 实现 projectRoot canonical boundary 与 .ai-agent-platform protected rules | `EXECUTION-TODO-EXECUTION-LOCAL` § `EXE-LOCAL-001` | `EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`<br>`EXECUTION-DOC-02-01` | `CP-EXE-LOCAL-01` | projectRoot canonical boundary 与 .ai-agent-platform protected rules | canonical projectRoot、`..`、absolute/symlink escape 与 `.ai-agent-platform` protected rules fail-closed。 |
| `EXE-LOCAL-002` | 实现 typed fs/git/code/package/dependency/build-test capabilities | `EXECUTION-TODO-EXECUTION-LOCAL` § `EXE-LOCAL-002` | `EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`<br>`EXECUTION-DOC-02-01` | `CP-EXE-LOCAL-02` | typed fs/git/code/package/dependency/build-test capabilities | fs/git/code/package/dependency/build-test 能力使用 typed request/result，不退化为任意 shell。 |
| `EXE-LOCAL-003` | 实现 process one-shot/managed-process 与 stdout/stderr artifact capture | `EXECUTION-TODO-EXECUTION-LOCAL` § `EXE-LOCAL-003` | `EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`<br>`EXECUTION-DOC-02-01` | `CP-EXE-LOCAL-03` | process one-shot/managed-process 与 stdout/stderr artifact capture | one-shot 与 managed process 区分生命周期；stdout/stderr 大输出通过 bounded artifact/ref；timeout/cancel 清理 process tree。 |
| `EXE-LOCAL-004` | 实现 deterministic network：localhost/LAN/exact URL/authenticated HTTP/probe | `EXECUTION-TODO-EXECUTION-LOCAL` § `EXE-LOCAL-004` | `EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`<br>`EXECUTION-DOC-02-01` | `CP-EXE-LOCAL-04` | deterministic network：localhost/LAN/exact URL/authenticated HTTP/probe | network 仅 localhost/LAN/exact URL/authenticated engineering HTTP/probe，不扩展为通用 public research。 |
| `EXE-LOCAL-005` | 实现 shell escape hatch 的 FAST/policy/approval guard | `EXECUTION-TODO-EXECUTION-LOCAL` § `EXE-LOCAL-005` | `EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`<br>`EXECUTION-DOC-02-01` | `CP-EXE-LOCAL-05` | shell escape hatch 的 FAST/policy/approval guard | shell 只作为 escape hatch，hard policy/approval 先于真实执行；sudo/system destructive case DENY。 |
| `EXE-LOCAL-006` | 完成 symlink/path traversal/secret redaction/security tests | `EXECUTION-TODO-EXECUTION-LOCAL` § `EXE-LOCAL-006` | `EXECUTION-EXECUTION-LOCAL-TECH-DESIGN`<br>`EXECUTION-DOC-02-01` | `CP-EXE-LOCAL-01`<br>`CP-EXE-LOCAL-06` | symlink/path traversal/secret redaction/security tests | canonical projectRoot、`..`、absolute/symlink escape 与 `.ai-agent-platform` protected rules fail-closed。；secret redaction 与 env 最小继承可证明；write/commit response interruption 可通过 hash/HEAD reality recover。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-EXE-LOCAL-01** — projectRoot/../absolute/symlink/protected path 越界
- [ ] **RF-EXE-LOCAL-02** — typed fs/git/code/package/build-test 退化为任意 shell
- [ ] **RF-EXE-LOCAL-03** — process timeout/cancel 未清理 process tree 或 stdout/stderr 失控
- [ ] **RF-EXE-LOCAL-04** — network 越出 localhost/LAN/exact/authenticated engineering boundary
- [ ] **RF-EXE-LOCAL-05** — shell escape hatch 绕过 hard policy/approval 或允许 sudo/system destructive
- [ ] **RF-EXE-LOCAL-06** — secret/env 泄漏，或 write/commit 响应中断后未按 hash/HEAD reality recover




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-EXE-LOCAL-01** — 真实临时 projectRoot 文件/hash/目录状态
- **EV-EXE-LOCAL-02** — Git HEAD/diff/status evidence
- **EV-EXE-LOCAL-03** — process exit/stdout/stderr bounded artifact
- **EV-EXE-LOCAL-04** — network exact target/probe observation
- **EV-EXE-LOCAL-05** — policy/approval/DENY result
- **EV-EXE-LOCAL-06** — path/symlink/protected-path rejection
- **EV-EXE-LOCAL-07** — redacted log/env observation
- **EV-EXE-LOCAL-08** — response interruption 后 hash/HEAD reality check
- **EV-EXE-LOCAL-09** — typed capability request/result runtime-schema observation

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-EXE-LOCAL-01` | `Real Local Integration`<br>`Security / Boundary` | `RF-EXE-LOCAL-01` | `EV-EXE-LOCAL-01`<br>`EV-EXE-LOCAL-06` |
| `CP-EXE-LOCAL-02` | `Unit`<br>`Contract / Runtime Schema`<br>`Real Local Integration` | `RF-EXE-LOCAL-02` | `EV-EXE-LOCAL-02`<br>`EV-EXE-LOCAL-09` |
| `CP-EXE-LOCAL-03` | `Real Local Integration`<br>`Failure / Recovery` | `RF-EXE-LOCAL-03` | `EV-EXE-LOCAL-03` |
| `CP-EXE-LOCAL-04` | `Real Local Integration`<br>`Security / Boundary` | `RF-EXE-LOCAL-04` | `EV-EXE-LOCAL-04` |
| `CP-EXE-LOCAL-05` | `Real Local Integration`<br>`Security / Boundary` | `RF-EXE-LOCAL-05` | `EV-EXE-LOCAL-05` |
| `CP-EXE-LOCAL-06` | `Real Local Integration`<br>`Failure / Recovery`<br>`Security / Boundary` | `RF-EXE-LOCAL-06` | `EV-EXE-LOCAL-07`<br>`EV-EXE-LOCAL-08` |

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

当前必须控制的 Module 风险：**Local executor 直接接触真实文件/Git/process/network；路径、secret、重试或 shell 边界错误会造成不可逆本机副作用。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Local executor 直接接触真实文件/Git/process/network；路径、secret、重试或 shell 边界错误会造成不可逆本机副作用。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


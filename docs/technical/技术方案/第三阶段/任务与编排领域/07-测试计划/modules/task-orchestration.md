---
docId: TP-MODULE-TASK-ORCHESTRATION
title: task-orchestration｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: task-orchestration
subdomain: null
subdomains: []
boundedContext: task-orchestration
moduleRef: task-orchestration
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION
- TASK-DOC-02-01
- TASK-DOC-02-02
- TASK-DOC-05-02
implementationWave: Wave 1
---

# `task-orchestration` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 1**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`](../../04-模块/task-orchestration/TECHNICAL-DESIGN.md)
- [`TASK-DOC-02-01`](../../02-契约/01-Public-API-契约.md)
- [`TASK-DOC-02-02`](../../02-契约/02-API-依赖-模块清单.md)
- [`TASK-DOC-05-02`](../../05-质量与部署/02-实施顺序与验收门禁.md)

## 2. 风险定位

Task 是长期工作事实与状态推进 Owner；错误 transition、binding、reopen、文档约束会污染整个跨域主链。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Domain Behavior
- Contract
- Document/Git Integration
- Cross-domain Integration

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Domain Behavior | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Contract / Runtime Schema | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Persistence | **REQUIRED** | TaskDocumentService owns Markdown/Git document persistence semantics, safe write/hash/index reconciliation; SQLite storage implementation remains task-store-sqlite-owned. |
| Generated Artifact / Package Conformance | **NOT_APPLICABLE** | 该 Module 不生成 template/package/skill artifact，不增加此类测试层。 |
| Module Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Cross-Domain Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **REQUIRED** | Frozen TaskDocument design requires real filesystem/Git workspace behavior: safe relative path, Markdown write/read, hash/index reconciliation and Git-tracked reality. |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **REQUIRED** | Frozen TaskDocument Public Contract rejects arbitrary absolute/../ target paths and requires owner-controlled safe relative-path mapping inside the workspace. |
| Concurrency / Idempotency | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：Domain/Contract 以真实 in-memory/store adapter；关键状态、文档和跨域合同后续使用真实 SQLite/Git 与 provider contract。

**允许的隔离方式**：可以 fake Agent/Execution public adapter；不能通过 Mock 绕过 Task 自身状态机、idempotency、version、TaskRoleBinding 与文档规则。

## 5. Critical Proofs

- [ ] **CP-TASK-ORCH-01** — Task/TaskGroup/Node 的所有冻结合法 transition 成功，非法 transition zero side effect。
- [ ] **CP-TASK-ORCH-02** — Node 是唯一调度单元；不出现 WorkItem/Claim/Lease/parallel Node 的替代路径。
- [ ] **CP-TASK-ORCH-03** — TaskRoleBinding one-time + idempotent：同值重放安全，不同值覆盖冲突；`startNode` 只能自动解析 binding.workerRef。
- [ ] **CP-TASK-ORCH-04** — actorRef/idempotencyKey/expectedVersion 共同约束 Command；stale version、duplicate、same-key-different-fingerprint 均有明确结果。
- [ ] **CP-TASK-ORCH-05** — `reopenNode` 保留旧 execution history、runNo 递增、后续 Node 受控重置，Task currentNodeId 回到目标 Node。
- [ ] **CP-TASK-ORCH-06** — TaskDocument 只返回 Node 声明 input；缺 required output 不允许 complete；正文 Git 真源与 SQLite metadata/hash 可 reconciliation。
- [ ] **CP-TASK-ORCH-07** — TaskGroup `maxActiveTasks=1` 与 WAITING/FAILED/PAUSED blocking 规则可执行。
- [ ] **CP-TASK-ORCH-08** — TaskDocument API 只接受 canonical documentType+content；任意 absolute/`../` target path 被拒绝，实际路径由 owner 映射为 workspace 内安全相对路径并采用安全文件写。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `TASK-ORCH-001` | 冻结并实现 Public Contract / runtime schema / unified error envelope | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-001` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-01`<br>`CP-TASK-ORCH-03`<br>`CP-TASK-ORCH-04`<br>`CP-TASK-ORCH-06` | Public Contract / runtime schema / unified error envelope | Task/TaskGroup/Node 的所有冻结合法 transition 成功，非法 transition zero side effect。；TaskRoleBinding one-time + idempotent：同值重放安全，不同值覆盖冲突；`startNode` 只能自动解析 binding.workerRef。；actorRef/idempotencyKey/expectedVersion 共同约束 Command；stale version、duplicate、same-key-different-fingerprint 均有明确结果。；TaskDocument 只返回 Node 声明 input；缺 required output 不允许 complete；正文 Git 真源与 SQLite metadata/hash 可 reconciliation。 |
| `TASK-ORCH-002` | 实现 Task/Plan/Node 状态机与合法 transition guard | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-002` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-01`<br>`CP-TASK-ORCH-02`<br>`CP-TASK-ORCH-07` | Task/Plan/Node 状态机与合法 transition guard | Task/TaskGroup/Node 的所有冻结合法 transition 成功，非法 transition zero side effect。；Node 是唯一调度单元；不出现 WorkItem/Claim/Lease/parallel Node 的替代路径。；TaskGroup `maxActiveTasks=1` 与 WAITING/FAILED/PAUSED blocking 规则可执行。 |
| `TASK-ORCH-003` | 实现 TaskRoleBinding one-time/idempotent 绑定与 startNode 自动 Worker 解析 | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-003` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-03` | TaskRoleBinding one-time/idempotent 绑定与 startNode 自动 Worker 解析 | TaskRoleBinding one-time + idempotent：同值重放安全，不同值覆盖冲突；`startNode` 只能自动解析 binding.workerRef。 |
| `TASK-ORCH-004` | 实现 TaskDocument metadata/Git path contract 与 required input/output 校验 | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-004` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-06`<br>`CP-TASK-ORCH-08` | TaskDocument metadata/Git path contract 与 required input/output 校验 | TaskDocument 只返回 Node 声明 input；缺 required output 不允许 complete；正文 Git 真源与 SQLite metadata/hash 可 reconciliation。；TaskDocument API 只接受 canonical documentType+content；任意 absolute/`../` target path 被拒绝，实际路径由 owner 映射为 workspace 内安全相对路径并采用安全文件写。 |
| `TASK-ORCH-005` | 实现 reopenNode/runNo/history preserved 语义 | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-005` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-05` | reopenNode/runNo/history preserved 语义 | `reopenNode` 保留旧 execution history、runNo 递增、后续 Node 受控重置，Task currentNodeId 回到目标 Node。 |
| `TASK-ORCH-006` | 实现 actorRef/idempotencyKey/expectedVersion 的 Command 边界 | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-006` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-04` | actorRef/idempotencyKey/expectedVersion 的 Command 边界 | actorRef/idempotencyKey/expectedVersion 共同约束 Command；stale version、duplicate、same-key-different-fingerprint 均有明确结果。 |
| `TASK-ORCH-007` | 完成 Task↔Agent/Execution cross-domain contract tests 与主链 E2E | `TASK-ORCHESTRATION-TODO-TASK-ORCHESTRATION` § `TASK-ORCH-007` | `TASK-ORCHESTRATION-TECH-TASK-ORCHESTRATION`<br>`TASK-DOC-02-01`<br>`TASK-DOC-02-02` | `CP-TASK-ORCH-01`<br>`CP-TASK-ORCH-03`<br>`CP-TASK-ORCH-04`<br>`CP-TASK-ORCH-05`<br>`CP-TASK-ORCH-06`<br>`CP-TASK-ORCH-07` | Task↔Agent/Execution cross-domain contract tests 与主链 E2E | Task/TaskGroup/Node 的所有冻结合法 transition 成功，非法 transition zero side effect。；TaskRoleBinding one-time + idempotent：同值重放安全，不同值覆盖冲突；`startNode` 只能自动解析 binding.workerRef。；actorRef/idempotencyKey/expectedVersion 共同约束 Command；stale version、duplicate、same-key-different-fingerprint 均有明确结果。；`reopenNode` 保留旧 execution history、runNo 递增、后续 Node 受控重置，Task currentNodeId 回到目标 Node。；TaskDocument 只返回 Node 声明 input；缺 required output 不允许 complete；正文 Git 真源与 SQLite metadata/hash 可 reconciliation。；TaskGroup `maxActiveTasks=1` 与 WAITING/FAILED/PAUSED blocking 规则可执行。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-TASK-ORCH-01** — 非法 Task/TaskGroup/Node transition 产生副作用
- [ ] **RF-TASK-ORCH-02** — TaskRoleBinding 同值/异值重放与 startNode worker 解析错误
- [ ] **RF-TASK-ORCH-03** — stale expectedVersion、duplicate idempotencyKey、same-key-different-fingerprint 处理错误
- [ ] **RF-TASK-ORCH-04** — TaskDocument required input/output 或 Git/metadata/hash reconciliation 错误
- [ ] **RF-TASK-ORCH-05** — reopen 覆盖旧 history、runNo/currentNodeId/后续 Node 重置错误
- [ ] **RF-TASK-ORCH-06** — TaskGroup maxActiveTasks/WAITING/FAILED/PAUSED blocking 失效
- [ ] **RF-TASK-ORCH-07** — Node 唯一调度单元被 WorkItem/Claim/Lease/parallel Node 等替代路径绕过
- [ ] **RF-TASK-ORCH-08** — TaskDocument 接受 arbitrary absolute/../ target path，或 safe relative-path mapping 被绕过



## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-TASK-ORCH-01** — Command result / unified error envelope
- **EV-TASK-ORCH-02** — Task/TaskGroup/Node before-after state
- **EV-TASK-ORCH-03** — TaskRoleBinding 与 resolved workerRef
- **EV-TASK-ORCH-04** — idempotency/version conflict result
- **EV-TASK-ORCH-05** — TaskDocument path/hash/Git reality
- **EV-TASK-ORCH-06** — node_execution_history/runNo/currentNodeId
- **EV-TASK-ORCH-07** — Task↔Agent/Execution contract trace
- **EV-TASK-ORCH-08** — public/runtime model inspection：无 WorkItem/Claim/Lease/parallel Node 替代调度路径
- **EV-TASK-ORCH-09** — TaskDocument arbitrary absolute/../ target-path rejection + owner-controlled safe relative-path/atomic-write observation

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-TASK-ORCH-01` | `Unit`<br>`Domain Behavior` | `RF-TASK-ORCH-01` | `EV-TASK-ORCH-01`<br>`EV-TASK-ORCH-02` |
| `CP-TASK-ORCH-02` | `Domain Behavior`<br>`Contract / Runtime Schema` | `RF-TASK-ORCH-07` | `EV-TASK-ORCH-08` |
| `CP-TASK-ORCH-03` | `Domain Behavior`<br>`Module Integration`<br>`Concurrency / Idempotency` | `RF-TASK-ORCH-02` | `EV-TASK-ORCH-03`<br>`EV-TASK-ORCH-07` |
| `CP-TASK-ORCH-04` | `Contract / Runtime Schema`<br>`Concurrency / Idempotency` | `RF-TASK-ORCH-03` | `EV-TASK-ORCH-01`<br>`EV-TASK-ORCH-04` |
| `CP-TASK-ORCH-05` | `Domain Behavior`<br>`Module Integration`<br>`Failure / Recovery` | `RF-TASK-ORCH-05` | `EV-TASK-ORCH-06` |
| `CP-TASK-ORCH-06` | `Persistence`<br>`Real Local Integration`<br>`Module Integration`<br>`Failure / Recovery` | `RF-TASK-ORCH-04` | `EV-TASK-ORCH-05`<br>`EV-TASK-ORCH-07` |
| `CP-TASK-ORCH-07` | `Unit`<br>`Domain Behavior` | `RF-TASK-ORCH-06` | `EV-TASK-ORCH-02` |
| `CP-TASK-ORCH-08` | `Persistence`<br>`Real Local Integration`<br>`Security / Boundary` | `RF-TASK-ORCH-08` | `EV-TASK-ORCH-05`<br>`EV-TASK-ORCH-09` |

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

当前必须控制的 Module 风险：**Task 是长期工作事实与状态推进 Owner；错误 transition、binding、reopen、文档约束会污染整个跨域主链。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Task 是长期工作事实与状态推进 Owner；错误 transition、binding、reopen、文档约束会污染整个跨域主链。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


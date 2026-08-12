---
docId: TP-MODULE-TASK-STORE-SQLITE
title: task-store-sqlite｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: task-orchestration
subdomain: null
subdomains: []
boundedContext: task-orchestration
moduleRef: task-store-sqlite
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE
- TASK-DOC-03-03
- TASK-DOC-03-02
- TASK-DOC-05-02
implementationWave: Wave 1
---

# `task-store-sqlite` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 1**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE`](../../04-模块/task-store-sqlite/TECHNICAL-DESIGN.md)
- [`TASK-DOC-03-03`](../../03-流程与数据/03-数据模型与SQLite-DDL.md)
- [`TASK-DOC-03-02`](../../03-流程与数据/02-事务-版本-幂等与恢复.md)
- [`TASK-DOC-05-02`](../../05-质量与部署/02-实施顺序与验收门禁.md)

## 2. 风险定位

Store 若泄漏业务语义、事务不完整或并发约束失效，会造成 Task/Node 双写、历史覆盖和幂等失效。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Persistence Real Integration
- Crash/Recovery
- Module Integration

### 3.1 Test Layer Applicability Matrix

> `REQUIRED` 表示开发前计划必须覆盖；不表示必须在当前 Wave 立即执行真实环境测试。真实执行时机仍由实施 Wave/Gate 控制。`NOT_APPLICABLE` 只表示 Frozen SDD 未给本 Module 该层责任，禁止为了模板完整强行新增测试。

| Layer | Applicability | Basis |
|---|---|---|
| Unit | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Domain Behavior | **NOT_APPLICABLE** | 该 Module 不拥有独立领域状态机/业务规则；不为模板完整性制造 Domain Behavior 层。 |
| Contract / Runtime Schema | **NOT_APPLICABLE** | 该 Module 不发布独立 Public Contract/runtime schema；只消费 owner Contract。 |
| Persistence | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Generated Artifact / Package Conformance | **NOT_APPLICABLE** | 该 Module 不生成 template/package/skill artifact，不增加此类测试层。 |
| Module Integration | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Cross-Domain Integration | **NOT_APPLICABLE** | 该 Module 的本地正确性不要求直接跨域；跨域主链由相关 owner 与 Wave 7 验证。 |
| Process Lifecycle | **NOT_APPLICABLE** | 该 Module 不是独立长期运行 Process/Service lifecycle owner。 |
| Real Local Integration | **NOT_APPLICABLE** | 该 Module 不直接接触真实 fs/git/process/network 本地 Effect。 |
| Real External E2E | **NOT_APPLICABLE** | 该 Module correctness 不直接依赖真实外部资源；外部链由拥有 External Boundary 的 Module 验证。 |
| Failure / Recovery | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Security / Boundary | **NOT_APPLICABLE** | 冻结 SDD 未定义该 Module 独立 trust/effect boundary；不从通用 checklist 新增安全产品需求。 |
| Concurrency / Idempotency | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：必须使用真实临时 SQLite；关键事务/WAL/crash/reopen 不允许 Mock DB。

**允许的隔离方式**：Repository consumer 可用真实临时 DB；只允许在上层 Domain unit test 中 fake Repository port。

## 5. Critical Proofs

- [ ] **CP-TASK-STORE-01** — 冻结 schema（含 task_role_bindings）可从 fresh DB 建立，字段/constraint/index 与正式 DDL 一致。
- [ ] **CP-TASK-STORE-02** — 关联写在 transaction 中原子提交/回滚；optimistic version conflict 不产生部分写。
- [ ] **CP-TASK-STORE-03** — Repository port 不把 SQL/SQLite row/connection 泄漏到业务层。
- [ ] **CP-TASK-STORE-04** — WAL、busy timeout、crash/reopen 后 integrity 与约束仍成立。
- [ ] **CP-TASK-STORE-05** — idempotency fingerprint same/same 重放、same/different 冲突与并发重复写不会产生双业务事实。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `TASK-STORE-001` | 建立 task_groups/tasks/nodes/node_execution_history/task_documents/task_messages/task_events/idempotency_records/schema_migrations schema | `TASK-ORCHESTRATION-TODO-TASK-STORE-SQLITE` § `TASK-STORE-001` | `TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE`<br>`TASK-DOC-03-03`<br>`TASK-DOC-03-02` | `CP-TASK-STORE-01` | task_groups/tasks/nodes/node_execution_history/task_documents/task_messages/task_events/idempotency_records/schema_migrations schema | 冻结 schema（含 task_role_bindings）可从 fresh DB 建立，字段/constraint/index 与正式 DDL 一致。 |
| `TASK-STORE-002` | 实现 transaction + optimistic version + constraint/index | `TASK-ORCHESTRATION-TODO-TASK-STORE-SQLITE` § `TASK-STORE-002` | `TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE`<br>`TASK-DOC-03-03`<br>`TASK-DOC-03-02` | `CP-TASK-STORE-02` | transaction + optimistic version + constraint/index | 关联写在 transaction 中原子提交/回滚；optimistic version conflict 不产生部分写。 |
| `TASK-STORE-003` | 实现 repository ports，不泄漏 SQLite 给业务层 | `TASK-ORCHESTRATION-TODO-TASK-STORE-SQLITE` § `TASK-STORE-003` | `TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE`<br>`TASK-DOC-03-03`<br>`TASK-DOC-03-02` | `CP-TASK-STORE-03` | repository ports，不泄漏 SQLite 给业务层 | Repository port 不把 SQL/SQLite row/connection 泄漏到业务层。 |
| `TASK-STORE-004` | 启用 WAL、busy timeout 与 crash/reopen integrity tests | `TASK-ORCHESTRATION-TODO-TASK-STORE-SQLITE` § `TASK-STORE-004` | `TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE`<br>`TASK-DOC-03-03`<br>`TASK-DOC-03-02` | `CP-TASK-STORE-04` | WAL、busy timeout 与 crash/reopen integrity tests | WAL、busy timeout、crash/reopen 后 integrity 与约束仍成立。 |
| `TASK-STORE-005` | 验证 idempotency fingerprint conflict 与并发写冲突 | `TASK-ORCHESTRATION-TODO-TASK-STORE-SQLITE` § `TASK-STORE-005` | `TASK-ORCHESTRATION-TECH-TASK-STORE-SQLITE`<br>`TASK-DOC-03-03`<br>`TASK-DOC-03-02` | `CP-TASK-STORE-05` | idempotency fingerprint conflict 与并发写冲突 | idempotency fingerprint same/same 重放、same/different 冲突与并发重复写不会产生双业务事实。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-TASK-STORE-01** — fresh DB schema/constraint/index 与冻结 DDL 不一致
- [ ] **RF-TASK-STORE-02** — transaction rollback 或 optimistic conflict 产生部分写
- [ ] **RF-TASK-STORE-03** — Repository port 泄漏 SQLite row/connection/SQL 到业务层
- [ ] **RF-TASK-STORE-04** — WAL/busy timeout/crash-reopen 后 integrity 失败
- [ ] **RF-TASK-STORE-05** — idempotency replay/conflict/concurrent write 产生双业务事实




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-TASK-STORE-01** — SQLite schema/constraint/index introspection
- **EV-TASK-STORE-02** — transaction commit/rollback DB state
- **EV-TASK-STORE-03** — optimistic version conflict observation
- **EV-TASK-STORE-04** — WAL/busy timeout configuration + integrity/reopen result
- **EV-TASK-STORE-05** — idempotency record 与业务 row count/uniqueness
- **EV-TASK-STORE-06** — Repository port/type boundary inspection：业务层不可见 SQL/SQLite row/connection

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-TASK-STORE-01` | `Persistence` | `RF-TASK-STORE-01` | `EV-TASK-STORE-01` |
| `CP-TASK-STORE-02` | `Persistence`<br>`Concurrency / Idempotency` | `RF-TASK-STORE-02` | `EV-TASK-STORE-02`<br>`EV-TASK-STORE-03` |
| `CP-TASK-STORE-03` | `Unit`<br>`Module Integration` | `RF-TASK-STORE-03` | `EV-TASK-STORE-06` |
| `CP-TASK-STORE-04` | `Persistence`<br>`Failure / Recovery` | `RF-TASK-STORE-04` | `EV-TASK-STORE-04` |
| `CP-TASK-STORE-05` | `Persistence`<br>`Concurrency / Idempotency` | `RF-TASK-STORE-05` | `EV-TASK-STORE-05` |

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

当前必须控制的 Module 风险：**Store 若泄漏业务语义、事务不完整或并发约束失效，会造成 Task/Node 双写、历史覆盖和幂等失效。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Store 若泄漏业务语义、事务不完整或并发约束失效，会造成 Task/Node 双写、历史覆盖和幂等失效。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


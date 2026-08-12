---
docId: TP-MODULE-AGENT-GATEWAY
title: agent-gateway｜开发前 Module Test Plan
docType: test-plan
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
boundedContext: agent-runtime-collaboration
moduleRef: agent-gateway
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- AGENT-AGENT-GATEWAY-TECH-DESIGN
- AGENT-DOC-02-01
- AGENT-DOC-02-02
- AGENT-DOC-05-01
- AGENT-CROSS-DOMAIN-INTEGRATION-CHECKLIST
- AGENT-GATEWAY-SERVICE-RUNTIME
implementationWave: Wave 4
---

# `agent-gateway` 开发前 Module Test Plan

> 状态：**FINAL_FROZEN**  
> Implementation Wave：**Wave 4**  
> 本文只冻结“必须证明什么”；开发后 exact fixture / command / actual result / evidence ref 进入未来 `08-测试用例与验证/`。

## 1. Source of Truth

- [`AGENT-AGENT-GATEWAY-TECH-DESIGN`](../../04-模块/agent-gateway/TECHNICAL-DESIGN.md)
- [`AGENT-DOC-02-01`](../../02-契约/01-Public-API与跨领域接口矩阵.md)
- [`AGENT-DOC-02-02`](../../02-契约/02-Custom-GPT-官方能力与v1约束.md)
- [`AGENT-DOC-05-01`](../../05-质量与部署/01-失败恢复版本安全与验收.md)
- [`AGENT-CROSS-DOMAIN-INTEGRATION-CHECKLIST`](../../05-质量与部署/02-跨领域一致性验收清单.md)
- [`AGENT-GATEWAY-SERVICE-RUNTIME`](../../04-模块/agent-gateway/SERVICE-RUNTIME.md) — agent-gateway Service Runtime

## 2. 风险定位

Gateway 是 Custom GPT Actions 公网入口；auth、传输预算、File Bridge/relay 安全与业务边界错误会直接暴露平台或重复业务调用。

## 3. 必须覆盖的测试层

原 v0.1 已确认的 Module-specific 测试层保持不变：

- Unit
- Contract
- HTTP/Serializer Integration
- Security Boundary
- Real Custom GPT E2E

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
| Security / Boundary | **REQUIRED** | 由本 Module 现有 Critical Proof / v0.1 必测层直接要求。 |
| Concurrency / Idempotency | **NOT_APPLICABLE** | 该 Module 不拥有共享可变状态、串行调度或幂等写入 Contract。 |
| Stability / Performance | **NOT_APPLICABLE** | 冻结 SDD 未为该 Module定义独立稳定性/性能 Gate；不自动生成阈值。 |

## 4. Real / Fake Boundary

**Real requirement**：Transport/conformance 可本地 harness；最终必须真实 Custom GPT Preview/Actions/File Bridge E2E。

**允许的隔离方式**：下游 owner 可用 contract fake；Carrier hard limits、schema、auth/relay 安全需实际 serializer/http 验证，真实 ChatGPT 行为不能 Mock 升级。

## 5. Critical Proofs

- [ ] **CP-AGT-GW-01** — Bearer key 解析 authenticatedRoleRef，不信任 body 自报 roleRef；所有外部输入 `unknown → validate → typed`。
- [ ] **CP-AGT-GW-02** — GPT-facing body/path/query 正规化为 internal canonical DTO，不依赖 arbitrary custom headers。
- [ ] **CP-AGT-GW-03** — 45s ceiling 与 `<100,000 chars` request/response hard guard、真实 429/5xx semantics 可证明。
- [ ] **CP-AGT-GW-04** — `openaiFileIdRefs` object-array normalization，最多 10 项；input single 10MB / aggregate 50MB / fetch 15s 等平台 hard gate。
- [ ] **CP-AGT-GW-05** — filename/MIME/URL untrusted；redirect private/localhost/metadata、path traversal/control chars、MIME mismatch fail-closed。
- [ ] **CP-AGT-GW-06** — `openaiFileResponse` inline→URL relay、10 files/10MB、no image/video；relay token opaque/GET-only/artifact-scoped/TTL=5min，headers 不泄漏本地路径/secret。
- [ ] **CP-AGT-GW-07** — 每个 operation 显式 `x-openai-isConsequential`；Carrier confirmation 与 Execution Approval 独立。
- [ ] **CP-AGT-GW-08** — Gateway 无业务 persistence；expired locator/timeout 只重试无 business mutation transport，已有 Action 先按 owner idempotency/result 查询。
- [ ] **CP-AGT-GW-09** — process readiness 分别验证 ingress/credential/required downstream/relay capability；任一 blocking dependency 缺失不得 READY，restart 不重放业务 mutation。

## 6. Frozen TODO Coverage

> 本表不修改 Frozen TODO 的 `priority / dependsOn / implementationReadiness / ACCEPTANCE_NOT_FROZEN`。这里的 Acceptance 仅是**开发前 Test Plan 的 proof acceptance**，完全复用 §5 已存在的 Critical Proof，不回写成 TODO implementation acceptance。

| TODO | Frozen Goal | Frozen Anchor | Normative Rule Refs | Critical Proof | Scenario Family | Test Plan Acceptance |
|---|---|---|---|---|---|---|
| `AGT-GW-001` | 实现公网 Action ingress、Bearer auth、role resolution 与 runtime validation | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-001` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-01` | 公网 Action ingress、Bearer auth、role resolution 与 runtime validation | Bearer key 解析 authenticatedRoleRef，不信任 body 自报 roleRef；所有外部输入 `unknown → validate → typed`。 |
| `AGT-GW-002` | 实现 GPT-facing body/path/query → internal canonical DTO normalization | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-002` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-02` | GPT-facing body/path/query → internal canonical DTO normalization | GPT-facing body/path/query 正规化为 internal canonical DTO，不依赖 arbitrary custom headers。 |
| `AGT-GW-003` | 实现 45s/<100k/429/5xx transport hard guards | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-003` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-03` | 45s/<100k/429/5xx transport hard guards | 45s ceiling 与 `<100,000 chars` request/response hard guard、真实 429/5xx semantics 可证明。 |
| `AGT-GW-004` | 实现 openaiFileIdRefs object-array normalization 与 bounded input validation | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-004` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-04`<br>`CP-AGT-GW-05` | openaiFileIdRefs object-array normalization 与 bounded input validation | `openaiFileIdRefs` object-array normalization，最多 10 项；input single 10MB / aggregate 50MB / fetch 15s 等平台 hard gate。；filename/MIME/URL untrusted；redirect private/localhost/metadata、path traversal/control chars、MIME mismatch fail-closed。 |
| `AGT-GW-005` | 实现 openaiFileResponse inline/URL serializer、relay TTL/token/scope/SSRF guards | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-005` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-05`<br>`CP-AGT-GW-06` | openaiFileResponse inline/URL serializer、relay TTL/token/scope/SSRF guards | filename/MIME/URL untrusted；redirect private/localhost/metadata、path traversal/control chars、MIME mismatch fail-closed。；`openaiFileResponse` inline→URL relay、10 files/10MB、no image/video；relay token opaque/GET-only/artifact-scoped/TTL=5min，headers 不泄漏本地路径/secret。 |
| `AGT-GW-006` | 为每个 Action operation 固定 x-openai-isConsequential 并做 schema conformance | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-006` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-07` | 为每个 Action operation 固定 x-openai-isConsequential 并做 schema conformance | 每个 operation 显式 `x-openai-isConsequential`；Carrier confirmation 与 Execution Approval 独立。 |
| `AGT-GW-007` | 完成真实 Custom GPT Preview/Actions/File Bridge E2E | `AGENT-RUNTIME-COLLABORATION-TODO-AGENT-GATEWAY` § `AGT-GW-007` | `AGENT-AGENT-GATEWAY-TECH-DESIGN`<br>`AGENT-DOC-02-01`<br>`AGENT-DOC-02-02` | `CP-AGT-GW-01`<br>`CP-AGT-GW-02`<br>`CP-AGT-GW-03`<br>`CP-AGT-GW-04`<br>`CP-AGT-GW-05`<br>`CP-AGT-GW-06`<br>`CP-AGT-GW-07`<br>`CP-AGT-GW-08`<br>`CP-AGT-GW-09` | 真实 Custom GPT Preview/Actions/File Bridge E2E | Bearer key 解析 authenticatedRoleRef，不信任 body 自报 roleRef；所有外部输入 `unknown → validate → typed`。；GPT-facing body/path/query 正规化为 internal canonical DTO，不依赖 arbitrary custom headers。；45s ceiling 与 `<100,000 chars` request/response hard guard、真实 429/5xx semantics 可证明。；`openaiFileIdRefs` object-array normalization，最多 10 项；input single 10MB / aggregate 50MB / fetch 15s 等平台 hard gate。；filename/MIME/URL untrusted；redirect private/localhost/metadata、path traversal/control chars、MIME mismatch fail-closed。；`openaiFileResponse` inline→URL relay、10 files/10MB、no image/video；relay token opaque/GET-only/artifact-scoped/TTL=5min，headers 不泄漏本地路径/secret。；每个 operation 显式 `x-openai-isConsequential`；Carrier confirmation 与 Execution Approval 独立。；Gateway 无业务 persistence；expired locator/timeout 只重试无 business mutation transport，已有 Action 先按 owner idempotency/result 查询。；process readiness 分别验证 ingress/credential/required downstream/relay capability；任一 blocking dependency 缺失不得 READY，restart 不重放业务 mutation。 |

## 7. Required Failure / Boundary Families

只覆盖 Frozen SDD / §5 Critical Proof 已经存在的失败与边界；不从通用 checklist 新增产品需求。

- [ ] **RF-AGT-GW-01** — Bearer auth/role resolution 信任 body 自报 roleRef 或 invalid input 绕过 validation
- [ ] **RF-AGT-GW-02** — GPT-facing body/path/query 未正规化或依赖 arbitrary custom headers
- [ ] **RF-AGT-GW-03** — 45s/<100k/429/5xx transport hard guard 失效
- [ ] **RF-AGT-GW-04** — openaiFileIdRefs count/size/aggregate/fetch hard gate 失效
- [ ] **RF-AGT-GW-05** — filename/MIME/URL/redirect/SSRF/path/control-char 边界失效
- [ ] **RF-AGT-GW-06** — openaiFileResponse/relay size/type/token/scope/TTL/header 安全失效
- [ ] **RF-AGT-GW-07** — x-openai-isConsequential 缺失或 Carrier confirmation 与 Execution Approval 混淆
- [ ] **RF-AGT-GW-08** — 启动时 credential/downstream/relay blocking dependency 缺失却宣称 READY，或 restart 重放业务 mutation
- [ ] **RF-AGT-GW-09** — expired locator/timeout 在 business mutation 后盲重试或 Gateway 建立业务 persistence




## 8. Evidence Contract

本阶段只冻结**未来必须可观测的 Evidence 类型**；exact fixture / command / actual result / evidenceRef 仍留到开发后 `08-测试用例与验证/`。

- **EV-AGT-GW-01** — HTTP status/request-response envelope
- **EV-AGT-GW-02** — Bearer → authenticatedRoleRef resolution
- **EV-AGT-GW-03** — external unknown → canonical DTO normalization result
- **EV-AGT-GW-04** — serializer char/size/count/fetch budget observation
- **EV-AGT-GW-05** — File Bridge input validation / expired locator result
- **EV-AGT-GW-06** — relay token/scope/TTL/header/SSRF rejection
- **EV-AGT-GW-07** — OpenAPI consequential schema conformance
- **EV-AGT-GW-08** — startup/readiness blocking-dependency status 与 restart no-replay trace
- **EV-AGT-GW-09** — 真实 Custom GPT Preview/Actions/File Bridge interaction evidence
- **EV-AGT-GW-10** — Gateway no-business-persistence inspection + uncertain business mutation owner idempotency/result lookup trace

## 8.1 Critical Proof → Risk → Layer → Evidence Binding

> 本表完成 `Frozen TODO → Critical Proof → Risk → Test Layer → Evidence` 的显式链。RF/EV 只是本文内导航 identity，不是新的产品 Contract/capability。Test Plan Acceptance 仍以 §5 Critical Proof 为准；本文不冻结 TODO priority、dependsOn 或 implementation acceptance。

| Critical Proof | Required Test Layer(s) | Risk / Failure Ref(s) | Required Evidence Ref(s) |
|---|---|---|---|
| `CP-AGT-GW-01` | `Unit`<br>`Contract / Runtime Schema`<br>`Security / Boundary` | `RF-AGT-GW-01` | `EV-AGT-GW-01`<br>`EV-AGT-GW-02`<br>`EV-AGT-GW-03` |
| `CP-AGT-GW-02` | `Unit`<br>`Contract / Runtime Schema`<br>`Module Integration` | `RF-AGT-GW-02` | `EV-AGT-GW-01`<br>`EV-AGT-GW-03` |
| `CP-AGT-GW-03` | `Contract / Runtime Schema`<br>`Failure / Recovery`<br>`Real External E2E` | `RF-AGT-GW-03` | `EV-AGT-GW-01`<br>`EV-AGT-GW-04`<br>`EV-AGT-GW-09` |
| `CP-AGT-GW-04` | `Contract / Runtime Schema`<br>`Security / Boundary`<br>`Real External E2E` | `RF-AGT-GW-04` | `EV-AGT-GW-04`<br>`EV-AGT-GW-05`<br>`EV-AGT-GW-09` |
| `CP-AGT-GW-05` | `Security / Boundary`<br>`Real External E2E` | `RF-AGT-GW-05` | `EV-AGT-GW-05`<br>`EV-AGT-GW-06`<br>`EV-AGT-GW-09` |
| `CP-AGT-GW-06` | `Contract / Runtime Schema`<br>`Security / Boundary`<br>`Real External E2E` | `RF-AGT-GW-06` | `EV-AGT-GW-06`<br>`EV-AGT-GW-09` |
| `CP-AGT-GW-07` | `Contract / Runtime Schema`<br>`Security / Boundary`<br>`Real External E2E` | `RF-AGT-GW-07` | `EV-AGT-GW-07`<br>`EV-AGT-GW-09` |
| `CP-AGT-GW-08` | `Module Integration`<br>`Failure / Recovery` | `RF-AGT-GW-09` | `EV-AGT-GW-05`<br>`EV-AGT-GW-10` |
| `CP-AGT-GW-09` | `Module Integration`<br>`Process Lifecycle`<br>`Real External E2E`<br>`Failure / Recovery` | `RF-AGT-GW-08` | `EV-AGT-GW-08`<br>`EV-AGT-GW-09` |

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

当前必须控制的 Module 风险：**Gateway 是 Custom GPT Actions 公网入口；auth、传输预算、File Bridge/relay 安全与业务边界错误会直接暴露平台或重复业务调用。**

## 10. Module STOP

出现以下任一情况立即 STOP，不允许 Codex 自行修 Spec：

- 任一 TODO 无法追溯到 Frozen Anchor / sourceRefs / Critical Proof；
- 任一 `REQUIRED` 测试层必须靠新增 Public API、改变 Owner/BC/Contract 才能实现；
- §7 的关键 failure/recovery 在 Frozen SDD 中没有确定语义；
- §8 所需 Evidence 无法从 owner/runtime/reality 观察，只能靠 Mock 自证；
- 真实 External Boundary 只能由 Fake PASS，或 `PENDING_SPIKE` 被当成已验证能力；
- 为了让测试通过必须改变 frozen TODO goal。

若风险“Gateway 是 Custom GPT Actions 公网入口；auth、传输预算、File Bridge/relay 安全与业务边界错误会直接暴露平台或重复业务调用。”无法通过当前 Frozen Contract/Boundary 得到可执行证明，标记 `SPEC_GAP` 并停止进入实现。


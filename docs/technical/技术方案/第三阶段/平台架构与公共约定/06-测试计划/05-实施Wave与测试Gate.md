---
docId: TP-PLATFORM-05
title: 实施 Wave 与测试 Gate
docType: test-plan
authority: normative
lifecycle: frozen
domain: platform
subdomain: null
subdomains: []
boundedContext: null
moduleRef: null
provides: []
requires: []
contractRefs: []
testPlanPhase: PRE_IMPLEMENTATION
testPlanStatus: FINAL_FROZEN
sourceBaseline: 第三阶段-Phase3-DDD规范化技术文档-最终冻结基线-20260812.zip
sourceBaselineSha256: 69fdfbac8a5ee36b700bcb10c0b8a9a61f0a5aa3367386cb5bc7e98118a4a875
sourceRefs:
- DEPLOYMENT-DOC-05-03
- TASK-DOC-05-02
- MODEL-DOC-05-03
- EXECUTION-DOC-05-03
- AGENT-DOC-05-03
---

# Phase 3 实施 Wave 与测试 Gate

> 本文件记录 Test Planning 阶段已经确认的**施工 Wave**。它用于控制 Codex 开工顺序，不改写各 Domain 的能力、Package 或 runtime dependency 语义。

## Operational Scheduling Authority

本文件的 Wave 是 **Phase 3 Test Planning 层的跨领域 operational scheduling decision**，只回答“Codex 何时可以开始某个 Module / 何时进入下一测试 Gate”。它不重新定义 Domain architecture，也不是 machine dependency graph。

治理关系固定为：

```text
Frozen DDD/SDD
= Domain / BC / Module / Contract / Owner / Domain-local implementation constraints 的事实真源

本文件 Cross-domain Wave
= Phase 3 跨领域开工与测试 Gate 的执行调度真源
```

因此：

1. **不得**把 Wave 箭头写入 `Provides / Requires`、npm dependency、runtime dependency 或 Deployment Module Graph；
2. Frozen Domain-local roadmap 继续约束该 Domain 内已经冻结的技术前置条件；Cross-domain Wave 不删除、不覆盖这些条件；
3. 当 Domain-local roadmap 的文字顺序与本文件 Wave 不同，**“某 Module 何时允许 Codex 开工”以本文件的跨领域 Wave/Gate 为准**，但开工后仍必须满足该 Module Frozen SDD 中的真实 prerequisite；
4. 如果两者无法同时满足而必须修改 Frozen Contract/Owner/architecture 才能继续，立即 `STOP → SPEC_GAP / Contract Change`，不得由 Test Plan 自行改架构；
5. 本 Wave 是人工确认的施工治理决策，不得自动转换成 TODO `dependsOn` 或机器 capability dependency。

当前已知文字顺序差异明确记录如下，仅用于消除歧义，不修改 Frozen 文档：

- Task Domain-local roadmap 中 Migration/Store/Domain Service 的文字顺序，与 Wave 1 的 `task-orchestration → task-store-sqlite → task-migration-runner` 不同；Wave 1 控制跨领域开工 Gate，真实 store/migration prerequisite 仍按各 Module Frozen SDD/Test Gate 验证。
- Execution Domain-local roadmap 中 Runtime/Local 的文字顺序，与 Wave 3 的 `execution-contracts → execution-local → execution-runtime` 不同；Wave 3 是施工顺序，不把 Runtime↔Local 调用关系改写成 package/Deployment dependency。
- Deployment Domain-local roadmap 连续列出 platform-cli/module-skill；本计划将它们的完整 production implementation 收口到 Wave 6。Deployment Test Plan 与 offline fake-Module Gate 可以提前完成，但真实 production lifecycle acceptance 必须等待主要真实 Module 存在。

## Wave 0 — Module Governance Bootstrap

```text
module-contract
→ module-template
→ deployment-conformance
```

第一个 Codex 工程 Module：`module-contract`。目标是先验证“Test Plan → TDD → Evidence”工作方式本身。

GO：contract/schema、template profile、C1/C2/C3 conformance 均能拒绝故意错误输入；不要求此时完成真实 External Resource 全链。

## Wave 1 — Task

```text
task-orchestration
→ task-store-sqlite
→ task-migration-runner
```

第一个大型业务 Module：`task-orchestration`。Domain state/contract 先建立，再用真实 SQLite/migration 证明持久化与恢复。

## Wave 2 — Model

```text
model-contracts
→ model-runtime
```

GO：M1 + 真实 M2 基础能力；M3/M4 按进入生产控制路径的 Spec 和真实单 Lane 跑。

## Wave 3 — Execution Core

```text
execution-contracts
→ execution-local
→ execution-runtime
```

GO：E1 + E2 + Runtime fault/recovery 核心；此 Wave 不要求 Browser 完成。

## Wave 4 — Agent Core

```text
agent-runtime
→ agent-gateway
→ agent-product / agent-controller-dev / agent-test-ops
```

三角色包可并行 materialize，但共同受 Agent Runtime/Gateway Contract 与角色最小权限门约束。

## Wave 5 — Browser / Carrier Real Integration

```text
execution-browser-extension
```

只有 Execution Core + Agent Core + Gateway 已能独立验证后才进入。原因是 Browser 同时跨 Task/Role/Worker/Gateway/Execution/Custom GPT，是最高风险真实 E2E 点。

## Wave 6 — Composition & Operations

```text
platform-host
→ platform-cli
→ module-skill
```

`platform-cli` 的测试计划在 Deployment 阶段最先写完；其 fake-Module offline Gate 也可以提前准备，但**完整 production implementation/real lifecycle acceptance 在主要真实 Module 已存在后收口**。这既保留 Deployment 冻结文档中的 offline plan/apply Gate，也避免 CLI 先于真实 lifecycle 大量实现 fake 语义。

`module-skill` 始终最后，不能早于规则与门禁。

## Wave 7 — Cross-Domain Final Verification

```text
Cross-Domain Integration
→ Real E2E
→ Fault / Recovery
→ Stability
→ Full Evidence
```

E4/关键 reliability 不 PASS，不进入最终跨域 E2E freeze。

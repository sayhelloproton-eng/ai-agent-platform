# ARC-P3-RULING-001｜Execution Flow Runtime EF-6 Handoff 裁决

> 日期：2026-08-10
> 证据基线：lab.13, commit `410fd37e`, `experiments/execution-flow-runtime/`
> 冻结版本：`0.0.0-lab.13`
> EF-0～EF-5 验证状态：GO / ACCEPT / FROZEN
> EF-6 STATUS：HANDOFF COMPLETE — NO DIRECT INTEGRATION YET

## 1. 裁决结论

```text
EF-6 = HANDOFF READY / NO DIRECT INTEGRATION YET.
```

Execution Flow Runtime 已完成实验验证。下一步：
- **不** 制作 lab.14
- **不** 直接把 experiment 迁入 packages/
- **不** 修改 CTL/TSK/LCL/BHR/Gateway
- **不** 重跑真实手机测试

正确动作：
1. 冻结 lab.13 作为 Phase 3 Runtime evidence input
2. 进入 Phase 3 Stage 0/1 contract reconciliation
3. Commons 冻结后，再按本裁决执行正式迁移

---

## 2. lab.13 资产分类

| 资产 | 分类 | 说明 |
|---|---|---|
| execution-run.v0 | ADOPT SEMANTICS / REWRITE IMPLEMENTATION | 协议形状正确，需对齐 Commons envelope |
| execution-flow.v0 | ADOPT AS-IS | 节点类型和拓扑语义冻结 |
| execution-result.v0 | ADOPT SEMANTICS / MIGRATE AFTER COMMONS | status 与 Common Result 需显式 mapping |
| Binding `{$ref:...}` | ADOPT AS-IS | 显式对象绑定，反歧义设计 |
| capability.v0 descriptor | MIGRATE AFTER COMMONS | 对齐到 Commons Capability Descriptor |
| inference-node.v0 | ADOPT SEMANTICS / REWRITE IMPLEMENTATION | backend→backend_ref 在 Stage 1 统一 |
| FAST/REASON roles | ADOPT AS-IS | 角色语义冻结，模型 mapping 属于 Runtime config |
| Serial inference scheduler | ADOPT AS-IS | max_concurrency=1, FIFO, 不 poison queue |
| Service API (HTTP) | ADOPT AS-IS | transport/application 分离冻结 |
| CLI lifecycle primitives | ADOPT AS-IS | start/stop/status/health/doctor |
| Runtime Home / config | ADOPT AS-IS | singleton per home, identity-verified stop |
| deployment requirements | ADOPT AS-IS (empirical input) | read-only, zero-side-effect, 作为 Commons Module Contract 输入 |
| file/fixed-command capabilities | DEPRECATE as built-in → MIGRATE to LCL adapter (Stage 4) | 安全语义保留为 LCL adapter contract |

---

## 3. Commons Reconciliation 裁决

| lab.13 | Phase 3 Commons Plan | 裁决 |
|---|---|---|
| execution.result 状态 (completed/blocked/failed) | Common Result (SUCCEEDED/FAILED/PARTIAL/UNCERTAIN/CANCELLED) | 不合并。显式 mapping + 版本化 conformance test。Runtime `blocked` 是 Runtime-specific。 |
| capability.v0 | Commons Capability Descriptor | 扩展，不替换。 |
| aap.deployment.requirements.v0 | Commons Module Contract | 采纳为 v0.1 模板输入。 |
| Flow `backend` 字段 | Commons `backend_ref` | 延后到 Stage 1 统一。 |
| authorization.allowed_capabilities | Approval Grant | 明确标记为 CAPABILITY_ALLOWLIST 非 APPROVAL。 |
| correlation (opaque) | Task refs | 保持 opaque。Adapter 负责映射。 |

---

## 4. 部署领域 REWORK 裁决

标记为 REWORK。模块不负责规划/apply 自己的整体部署。

正确流程：
```text
selected modules
→ Deployment Planner 聚合 requirements
→ Dependency Graph
→ Provider/Consumer matching
→ Resolve concrete environment
→ Verify deps
→ Dynamic INSTALL.md
→ Confirmation Gate
→ Deployment Executor apply
```

见 `领域/部署领域/README.md`。

---

## 5. Task → Runtime Adapter 模型

```text
Task node (WORK, targetDomain=execution)
→ Execution Adapter (builds execution.run, injects correlation)
→ Runtime (executes Flow, returns execution.result)
→ Task Adapter (maps result → durable Task event/transition)
```

所有权：
- Claim/Lease：Task Domain
- Approval：Approval Domain（独立）
- Delivery：Task Domain + Browser Host Protocol
- Continuation/Recovery：Task Domain
- Capability execution：Capability Provider (LCL/BHR)
- Runtime：validation + composition + bounded execution

Runtime 永不拥有 Task/Plan/Claim/Approval 真理。

---

## 6. Runtime Composition Root

```text
capability_ref → provider_ref → adapter type + module (from Runtime config)
backend_ref    → provider_ref → adapter type + module (from Runtime config)
command_ref    → Runtime-owned registry (from config)

adapter types: InProcess | HTTP
```

不变约束：同一 Flow 文件在 InProcess vs HTTP adapter 部署下语义一致。
物理 endpoint 只存在于 Runtime config，不出现在 Flow。

---

## 7. Stage Gate

**Stage 1 Commons 冻结前：STOP。不迁 Runtime。**

Stage 3 最小验收门：
1. 同一 Flow 在 InProcess + HTTP 两种部署组合下运行，Flow 不变
2. capability/provider physical endpoint 只出现在 injected config
3. Task adapter 不泄漏 Task internals 到 Runtime
4. deterministic routing 不回退给 inference
5. Approval truth 仍在 Runtime 外
6. Flow 不含任何物理地址/模型 ID
7. FAST/REASON provider mapping 可仅通过 config 替换
8. Runtime listener loopback-only 直到 auth 实现

---

## 8. 高风险问题回答

### Q1: execution.result.status=blocked — Runtime or Commons?
**Runtime-specific.** `blocked` 是 Runtime 执行前提未满足状态。Task Adapter 映射为 Common `BLOCKED`。

### Q2: UNCERTAIN — 哪层拥有？
三层各有其域：Inference result (model-level signal) → Execution result (可触发 REASON escalation) → Task state (workflow surface)。不冲突。

### Q3: Task cancel → Runtime？
v0: client disconnect ≠ cancel。Phase 3 需定义新的 `runtime.cancellation.v1` port，含 cancel_token + 幂等 + 确认。

### Q4: Approval → capability authorization？
Approval Grant 在 Runtime 外处理，产生非伪造 Capability Authorization Token 注入 allowed_capabilities。Token 绑定 execution_id + capability_ref + time window。

### Q5: lab built-in capabilities 在 Phase 3？
变为 LCL InProcess Adapter 参考实现。安全语义（rooted, traversal-protected, shell=false, bounded lifecycle）冻结为 LCL adapter contract。

### Q6: deployment requirements 作为 Module Contract？
是。采纳为 Commons Module Contract 的实证模板输入。

### Q7: Runtime loopback-only 直到 auth？
是。caller auth 实现前，Runtime listener 限制 loopback-only。

---

## 9. 裁决状态

```text
EF-0 GO
EF-1 GO
EF-2 GO
EF-3 GO
EF-4 GO
EF-5 ACCEPT / FROZEN
EF-6 HANDOFF COMPLETE

DEPLOYMENT DOMAIN: REWORK
COMMONS: AWAIT STAGE 1
RUNTIME MIGRATION: BLOCKED UNTIL STAGE 1 COMMONS FROZEN
```

**NEXT**: Phase 3 Stage 0 Rebaseline → Stage 1 Commons freeze.

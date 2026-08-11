# 99 · 下一 Chat 交接上下文

## 1. 当前阶段

Phase 3 已完成并冻结：

```text
Task & Orchestration
Agent Runtime & Collaboration
Execution Domain
Model & Reasoning Domain   ← 本目录
```

Deployment 不再作为单独长时间领域讨论；用户计划在最终总纲中统一串联部署、跨域接口、新仓库目录和实施顺序。

## 2. Model Domain 一句话

> **Model & Reasoning Domain 是平台认知计算层。模型不是自由 Agent，而是通过 Reasoning Spec、typed input/output、runtime validation 和有界升级工作的认知函数。**

## 3. 最终包/服务

```text
model-contracts
model-runtime
```

**2 包 / 1 服务 / 6 内部模块**：

```text
Inference API
  ├─ Spec Resolver
  └─ Prompt Renderer
Resource Coordinator
Reasoning Router
API Provider Adapter
Output Validator
Health & Observability
```

## 4. 最终算力语义

```text
FAST    = no-thinking 逻辑角色，低延迟/高频
REASON  = thinking 逻辑角色，低频复杂推理
AUTO    = 仅按 Reasoning Spec 有界 FAST→REASON
Vision  = image input modality，不是第三角色
```

FAST/REASON 不绑定具体模型、MLXHub、手机或远端厂商。

## 5. Provider / Capability

Provider 必须通用 API 化。Deployment 最终配置 base URL / credential / model id。

Model Capability Profile 至少约束：

```text
thinking/no-thinking
text/image
structured output
context window
max output
```

能力不满足时显式 `CAPABILITY_UNSUPPORTED`，禁止静默降级。

## 6. Small-model-first

Reasoning Spec v1：

- TypeScript 静态定义；
- Git 版本化；
- 固定 instruction；
- typed input/output schema；
- bounded context/output；
- finite decision vocabulary；
- routing/repair 规则；
- 控制路径优先 `specRef + typed payload`。

## 7. Tool/Execution

v1 不依赖 provider-native Tool Calling。

```text
Model → one Capability Proposal
→ caller validates candidate
→ Execution validates Scope/Policy/Approval
→ real effect
→ structured Result envelope
→ optional next model round
```

一个 inference 最多一个 Proposal；调用领域必须有限 `maxRounds`。

## 8. Runtime

- one inference lane；
- `business/background` 两级队列；
- business 优先；
- queue/active memory-only；
- structured logs 落 `.ai-agent-platform/logs/model/`；
- 无 inference DB；
- queue timeout / inference timeout 分离；
- transport retry ≤1；
- output repair ≤1；
- 无 UNKNOWN_SIDE_EFFECT；
- 不要求/持久化 CoT。

## 9. Health

```text
Runtime READY/DEGRADED/UNAVAILABLE
Lane IDLE/BUSY
FAST READY/UNAVAILABLE
REASON READY/UNAVAILABLE
```

API 曾经 200 不等于 READY；真实能力由 M2/Deployment doctor 验证。

## 10. Test Gates

```text
M1 Contract
M2 Capability
M3 Scenario Regression
M4 Stability / Performance
```

换模型必须重新跑受影响的 M2/M3/M4。

## 11. 工程约束

```text
Node 20.20.1
TypeScript-first
tsx runtime
tsc --noEmit
runtime validation
no public any drift
```

## 12. 明确删除/不做

```text
Prompt Service
Tool Service
Model Registry Service
Provider Plugin Framework
Inference Job/Scheduler
persistent queue
inference DB
multi-lane concurrency
independent Health/Logging/Evaluation services
complex metrics platform
native tool calling dependency
open autonomous tool loop
```

## 13. 旧 MVP

`experiments.zip` / SOL-MOB-001 等旧实现**不是本领域架构真源**。下一步如要复用，只能根据本冻结文档逐项判定：

```text
REUSE AS-IS
REFACTOR & ADAPT
REWRITE
DROP
```

不得为了复用旧代码修改本领域边界。

## 14. 下一步

进入 Phase 3 总纲最后收口：

- 四领域跨域接口审计；
- Deployment 串联；
- 新仓库 package/service 目录；
- 配置、启动、status、verify、doctor；
- E2E 主路径；
- Phase 3 实施顺序与停止门。

建议新 Chat 首先读取：`README.md` → `00` → `99`，再按问题读取专项文档。

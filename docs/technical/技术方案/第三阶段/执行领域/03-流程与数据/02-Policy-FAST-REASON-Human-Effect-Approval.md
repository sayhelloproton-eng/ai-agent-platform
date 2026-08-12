---
docId: EXECUTION-DOC-03-02
title: 08 · Policy、FAST、REASON、Human 与 Effect Approval
docType: policy-flow
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 08 · Policy、FAST、REASON、Human 与 Effect Approval

## 1. 决策分层

```text
Layer 1: deterministic hard rules
Layer 2: FAST
Layer 3: REASON
Layer 4: Human
```

目标不是“所有执行都问模型”，而是把模型放在真正需要语义判断的位置。

## 2. Layer 1 — Deterministic

适合：

- schema；
- caller identity；
- projectRoot/canonical path；
- hard deny；
- clearly read-only safe capability；
- approval fingerprint validity；
- idempotency conflict。

这些结论模型不可覆盖。

## 3. Layer 2 — FAST

任何普通真实副作用、常规风险分类、正常研发决策默认 FAST。

FAST 典型输入应是紧凑结构化事实：

```text
capability
caller/task/worker refs
scope result
input summary
current state/evidence
known policy constraints
```

不要把 secret/full logs 直接塞进模型。

## 4. Layer 3 — REASON

只在以下情况升级：

- FAST 低置信；
- evidence 冲突；
- UNKNOWN recovery；
- 多步复杂副作用；
- command semantics 难以可靠判断；
- Browser 页面语义冲突；
- “继续/停止/找人”判断复杂。

FAST/REASON 使用手机模型时是同一串行资源，不能按并行推理设计。

## 5. Layer 4 — Human

触发：

- REASON 仍无法安全决定；
- hard policy 明确规定必须人承担；
- Browser abnormal reject/deny 会阻断 Worker；
- 需要业务责任而不是纯技术风险判断。

Human 是稀有升级路径，不是默认 side-effect gate。

## 6. Effect Approval

Approval 必须 concrete binding：

```text
executionRef/caller
capability
target
critical params
fingerprint
precondition
expiry
```

审批回来要 revalidate；现实已变化则 Approval stale。

## 7. Browser Carrier Permission

ChatGPT Action Allow popup 与 Effect Approval 分离。目标环境已经真实验证 `Always Allow` 时，routine non-consequential Action 的 happy path 不需要 Browser click。

以下 auto-Allow 只属于 **permission fallback**（Always Allow 未验证/失效或异常 prompt 已出现），不是正常主链。fallback 中允许自动处理的条件必须同时满足：

```text
managed Worker
expected Action/Gateway
expected scope
policy allows
page identity reliable
```

否则 pause + human，不先 Deny。

## 8. 决策日志

Execution Record 建议记录：

```text
decisionPath
decision summary
policy rule ids（若有）
model call ref（未来由 Model logs 提供）
approvalRef
```

不把完整 model chain-of-thought 当日志要求；只记录可审计结构化结论。

---

## 当前正式约束：Approval 分层

Task authorization、Execution Effect Approval、ChatGPT Carrier confirmation 是三个不同层次。Execution Approval 必须绑定具体 effect fingerprint/scope/target/precondition，不能作为长期通用权限。OpenAI `x-openai-isConsequential` 暂不改写 Execution approval 语义，由 Agent Carrier Spike 后对齐。

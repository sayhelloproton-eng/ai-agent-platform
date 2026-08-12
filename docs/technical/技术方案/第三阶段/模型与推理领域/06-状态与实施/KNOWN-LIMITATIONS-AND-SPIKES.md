---
docId: MODEL-LIMITATIONS
title: 模型与推理领域｜待确认项、限制与 Spike
docType: limitations
authority: normative
lifecycle: active
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 模型与推理领域｜待确认项、限制与 Spike

## 状态规则

```text
TODO = 正确目标和实施方法已经确定，但尚未完成
PENDING_SPIKE = 外部行为或关键假设尚未通过真实验证
KNOWN_LIMITATION = 已知限制，必须有当前 fallback / operator action
FUTURE = 不属于 v1 当前范围
```

任何 `PENDING_SPIKE` 都不得成为没有 fallback 的 correctness dependency。只有真实 E2E/实验通过，并确认不破坏 ownership / contract / recovery 后，才可提升为正式主路径。

## MODEL-LIMIT-001｜Provider Capability 必须实测
- Type: `KNOWN_LIMITATION`
- Provider 声明不能代替真实 capability verification。
- Current fallback: Deployment verify/doctor + Model behavior tests；不满足则 `DEGRADED/UNAVAILABLE`。

## MODEL-LIMIT-002｜单 Lane 是 v1 稳定性策略
- Type: `KNOWN_LIMITATION`
- v1 不承诺多模型并行或抢占。
- Current fallback: business/background 两级队列，串行执行。

## MODEL-FUTURE-003｜并行推理/持久队列
- Type: `FUTURE`
- 只有真实吞吐量需求证明单 Lane 不够时才重新评估。

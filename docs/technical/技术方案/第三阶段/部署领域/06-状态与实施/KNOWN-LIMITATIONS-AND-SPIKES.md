---
docId: DEPLOYMENT-LIMITATIONS
title: 部署领域｜待确认项、限制与 Spike
docType: limitations
authority: normative
lifecycle: active
domain: deployment-governance
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 部署领域｜待确认项、限制与 Spike

## 状态规则

```text
TODO = 正确目标和实施方法已经确定，但尚未完成
PENDING_SPIKE = 外部行为或关键假设尚未通过真实验证
KNOWN_LIMITATION = 已知限制，必须有当前 fallback / operator action
FUTURE = 不属于 v1 当前范围
```

任何 `PENDING_SPIKE` 都不得成为没有 fallback 的 correctness dependency。只有真实 E2E/实验通过，并确认不破坏 ownership / contract / recovery 后，才可提升为正式主路径。

## DPL-LIMIT-001｜Custom GPT 配置是 Web-only
- Type: `KNOWN_LIMITATION`
- Current fallback: `ACTION_REQUIRED_WEB` + 完成后 verify/doctor。

## DPL-LIMIT-002｜Carrier Workspace 管理要求可能因环境而异
- Type: `KNOWN_LIMITATION`
- 包括 domain allowlist、Actions enablement、Privacy Policy、auth restore 等。
- Current fallback: External Resource Module 逐项检测，缺失时 `ACTION_REQUIRED`，不伪装 READY。

## DPL-LIMIT-003｜recommended model 非强约束
- Type: `KNOWN_LIMITATION`
- READY 依据 capability + behavior/E2E，而不是 exact model id。

## DPL-FUTURE-004｜容器/集群部署
- Type: `FUTURE`
- v1 只面向当前单机/单体部署；无真实需求不引入 Docker/Kubernetes 编排层。

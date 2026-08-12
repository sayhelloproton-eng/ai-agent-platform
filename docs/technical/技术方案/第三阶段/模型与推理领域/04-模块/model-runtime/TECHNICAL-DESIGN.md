---
docId: MODEL-MODEL-RUNTIME-TECH-DESIGN
title: 03 · model-runtime 详细技术方案
docType: module-design
authority: normative
lifecycle: frozen
domain: model-reasoning
moduleRef: model-runtime
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- MODEL-MODEL-RUNTIME-TECH-DESIGN
- MODEL-DOC-02-01
- MODEL-DOC-02-02
---

# 03 · model-runtime 详细技术方案

## 1. [FROZEN] 服务职责

`model-runtime` 是 Model Domain 唯一服务，对外提供受规范约束的 inference 能力与 runtime status。

它不是 Agent，也不是 Workflow Engine。

## 2. Inference API

职责：

- 接收 `infer(request)`；
- 校验公共 Envelope；
- 解析 `specRef`；
- 校验 typed payload；
- 调用 Prompt Renderer；
- 将完成结果返回调用方。

### Spec Resolver

根据静态 TypeScript Spec Registry（代码内导出集合）解析：

```text
specRef → exact versioned Reasoning Spec
```

未知 `specRef` → `INVALID_REQUEST`。

### Prompt Renderer

把 Spec 的固定 instruction + validated payload + bounded context 转成模型 API 输入。

Prompt Renderer 必须确定性；同一 Spec + 同一 payload 在同一版本下应得到语义等价输入。

## 3. Resource Coordinator

职责：

- 维护单一 inference lane；
- `business/background` 两级队列；
- active inference；
- requested role 的准备；
- queue timeout；
- cancel bookkeeping。

不做：

- 持久化任务；
- 多 Lane；
- 抢占已运行 inference；
- 复杂公平调度。

## 4. Reasoning Router

职责：

- 解释 FAST / REASON / AUTO；
- 检查当前 Spec 的 allowed modes；
- 执行 Spec 定义的 AUTO 升级条件；
- 将逻辑角色交给 Resource Coordinator。

不负责业务风险规则。

## 5. API Provider Adapter

职责：

- 将平台统一 message/context 输入转换为具体 API；
- 支持 text/image；
- 设置具体 model id / provider parameters；
- 读取 Deployment 提供的 credential reference；
- 标准化 provider transport/status/error；
- 不向上层泄漏 provider wire format。

v1 不支持 provider-native tool calls。

## 6. Output Validator

处理：

```text
raw output
→ extract bounded result
→ parse
→ runtime schema validate
→ normalize typed output
```

Schema invalid：如 Spec 允许，只做一次 bounded repair；仍失败返回 `INVALID_OUTPUT`。

Validator 不“猜模型大概想表达什么”。

## 7. Health & Observability

职责：

- Runtime/Lane/FAST/REASON 状态；
- queue depth；
- active inference；
- last success/failure；
- structured disk logs；
- lightweight provider health。

不承担 Deployment 深度 capability verify。

## 8. [FROZEN] 一次请求生命周期

```text
HTTP/API boundary
→ validate request
→ resolve Spec
→ validate payload
→ route role
→ validate role capability
→ queue
→ acquire lane
→ provider invoke
→ validate output
→ optional bounded repair
→ optional AUTO escalation
→ typed result
→ structured log
```

任何错误都在相应阶段明确终止，不能通过自由 Prompt 自救。

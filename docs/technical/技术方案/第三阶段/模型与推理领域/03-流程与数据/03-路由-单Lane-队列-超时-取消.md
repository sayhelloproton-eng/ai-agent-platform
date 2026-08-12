---
docId: MODEL-DOC-03-03
title: 07 · 路由、单 Lane、队列、超时与取消
docType: runtime-flow
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 07 · 路由、单 Lane、队列、超时与取消

## 1. [FROZEN] 路由语义

### FAST

只用 FAST。FAST 不可用立即失败，不自动 REASON。

### REASON

只用 REASON。REASON 不可用立即失败，不自动 FAST。

### AUTO

只有 AUTO 才允许根据 Reasoning Spec 做有限升级。

## 2. [FROZEN] AUTO 规则归 Spec

Runtime 不内置：

```text
confidence < 0.7 就升级
```

这种全局业务规则。

每个 Spec 明确自己的：

- start role；
- allowReasonEscalation；
- triggers；
- latency/场景约束。

## 3. [FROZEN] 单 Lane

```text
business queue ----┐
                   ├──→ one active inference
background queue --┘
```

没有并行 model workers。

## 4. [FROZEN] 优先级

尚未启动时：

```text
business > background
```

已运行 background 不强制 preempt。

理由：避免 provider cancel 差异和复杂调度。

## 5. Queue timeout vs inference timeout

```text
QUEUE_TIMEOUT
```

表示请求没有获得算力。

```text
INFERENCE_TIMEOUT
```

表示已经开始但 provider/model 未在时限内完成。

必须分别记录 queueLatency / inferenceLatency。

## 6. [FROZEN] 取消

- `QUEUED`：从内存队列移除；
- `RUNNING`：能 cancel 就 cancel；不能则停止等待并 discard late result。

推理无真实世界副作用，因此取消后没有 Execution 那种 UNKNOWN。

## 7. [FROZEN] retry / repair

- transport 明确未开始：最多一次 retry；
- invalid structured output：最多一次 bounded repair；
- AUTO REASON escalation：最多按 Spec 一次路径升级；
- 不允许循环降级/升级。

## 8. [FROZEN] Runtime 重启

内存 queue / active inference 直接丢失并失败；调用方重新发起。

不建设恢复队列或 inference database。

---

## 当前正式约束：低并发确定性

v1 继续单 inference lane，business/background 轻量优先级；queue timeout 与 inference timeout 分离。显式 FAST/REASON 不暗换模型角色；AUTO 只按 ReasoningSpec 执行升级规则。retry 仅限确认未开始的安全 transport retry，结构化输出 repair 最多一次。

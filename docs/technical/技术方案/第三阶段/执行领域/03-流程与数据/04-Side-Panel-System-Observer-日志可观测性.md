---
docId: EXECUTION-DOC-03-04
title: 10 · Side Panel、System Observer 与日志可观测性
docType: observability
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 10 · Side Panel、System Observer 与日志可观测性

## 1. Side Panel 的 P0 地位

Side Panel 是 Browser Extension 的**一线运行事实面板**，不是装饰性 UI。

用户明确要求：

> 哪怕有问题，也要一眼感知到。

## 2. 首页信息架构

推荐按严重性排序：

```text
[Overall]
Extension ONLINE / STALE / OFFLINE
heartbeat freshness
Runtime connection

[Blocking Alerts]
UNKNOWN_SIDE_EFFECT
Human Decision pending
Action Permission
Runtime Stall
Worker UNKNOWN

[Workers]
Product / Dev / Test
roleRef / workerRef
page state
activity
last progress
current Task/Node/run

[Executions]
in-flight executionRef
stage
status

[System Observer]
latest assessment
last observation
recommendations
```

## 3. Worker Detail

至少展示：

```text
roleRef / workerRef
URL identity
Tab / content session freshness
IDLE/BUSY/BLOCKED/UNKNOWN
activityKind
lastProgressAt / lastProgressKind
Task / Node / run
current executionRef
continuationRef / waiting reason
recent errors
```

## 4. Execution Detail

按 `executionRef` 下钻：

```text
Capability
Target
COMMAND_ACCEPTED
PRECONDITION_VERIFIED
EFFECT_STARTED
RESULT_REPORTED
Final status
sideEffectState
Precondition summary
Evidence refs / screenshot
Error / retryable
Recovery history
Recent structured logs
```

## 5. 状态真实性

Panel 不存业务真源。

- ONLINE = current session heartbeat；
- Worker binding = current browser reality；
- Task/Node = Task API；
- Execution = runtime record；
- Collaboration = Agent API。

不允许 persisted old `ONLINE/READY` 直接显示为绿色。

## 6. Human Decision Control

Side Panel 可以作为 P0 的 Human Decision 展示/承接入口：显示问题、Evidence、选项和 continuation 状态；但点击后的正式结果仍通过 Runtime/Task Driver 的 continuation contract 生效，Panel 本身不成为 Approval/Decision 真源。未来通知渠道（例如飞书机器人）可并存。

## 7. Visual Semantics

具体颜色由 UI 后定，但语义要明确：

```text
Healthy
Working
Waiting/Blocked
Stale
Unknown/Critical
```

UNKNOWN/STALE 必须明显，不允许被“默认绿色”掩盖。

## 8. System Observer

Observer 是独立只读线：

- lowest priority；
- business busy 时让路；
- screenshot/deep observe 不得抢占或扰动 active Worker 的页面焦点/写入现场；如果会干扰就延后；
- 观察到系统从异常恢复后，可以在后续报告中明确“recovered”，但仍不自动执行恢复动作；
- 低成本 heartbeat/state/log summary 可周期；
- heavy screenshot/log review/model judgement 只在 idle；
- 不 auto recover；
- 不推进 Task；
- 输出 stability assessment + suggestions。

可报告：

```text
HEALTHY
DEGRADED
UNSTABLE
UNKNOWN
```

具体 enum 可在 UI implementation 冻结，但必须区分“系统观察建议”和“业务执行状态”。

## 9. Log Persistence

v1 日志必须落盘到 `.ai-agent-platform`，因为失败分析是平台核心能力。

推荐层级：

```text
.ai-agent-platform/
└── logs/
    ├── execution-runtime/
    ├── execution-local/
    └── browser-extension/
```

Browser Extension 不能直接随意写 workspace 文件，应通过本地 runtime 接口提交结构化日志持久化。

## 10. Log Linking

最重要的链接键：

```text
executionRef
correlationId
taskId
nodeId/runNo
roleRef/workerRef
capability
component
```

v1 不要求 `productRef`。

## 11. Redaction

日志中：

- Authorization/Bearer；
- tokens；
- password；
- cookies；
- private key；
- `.env` secret values；

必须 redacted。

允许保留变量名、mask、hash、existence 以支持排障。

## 12. 不建设独立 Observability/Logging Domain

这些是横切实现约定，v1 不建立 logging service/db/dashboard platform。

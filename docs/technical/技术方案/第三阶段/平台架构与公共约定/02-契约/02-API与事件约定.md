---
docId: PLATFORM-DOC-02-02
title: 03｜API 与事件约定
docType: cross-domain-contract
authority: normative
lifecycle: frozen
domain: platform
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 03｜API 与事件约定

> 状态：FROZEN  
> 目标：统一跨领域命令、查询、事件、幂等、错误与异步结果的交互规则。

---

# 1. Public API 必须由 Owner 定义

一个 Public API 必须能明确回答：

```text
Owner 是谁？
解决哪个领域用例？
输入 Contract 是什么？
成功结果是什么？
失败语义是什么？
是否幂等？
是否有并发版本？
是否产生 Event？
是否有副作用？
```

禁止为了“方便调用”暴露：

```text
通用 update(any)
通用 setStatus(status)
直接数据库 CRUD
领域内部 Repository API
```

---

# 2. Command 与 Query 分离

## Query

Query：

```text
MUST NOT 改变业务状态
```

允许技术副作用：

```text
cache
metrics
trace
```

但不能改变领域事实。

## Command

Command 表达：

> 请求领域做一件有业务含义的事。

Command：

```text
MAY 成功
MAY 被拒绝
MAY 进入异步处理
MAY 产生 Event
```

命名应体现业务意图：

```text
authorizeTask
bindTaskWorker
executeCapability
resumeTask
```

而不是：

```text
updateTask
patchExecution
setState
```

除非该 API 的真实业务语义就是通用资源编辑。

---

# 3. API 不等于 HTTP

Public Contract 可以通过：

```text
HTTP
in-process Port
Message Bus
MCP（future / non-v1 adapter only）
A2A
CLI Adapter
```

传输。

领域 API 定义的是语义，不应把：

```text
HTTP status
Express Request
数据库对象
```

直接变成领域语义。

---

# 4. 同步与异步

如果动作可以在一次调用内确定完成：

```text
可同步返回结果
```

如果动作需要：

```text
外部系统
长时间执行
Human Approval
设备执行
异步 Worker
```

应返回稳定接受事实，例如：

```text
executionRef
taskId + nodeId + runNo
collaborationMessageRef
```

之后通过：

```text
Query
Event
Callback
Wake / Resume
```

获得最终结果。

禁止让一个 HTTP 请求假装承担长期 Workflow 生命周期。

---

# 5. 事件只表达“已经发生的事实”

Event Type：

```text
SHOULD 使用过去事实语义
```

例如：

```text
TASK_COMPLETED
WORK_REQUESTED
EXECUTION_DELIVERED
AGENT_HANDOFF_COMPLETED
PROVIDER_BECAME_UNAVAILABLE
```

Event 不应写成：

```text
PLEASE_EXECUTE
DO_TASK
TRY_AGAIN
```

这类属于 Command / Request。

---

# 6. Event 是 immutable fact

发布后的领域事件：

```text
MUST NOT 被修改
```

错误修正通过新的事件表达。

例如：

```text
错误：
修改旧 EXECUTION_SUCCEEDED payload

正确：
发布 EXECUTION_RESULT_CORRECTED
```

是否允许 correction event 以及名字由领域定义。

---

# 7. Event Producer 是事实 Owner

只有拥有事实的领域可以发布该事实事件。

例如：

```text
执行领域
→ 发布 EXECUTION_DELIVERED

任务领域
MUST NOT 代替执行领域发布 EXECUTION_DELIVERED
```

Task 可以发布：

```text
TASK_WORK_RESULT_ACCEPTED
```

但不能伪造 Execution 事实。

---

# 8. Event Consumer 必须容忍重复交付

平台异步 Event 默认不得假设 exactly-once transport。

消费者：

```text
MUST 具备幂等消费能力
```

可以使用：

```text
eventId
business key
consumer checkpoint
```

去重。

“Transport 至少一次”与“业务动作恰好一次”是不同问题。

---

# 9. API 幂等

下列操作默认必须设计幂等：

```text
Task create / authorize / bind / Node write command
Execution capability submit / Effect Approval
Collaboration message / physical delivery report
External result report
Deployment Apply
```

如果同一个请求被重复提交：

```text
不能创建两个不可区分业务事实
```

尤其真实副作用必须区分：

```text
重复请求
重复派发
重复 Delivery
重复 Result
```

---

# 10. 并发控制

涉及版本化状态的 Command：

```text
SHOULD 使用 expectedVersion
```

如果版本冲突：

```text
MUST 拒绝或要求调用方重新读取
MUST NOT 静默 last-write-wins
```

若领域选择其他并发控制方式：

```text
必须在 Public Contract 中明确
```

---

# 11. Retry 与副作用

调用方不能只根据：

```text
HTTP 500
TIMEOUT
连接断开
```

自动判断可以 Retry。

必须看领域语义：

```text
retryable
sideEffectCertainty
delivery state
idempotency
```

尤其执行领域：

```text
UNKNOWN / UNCERTAIN
```

时不得盲目重新执行真实副作用。

---

# 12. Error Contract

错误码命名：

```text
<DOMAIN>_<SEMANTIC>
```

例如：

```text
TASK_VERSION_CONFLICT
AGENT_WORKER_NOT_FOUND
EXECUTION_DELIVERY_UNCERTAIN
INFERENCE_PROVIDER_UNAVAILABLE
DEPLOYMENT_MODULE_NOT_FOUND
```

领域拥有业务错误码。

公共约定只拥有：

```text
Error Envelope
category
retryable
correlation
```

---

# 13. Public API 的最小文档

每个 Public API 至少记录：

```text
Purpose
Owner
Request
Response
Errors
Idempotency
Concurrency
Side Effect
Events
Version
Consumers
```

如果某项不适用：

```text
明确写 N/A
```

不要省略导致消费者猜测。

---

# 14. Provides / Requires 对齐

跨域接口设计时必须形成成对关系：

```text
Domain A Provides X v1
Domain B Requires X v1
```

禁止：

```text
A 提供 execution.status
B 却依赖 execution.internalState
```

最终五域接口矩阵至少要检查：

```text
Provider
Consumer
Contract
Version
Direction
Sync / Async
Owner
Compatibility
Status
```

---

# 15. Wake / Notification 的语义

Wake / Signal / Notification：

> 只表示“某个主体应重新检查状态或继续工作”。

它不自动等于：

```text
结果
响应
业务完成
任务推进
```

接到 Wake 后：

```text
消费者 SHOULD 重新读取 Owner 的最新 Public State / Context
```

不能把 Wake payload 当成新的事实真源。

---

# 16. Human Approval

Approval **不是独立 Domain**。Task authorization 归 Task；真实 Effect Approval 归 Execution；其他领域只传递 owner-defined `approvalRef`。若某个 Owner 的 Approval 作为准入的一部分：

```text
必须拥有稳定 approvalRef
必须绑定具体 action / scope / fingerprint
必须有状态
必须有批准者 / 时间
必须避免把批准扩张到未审动作
```

批准事件与执行事件必须分开：

```text
APPROVAL_GRANTED
≠
EXECUTION_DELIVERED
≠
EXECUTION_SUCCEEDED
```

批准只代表：

> 允许执行指定动作。

---

# 17. API 演进

Public API 新增字段、修改 enum、修改错误、修改事件，是否兼容：

> 一律按 `04-版本与兼容性约定.md` 判断。

禁止“代码能编译”就视为兼容。

---

# 18. 外部协议适配

MCP（future / non-v1）/ A2A / AG-UI 等外部协议：

```text
由 Adapter 把外部协议映射到领域 Public Contract
```

禁止：

```text
因为接入 MCP 就让整个执行领域内部模型变成 MCP Schema
因为接入 A2A 就让 Agent 内部消息完全等于 A2A Task
```

协议适配层保护领域语义不被外部协议绑死。

---

## 当前正式约束：不建设 Global Event Bus

v1 不建设全局 Event Bus/Event Domain。TaskEvent、CollaborationMessage、Execution Result 各归 Owner；主链优先 Public API + 明确 wake/poll/delivery。既有事件约定继续适用于某领域确实公开的 immutable fact，但不得据此强制所有跨域协作事件化。

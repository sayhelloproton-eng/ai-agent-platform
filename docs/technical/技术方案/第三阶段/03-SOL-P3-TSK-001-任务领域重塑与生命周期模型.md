# SOL-P3-TSK-001｜任务领域重塑与生命周期模型

> 优先级：P0，与公共领域并行设计。  
> 原则：先明确需求和不变量，再设计状态枚举；不要从当前 `packages/task-control` 的字段出发做增量 Patch。

## 1. 任务领域的需求目标

Task Domain 是全平台 Durable Coordination 的事实所有者。

它需要回答：

- 当前 Task 目标是什么；
- 当前 Plan / Node 在哪里；
- 下一步谁有资格推进；
- 哪些 Work 已创建；
- 哪些执行正在等待业务条件；
- 哪些执行已经发生不可逆副作用；
- 哪些 continuation 还未完成；
- crash / retry / replay 后平台应该做什么。

## 2. Phase 2 暴露的结构问题

### 2.1 Waiting 与 Lease 混合

Approval 等待不应该不断 claim / reclaim。

### 2.2 Delivery 与 Completion 混合

Browser side-effect 已 Delivery 后，后续 response failure 不应反向修改 execution fact。

### 2.3 Execution 与 Continuation 混合

Browser action 成功、Controller continuation 失败，必须是两个不同事实。

### 2.4 Failure 语义过度汇总

必须能够回答到底是：

- Work execution failed；
- approval expired；
- delivery failed；
- continuation failed；
- controller failed；
- recovery required。

## 3. 候选领域对象

Phase 3 可重命名，但建议先从职责而非表结构出发：

```text
Task Aggregate
Plan / PlanNode
ControllerLease
Work
ExecutionAttempt
Dispatch / Delivery
BusinessWait
ApprovalDependency
Continuation
Event / Cursor
RecoveryDecision
```

其中 `ExecutionAttempt` 是否需要成为正式实体，需要通过状态机设计决定，而不是为了保留旧字段。

## 4. 必须冻结的不变量

### INV-1 Delivery 不可逆

一旦一个有副作用 Execution 的 Delivery 被确认，该 Delivery Fact 永久成立。

### INV-2 No Blind Retry

副作用状态 UNCERTAIN 时不自动重发同一 mutation。

### INV-3 Business Wait 不持有 Execution Lease

等待人、等待外部条件、等待 Controller busy 结束，都不应伪装成长期执行。

### INV-4 Claim 只表达短期所有权

Claim / Lease 不是业务状态。

### INV-5 Continuation 独立

执行完成后需要重新唤醒 Controller，应创建 / 记录 continuation 事实，不反向污染已完成 execution。

### INV-6 Event 可重建关键协调事实

状态转移要有稳定事件语义，能够支持恢复 / 审计 / simulator。

## 5. 候选生命周期（非最终枚举）

### Work

```text
CREATED
→ READY
→ WAITING_DEPENDENCY / WAITING_APPROVAL
→ READY_TO_EXECUTE
→ EXECUTING
→ SUCCEEDED | FAILED | UNCERTAIN | CANCELLED
```

### Delivery / Execution

```text
PREPARED
→ CLAIMED
→ EXECUTING
→ DELIVERED
→ RESULT_REPORTED
```

对于某些 capability，`DELIVERED` 本身即可作为 success boundary；对于需要执行后 Result 的 capability，Result 仍可跟随，但不能否认已发生的 Delivery。

### Continuation

```text
PENDING
→ DEFERRED_BUSY
→ READY
→ DELIVERING
→ DELIVERED
→ CONSUMED / FAILED
```

## 6. 与 Execution Flow 的边界

建议区分：

- **Plan**：Task 领域拥有，可修订，表达业务意图和阶段进度；
- **Execution Flow**：Runtime 执行的有界声明式 contract，不拥有 Durable Task 生命周期。

Controller 可以决定“下一步使用哪个 Flow / Capability”，Task 记录 durable coordination，Runtime 执行有界 Flow。

## 7. 必须先写的测试

实现前必须有 simulator / fake-clock 测试覆盖：

- Approval 比 Claim 早 / 晚；
- Claim 到期时 Grant 到达；
- Delivery 后 Host crash；
- Result report 重放；
- Controller busy；
- continuation delivery 重放；
- UNCERTAIN mutation；
- cancellation；
- duplicate request / idempotency fingerprint conflict。

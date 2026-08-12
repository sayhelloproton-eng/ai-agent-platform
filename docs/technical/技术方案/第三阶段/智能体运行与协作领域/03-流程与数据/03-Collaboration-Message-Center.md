---
docId: AGENT-DOC-03-03
title: 智能体运行与协作领域｜Collaboration Message Center
docType: domain-capability
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Collaboration Message Center

> v1 只实现两个角色侧协作意图：`askPeer` 与 `replyPeer`。

---

# 1. 为什么 Collaboration 属于 Agent Domain

真实开发中产品、研发、测试会反复确认信息：

```text
测试：需求这里不明确
→ 问产品
→ 产品回复
→ 测试继续
```

这不是 Task Workflow：

```text
Message ≠ Node
Message ≠ reopen
Message ≠ WorkItem
Message ≠ Task Event
```

因此由 Agent Runtime & Collaboration Domain 保存协作事实，Task 仍只维护正式任务/节点事实。

---

# 2. 角色只需要两个 Action

```text
askPeer(...)
replyPeer(...)
```

角色不关心：

```text
目标在哪个 Tab
Browser 是否在线
如何打开 GPT
如何恢复 c-id
如何重试注入
```

这些属于 Message Center + Browser Extension。

---

# 3. 同一 Task 参与者约束

协作**只能发生在同一 Task 已正式绑定的参与者之间**。

推荐角色表达目标使用稳定 Agent Package 语义：

```text
askPeer(
  taskId,
  targetAgentPackageRef,
  content,
  idempotencyKey
)
```

Agent Runtime：

```text
authenticatedRoleRef
+ taskId
+ targetAgentPackageRef
→ Task Public API 查询 Task participant/bindings
→ 校验 sender 是 Task participant
→ 解析 target package 对应的 task roleRef + workerRef
→ 创建 Message
```

模型不应该直接指定任意 `targetWorkerRef` 去给外部 GPT 发消息。

`replyPeer`：

```text
replyPeer(threadId, content, idempotencyKey)
```

回复对象由 Thread 当前等待方自动决定，模型不能换收件人。

---

# 4. 多轮，但严格一问一答

同一个 Thread 允许：

```text
Q1 → A1 → Q2 → A2 → Q3 → A3 ...
```

禁止：

```text
Q1
├── Q2（A1 未反馈）
└── Q3（A1 未反馈）
```

并且“已反馈”的正式门槛已经冻结为：

> **A1 必须已经被 Browser Extension 真实投递回原发问 Worker，并记录为 `DELIVERED`，才允许 Q2。**

仅仅 reply 已经写入 SQLite 不算反馈完成。

---

# 5. Thread 最小状态

推荐：

```text
OPEN_AWAITING_REPLY
OPEN_REPLY_PENDING_DELIVERY
OPEN_CAN_ASK
```

含义：

```text
OPEN_AWAITING_REPLY
= 当前有一个 QUESTION，等待目标 Worker 生成 reply

OPEN_REPLY_PENDING_DELIVERY
= reply 已 durable，但尚未真实投递回原发问 Worker

OPEN_CAN_ASK
= reply 已 DELIVERED，原发问 Worker 可以继续下一问
```

是否进一步压缩字段可以在实现中做，但业务状态门槛不能改变。

---

# 6. Message

最小持久化事实：

```text
messageId
threadId
taskId
kind = QUESTION | REPLY
fromRoleRef
fromWorkerRef
targetRoleRef
targetWorkerRef
replyToMessageId
content
status
createdAt
deliveryAttemptCount
lastDeliveryErrorCode
deliveredAt
version
```

消息状态至少区分：

```text
PENDING
DELIVERED
```

失败尝试保留 error/attempt 信息；不需要为了每一种 transport 结果发明复杂业务状态机。

---

# 7. askPeer

核心校验：

```text
1. Task 必须仍可处理（非终态）
2. authenticated sender role 是 Task participant
3. sender workerRef 与 Task binding 一致
4. targetAgentPackageRef 对应同 Task 的 participant
5. target worker 已绑定
6. Thread 若已存在，当前必须 OPEN_CAN_ASK
7. idempotencyKey 合法
```

正常流程目标 Worker 已在 Task 启动初始化时绑定。

防御错误：

```text
TARGET_WORKER_NOT_BOUND
```

但 Agent Runtime **不能因此创建 Worker**。

创建 QUESTION 后：

```text
Message = PENDING
Thread = OPEN_AWAITING_REPLY
```

---

# 8. replyPeer

校验：

```text
Thread 存在
当前 caller 正是等待回复的 role/worker
当前有唯一未回复 QUESTION
不能改 target
不能重复不同内容回复同一 QUESTION
idempotency 合法
Task 尚未终态
```

reply durable 后：

```text
Reply = PENDING
Thread = OPEN_REPLY_PENDING_DELIVERY
```

只有：

```text
Browser Extension
→ 将 Reply 真实注入原发问 Worker
→ reportCollaborationDelivery(replyMessageId, DELIVERED)
```

才：

```text
Reply = DELIVERED
Thread = OPEN_CAN_ASK
```

此后才允许下一次 `askPeer`。

---

# 9. Extension Delivery API

这些不是 GPT Action：

```text
listPendingCollaborationMessages(...)
reportCollaborationDelivery(...)
```

Extension：

```text
pending message
→ getRegisteredRole(targetRoleRef)
→ task targetWorkerRef
→ open/restore exact Conversation
→ inject PEER_MESSAGE
→ obtain real receipt
→ report delivery
```

同一个 `messageId` 的 Delivery 必须幂等，Extension reload / duplicate polling 不得导致重复注入。

---

# 10. Task terminal

冻结：

> **Task 终态就是终态，不再处理该 Task 的协作消息。**

当 Task 已终态：

```text
askPeer/replyPeer → reject/no-op according to final public error contract
Extension → 不再投递该 Task pending Collaboration
```

Task 进入终态前已经持久化的消息：

```text
作为既有协作记录保持不可变
```

不要为了 Task terminal 把它们统一改写为：

```text
CANCELLED
TASK_TERMINAL
```

等新 Agent 业务状态。

既有协作记录不能阻塞、恢复或改变 Task 终态。

---

# 11. 持久化边界

Message Center durable 保存：

```text
Thread
Message
sender/target participant refs
content
createdAt
reply relation
delivery attempts
delivery error
deliveredAt
idempotency
```

明确不保存：

```text
完整 Custom GPT Conversation transcript
Task Requirement/PRD/Technical Design 正文副本
Worker 全量上下文
Execution logs 的副本
```

这些继续由各自事实 Owner 提供。

---

# 12. 与 Task Workflow 的关系

`askPeer/replyPeer` 默认不改变：

```text
Task.status
Node.status
runNo
currentNodeId
```

如果 Worker 真正需要暂停当前 Node，另行使用 Task Domain 正式意图，例如 `waitNode`。

协作和 Workflow 是两套不同业务语义。

---

## 当前正式约束：logical collaboration vs physical delivery

- Agent owns CollaborationThread/CollaborationMessage 与 logical delivery intent/state。
- 把消息真实提交到目标 GPT Conversation 是 Execution Browser Effect；Agent 必须依据 Execution typed result/evidence 更新 logical delivery state。
- `askPeer/replyPeer` 成功不等于页面已收到；严格串行规则保持：reply 必须物理 DELIVERED 后才能开启下一问。
- CollaborationMessage 与 TaskMessage 不合并；不建设全局 Message/Event Bus。

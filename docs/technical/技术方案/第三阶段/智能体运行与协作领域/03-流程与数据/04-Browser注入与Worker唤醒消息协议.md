---
docId: AGENT-DOC-03-04
title: 智能体运行与协作领域｜Browser 注入与 Worker 唤醒消息协议
docType: carrier-flow
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Browser 注入与 Worker 唤醒消息协议

> 本文定义 Agent Domain 与 Execution Browser 之间的**Worker Wake 逻辑消息契约**。Execution 可以调整内部传输实现，但不得改变 trigger 语义、身份边界和事实 Owner。目标是让 Custom GPT Conversation 明确知道“为什么被唤醒”，避免依赖自由文本或 Conversation 既有内容猜测当前业务事件。

---

# 1. 为什么需要显式消息协议

v1 Worker 是 Custom GPT Conversation，同一个 Worker 会被多次唤醒：

```text
Task 启动时建立 Worker
Node 第一次 READY
跨角色问询/回复
reopen 后重新研发
后续 Node/任务反馈
```

如果 Extension 只注入：

```text
“继续处理任务”
```

Worker 无法稳定区分：

- 当前是否真的允许执行 Node；
- 是普通继续还是 reopen；
- 是 peer question/reply 还是 Workflow 变化；
- 当前 runNo 是否变化。

因此 v1 定义四类显式 trigger。

---

# 2. 通用 Envelope

逻辑结构：

```json
{
  "protocol": "aap.agent.browser-trigger.v1",
  "triggerId": "trigger-...",
  "triggerType": "WORKER_BIND | NODE_READY | REOPEN | PEER_MESSAGE",
  "taskId": "task-...",
  "roleRef": "g-...",
  "workerRef": "conversation-id",
  "occurredAt": "...",
  "payload": {}
}
```

字段语义：

| 字段 | Owner/来源 | 说明 |
|---|---|---|
| protocol | Agent/Browser adapter contract | 消息版本 |
| triggerId | Extension/Delivery intent | 防重复投递关联 |
| triggerType | Extension 根据正式待办类型映射 | 不由模型猜 |
| taskId | Task fact | 当前 Task |
| roleRef | Task binding / Agent registry | 当前角色 |
| workerRef | Task binding / page identity | 当前具体人员 |
| occurredAt | 触发生成时间 | 非 Task version |
| payload | 对应 Owner 的事实投影 | 不夹带另一个领域的自创状态 |

这是一种**注入给 Worker 的上下文 envelope**，不是 Task Domain 的状态机 Contract。

---

# 3. WORKER_BIND

用途：Task 正式启动后，Extension 创建研发/测试 Conversation，立即建立具体 Worker 身份和 Task 关系，但对应 Node 可能尚未 READY。

建议 payload：

```json
{
  "binding": {
    "roleRef": "g-...",
    "workerRef": "..."
  },
  "task": {
    "taskId": "task-...",
    "title": "...",
    "objective": "..."
  },
  "instruction": "当前仅完成工作人员绑定。除非收到 NODE_READY / REOPEN / PEER_MESSAGE，或者用户直接提出新指令，否则不要自行推进未 READY 的 Task Node。"
}
```

关键规则：

- WORKER_BIND 不代表 Node READY；
- 不调用 completeNode；
- Worker 只获得完成身份绑定所需的最小 Task/Role/Worker 背景；大型 Task 文档不通过 WORKER_BIND 注入；
- Worker 可在上下文不明时主动查询，但不能自行推进 Workflow。

---

# 4. NODE_READY

用途：Task Domain 已判定当前 Node 可执行，Extension 唤醒已绑定 Worker。

建议 payload：

```json
{
  "node": {
    "nodeId": "node-dev",
    "title": "...",
    "objective": "...",
    "status": "READY",
    "runNo": 1,
    "requiredRoleRef": "g-...",
    "expectedTaskVersion": 12,
    "expectedNodeVersion": 3
  },
  "contextHint": {
    "useConversationContext": true,
    "queryTaskIfNeeded": true,
    "queryLocalResourcesIfNeeded": true,
    "askPeerIfNeeded": true
  }
}
```

Extension 不需要把所有 Task Markdown 全量塞入消息；Worker 先按需 `getNodeContext`，Custom GPT Carrier 再优先用 File Bridge 取得对应 TaskDocument。

Task/Node version 是否直接出现在注入正文以及 startNode 的精确顺序，最终由 Task + Browser/Execution 联合合同决定。

---

# 5. REOPEN

用途：Task Domain 已执行 reopen，原 Worker 必须继续新 run。

payload 必须来自 Task Domain 正式 reopen projection：

```json
{
  "node": {
    "nodeId": "node-dev",
    "runNo": 2,
    "status": "READY"
  },
  "reopenContext": {
    "fromRunNo": 1,
    "runNo": 2,
    "reason": "测试不通过，需要重新研发",
    "reopenedByRef": "...",
    "reopenedAt": "...",
    "relatedRefs": ["document:TEST_RESULT"]
  }
}
```

MUST：

```text
roleRef = Task 原角色
workerRef = Task role binding 原 worker
```

MUST NOT：

- 新建 Worker；
- Extension 自己改写/概括成不同 reopen reason；
- 只写“继续”；
- 把旧 run 当当前 run。

---

# 6. PEER_MESSAGE

用途：投递 Agent Collaboration Message。

建议 payload：

```json
{
  "collaboration": {
    "threadId": "thread-...",
    "messageId": "msg-...",
    "kind": "QUESTION | REPLY",
    "fromRoleRef": "g-...",
    "fromWorkerRef": "...",
    "targetRoleRef": "g-...",
    "targetWorkerRef": "...",
    "replyToMessageId": "msg-q1",
    "content": "..."
  }
}
```

Worker 收到：

- QUESTION → 理解/处理后使用 `replyPeer`；
- REPLY → 根据原 thread 继续当前工作，若确有新问题且 Thread 已允许，可下一次 `askPeer`。

PEER_MESSAGE 本身不表示 Task Node 状态变化。

---

# 7. Worker Instructions 必须包含的触发规则

三个 Agent Package 的 Instructions 至少应包含同类规则：

```text
1. 识别平台注入的 triggerType。
2. WORKER_BIND 只建立任务/人员上下文，不主动执行未 READY Node。
3. NODE_READY 表示当前角色对应 Node 已进入可执行状态。
4. REOPEN 表示新的 run，必须优先理解 reopenContext 和相关结果。
5. PEER_MESSAGE 是协作，不等于 Workflow 状态变化。
6. 上下文不明确时主动查 Task / Execution / Peer，不盲猜。
7. 完成节点调用 completeNode；等待调用 waitNode；需要回退由有权限角色调用 reopenNode。
8. 不直接 set/advance/change Task status。
```

---

# 8. triggerId 与重复保护

Extension 可能因重启/轮询重复看到同一待办。

规则：

```text
triggerId = 对应业务待办/Delivery intent 的稳定 ref
```

例如：

```text
NODE_READY → taskId + nodeId + runNo 对应稳定 wake intent
REOPEN     → reopen event/ref
PEER_MESSAGE → messageId
```

Browser/Execution 侧必须保证同一 trigger intent 不产生无条件重复输入。

如果真实页面是否已提交不确定，先观察/恢复，不盲 Retry。

---

# 9. Extension 在页面中必须识别的 Carrier Identity

v1 ChatGPT Web：

```text
Role page     → g-id
Conversation  → c-id
```

Extension 对受管页面应能得到：

```text
observedRoleRef
observedWorkerRef
pageUrl
```

投递前校验：

```text
observedRoleRef == expected roleRef
observedWorkerRef == expected workerRef
```

否则拒绝提交，避免错 Tab/错 Conversation。

这条直接继承 既有实验实现 Browser Host 的“目标页面身份/Binding 必须真实校验”的经验，但 v1 的具体实现由 Browser/Execution 技术方案冻结。

---

# 10. Task human authorization 与 Conversation provisioning 的跨系统现实

Task human authorization、Task 持久状态与两个外部 Web Conversation 的创建不可能形成一个跨系统数据库事务。

业务顺序已经冻结：

```text
user authorizes Task
→ Execution Browser CREATE/identify dev → Agent validate → Task bindTaskWorker
→ Execution Browser CREATE/identify test → Agent validate → Task bindTaskWorker
→ required bindings complete
→ startTask (READY → ACTIVE)
→ startNode (Task resolves TaskRoleBinding)
→ RESTORE/WAKE/NODE_READY
→ formal Node work
```

`startTask` 的正式前置条件是 required TaskRoleBinding 全部齐备；`startNode` 成功后才允许对对应 Worker 发起业务 WAKE。不得提前启动 Node work。

每一步必须可查询当前 Task roleBindings，重启后继续缺失步骤：

```text
dev 已绑定 / test 未绑定
→ 只创建 test
→ before test bound: no NODE_READY business work
```

禁止“失败就从头重建两个 Conversation”。

这要求 Task `bindTaskWorker` 是 one-time + idempotent。

---

# 11.  NODE_READY 与 startNode 顺序

架构顺序已冻结；真实 Browser E2E 只验证 transport/recovery，不再重开 ownership/order：

```text
方案 A：
Task startNode 成功
→ Browser one-time NODE_READY submit
→ submit 失败则 Node IN_PROGRESS 但 Worker 未收到，需要可靠恢复投递

方案 B：
Browser prepare/verify target
→ Task startNode
→ one-time submit
```

禁止采用以下顺序：

```text
先真实提交 NODE_READY
→ 再 startNode
```

因为 Worker 可能已经开始 Action，而 Task 仍是 READY。

该顺序在落地前仍标记为 `PENDING_DECISION`；无论最终选择方案 A 或 B，都必须满足：

- stable wake intent id；
- target identity check；
- recoverable pending delivery；
- no blind duplicate submit。

Worker identity 必须可验证；具体 Carrier identity provider 属于实现与 E2E 选择，并可保留 `PENDING_SPIKE`，但不得改变 Agent/Task/Execution 的既定 ownership。


---

# 12. Product pre-Task Carrier Context 不属于 WORKER_BIND

产品 Worker 已由用户在 Task 前主动创建，Extension 的 Task start `WORKER_BIND` **不负责产品 Worker 创建**。

产品 createTask 前需要可靠取得以下 Carrier identity；Carrier Context Action 只是 `PENDING_SPIKE` 路径：

```text
roleRef / g-id
workerRef / c-id
conversationUrl
```

当前不得假设 Action 原生提供稳定 c-id。当前可靠证据来源保留 Execution Browser / Carrier observation；Action 若真实 E2E 通过，可升级为更轻 provider，但不得把产品流程改造成 Task-driven worker creation。

---

# 13. Custom GPT 动态上下文传输：Browser 只做小控制面

对于 Custom GPT Carrier，Browser trigger 的职责收敛为：

```text
taskId
nodeId（如适用）
runNo（如适用）
roleRef
workerRef
triggerType
必要的 expected versions / continuation ref
极短 instruction
```

Browser **不再默认注入**：

```text
完整 Requirement / PRD / Technical Design
测试报告
代码包 / patch 全文
长日志
大型 JSON/CSV/PDF
```

大型动态上下文优先由 Worker 调用 Action，从 Task/Execution Public Contract 获取，并由 Gateway 使用 `openaiFileResponse` 放入当前 Conversation。

`openaiFileIdRefs` / `openaiFileResponse` 是 Carrier transport；TaskDocument/Execution Artifact ownership 不改变。

一次 WAKE 启动的是一个 Worker Turn，而不是“一个 Action”。同一个 Turn 内可以继续调用多个受控 Action；**Browser 不在每个 Action 之间机械再次 WAKE**。该实际行为进入真实 Carrier E2E，继续标记为 `PENDING_SPIKE`。若 Multi-Action 在目标环境不稳定或 Spike FAIL，则回退为 **bounded multiple Worker Turns**：每个新 Turn 开始前重新读取 owning Domain 的最新 facts/version/continuation，依据已持久化的 Action/Execution refs 判断前序结果，**不得重放已经成功的 Action 或 Effect**；仅在 Turn 边界按需再次 WAKE。fallback 仍只使用 small control text + File Bridge，不恢复大型 DOM 注入。

File Bridge 对图片是非对称的：平台不能通过 `openaiFileResponse` 返回 image/video，因此 screenshot / Vision 仍由 Execution Browser + Model Vision 路径承担。

## 当前正式约束：协议 Owner 与 WAKE 边界

本文的 WORKER_BIND/NODE_READY/REOPEN/PEER_MESSAGE 载荷语义保留；实际 Browser protocol 的 Owner 改为 Execution Domain。Agent 只定义其中 Role/Worker/Collaboration 所需的 opaque identity/intent。WAKE 不承担大型 Task Context 传输；GPT Actions File Bridge 已纳入 Custom GPT Carrier transport contract。Conversation-native file search、Code Interpreter Context Pack/Patch、Always Allow 与 Multi-Action Turn 的平台实际稳定性继续按 `PENDING_SPIKE` 验证。

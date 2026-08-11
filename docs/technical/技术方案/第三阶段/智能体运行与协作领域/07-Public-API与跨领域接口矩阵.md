# 智能体运行与协作领域｜Public API 与跨领域接口矩阵

> 本文区分：`CONFIRMED Agent API`、`REQUIRES existing API`、`CROSS-DOMAIN CHANGE`。不得把跨域变更写成已由对方领域落地的既成事实。

---

# 1. Agent Domain Provides

## 1.1 Role Registry

### `listRegisteredRoles`

消费者：

```text
产品 Worker（创建 Task 前）
Browser Extension（按需）
Management UI（未来）
```

语义：返回当前工作区已注册 Role；可按 agentPackageRef 过滤。

### `getRegisteredRole`

消费者：

```text
Browser Extension
```

语义：`roleRef → carrierType/carrierUrl/package metadata`。

---

## 1.2 Agent Collaboration

### `askPeer`

消费者：Custom GPT Worker。

关键输入：

```text
taskId
fromWorkerRef
targetAgentPackageRef
threadId?
content
idempotencyKey
```

`fromRoleRef` 由 Gateway Key 确定，不由模型自报。Agent Runtime 通过 Task Public API 校验 sender/target 都是同一个 Task 的正式参与者，并把 `targetAgentPackageRef` 解析为该 Task 内实际 `targetRoleRef + targetWorkerRef`。模型不能把 askPeer 当任意 GPT 消息发送器。

### `replyPeer`

关键输入：

```text
threadId
fromWorkerRef
content
idempotencyKey
```

`taskId / replyToMessageId / target participant` 由 Thread 当前状态确定；实现可为版本/防御带上显式 expected ref，但模型不能自由更改回复目标。Reply 真实 `DELIVERED` 回原 Worker 后才允许同 Thread 下一问。

---

## 1.3 Extension Collaboration Delivery

### `listPendingCollaborationMessages`

消费者：Browser Extension。

### `reportCollaborationDelivery`

消费者：Browser Extension / Browser Execution Adapter。

最终 Browser Delivery/Receipt 字段应与 Execution Domain 对齐。

---

# 2. 本地管理面（不是 Public Action API）

```text
custom-gpt setup
custom-gpt field show/copy/export commands
role register
role show
role validate
role delete
role key show
role key rotate
```

`registerRole` 不作为 GPT Action。

---

# 3. Agent Domain Requires：Task Domain 现有 API

当前 Task v0.1 已有并应复用：

```text
createTask
listTasks
getTask
startTask
getNodeContext
startNode
completeNode
waitNode
failNode
reopenNode
putTaskDocument
getTaskDocument
listPendingMessages
```

Task Domain 当前明确 `canStart / blockedReason` 由自己计算；Extension 不复制规则。

---

# 4. CROSS-DOMAIN CHANGE：Task Role Bindings

本 Chat 新业务需要当前 Task v0.1 最小调整。

## 4.1 createTask 增加 Task-level role bindings

建议契约：

```json
{
  "roleBindings": [
    {
      "roleRef": "<product-g-id>",
      "workerRef": "<product-conversation-id>"
    },
    {
      "roleRef": "<dev-g-id>",
      "workerRef": null
    },
    {
      "roleRef": "<test-g-id>",
      "workerRef": null
    }
  ]
}
```

约束：

- roleRef 唯一；
- 每个 Node.requiredRoleRef 必须引用 Task 已声明 roleRef（建议）；
- product worker 可以创建时直接绑定；
- dev/test worker 启动时绑定。

## 4.2 新增一次性 Worker 绑定动作

建议最小 Public API：

```text
bindTaskWorker
```

概念请求：

```json
{
  "taskId": "task-001",
  "roleRef": "g-...",
  "workerRef": "conversation-id",
  "expectedTaskVersion": 5,
  "actorRef": "browser-extension",
  "idempotencyKey": "..."
}
```

规则：

- Task 必须包含该 roleRef；
- workerRef 为空才允许绑定；
- 相同值幂等；
- 已绑定不同 workerRef 禁止覆盖；
- Task 完成后不可修改；
- reopen 不清理 Task-level binding。

命名最终由 Task Domain/总纲裁决；语义必须保留。

## 4.3 getTask / Node Context 返回 binding

`getTask` 至少需要：

```text
roleBindings[]
```

Extension / Agent Collaboration 用于解析 targetWorkerRef。

---

# 5. CROSS-DOMAIN CHANGE：可驱动投影

Extension 需要稳定获得：

```text
哪个 Task/Node 可驱动
requiredRoleRef
该 Task roleRef 是否已有 workerRef
boundWorkerRef
canStart / canDrive
blockedReason
```

总纲可以选择：

### 方案 A：扩展 `listTasks` projection

优点：Extension 单次轮询足够。

### 方案 B：listTasks + getTask

优点：少改 listTasks；缺点：N+1 查询。

业务要求是“Task Domain 返回正式可执行性”，具体 API 形状由总纲决定。

---

# 6. CROSS-DOMAIN CHANGE：reopen Context

当前 Task v0.1 `reopenNode` 保存 reason/event，但 `getNodeContext` 尚未明确返回 reopen payload。

需要新增正式可消费信息：

```text
reopenContext? {
  reopened: true
  fromRunNo
  runNo
  reason
  reopenedByRef
  reopenedAt
  relatedRefs[]
}
```

Browser Extension 在 `REOPEN` 唤醒时必须把该正式信息注入原 Worker。

Extension 不自己拼 reopen 原因。

---

# 7. Task start/reopen 与 Node.workerRef 的兼容方案

当前 Task v0.1：

```text
reopenNode
→ target Node.workerRef = null
```

本 Chat：

```text
reopen 必须复用原 Worker
```

最小兼容设计：

```text
Task-level role binding 永久保留原 workerRef
Node-level workerRef 按 run 清空
Extension 新 run startNode 时从 Task binding 取同一 workerRef
```

所以不需要直接推翻现有 Node transaction。

---

# 8. Agent Domain Requires：Execution Domain

第一版需要 Public capability（最终名字由 Execution 领域设计冻结）：

```text
File:
readFile / listFiles / searchFiles / metadata

Git:
status / diff / log / branch

Code structure:
CodeGraph query / symbol / references / impact（按 v1 实现能力）

Dev env:
runtime version / dependencies / scripts

Build/Test:
build / test / lint / typecheck result

Runtime/Ops:
service / process / port / logs / health

Machine/Network:
resources / network / endpoint reachability

Mutation:
write/apply/runCommand/service actions under Execution policy
```

Agent Domain 不实现这些底层动作。

---

# 9. Agent Domain Requires：Deployment Domain

Agent Domain 已冻结七个独立发布单元，并要求每个包自己形成 setup/config/account/login/bind/lifecycle/verify 闭环。

Deployment Domain 需要提供统一的 **Package Lifecycle Protocol / Platform CLI orchestration**：

```text
package capability discovery
standard lifecycle command contract
dependency/order orchestration
command pass-through
status/verify aggregation
Runtime Home / config convention
version/installation records
```

每个 Agent Domain package 自己实现自己支持的：

```text
setup/configure/login/bind/start/stop/status/verify/doctor
+ package-specific commands
```

Deployment 不拥有：

```text
Role Registry business semantics
Collaboration Message
roleRef/workerRef binding semantics
Agent Instructions
Microsoft Dev Tunnel account/login implementation
Custom GPT Web setup implementation
```

这项对早期 Planner/Executor-owned apply 方案构成 CROSS-DOMAIN CHANGE。

---

# 10. Agent Domain ↔ Browser Extension

## Agent provides to Extension

```text
getRegisteredRole
listPendingCollaborationMessages
reportCollaborationDelivery
```

## Task provides to Extension

```text
listTasks / drive projection
startTask
bindTaskWorker (change)
getTask
startNode
```

## Extension reports / produces

```text
workerRef discovered from Conversation URL
Browser delivery result
current role/worker page observation / Carrier Context support（仅在真实 E2E 需要时）
```

Extension 不拥有领域状态。

---

# 11. Product Worker createTask 依赖链

```text
User ↔ new Product Custom GPT Conversation
→ full requirement discussion
→ getCurrentCarrierContext/current-link Action capability
→ listRegisteredRoles (Agent)
→ select roles by agentPackageRef
→ createTask (Task)
```

产品 Worker 在 Task 前已经存在，**不由 Task-driven Extension 创建**。

产品 `workerRef/c-id` 的可靠来源必须通过真实 Carrier E2E 冻结：优先满足“产品 GPT 通过 Action 获取当前链接/Carrier context”的需求；不能把“Action 请求一定自动携带 c-id”当作无证据前提，也不能为了取得产品 identity 先创建 Task。

若未来需要 Browser Extension 提供页面身份，也只能是 Carrier Context 的被动技术提供者，不得把产品前置工作流改造成 Task Scheduler 流程；是否需要该 fallback 由真实测试裁决。

---

# 12. API 身份与 actorRef

角色 Action：

```text
Bearer key → authenticatedRoleRef
workerRef → request + Task binding validation
```

`actorRef` 可以由 Gateway根据 authenticated role + validated worker 派生/规范化，而不是让模型自由伪造任意 actor string。

总纲应统一 actorRef 表达与平台各领域 opaque ref 规则。

---
docId: AGENT-DOC-02-01
title: 智能体运行与协作领域｜Public API 与跨领域接口矩阵
docType: contract
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜Public API 与跨领域接口矩阵

## 1. Agent Domain Provides

### 1.1 Role Registry

#### `listRegisteredRoles`

消费者：产品 Worker、Execution Task Driver、管理 CLI/UI。

语义：返回当前工作区已注册 Role；可按 `agentPackageRef` 过滤。输出只包含 Agent-owned Role facts，不携带 Task binding。

#### `getRegisteredRole`

消费者：Execution Task Driver / Browser coordination、管理面。

语义：`roleRef → carrierType / carrierUrl-or-gptId metadata / agentPackageRef / registeredPackageVersion`。

### 1.2 Worker identity

Agent Runtime 对 Worker identity 提供校验/解析能力，用于确认 `workerRef` 与 Role/Carrier 语义是否一致。TaskRoleBinding 的持久化仍归 Task Domain。

### 1.3 Collaboration

#### `askPeer`

关键输入：

```text
taskId
fromWorkerRef
targetAgentPackageRef
threadId?
content
idempotencyKey
```

`fromRoleRef` 由 Gateway credential 确定。Agent Runtime 通过 Task Public Contract 验证 sender/target 属于同一 Task，并将 `targetAgentPackageRef` 解析为该 Task 已绑定的 `targetRoleRef + targetWorkerRef`。

#### `replyPeer`

关键输入：

```text
threadId
fromWorkerRef
content
idempotencyKey
```

`taskId / replyTo / target participant` 由 Thread 当前状态确定，不允许模型自由改写回复目标。Reply 必须物理 `DELIVERED` 回原 Worker 后，同一 Thread 才能进入下一问。

### 1.4 Agent-internal delivery coordination

Execution Task Driver 可读取待投递 Collaboration Message，并把 Execution physical delivery result 回报给 Agent Runtime。该协调能力属于平台内部 contract，不自动暴露为 GPT Action。

## 2. Local management surface

以下是本地管理 CLI，不是 GPT runtime Action：

```text
custom-gpt setup/materialize/show
role register
role show
role validate
role delete
role key show
role key rotate
```

## 3. Requires｜Task Domain

Agent/Execution Task Driver 只通过 Task Public Contract 使用：

```text
createTask
listTasks
getTask
authorizeTask
bindTaskWorker
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

### TaskRoleBinding

`createTask` 必须能表达：

```json
{
  "roleBindings": [
    {"roleRef": "<product-role>", "workerRef": "<product-worker>"},
    {"roleRef": "<dev-role>", "workerRef": null},
    {"roleRef": "<test-role>", "workerRef": null}
  ]
}
```

规则：

- `roleRef` 在 Task 内唯一；
- Node.requiredRoleRef 必须指向 Task 声明角色；
- 产品 Worker 可创建 Task 时直接绑定；
- 研发/测试 Worker 在授权后 provisioning 时 one-time 绑定；
- 相同 workerRef 重放幂等；不同 workerRef 覆盖冲突；
- terminal Task 默认不允许修改 binding；
- reopen 保留 Task-level binding。

### `bindTaskWorker`

概念请求：

```json
{
  "taskId": "task-001",
  "roleRef": "g-...",
  "workerRef": "conversation-id",
  "expectedTaskVersion": 5,
  "actorRef": "execution-task-driver",
  "idempotencyKey": "..."
}
```

Task 是该动作唯一 Owner。

### Drive projection

Task Query 必须能提供：

```text
Task/Node 当前状态
requiredRoleRef
roleBindings
canStart/canDrive
blockedReason
currentNodeId/runNo/version
reopenContext（如适用）
```

Execution Task Driver 不复制 eligibility/state-machine 规则。

### reopen

Task-level role binding 保持原 workerRef；Node 新 run 按当前 Task 规则重置 run-local binding/state，再由 `requiredRoleRef → TaskRoleBinding.workerRef` 解析同一个 Worker。

## 4. Requires｜Execution Domain

Agent 只依赖 Execution Public Contract / typed capabilities：

```text
executeCapability(...)
getExecution(...)
readExecutionOutput(...)
cancelExecution(...)
```

GPT-facing role-specific operations可以是 `readFile/getGitDiff/runTests/...` 等清晰 facade，但 Gateway 最终归一化为 Execution canonical capability request。

Browser CREATE/RESTORE/WAKE、physical collaboration delivery、screenshot/permission/recovery 都由 Execution-owned Browser path 实现。

Agent 不实现 File/Git/Shell/Browser real Effect。

## 5. Requires｜Deployment Domain

Agent-owned packages、Gateway Service、ChatGPT Carrier、Dev Tunnel 等进入统一 Module Governance。

Agent Domain 声明：

```text
required modules/resources
config slots/secret refs
real lifecycle primitives
carrier requirements
verify/doctor expectations
```

Deployment 负责 dependency graph、plan/apply、status/verify/doctor/upgrade 与 ACTION_REQUIRED；不拥有 Role/Worker/Collaboration 业务语义。

## 6. Agent ↔ Execution Browser 边界

### Agent provides

```text
Registered Role lookup
Worker identity validation
Collaboration logical pending/result update
```

### Task provides

```text
Task drive projection
authorization state
TaskRoleBinding commands/query
Node commands/query
```

### Execution Browser provides

```text
Conversation CREATE/RESTORE/WAKE
workerRef/c-id observation from real URL
page state/permission/screenshot
physical message/action delivery
Browser evidence/recovery result
```

Browser Extension 本体不直接读写 Task/Agent store。

## 7. Product Worker → createTask

```text
User ↔ Product Custom GPT Conversation
→ requirement complete
→ Browser observes/verifies product workerRef/c-id
→ listRegisteredRoles
→ createTask(product role+worker, dev/test role requirements)
```

Action/current-link shortcut 只有在真实 E2E 验证后才能作为优化；Action request 不被假定携带 stable Conversation c-id。

## 8. API identity / actorRef

```text
Bearer key → authenticatedRoleRef
workerRef → request + Task binding validation
actorRef → Gateway 根据 authenticated role + validated worker 规范化
```

模型不得自由伪造 roleRef/actorRef。

## 9. Public API ownership rules

- Agent：Role Registry、Worker identity、Collaboration logical API。
- Task：TaskRoleBinding、workflow、TaskDocument。
- Execution：physical Browser/local delivery/effect/evidence。
- Gateway 不持久化第二份 binding 或 effect state。
- 所有跨域 request/response 统一 contract/version/error envelope，外部边界 runtime validation，Refs opaque。

## 10. OpenAI Carrier DTO 与 Domain Contract 分层

`openaiFileIdRefs`、`openaiFileResponse`、`x-openai-isConsequential` 都属于 GPT Actions/OpenAI transport contract，不是 Task/Agent/Execution business fields。

```text
Custom GPT OpenAPI
→ Gateway OpenAI Adapter
→ canonical Domain Public Contract
```

不得把 `download_link`、OpenAI file id、consequential flag 写成 Task/Execution durable business identity。

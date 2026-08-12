---
docId: TASK-DOC-02-01
title: 任务与编排领域｜Public API Contract v0.1
docType: contract
authority: normative
lifecycle: frozen
domain: task-orchestration
subdomain: null
subdomains:
- task-lifecycle
- task-chain
- node-workflow
- task-documents
- message-event-audit
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜Public API Contract v0.1

> 本文冻结第一版 API 的**业务语义、请求字段、响应字段和状态效果**。最终 HTTP path / TypeScript function name / OpenAPI operationId 可以在实现时机械映射，但不得改变语义。

---

# 1. Public API 分层原则

```text
Domain Public API
≠
Custom GPT Action 列表
≠
Browser Extension API
```

Gateway 可以将多个领域动作聚合成更少的 GPT Actions。Browser Extension 本体只连接 Execution Runtime 的 Browser protocol surface；本文出现的 `Execution Task Driver` 指 Execution-owned runtime/application flow 对 Task Public Contract 的调用，不表示 Extension 直接连接 Task Store/API。

---

# 2. 公共 Envelope

## 2.1 成功

```json
{
  "contract": "task-orchestration",
  "contractVersion": "1.0.0",
  "ok": true,
  "data": {}
}
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `contract` | string | 稳定 Contract 名称 |
| `contractVersion` | string | SemVer Contract 版本 |
| `ok` | boolean | 成功为 `true` |
| `data` | object | 当前操作成功结果 |

## 2.2 失败

```json
{
  "contract": "task-orchestration",
  "contractVersion": "1.0.0",
  "ok": false,
  "error": {
    "code": "TASK_VERSION_CONFLICT",
    "message": "Task version does not match.",
    "retryable": true,
    "correlationId": "corr-...",
    "details": {}
  }
}
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `code` | string | 稳定机器错误码 |
| `message` | string | 人 / Agent 可读说明 |
| `retryable` | boolean | 修正状态后是否允许重新尝试；不代表允许盲目自动 retry |
| `details` | object | 可选结构化详情 |

---

# 3. 写操作公共字段

| 字段 | 类型 | 必填 | 含义 |
|---|---|---:|---|
| `actorRef` | string | 是 | 发起业务动作的 opaque 主体引用 |
| `idempotencyKey` | string | 是 | 业务幂等键 |
| `expectedTaskVersion` | integer | 依接口 | 调用者最后看到的 Task version |
| `expectedNodeVersion` | integer | 依接口 | 调用者最后看到的 Node version |
| `expectedGroupVersion` | integer | 依接口 | 调用者最后看到的 TaskGroup version |

---

# 4. API 总表

| # | API | 主要调用者 | 修改状态 |
|---:|---|---|---:|
| 1 | `createTaskGroup` | 产品 / 总控 | 是 |
| 2 | `getTaskGroup` | Execution Task Driver / 总控 | 否 |
| 3 | `startTaskGroup` | 人工 / Execution Task Driver | 是 |
| 4 | `createTask` | 产品 / 总控 | 是 |
| 5 | `listTasks` | Execution Task Driver | 否 |
| 6 | `getTask` | 总控 / 管理端 | 否 |
| 7 | `startTask` | Execution Task Driver / platform-host | 是 |
| 8 | `pauseTask` | 人工 / 总控 | 是 |
| 9 | `resumeTask` | 人工 / 总控 | 是 |
| 10 | `terminateTask` | 人工 / 总控 | 是 |
| 11 | `getNodeContext` | Worker | 否 |
| 12 | `startNode` | Execution Task Driver / Worker flow | 是 |
| 13 | `completeNode` | Worker | 是 |
| 14 | `waitNode` | Worker / Execution | 是 |
| 15 | `failNode` | Worker / Execution | 是 |
| 16 | `reopenNode` | 总控 | 是 |
| 17 | `putTaskDocument` | Worker | 是 |
| 18 | `getTaskDocument` | Worker / 总控 | 否 |
| 19 | `listPendingMessages` | Execution Task Driver / 总控 | 否 |
| 20 | `acknowledgeMessage` | 人工 / 总控 | 是 |
| 21 | `listTaskEvents` | 管理 / 审计 | 否 |
| 22 | `authorizeTask` | 人工（独立 Task） | 是 |
| 23 | `bindTaskWorker` | platform-host / Worker provisioning flow | 是 |

---

# 5. TaskGroup API

## 5.1 createTaskGroup

用途：创建大型任务链容器。

请求：

```json
{
  "taskGroupId": "tg-001",
  "title": "大型系统第一阶段",
  "objective": "完成第一阶段所有模块",
  "maxActiveTasks": 1,
  "actorRef": "worker:ops-product:xxx",
  "idempotencyKey": "idem:create-tg-001"
}
```

| 字段 | 类型 | 必填 | 含义 |
|---|---|---:|---|
| `taskGroupId` | string | 否 | 不传则平台生成 |
| `title` | string | 是 | TaskGroup 显示名称 |
| `objective` | string | 否 | 整条任务链目标 |
| `maxActiveTasks` | integer | 是 | v1 必须为 1 |
| `actorRef` | string | 是 | 创建主体 |
| `idempotencyKey` | string | 是 | 幂等键 |

响应 `data`：

```json
{
  "taskGroupId": "tg-001",
  "title": "大型系统第一阶段",
  "status": "READY",
  "maxActiveTasks": 1,
  "version": 1
}
```

## 5.2 getTaskGroup

请求：

```json
{
  "taskGroupId": "tg-001"
}
```

响应 `data`：

```json
{
  "taskGroupId": "tg-001",
  "title": "大型系统第一阶段",
  "objective": "...",
  "status": "ACTIVE",
  "version": 3,
  "maxActiveTasks": 1,
  "currentTaskId": "task-003",
  "tasks": [
    {"taskId": "task-001", "sequenceNo": 1, "status": "SUCCEEDED"},
    {"taskId": "task-002", "sequenceNo": 2, "status": "SUCCEEDED"},
    {"taskId": "task-003", "sequenceNo": 3, "status": "ACTIVE"}
  ]
}
```

`currentTaskId` 是查询计算字段，不要求成为数据库独立真源。

## 5.3 startTaskGroup

请求：

```json
{
  "taskGroupId": "tg-001",
  "expectedGroupVersion": 2,
  "actorRef": "human:operator",
  "idempotencyKey": "idem:start-tg-001"
}
```

效果：`TaskGroup READY → ACTIVE`，并允许第一个满足条件的 Task 进入可执行状态。

响应：

```json
{
  "taskGroupId": "tg-001",
  "status": "ACTIVE",
  "version": 3,
  "firstEligibleTaskId": "task-001"
}
```

---

# 6. Task API

## 6.1 createTask

用途：一次创建 Task + ordered Plan Nodes + initial Markdown documents。

请求：

```json
{
  "taskId": "task-001",
  "taskGroupId": "tg-001",
  "sequenceNo": 1,
  "title": "实现用户管理模块",
  "objective": "完成用户管理模块研发与验收",
  "plan": {
    "nodes": [
      {
        "nodeId": "node-product",
        "title": "产品设计",
        "objective": "完成需求整理和 PRD",
        "requiredRoleRef": "role:ops-product",
        "inputDocuments": ["REQUIREMENT"],
        "outputDocuments": ["PRD"]
      },
      {
        "nodeId": "node-dev",
        "title": "研发与项目管理",
        "objective": "完成技术设计和研发",
        "requiredRoleRef": "role:controller-dev",
        "inputDocuments": ["REQUIREMENT", "PRD"],
        "outputDocuments": ["TECHNICAL_DESIGN"]
      }
    ]
  },
  "initialDocuments": [
    {
      "documentType": "REQUIREMENT",
      "content": "# 用户批准后的正式需求"
    }
  ],
  "roleBindings": [
    {"roleRef": "role:ops-product", "workerRef": "worker:conversation:aaa"},
    {"roleRef": "role:controller-dev", "workerRef": null},
    {"roleRef": "role:test-ops", "workerRef": null}
  ],
  "actorRef": "worker:ops-product:xxx",
  "idempotencyKey": "idem:create-task-001"
}
```

| 字段 | 类型 | 必填 | 含义 |
|---|---|---:|---|
| `taskId` | string | 否 | Task ID；不传可生成 |
| `taskGroupId` | string | 否 | 所属 TaskGroup |
| `sequenceNo` | integer | 条件 | 属于 TaskGroup 时的顺序 |
| `title` | string | 是 | 简短名称 |
| `objective` | string | 是 | Task 最终业务目标 |
| `plan.nodes` | array | 是 | v1 有序串行 Node |
| `nodeId` | string | 是 | Node 稳定 ID |
| `node.title` | string | 是 | Node 名称 |
| `node.objective` | string | 是 | 当前阶段要完成什么 |
| `requiredRoleRef` | string | 是 | Role opaque ref |
| `inputDocuments` | string[] | 是 | Node 上下文必须读取的文档类型 |
| `outputDocuments` | string[] | 是 | Node 成功前必须存在的输出文档类型 |
| `initialDocuments` | array | 否 | 创建 Task 时写入的 Markdown |
| `roleBindings` | array | 否 | Task-level role→worker binding 声明；产品可带已有 workerRef，研发/测试可先为 null |
| `roleBindings[].roleRef` | string | 条件 | Agent Role opaque ref |
| `roleBindings[].workerRef` | string \| null | 条件 | 已有 Worker opaque ref；未 provisioning 时为 null |
| `actorRef` | string | 是 | 创建者 |
| `idempotencyKey` | string | 是 | 幂等键 |

响应：

```json
{
  "taskId": "task-001",
  "taskGroupId": "tg-001",
  "status": "PENDING",
  "version": 1,
  "planVersion": 1,
  "currentNodeId": null,
  "authorizedByRef": null,
  "authorizedAt": null,
  "roleBindings": [
    {"roleRef": "role:ops-product", "workerRef": "worker:conversation:aaa"},
    {"roleRef": "role:controller-dev", "workerRef": null},
    {"roleRef": "role:test-ops", "workerRef": null}
  ]
}
```

v1 不需要独立 `planId`。

## 6.1A authorizeTask

用途：记录独立 Task 的 human execution authorization，使 Task 在前置条件满足后具备进入 READY 的资格。已由人工启动的 TaskGroup 可以作为其成员 Task 的 authorization source，不要求用户逐 Task 重复点击批准。

请求：

```json
{
  "taskId": "task-001",
  "expectedTaskVersion": 1,
  "actorRef": "human:operator",
  "idempotencyKey": "idem:authorize-task-001"
}
```

语义：

- 只由 Task Domain 修改授权事实；不创建独立 Approval entity/table；
- 写入 `authorizedByRef / authorizedAt`（TaskGroup 成员若使用 group-level authorization，可由 Task Owner 依据 ACTIVE TaskGroup 判定授权已满足）；
- 若授权与 Task 前置条件均已满足，则 `PENDING → READY`；否则保持 `PENDING`，待前置条件满足后由 Task Owner 计算 READY；
- 同一幂等意图重复提交返回原结果；version conflict 必须重新读取后再决定；
- authorization 只允许 Task 进入执行初始化，**不等于**任何 Execution Effect Approval。

响应：

```json
{
  "taskId": "task-001",
  "status": "READY",
  "version": 2,
  "authorizedByRef": "human:operator",
  "authorizedAt": "2026-08-12T00:00:00.000Z"
}
```

## 6.1B bindTaskWorker

用途：把 Agent 已校验的 Worker identity 固化为 Task Owner 的稳定 `TaskRoleBinding`。真实 Conversation CREATE/RESTORE 由 Execution Browser 完成，Agent 只拥有/校验 Worker identity；两者都不能直接写 Task binding。

请求：

```json
{
  "taskId": "task-001",
  "roleRef": "role:controller-dev",
  "workerRef": "worker:conversation:bbb",
  "expectedTaskVersion": 2,
  "actorRef": "platform-host:worker-provisioning",
  "idempotencyKey": "idem:bind-task-001-controller-dev"
}
```

语义：

- `(taskId, roleRef)` one-time + idempotent；
- 空 binding 可写入；同 workerRef 重放返回原结果；
- 尝试覆盖为不同 workerRef 返回 `TASK_ROLE_BINDING_CONFLICT`；
- roleRef 必须已属于该 Task 的 required/declared roles，否则拒绝；
- terminal Task 默认拒绝修改；
- reopen 不删除 TaskRoleBinding。

响应：

```json
{
  "taskId": "task-001",
  "version": 3,
  "roleBinding": {
    "roleRef": "role:controller-dev",
    "workerRef": "worker:conversation:bbb"
  }
}
```

## 6.2 listTasks

请求：

```json
{
  "taskGroupId": "tg-001",
  "statuses": ["READY", "ACTIVE", "WAITING"]
}
```

两个过滤字段都可选。

响应：

```json
{
  "tasks": [
    {
      "taskId": "task-001",
      "taskGroupId": "tg-001",
      "sequenceNo": 1,
      "title": "实现用户管理模块",
      "status": "READY",
      "version": 4,
      "currentNodeId": null,
      "canStart": true,
      "blockedReason": null
    }
  ]
}
```

`canStart / blockedReason` 由 Task Domain 计算；Execution Task Driver 不自行推断前置 Task或 required binding 是否满足。

## 6.3 getTask

请求：

```json
{"taskId": "task-001"}
```

响应：

```json
{
  "taskId": "task-001",
  "taskGroupId": "tg-001",
  "sequenceNo": 1,
  "title": "实现用户管理模块",
  "objective": "...",
  "status": "ACTIVE",
  "version": 8,
  "planVersion": 1,
  "currentNodeId": "node-dev",
  "authorizedByRef": "human:operator",
  "authorizedAt": "2026-08-12T00:00:00.000Z",
  "roleBindings": [
    {"roleRef": "role:ops-product", "workerRef": "worker:conversation:aaa"},
    {"roleRef": "role:controller-dev", "workerRef": "worker:conversation:bbb"},
    {"roleRef": "role:test-ops", "workerRef": "worker:conversation:ccc"}
  ],
  "nodes": [
    {
      "nodeId": "node-product",
      "title": "产品设计",
      "status": "SUCCEEDED",
      "runNo": 1,
      "requiredRoleRef": "role:ops-product",
      "workerRef": "worker:conversation:aaa",
      "version": 3
    },
    {
      "nodeId": "node-dev",
      "title": "研发与项目管理",
      "status": "IN_PROGRESS",
      "runNo": 1,
      "requiredRoleRef": "role:controller-dev",
      "workerRef": "worker:conversation:bbb",
      "version": 2
    }
  ],
  "pendingMessages": []
}
```

不返回所有 Markdown 正文。

## 6.4 startTask

请求：

```json
{
  "taskId": "task-001",
  "expectedTaskVersion": 4,
  "actorRef": "execution-runtime:task-driver",
  "idempotencyKey": "idem:start-task-001"
}
```

校验：Task == READY；若属于 TaskGroup，TaskGroup == ACTIVE；前序 Task 已满足；所有当前执行所需 `TaskRoleBinding.workerRef` 已补齐。

效果：Task READY → ACTIVE；第一 Node PENDING → READY；`currentNodeId = firstNode`。

响应：

```json
{
  "taskId": "task-001",
  "status": "ACTIVE",
  "version": 5,
  "currentNodeId": "node-product"
}
```

## 6.5 pauseTask

请求：

```json
{
  "taskId": "task-001",
  "reason": "人工暂停",
  "expectedTaskVersion": 12,
  "actorRef": "human:operator",
  "idempotencyKey": "idem:pause-task-001"
}
```

效果：Task → PAUSED，不修改 Node 当前状态。

## 6.6 resumeTask

请求：

```json
{
  "taskId": "task-001",
  "expectedTaskVersion": 13,
  "actorRef": "human:operator",
  "idempotencyKey": "idem:resume-task-001"
}
```

第一版用于 PAUSED → ACTIVE / WAITING → ACTIVE。若 current Node 为 WAITING，则 Node WAITING → IN_PROGRESS；runNo 不变。

## 6.7 terminateTask

请求：

```json
{
  "taskId": "task-001",
  "reason": "需求终止",
  "expectedTaskVersion": 15,
  "actorRef": "human:operator",
  "idempotencyKey": "idem:terminate-task-001"
}
```

效果：Task → TERMINATED，不可 resume。

---

# 7. Node API

## 7.1 getNodeContext

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev"
}
```

响应：

```json
{
  "task": {
    "taskId": "task-001",
    "title": "实现用户管理模块",
    "objective": "...",
    "status": "ACTIVE",
    "version": 8
  },
  "node": {
    "nodeId": "node-dev",
    "title": "研发与项目管理",
    "objective": "...",
    "status": "READY",
    "version": 2,
    "runNo": 1,
    "requiredRoleRef": "role:controller-dev",
    "workerRef": null,
    "inputDocuments": ["REQUIREMENT", "PRD"],
    "outputDocuments": ["TECHNICAL_DESIGN"]
  },
  "documents": [
    {
      "documentType": "REQUIREMENT",
      "path": ".ai-agent-platform/...",
      "contentHash": "sha256:...",
      "sizeBytes": 12345
    },
    {
      "documentType": "PRD",
      "path": ".ai-agent-platform/...",
      "contentHash": "sha256:...",
      "sizeBytes": 45678
    }
  ]
}
```

`path` 是服务返回的仓库相对路径；Worker 不需要自行使用该路径读取文件。

`getNodeContext` 的默认跨域 response 只携带 Task/Node 小型结构化事实和文档 metadata，不把完整 Requirement/PRD 正文默认塞入 JSON。需要正文时由调用方按 documentType 调 `getTaskDocument`；Custom GPT Carrier 可由 Gateway 把这些文档序列化为 `openaiFileResponse`。`openaiFileResponse` 不进入 Task Contract。

## 7.2 startNode

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "workerRef": "worker:conversation:abc",
  "expectedTaskVersion": 8,
  "expectedNodeVersion": 2,
  "actorRef": "execution-runtime:task-driver",
  "idempotencyKey": "idem:start-node-dev:run-1"
}
```

| 字段 | 含义 |
|---|---|
| `taskId` | 所属 Task |
| `nodeId` | 当前 Node |
| `workerRef` | **不得由调用方提供**；Task 依据 TaskRoleBinding 自动解析 |
| `expectedTaskVersion` | 防旧 Task 写 |
| `expectedNodeVersion` | 防重复 / 旧 Node 写 |
| `actorRef` | 谁发起启动 |
| `idempotencyKey` | 幂等业务意图；不承诺端到端 exactly-once |

**当前规则：** `Node.workerRef = TaskRoleBinding.workerRef`，READY → IN_PROGRESS，startedAt = now。

响应：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "status": "IN_PROGRESS",
  "runNo": 1,
  "workerRef": "worker:conversation:abc",
  "taskVersion": 9,
  "nodeVersion": 3,
  "startedAt": "2026-08-10T..."
}
```

## 7.3 completeNode

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "resultSummary": "技术设计和研发已完成",
  "expectedTaskVersion": 9,
  "expectedNodeVersion": 3,
  "actorRef": "worker:conversation:abc",
  "idempotencyKey": "idem:complete-node-dev:run-1"
}
```

Task Service 自动检查 Node.outputDocuments。缺失返回 `NODE_OUTPUT_MISSING`。

成功效果：Node IN_PROGRESS → SUCCEEDED；后续 Node → READY；若最后 Node 完成则 Task → SUCCEEDED。

响应：

```json
{
  "nodeId": "node-dev",
  "status": "SUCCEEDED",
  "runNo": 1,
  "completedAt": "...",
  "taskStatus": "ACTIVE",
  "taskVersion": 10,
  "nextNodeId": "node-test"
}
```

## 7.4 waitNode

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-test",
  "waitType": "BUSINESS_CONFIRMATION",
  "reasonCode": "TEST_NOT_PASSED",
  "message": "测试存在阻断缺陷，需要确认是否回到研发节点",
  "relatedRef": "document:TEST_RESULT",
  "expectedTaskVersion": 11,
  "expectedNodeVersion": 3,
  "actorRef": "worker:test:xxx",
  "idempotencyKey": "idem:wait-test:run-1"
}
```

`waitType` v1：

| 值 | 含义 |
|---|---|
| `BUSINESS_CONFIRMATION` | 业务结果需要人工 / 总控确认 |
| `ACTION_APPROVAL_REQUIRED` | Agent Action 需要权限 |
| `EXECUTION_ALERT` | 页面 / 执行环境异常，无法安全继续 |

效果：Node → WAITING；Task → WAITING；PendingMessage 创建。

## 7.5 failNode

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "errorCode": "EXECUTION_BROWSER_UNAVAILABLE",
  "errorMessage": "Execution Browser runtime is unavailable.",
  "retryable": true,
  "expectedTaskVersion": 9,
  "expectedNodeVersion": 3,
  "actorRef": "execution-runtime:task-driver",
  "idempotencyKey": "idem:fail-node-dev:run-1"
}
```

效果：Node → FAILED；Task → FAILED。

## 7.6 reopenNode

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "reason": "测试不通过，需要重新研发",
  "expectedTaskVersion": 15,
  "actorRef": "worker:controller:xxx",
  "idempotencyKey": "idem:reopen-dev:run-2"
}
```

效果：目标 Node runNo + 1 / workerRef null / READY；后续 Node PENDING；Task ACTIVE / currentNodeId=target；旧历史 / 文档 / Event 保留。

---

# 8. Task Document API

## 8.1 putTaskDocument

请求：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "documentType": "TECHNICAL_DESIGN",
  "content": "# 技术方案\n...",
  "expectedTaskVersion": 9,
  "actorRef": "worker:controller:xxx",
  "idempotencyKey": "idem:write-tech-design:run-1"
}
```

规则：Agent 只提交 canonical `documentType + content`，不能提交任意磁盘绝对路径；TaskDocumentService 决定实际仓库相对路径。

Custom GPT 若通过 `openaiFileIdRefs` 提交文件，必须先由 Gateway/Execution Carrier adapter 完成临时 URL 获取、MIME/size/hash 校验并转换为 canonical TaskDocument 写入输入；Task API **不直接接收** `download_link` 或 OpenAI file id 作为业务字段。

响应：

```json
{
  "taskId": "task-001",
  "nodeId": "node-dev",
  "documentType": "TECHNICAL_DESIGN",
  "path": ".ai-agent-platform/...",
  "contentHash": "sha256:...",
  "updatedAt": "...",
  "taskVersion": 10
}
```

## 8.2 getTaskDocument

请求：

```json
{
  "taskId": "task-001",
  "documentType": "PRD"
}
```

响应：

```json
{
  "taskId": "task-001",
  "documentType": "PRD",
  "path": ".ai-agent-platform/...",
  "content": "# PRD...",
  "contentHash": "sha256:...",
  "updatedAt": "..."
}
```

普通 Worker 优先使用 `getNodeContext`。

---

# 9. Message / Event API

## 9.1 listPendingMessages

请求：

```json
{"taskId": "task-001"}
```

`taskId` 可选。

响应：

```json
{
  "messages": [
    {
      "messageId": "msg-001",
      "taskId": "task-001",
      "nodeId": "node-test",
      "type": "BUSINESS_CONFIRMATION",
      "reasonCode": "TEST_NOT_PASSED",
      "message": "测试未通过，需要总控确认",
      "relatedRef": "document:TEST_RESULT",
      "status": "PENDING",
      "createdAt": "..."
    }
  ]
}
```

## 9.2 acknowledgeMessage

请求：

```json
{
  "messageId": "msg-001",
  "resolution": "确认返回研发节点修改",
  "actorRef": "human:operator",
  "idempotencyKey": "idem:ack-msg-001"
}
```

响应：

```json
{
  "messageId": "msg-001",
  "status": "ACKNOWLEDGED",
  "acknowledgedAt": "...",
  "acknowledgedByRef": "human:operator"
}
```

不自动 resume / reopen。

## 9.3 listTaskEvents

请求：

```json
{
  "taskId": "task-001",
  "afterEventId": 100,
  "limit": 100
}
```

响应：

```json
{
  "events": [
    {
      "eventId": 101,
      "taskId": "task-001",
      "nodeId": "node-dev",
      "eventType": "NODE_STARTED",
      "actorRef": "execution-runtime:task-driver",
      "taskVersion": 9,
      "nodeVersion": 3,
      "payload": {
        "workerRef": "worker:conversation:abc",
        "runNo": 1
      },
      "createdAt": "..."
    }
  ]
}
```

---

# 10. 核心错误码 v0.1

实现时至少稳定覆盖：

```text
TASK_GROUP_NOT_FOUND
TASK_NOT_FOUND
NODE_NOT_FOUND
MESSAGE_NOT_FOUND

TASK_INVALID_STATE
NODE_INVALID_STATE
TASK_GROUP_INVALID_STATE

TASK_VERSION_CONFLICT
NODE_VERSION_CONFLICT
TASK_GROUP_VERSION_CONFLICT

IDEMPOTENCY_CONFLICT

NODE_OUTPUT_MISSING
WORKER_MISMATCH
ROLE_NOT_ELIGIBLE
TASK_NOT_AUTHORIZED
TASK_ROLE_BINDING_REQUIRED
TASK_ROLE_BINDING_NOT_FOUND
TASK_ROLE_BINDING_CONFLICT

DOCUMENT_TYPE_NOT_ALLOWED
DOCUMENT_NOT_FOUND
DOCUMENT_WRITE_FAILED
DOCUMENT_INDEX_MISMATCH

TASK_BLOCKED
PREDECESSOR_NOT_SUCCEEDED
```

错误码可以增加，但已公开含义不得静默改变。

---

# 11. 明确不存在的 API

v1 **没有**：

```text
createWorkItem
claimWork
releaseClaim
reassignWorker
assignWorker
createEdge
transitionNode
approveNode
retryWorkItem
cancelWorkItem
submitPlan
activatePlan
```

如果实现阶段发现“必须加”，先回领域文档说明真实需求。

---

## 当前 Task Public Contract 强约束


1. `createTask` 创建新 Task 后的初始业务状态统一为 `PENDING`。Human authorization 之后才允许进入 `READY`；`startTask` 只负责 `READY → ACTIVE`。
2. Task 正式拥有 `TaskRoleBinding`。`createTask` 可携带产品已有 `product roleRef + workerRef` 以及研发/测试 `roleRef` 空绑定；授权后由 provisioning 流程补齐研发/测试 workerRef。
3. `bindTaskWorker(taskId, roleRef, workerRef, expectedTaskVersion, actorRef, idempotencyKey)` 冻结为 one-time + idempotent Task Command：空绑定可写入；相同 workerRef 重放返回原结果；不同 workerRef 覆盖返回冲突。Task terminal 后默认拒绝修改。
4. `getTask` / 必要 projection 返回 `roleBindings[]`。其他领域只能把 `roleRef/workerRef` 当 opaque ref。
5. `startNode` **删除调用方选择任意 `workerRef` 的语义**。`startNode` 不接受调用方指定 `workerRef`；Task 根据 `Node.requiredRoleRef → TaskRoleBinding.workerRef` 自动解析并绑定当前 run。
6. 所有 Public Command 遵守 `unknown → runtime validation → typed DTO`、领域内 idempotency、必要 `expectedVersion` 与统一错误 envelope。`contract` 与 SemVer `contractVersion` 分离。
7. Gateway / Browser / Execution 不得直接修改 Task SQLite；所有 workflow transition 必须回到 Task Public Command。

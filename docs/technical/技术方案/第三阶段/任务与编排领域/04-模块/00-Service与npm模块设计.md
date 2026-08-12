---
docId: TASK-DOC-04-00
title: 任务与编排领域｜Service 与 npm 模块设计
docType: module-design
authority: normative
lifecycle: frozen
domain: task-orchestration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 任务与编排领域｜Service 与 npm 模块设计

---

# 1. 运行时原则

第一版：

> **3 个逻辑 Service，1 个领域业务 npm 包；模块化不等于多进程。**

Task Domain v1 由独立 npm package 提供，并由 `@ai-agent-platform/platform-host` 作为 Application Composition Root **in-process 装配**。Task 不单独建立 `task-service` daemon；若未来出现真实独立部署需求，再复用相同 Public Contract 和 Service 层。

---

# 2. 3 个逻辑 Service

```text
TaskCommandService
TaskQueryService
TaskDocumentService
```

由 `@ai-agent-platform/task-orchestration` 统一提供。

---

# 3. TaskCommandService

负责写业务动作：

```text
createTaskGroup
startTaskGroup
createTask
authorizeTask
bindTaskWorker
startTask
pauseTask
resumeTask
terminateTask
startNode
completeNode
waitNode
failNode
reopenNode
acknowledgeMessage
```

职责：读取当前状态、校验 expectedVersion、校验状态转换、检查 idempotency、开启 transaction、修改 Task / Node / Group、写 Message / Event、保存幂等响应并 commit。

不负责选择 Worker、模型推理、Browser 操作、Shell、判断测试结果业务好坏、决定用户是否应该批准。

---

# 4. TaskQueryService

只读：

```text
getTaskGroup
listTasks
getTask
getNodeContext
listPendingMessages
listTaskEvents
```

默认不修改业务状态。

`getNodeContext` 组合 Task + Node + inputDocuments + TaskDocument metadata；正文由 `getTaskDocument` 按需读取。Custom GPT Carrier 需要大文档时由 Gateway 适配为 File Bridge。Worker 不直接访问 SQLite。

---

# 5. TaskDocumentService

Public：

```text
putTaskDocument
getTaskDocument
```

Internal：

```text
readDocumentsForNode
verifyRequiredOutputs
resolveDocumentPath
reconcileDocumentIndex
```

职责：safe path、Markdown read/write、atomic replace、content hash、document index、required output verification、reconciliation。

Agent 不允许传任意磁盘路径。

---

# 6. npm 包边界

第一版 3 个 npm 包：

```text
@ai-agent-platform/task-orchestration
@ai-agent-platform/task-store-sqlite
@ai-agent-platform/task-migration-runner
```

---

# 7. @ai-agent-platform/task-orchestration

领域业务包，拥有：

```text
Domain Models
Task / Node / TaskGroup 状态规则
Public Contracts
JSON Schemas（或其领域定义）
TaskCommandService
TaskQueryService
TaskDocumentService ports
Domain Errors
```

不写具体 SQLite SQL。

建议逻辑源码结构：

```text
src/
├── contracts/
├── domain/
├── services/
│   ├── task-command-service.ts
│   ├── task-query-service.ts
│   └── task-document-service.ts
├── ports/
└── index.ts
```

目录名是实现建议，不等于现在冻结目标仓库物理布局。

---

# 8. @ai-agent-platform/task-store-sqlite

任务领域 SQLite Adapter 包，拥有：

```text
SQLite connection lifecycle
transaction abstraction
TaskGroupRepository
TaskRepository
NodeRepository
NodeExecutionHistoryRepository
TaskDocumentRepository
TaskMessageRepository
TaskEventRepository
IdempotencyRepository
Task schema
Task migrations SQL
```

重要：Task / Node / Event / Idempotency 必须能够共享同一个 SQLite transaction。

---

# 9. Event Store 为什么不拆包

第一版 `TaskEventRepository` 明显仍属于 Task Domain。当前事件依赖 taskId / nodeId / taskVersion / nodeVersion，没有第二个领域真实共用。

因此 v1 不创建 `@ai-agent-platform/event-store`。

未来只有 Task / Agent / Execution / Deployment 等多个领域确实需要共同 append-only Event Journal 时，再抽公共包。

---

# 10. @ai-agent-platform/task-migration-runner

迁移执行包。

为什么带 `task-` 前缀：当前只有 Task Domain 一个真实消费者，不提前创建平台公共抽象。

职责：discover migrations、parse version / name、read schema_migrations、sort pending migrations、execute migration transaction、record applied migration。

它不拥有具体 Task SQL。

---

# 11. Migration 归属规则

原则：

> **谁拥有 schema，谁拥有 migration。**

所以 Task migration SQL 由 `task-store-sqlite` 维护；`task-migration-runner` 只负责执行。

未来多个领域真实复用后，再考虑抽 `@ai-agent-platform/migration-runner`。

---

# 12. Service / Package / Process 三层不能混

```text
Service = 逻辑业务能力
npm Package = 软件交付 / 模块边界
Process = 运行部署单元
```

第一版：3 logical services、3 npm packages、不要求 3 个 daemon。

当前优先：

```text
Gateway / Runtime process
    ↓
load task-orchestration
    ↓
task-store-sqlite
    ↓
SQLite / Markdown
```

---

# 13. Module 生命周期

具体模块部署行为必须遵循当前 Deployment Domain 的正式 Deployment Contract。

Task 侧至少需要机器可管理的生命周期能力，例如 describe / preflight / start / stop / status / verify / doctor；具体 install / configure / dependency planning 由 Deployment Domain 当前正式模型裁决，Task Domain 不自行建立第二套部署编排。

---

# 14. Provides

任务与编排领域对外提供：

```text
TaskGroup lifecycle
Task lifecycle
Node lifecycle
Node context
Task document access
Pending Message query / ack
Task Event query
```

---

# 15. Requires

业务层不直接依赖 Agent / Execution / Model / Deployment 内部实现，只接受 opaque refs。

基础运行依赖：Node.js runtime、filesystem、SQLite、Git repository workspace、clock、ID generator、hash function。

---

# 16. 明确禁止

```text
task-orchestration import Agent internal implementation
task-store-sqlite 读取其他领域数据库
Task Service 直接操作 Browser DOM
Task Service 直接调用模型
Task Service 直接执行 Shell
Task Migration Runner 拥有跨领域 migration SQL
```

---

## 当前正式约束：package / host / dependency boundary

- `@ai-agent-platform/task-orchestration`、`task-store-sqlite`、`task-migration-runner` 继续保持独立 npm package；不得把 Task 源码直接内嵌到 `platform-host`。
- `platform-host` 只 instantiate / DI / local transport / startup-shutdown；Task package 不得反向依赖 platform-host。
- 跨领域只能依赖对方 Public Contract / client；禁止深路径 import、共享 SQLite、直接 import Adapter。
- 同进程调用使用公开 TypeScript interface；只有真实跨进程边界才增加 transport client。

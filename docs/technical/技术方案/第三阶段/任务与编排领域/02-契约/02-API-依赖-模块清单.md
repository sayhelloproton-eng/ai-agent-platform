---
docId: TASK-DOC-02-02
title: 任务与编排领域｜API / 依赖 / 模块清单
docType: dependency-index
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

# 任务与编排领域｜API / 依赖 / 模块清单

> 本页是 Task Domain Public Contract / Dependencies / Module 的快速索引；详细语义以链接到的 canonical 文档为准。

## Domain

```text
任务与编排领域
= 持久工作事实 + 合法推进 + 可恢复编排 + Task-scoped document context
```

## Bounded Context

```text
Task Orchestration Context
```

唯一拥有：TaskGroup / Task / Node / Version / runNo / Execution History / TaskDocument metadata / Message / Event / Idempotency。

## Provides API

```text
TaskGroup:
createTaskGroup
getTaskGroup
startTaskGroup

Task:
createTask
listTasks
getTask
authorizeTask
bindTaskWorker
startTask
pauseTask
resumeTask
terminateTask

Node:
getNodeContext
startNode
completeNode
waitNode
failNode
reopenNode

Document:
putTaskDocument
getTaskDocument

Message / Event:
listPendingMessages
acknowledgeMessage
listTaskEvents
```

## Requires

业务只接受 opaque refs：`requiredRoleRef / workerRef / actorRef / relatedRef`。

基础运行：Node.js / filesystem / SQLite / Git repository workspace / clock / ID generator / hash。

## Logical Services

```text
TaskCommandService
TaskQueryService
TaskDocumentService
```

## npm Packages

```text
@ai-agent-platform/task-orchestration
@ai-agent-platform/task-store-sqlite
@ai-agent-platform/task-migration-runner
```

## SQLite Tables

```text
task_groups
tasks
nodes
task_role_bindings
node_execution_history
task_documents
task_messages
task_events
idempotency_records
schema_migrations
```

## Key Status

Task：`PENDING / READY / ACTIVE / WAITING / FAILED / PAUSED / SUCCEEDED / TERMINATED`

Node：`PENDING / READY / IN_PROGRESS / WAITING / FAILED / SUCCEEDED / TERMINATED`

TaskGroup：`READY / ACTIVE / SUCCEEDED`

## First-version exclusions

```text
WorkItem
Claim
Lease
parallel Node
DAG
Edge
generic loop engine
reassign worker
queue
Redis
Kafka
Temporal
DBOS
XState
ORM
standalone Event Store
```

## Storage

```text
Structured runtime state → repo-local SQLite
Task正文 → Markdown under .ai-agent-platform → Git history
CodeGraph → optional rebuildable code index → never business truth
```

## Core invariants

```text
一个业务事实只有一个 Owner
当前状态查表
Event 只审计
Markdown 正文只以文件为真源
workerRef 是 opaque ref
reopen 不覆盖历史
PAUSED 不逐个改 Node
WAITING 停整个 Task
```

---

## 当前正式约束

新增 Provides：TaskRoleBinding query/command；新增 Runtime composition requirement：由 `@ai-agent-platform/platform-host` in-process 装配。Requires 只能指向 Agent/Execution/Model Public Contract；禁止依赖其内部 package/Store/Adapter。

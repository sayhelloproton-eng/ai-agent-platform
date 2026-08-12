---
docId: TASK-DOC-03-03
title: 任务与编排领域｜SQLite 数据模型与 DDL v0.1
docType: persistence
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

# 任务与编排领域｜SQLite 数据模型与 DDL v0.1

> 第一版目标：少表、事务简单、状态真源明确。

---

# 1. 表清单

业务表 9 张：

```text
1. task_groups
2. tasks
3. nodes
4. task_role_bindings
5. node_execution_history
6. task_documents
7. task_messages
8. task_events
9. idempotency_records
```

基础设施表：`schema_migrations`。

明确没有：

```text
plans
plan_edges
work_items
claims
leases
approvals
workers
roles
document_versions
queues
```

---

# 2. task_groups

```sql
CREATE TABLE task_groups (
  task_group_id       TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  objective           TEXT,
  status              TEXT NOT NULL,
  max_active_tasks    INTEGER NOT NULL DEFAULT 1,
  version             INTEGER NOT NULL DEFAULT 1,
  created_by_ref      TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
```

| 字段 | 含义 |
|---|---|
| `task_group_id` | TaskGroup ID |
| `title` | 名称 |
| `objective` | 总体目标 |
| `status` | READY / ACTIVE / SUCCEEDED |
| `max_active_tasks` | v1 = 1 |
| `version` | 乐观并发版本 |
| `created_by_ref` | 创建主体 opaque ref |
| `created_at` | 创建时间 |
| `updated_at` | 最近业务修改时间 |

不保存 `currentTaskId / taskIds JSON`，避免双真源。

---

# 3. tasks

```sql
CREATE TABLE tasks (
  task_id             TEXT PRIMARY KEY,
  task_group_id       TEXT,
  sequence_no         INTEGER,
  title               TEXT NOT NULL,
  objective           TEXT NOT NULL,
  status              TEXT NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  plan_version        INTEGER NOT NULL DEFAULT 1,
  current_node_id     TEXT,
  created_by_ref      TEXT NOT NULL,
  authorized_by_ref   TEXT,
  authorized_at       TEXT,
  created_at          TEXT NOT NULL,
  started_at          TEXT,
  completed_at        TEXT,
  updated_at          TEXT NOT NULL,
  FOREIGN KEY (task_group_id)
    REFERENCES task_groups(task_group_id)
);
```

| 字段 | 含义 |
|---|---|
| `task_id` | Task ID |
| `task_group_id` | 可选 TaskGroup |
| `sequence_no` | TaskGroup 中顺序 |
| `title` | 任务名称 |
| `objective` | 任务目标 |
| `status` | TaskStatus |
| `version` | Task 乐观并发版本 |
| `plan_version` | 当前 Plan version；v1 通常为 1 |
| `current_node_id` | 当前流程位置 |
| `created_by_ref` | 创建者 |
| `authorized_by_ref` | 独立 Task 的 human authorization actor；TaskGroup 成员可由 group-level authorization 满足，不强制重复写入 |
| `authorized_at` | 独立 Task execution authorization 时间；不是 Execution Effect Approval |
| `started_at` | 首次 ACTIVE |
| `completed_at` | SUCCEEDED / TERMINATED 时间 |
| `updated_at` | 最近修改 |

v1 不单独建 `plans` 表。

---

# 4. nodes

```sql
CREATE TABLE nodes (
  node_id               TEXT PRIMARY KEY,
  task_id               TEXT NOT NULL,
  sequence_no           INTEGER NOT NULL,
  title                 TEXT NOT NULL,
  objective             TEXT NOT NULL,
  status                TEXT NOT NULL,
  version               INTEGER NOT NULL DEFAULT 1,
  run_no                INTEGER NOT NULL DEFAULT 1,
  required_role_ref     TEXT NOT NULL,
  worker_ref            TEXT,
  input_documents_json  TEXT NOT NULL DEFAULT '[]',
  output_documents_json TEXT NOT NULL DEFAULT '[]',
  result_summary        TEXT,
  error_code            TEXT,
  error_message         TEXT,
  error_retryable       INTEGER,
  started_at            TEXT,
  completed_at          TEXT,
  updated_at            TEXT NOT NULL,
  FOREIGN KEY (task_id)
    REFERENCES tasks(task_id)
    ON DELETE CASCADE,
  UNIQUE(task_id, sequence_no)
);
```

说明：

- `sequence_no`：v1 串行，不建 Edge 表。
- `input_documents_json / output_documents_json`：使用小型 JSON TEXT，读取 Node 时整组加载，由 Ajv / application validation 校验。
- `worker_ref`：当前 run 的具体 Worker，reopen 时清空。
- `error_retryable`：SQLite integer 0 / 1 / null。

---

# 5. node_execution_history

```sql
CREATE TABLE node_execution_history (
  execution_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id                TEXT NOT NULL,
  node_id                TEXT NOT NULL,
  run_no                 INTEGER NOT NULL,
  worker_ref             TEXT,
  final_status           TEXT NOT NULL,
  result_summary         TEXT,
  error_code             TEXT,
  error_message          TEXT,
  error_retryable        INTEGER,
  input_documents_json   TEXT NOT NULL DEFAULT '[]',
  output_documents_json  TEXT NOT NULL DEFAULT '[]',
  started_at             TEXT,
  ended_at               TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id),
  FOREIGN KEY (node_id) REFERENCES nodes(node_id),
  UNIQUE(node_id, run_no)
);
```

作用：取消 WorkItem 后保存 Node 每一轮执行事实。

至少在 SUCCEEDED / FAILED / TERMINATED 执行边界保存；若 WAITING run 因 reopen 前序 Node 而被重置，也必须先保存该 run 当前事实，避免历史丢失。普通 WAITING → resume → IN_PROGRESS 仍是同一个 run，不增加 runNo。

---

# 6. task_documents

```sql
CREATE TABLE task_documents (
  task_id            TEXT NOT NULL,
  document_type      TEXT NOT NULL,
  source_node_id     TEXT,
  file_path          TEXT NOT NULL,
  content_hash       TEXT NOT NULL,
  updated_by_ref     TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  PRIMARY KEY (task_id, document_type),
  FOREIGN KEY (task_id)
    REFERENCES tasks(task_id)
    ON DELETE CASCADE
);
```

正文不进 SQLite，正文真源是 Git 仓库内 Markdown。

v1 每 Task 每 documentType 一个当前文件；历史由 Git 管，不建 document version 表。

---

# 7. task_messages

```sql
CREATE TABLE task_messages (
  message_id            TEXT PRIMARY KEY,
  task_id               TEXT NOT NULL,
  node_id               TEXT,
  message_type          TEXT NOT NULL,
  reason_code           TEXT NOT NULL,
  message               TEXT NOT NULL,
  related_ref           TEXT,
  status                TEXT NOT NULL DEFAULT 'PENDING',
  created_by_ref        TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  acknowledged_by_ref   TEXT,
  acknowledged_at       TEXT,
  resolution            TEXT,
  FOREIGN KEY (task_id)
    REFERENCES tasks(task_id)
    ON DELETE CASCADE
);
```

状态只需 `PENDING / ACKNOWLEDGED`。

---

# 8. task_events

```sql
CREATE TABLE task_events (
  event_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id           TEXT NOT NULL,
  node_id           TEXT,
  event_type        TEXT NOT NULL,
  actor_ref         TEXT NOT NULL,
  task_version      INTEGER,
  node_version      INTEGER,
  payload_json      TEXT,
  created_at        TEXT NOT NULL,
  FOREIGN KEY (task_id)
    REFERENCES tasks(task_id)
    ON DELETE CASCADE
);
```

Event 是审计，不是状态真源。

候选事件：

```text
TASK_CREATED
TASK_AUTHORIZED
TASK_READY
TASK_STARTED
TASK_WAITING
TASK_PAUSED
TASK_RESUMED
TASK_FAILED
TASK_SUCCEEDED
TASK_TERMINATED
NODE_READY
NODE_STARTED
NODE_COMPLETED
NODE_WAITING
NODE_FAILED
NODE_REOPENED
DOCUMENT_UPDATED
MESSAGE_CREATED
MESSAGE_ACKNOWLEDGED
```

---

# 9. idempotency_records

```sql
CREATE TABLE idempotency_records (
  idempotency_key   TEXT PRIMARY KEY,
  operation         TEXT NOT NULL,
  request_hash      TEXT NOT NULL,
  response_json     TEXT NOT NULL,
  created_at        TEXT NOT NULL
);
```

规则：same key + same requestHash → 返回第一次 response；same key + different requestHash → `IDEMPOTENCY_CONFLICT`。

---

# 10. schema_migrations

```sql
CREATE TABLE schema_migrations (
  version        INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  applied_at     TEXT NOT NULL
);
```

---

# 11. 第一版索引

```sql
CREATE INDEX idx_tasks_group_sequence
ON tasks(task_group_id, sequence_no);

CREATE INDEX idx_tasks_status
ON tasks(status);

CREATE INDEX idx_nodes_task_sequence
ON nodes(task_id, sequence_no);

CREATE INDEX idx_nodes_task_status
ON nodes(task_id, status);

CREATE INDEX idx_messages_pending
ON task_messages(status, created_at);

CREATE INDEX idx_events_task
ON task_events(task_id, event_id);
```

---

# 12. SQLite 初始化

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
```

SQLite / WAL / SHM 是运行时状态，不进入 Git 历史。

---

# 13. 不变量

```text
一个 taskId 只有一条 Task 当前事实
一个 nodeId 只有一个当前 run
同 Task 的 sequenceNo 唯一
Task currentNodeId 必须属于自己
Node workerRef 只在当前 run 有效
reopen 不删除 History
TaskDocument path 必须位于平台允许的 workspace
同 taskId + documentType 只有一个当前文档索引
Event 不反向成为状态真源
```

---

## TaskRoleBinding 与正式表清单

`task_role_bindings` 是当前正式业务表，用于持久化同一 Task 内 `roleRef → workerRef` 的稳定绑定。

```sql
CREATE TABLE task_role_bindings (
  task_id TEXT NOT NULL,
  role_ref TEXT NOT NULL,
  worker_ref TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (task_id, role_ref),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

约束：
- `role_ref / worker_ref` 为 Agent Domain opaque ref；Task 不解析 Conversation URL。
- 同一 Task + roleRef 只有一个当前稳定 binding。
- reopen 不删除该 binding；只重置 Node run-level workerRef。
- `bindTaskWorker` 使用 Task transaction + expectedTaskVersion + idempotency；相同绑定幂等，不允许静默覆盖为另一个 workerRef。

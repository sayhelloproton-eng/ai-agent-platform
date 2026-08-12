---
docId: AGENT-DOC-03-05
title: 智能体运行与协作领域｜事务、并发、幂等与 Collaboration SQLite DDL
docType: persistence
authority: normative
lifecycle: frozen
domain: agent-runtime-collaboration
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 智能体运行与协作领域｜事务、并发、幂等与 Collaboration SQLite DDL

> Agent SQLite 只拥有 Collaboration durable facts；Role Registry 使用 atomic JSON，credentials 使用受限 secret file。

---

# 1. 数据库边界

Agent Domain SQLite 保存：

```text
CollaborationThread
CollaborationMessage
Collaboration idempotency
```

不得保存：

```text
Task.status / Node.status / runNo truth
Task role binding truth
完整 GPT Conversation transcript
Task documents copy
Execution log copy
Role secret
```

跨域只保存必要 opaque refs。

---

# 2. SQLite 初始化

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

v1 单机即可；不引入 Redis/Kafka/消息总线。

---

# 3. collaboration_threads

严格 Q→A→Delivery→Q 状态：

```sql
CREATE TABLE collaboration_threads (
  thread_id TEXT PRIMARY KEY,
  contract_version TEXT NOT NULL,
  task_id TEXT NOT NULL,

  participant_a_role_ref TEXT NOT NULL,
  participant_a_worker_ref TEXT NOT NULL,
  participant_b_role_ref TEXT NOT NULL,
  participant_b_worker_ref TEXT NOT NULL,

  state TEXT NOT NULL CHECK (
    state IN (
      'OPEN_CAN_ASK',
      'OPEN_AWAITING_REPLY',
      'OPEN_REPLY_PENDING_DELIVERY'
    )
  ),

  last_question_message_id TEXT NULL,
  last_reply_message_id TEXT NULL,

  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

业务含义：

```text
OPEN_CAN_ASK
→ 原发问方可继续 askPeer

OPEN_AWAITING_REPLY
→ 有唯一 QUESTION 等待目标 Worker replyPeer

OPEN_REPLY_PENDING_DELIVERY
→ REPLY 已 durable，但尚未真实投递回原发问 Worker
```

只有 Reply `DELIVERED` 才能回 `OPEN_CAN_ASK`。

---

# 4. collaboration_messages

```sql
CREATE TABLE collaboration_messages (
  message_id TEXT PRIMARY KEY,
  contract_version TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  task_id TEXT NOT NULL,

  kind TEXT NOT NULL CHECK (kind IN ('QUESTION', 'REPLY')),

  from_role_ref TEXT NOT NULL,
  from_worker_ref TEXT NOT NULL,
  target_role_ref TEXT NOT NULL,
  target_worker_ref TEXT NOT NULL,

  reply_to_message_id TEXT NULL,
  content TEXT NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'DELIVERED')
  ),

  delivery_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (delivery_attempt_count >= 0),
  last_delivery_error_code TEXT NULL,
  delivery_ref TEXT NULL,
  result_ref TEXT NULL,

  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  delivered_at TEXT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY(thread_id) REFERENCES collaboration_threads(thread_id)
);
```

为什么不强制 `DELIVERY_FAILED` 成为业务状态：失败/不确定性可以记录在 attempt/error/ref 中；是否允许重试取决于 Browser/Execution 的 side-effect certainty，Message Center 不需要为 transport 失败扩展复杂业务状态机。

---

# 5. collaboration_idempotency

```sql
CREATE TABLE collaboration_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

建议 namespace：

```text
authenticatedRoleRef + operation + caller-supplied key
```

最终遵守平台公共 idempotency contract。

---

# 6. 索引

```sql
CREATE INDEX idx_collab_threads_task
  ON collaboration_threads(task_id, updated_at);

CREATE INDEX idx_collab_messages_pending
  ON collaboration_messages(status, created_at);

CREATE INDEX idx_collab_messages_thread
  ON collaboration_messages(thread_id, created_at);

CREATE INDEX idx_collab_messages_target
  ON collaboration_messages(target_role_ref, target_worker_ref, status, created_at);
```

---

# 7. Task participant validation 在本地事务外

`askPeer/replyPeer` 进入 Collaboration Service 前，Gateway 已产生：

```text
authenticatedRoleRef
```

Service 调 Task Public API 读取：

```text
Task terminal?
Task participant roles/bindings
sender worker binding
target participant binding
```

禁止直接读 Task DB。

Task binding v1 是 Task 内 one-time/stable 事实，因此本地 collaboration transaction 不需要跨域分布式事务；如果 Task API 返回 version，可把版本用于防御性校验/日志。

---

# 8. 新 Thread / first askPeer transaction

前置校验：

```text
Task non-terminal
sender participant valid
target package/role resolves to same Task participant
target worker bound
```

事务：

```text
BEGIN IMMEDIATE;
check idempotency;
insert thread(state=OPEN_AWAITING_REPLY);
insert QUESTION(status=PENDING);
set last_question_message_id;
save idempotency response;
COMMIT;
```

---

# 9. existing Thread 下一问

只有：

```text
thread.state == OPEN_CAN_ASK
```

才允许。

事务条件更新：

```text
BEGIN IMMEDIATE;
check idempotency;
load thread;
validate participant;

UPDATE collaboration_threads
SET state='OPEN_AWAITING_REPLY',
    last_question_message_id=?,
    version=version+1,
    updated_at=?
WHERE thread_id=?
  AND version=?
  AND state='OPEN_CAN_ASK';

require changes == 1;
insert QUESTION PENDING;
save idempotency;
COMMIT;
```

否则：

```text
THREAD_AWAITING_REPLY
THREAD_REPLY_NOT_DELIVERED
COLLABORATION_VERSION_CONFLICT
```

错误码最终命名可收敛，但语义不能放宽。

---

# 10. replyPeer transaction

事务前：

```text
Task still non-terminal
caller is expected replying participant
caller worker matches Task binding
```

事务：

```text
BEGIN IMMEDIATE;
check idempotency;
load thread;
require state=OPEN_AWAITING_REPLY;
load last QUESTION;
validate question.target == caller;

insert REPLY(status=PENDING, reply_to_message_id=last_question);

UPDATE collaboration_threads
SET state='OPEN_REPLY_PENDING_DELIVERY',
    last_reply_message_id=?,
    version=version+1,
    updated_at=?
WHERE thread_id=?
  AND version=?
  AND state='OPEN_AWAITING_REPLY';

require changes == 1;
save idempotency;
COMMIT;
```

**reply durable 后绝不能直接 OPEN_CAN_ASK。**

---

# 11. listPendingCollaborationMessages

只返回：

```sql
SELECT ...
FROM collaboration_messages
WHERE status='PENDING'
ORDER BY created_at ASC
LIMIT ?;
```

在返回/投递前还必须确认 Task 当前没有进入终态。

若 Task 已终态：

```text
不继续投递
不把 message 改成 CANCELLED/TASK_TERMINAL
保留现有历史记录
```

可以在 query 层跳过，不新增业务状态。

---

# 12. reportCollaborationDelivery

概念输入：

```text
messageId
expectedMessageVersion
outcome
browser delivery/result refs
observed target role/worker
errorCode?
retrySafety?
```

成功：

```text
BEGIN IMMEDIATE
load message
validate version/status
validate observed target == expected target
UPDATE message → DELIVERED + delivered_at + refs + attempt_count + version

IF message.kind == REPLY:
  UPDATE thread
  SET state='OPEN_CAN_ASK', version=version+1
  WHERE thread_id=?
    AND state='OPEN_REPLY_PENDING_DELIVERY'
    AND last_reply_message_id=messageId

COMMIT
```

如果 message.kind = QUESTION，Delivery 只更新 Question；Thread 仍 `OPEN_AWAITING_REPLY`。

失败/不确定：

```text
status 仍 PENDING
attempt_count + 1
last_delivery_error_code / refs 更新
```

是否重新投递必须根据 Browser/Execution 的 retry safety；不确定已提交时先 reconcile/observe，不盲重发。

---

# 13. Delivery 幂等

稳定意图：

```text
messageId == PEER_MESSAGE trigger id
```

Browser/Execution Delivery 层必须对同一个 `messageId` 防重复真实注入。

Agent SQLite 的 expected version 只能防并发 report，不能单独证明网页 exactly-once。

---

# 14. Extension 多实例/重启

不引入 Claim/Lease。

轻量防御：

```text
messageId + message.version + Browser stable delivery intent
```

Extension reload 后继续读取 PENDING。

重复消费者最终依赖 Browser Delivery idempotency/receipt 保护真实副作用。

---

# 15. Task terminal 与历史消息

Task terminal 后：

```text
no ask/reply
no pending Browser delivery
no auto cancellation mutation
```

SQLite 历史原样保留，作为过去协作记录。

Task terminal 是 Task Domain 的事实，不被 Collaboration Message 状态机复制。

---

# 16. Role Registry atomic write

```text
read
→ schema validate
→ uniqueness validate
→ write temp
→ fsync as appropriate
→ atomic rename
```

Role delete 是 physical delete。

删除前必须先通过 Task Public API 做 `ROLE_IN_USE` 检查；此检查不能通过直接读 Task SQLite 完成。

Registry 与 credential 两个文件无法天然同事务，必须用 `validate/doctor` 检查半状态。

---

# 17. Secret Store / rotate

受限 secret file 保存：

```text
roleRef → bearer key
local-platform-token
```

Role Key 支持独立 rotate：

```text
new key
→ update local store
→ old key invalid
→ roleRef unchanged
→ guide user update GPT Web
```

---

# 18. Crash / concurrency tests

至少：

- [ ] create thread transaction rollback；
- [ ] duplicate ask same key returns same response；
- [ ] same key different request conflict；
- [ ] two concurrent ask only one succeeds；
- [ ] two concurrent reply only one succeeds；
- [ ] reply durable leaves thread `OPEN_REPLY_PENDING_DELIVERY`；
- [ ] Q2 before Reply DELIVERED rejected；
- [ ] Reply DELIVERED atomically opens next ask；
- [ ] stale thread/message version rejected；
- [ ] Extension restart leaves PENDING available；
- [ ] Task terminal causes pending delivery to be skipped without mutating 已存在 message；
- [ ] uncertain Browser submit not blindly retried；
- [ ] role registry crash preserves previous valid JSON；
- [ ] registry/secret half-state doctor detects；
- [ ] rotate key invalidates old credential without changing roleRef。

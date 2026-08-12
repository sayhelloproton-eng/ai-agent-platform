---
docId: EXECUTION-DOC-03-01
title: 07 · Execution Record、持久化、幂等与状态
docType: persistence
authority: normative
lifecycle: frozen
domain: execution
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 07 · Execution Record、持久化、幂等与状态

## 1. [FROZEN] Durable Execution 一笔一个主 Record

v1 不建立 `ExecutionAttempt` 实体。

**简单同步 deterministic read 不强制 durable record**，可以只保留 `executionRef` 关联的结构化日志；但 side-effect、Approval、async/long-running、Browser/external boundary、UNKNOWN、restart recovery 场景必须 durable。

凡进入 durable persistence 的 execution，一笔只有一个主 Record。安全 retry/recovery 使用同一个 `executionRef`，通过 `attemptCount`、阶段日志和现实恢复表达。

## 2. 推荐 SQLite 表（用于 durable executions）

```sql
CREATE TABLE execution_records (
  execution_ref        TEXT PRIMARY KEY,
  capability           TEXT NOT NULL,
  executor_kind        TEXT NOT NULL CHECK (executor_kind IN ('local','browser')),

  caller_ref           TEXT NOT NULL,
  task_id              TEXT,
  node_id              TEXT,
  run_no               INTEGER,
  role_ref             TEXT,
  worker_ref           TEXT,

  idempotency_key      TEXT NOT NULL,
  correlation_id       TEXT,

  request_json         TEXT NOT NULL,
  input_fingerprint    TEXT NOT NULL,

  status               TEXT NOT NULL,
  side_effect_state    TEXT NOT NULL,
  retryable            INTEGER NOT NULL DEFAULT 0,

  decision_path        TEXT,
  approval_ref         TEXT,

  result_json          TEXT,
  evidence_refs_json   TEXT,

  error_code           TEXT,
  error_message        TEXT,

  attempt_count        INTEGER NOT NULL DEFAULT 0,

  created_at           TEXT NOT NULL,
  started_at           TEXT,
  effect_started_at    TEXT,
  finished_at          TEXT,
  updated_at           TEXT NOT NULL
);
```

[RECOMMENDED] 增加唯一索引：

```sql
CREATE UNIQUE INDEX uq_execution_idempotency
ON execution_records(caller_ref, capability, idempotency_key);
```

如果实际幂等 scope 最终需要加入 role/workspace，可在实现前按 caller 语义调整，但必须保持“同 key 同 fingerprint 返回原 Execution；同 key 不同 fingerprint conflict”。

## 3. request_json

必须：

- 可重建必要 execution intent；
- 已 runtime validated；
- 已 redacted；
- secret 只留 ref/placeholder，不留原值。

## 4. 主状态

```text
PENDING
RUNNING
SUCCEEDED
FAILED
UNKNOWN
```

推荐状态转移：

```text
PENDING → RUNNING
PENDING → FAILED       # validation/policy/precondition terminal reject 可按实现细节决定是否先 RUNNING
RUNNING → SUCCEEDED
RUNNING → FAILED
RUNNING → UNKNOWN
UNKNOWN → SUCCEEDED   # reality reconciliation
UNKNOWN → FAILED      # reality confirmed not applied and terminal
UNKNOWN → UNKNOWN     # still unresolved
```

禁止 UNKNOWN 自动回 RUNNING 并重放副作用。

## 5. sideEffectState

```text
NOT_STARTED
STARTED
APPLIED
NOT_APPLIED
UNKNOWN
```

典型组合：

| status | sideEffectState | 含义 |
|---|---|---|
| FAILED | NOT_APPLIED | 明确没产生 effect，可能允许重新决策 |
| SUCCEEDED | APPLIED | effect 已验证成功 |
| UNKNOWN | UNKNOWN | effect 可能发生，不能确认 |
| RUNNING | STARTED | 已越过 effect boundary，尚未最终验证 |

## 6. Idempotency

请求首次：Runtime 生成/接收 `executionRef`。

重复：

```text
same caller + capability + idempotencyKey
+ same fingerprint
→ return original execution

same key
+ different fingerprint
→ IDEMPOTENCY_CONFLICT
```

不能悄悄创建第二笔。

## 7. Fingerprint

应覆盖 effect identity 的关键参数：

```text
capability
canonical target
critical input
caller/task/worker context needed for effect
```

Secret 参与 fingerprint 时用安全 hash/稳定 ref，不把原 secret 持久化。

## 8. Browser internal stage

Browser 可在 log/record metadata 中报告：

```text
COMMAND_ACCEPTED
PRECONDITION_VERIFIED
EFFECT_STARTED
RESULT_REPORTED
```

无需建独立 stage table；若最终实现需要结构化查询，可用 execution event log，但不能演化成 Attempt workflow。

## 9. Restart

Runtime 启动后扫描非终态：

- `PENDING`：重新校验是否仍可执行；
- `RUNNING/STARTED`：先现实恢复；
- `UNKNOWN`：只 reconcile；
- `SUCCEEDED/FAILED`：只读，不 replay。

Browser 需要等待 extension reconnect；Local 根据 capability-specific reality verifier 恢复。

---

## 当前正式约束：effectively-once 与 crash windows

平台不承诺端到端 exactly-once。Execution 通过 persist-before-effect、idempotency fingerprint、sideEffectState、persist-after-effect、reality verification 达成边界内 effectively-once。正式覆盖 crash windows：before effect / during effect / after effect before persist / after persist before response。Duplicate browser delivery 无法确认时进入 UNKNOWN，禁止 blind submit。

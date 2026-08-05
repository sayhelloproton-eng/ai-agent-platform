-- Target schema for a future Node 20-compatible SQLite adapter.
-- The current MVP ships a durable atomic JSON-file adapter because the repository
-- intentionally has zero runtime dependencies. Public repository ports are kept
-- independent from this schema so PostgreSQL can replace it later.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  task_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  required_role TEXT NOT NULL,
  aggregate_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_events (
  event_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  task_version INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id, created_at);

CREATE TABLE IF NOT EXISTS work_items (
  work_item_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  plan_node_id TEXT NOT NULL,
  status TEXT NOT NULL,
  required_role TEXT NOT NULL,
  claim_epoch INTEGER NOT NULL DEFAULT 0,
  item_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_items_available ON work_items(status, required_role);

CREATE TABLE IF NOT EXISTS dispatch_signals (
  signal_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  status TEXT NOT NULL,
  claim_epoch INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  signal_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dispatch_pending ON dispatch_signals(status, created_at);

CREATE TABLE IF NOT EXISTS idempotency_records (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scope, idempotency_key)
);

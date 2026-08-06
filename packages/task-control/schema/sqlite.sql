-- Minimum target schema for a future Node 20-compatible SQLite adapter.
-- Current round-2 MVP still uses JsonFileTaskControlStore with a strict
-- single-process / single-file / single-writer boundary.
-- Adopting SQLite or PostgreSQL requires total-control approval; this file is
-- an internal migration reference, not a public contract or deployment decision.
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_events_version
  ON task_events(task_id, task_version, event_id);
CREATE INDEX IF NOT EXISTS idx_task_events_task
  ON task_events(task_id, created_at);

CREATE TABLE IF NOT EXISTS work_items (
  work_item_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  plan_node_id TEXT NOT NULL,
  status TEXT NOT NULL,
  required_role TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  claim_epoch INTEGER NOT NULL DEFAULT 0,
  result_ref TEXT,
  started_at TEXT,
  updated_at TEXT NOT NULL,
  item_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_work_items_available
  ON work_items(status, required_role, updated_at);

CREATE TABLE IF NOT EXISTS dispatch_signals (
  signal_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  work_item_id TEXT,
  delivery_status TEXT NOT NULL,
  host_result_status TEXT NOT NULL,
  claim_epoch INTEGER NOT NULL DEFAULT 0,
  host_result_ref TEXT,
  created_at TEXT NOT NULL,
  reported_at TEXT,
  updated_at TEXT NOT NULL,
  signal_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dispatch_delivery
  ON dispatch_signals(delivery_status, created_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_result_recovery
  ON dispatch_signals(host_result_status, updated_at);

CREATE TABLE IF NOT EXISTS idempotency_records (
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scope, idempotency_key)
);

-- A production SQLite adapter must be owned by one Task Control service writer.
-- Cross-process writers must not open the database directly; they use an
-- application adapter/service boundary. PostgreSQL is the intended option once
-- true multi-instance concurrency is required.

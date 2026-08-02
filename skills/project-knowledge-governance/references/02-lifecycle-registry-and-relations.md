# Lifecycle, Registry and Relations

Every formal asset has a stable ID, type, status, evidence level, materialization flag, canonical path, publication status and migration state. Concept continuation keeps the ID; retirement uses `superseded_by` or Archive and never reassigns the old ID.

Update incoming and outgoing relations when a path or canonical owner changes. A materialized accepted/implemented/verified asset must resolve to a real repository path. Lifecycle promotion requires evidence and human Review; publication status is independent from semantic acceptance.

-- Crash/problem reports, one table per app (docs/reports.md, "What is stored").
-- Only worker/reports/store.ts writes these and scripts/reports.mjs reads them.
--
-- received_at: milliseconds since 1970 (UTC), the server's clock.
-- happened_at: the report's "when", as sent (ISO 8601, UTC).
-- bytes:       the body's size as sent (gzip size if it came gzip).
-- addr_hash:   SHA-256 of (secret salt, UTC day, address); set to NULL by the
--              daily scheduled job once that day is over.
-- payload:     the whole validated report as JSON, gzip.

CREATE TABLE reports_surfworld (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  happened_at TEXT NOT NULL,
  build TEXT NOT NULL,
  build_number INTEGER NOT NULL,
  kind TEXT NOT NULL,
  signature TEXT NOT NULL,
  os TEXT,
  runtime TEXT,
  install TEXT NOT NULL,
  session TEXT NOT NULL,
  note TEXT NOT NULL,
  log_lines INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  addr_hash TEXT,
  payload BLOB NOT NULL
);
CREATE INDEX reports_surfworld_received ON reports_surfworld (received_at);
CREATE INDEX reports_surfworld_signature ON reports_surfworld (signature, received_at);
CREATE INDEX reports_surfworld_build ON reports_surfworld (build_number);
-- For the per-install and per-address daily limits, so a check reads a
-- handful of rows instead of the whole day.
CREATE INDEX reports_surfworld_install ON reports_surfworld (install, received_at);
CREATE INDEX reports_surfworld_addr ON reports_surfworld (addr_hash, received_at);

CREATE TABLE reports_doopwatcher (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  happened_at TEXT NOT NULL,
  build TEXT NOT NULL,
  build_number INTEGER NOT NULL,
  kind TEXT NOT NULL,
  signature TEXT NOT NULL,
  os TEXT,
  runtime TEXT,
  install TEXT NOT NULL,
  session TEXT NOT NULL,
  note TEXT NOT NULL,
  log_lines INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  addr_hash TEXT,
  payload BLOB NOT NULL
);
CREATE INDEX reports_doopwatcher_received ON reports_doopwatcher (received_at);
CREATE INDEX reports_doopwatcher_signature ON reports_doopwatcher (signature, received_at);
CREATE INDEX reports_doopwatcher_build ON reports_doopwatcher (build_number);
CREATE INDEX reports_doopwatcher_install ON reports_doopwatcher (install, received_at);
CREATE INDEX reports_doopwatcher_addr ON reports_doopwatcher (addr_hash, received_at);

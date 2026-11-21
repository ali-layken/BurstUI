-- Attachments and the byte budget (docs/reports.md, "Files" and "Budget").
--
-- files_<app>:     one row per file of a report, the raw bytes as sent (decoded from base64). `type` is what the
--                  server found in the bytes (png, jpeg, webp, gif, swr, text, or bin for an app's crash file of
--                  another kind), never what the client said. Deleted with their report by the scheduled job.
--                  WITHOUT ROWID: the primary key is the table, so a file is one row written, not two (D1 counts
--                  index entries as rows written).
-- file_count:      how many files the report has (rows from before this migration say 0; their files, if any, are
--                  still inside their payload, which the reader understands).
-- stored_bytes:    payload + files, what the report counts against the budget.
-- report_counters: one row per app: the bytes stored on UTC day `day` (days since 1970) and in all, so the budget
--                  check is one row read. The insert adds to it in the same batch as the report; the scheduled job
--                  takes deleted reports off total_bytes.

ALTER TABLE reports_surfworld ADD COLUMN file_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports_surfworld ADD COLUMN stored_bytes INTEGER NOT NULL DEFAULT 0;
UPDATE reports_surfworld SET stored_bytes = length(payload);

ALTER TABLE reports_doopwatcher ADD COLUMN file_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports_doopwatcher ADD COLUMN stored_bytes INTEGER NOT NULL DEFAULT 0;
UPDATE reports_doopwatcher SET stored_bytes = length(payload);

CREATE TABLE files_surfworld (
  report_id TEXT NOT NULL,
  n INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (report_id, n)
) WITHOUT ROWID;

CREATE TABLE files_doopwatcher (
  report_id TEXT NOT NULL,
  n INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (report_id, n)
) WITHOUT ROWID;

CREATE TABLE report_counters (
  app TEXT PRIMARY KEY,
  day INTEGER NOT NULL,
  day_bytes INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL
);
INSERT INTO report_counters (app, day, day_bytes, total_bytes)
  SELECT 'surfworld', 0, 0, COALESCE(SUM(stored_bytes), 0) FROM reports_surfworld;
INSERT INTO report_counters (app, day, day_bytes, total_bytes)
  SELECT 'doopwatcher', 0, 0, COALESCE(SUM(stored_bytes), 0) FROM reports_doopwatcher;

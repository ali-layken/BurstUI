-- Hardening against someone who has read the source (docs/reports.md, "Limits" and "Budget").
--
-- asn, country:   the network operator (request.cf.asn) and country (request.cf.country) a report came from: facts the
--                 sender cannot choose, for the developer to group and delete junk by. Never the address.
-- file_bytes:     the bytes of the report's files, so the oldest files can be evicted when the budget is full.
-- reports_<app>_files: a partial index over the reports that still have files, oldest first: the eviction reads only
--                 those (written only for reports with files, and again when their files are evicted).
-- reports_<app>_addr is dropped: the per-address limit is a counter now, and the hashes are made unlinkable by
--                 deleting the day's random salt (report_salts) instead of rewriting every row.
-- report_limits:  one row per (app, UTC day, key): key is kind:crash, kind:problem, addr:<hash>, net48:<hash>,
--                 asn:<n>, or (with day 0) total. n = reports stored, bytes = counted bytes. WITHOUT ROWID: one row
--                 written per update. Replaces report_counters. Past days' rows are deleted by the daily job.
-- report_salts:   a random salt per UTC day, part of every address hash of that day; deleted after the day, which
--                 makes that day's hashes impossible to link to an address even with the secret REPORT_SALT.

ALTER TABLE reports_surfworld ADD COLUMN asn INTEGER;
ALTER TABLE reports_surfworld ADD COLUMN country TEXT;
ALTER TABLE reports_surfworld ADD COLUMN file_bytes INTEGER NOT NULL DEFAULT 0;
UPDATE reports_surfworld
  SET file_bytes = COALESCE((SELECT SUM(bytes) FROM files_surfworld WHERE report_id = reports_surfworld.id), 0);
DROP INDEX reports_surfworld_addr;
CREATE INDEX reports_surfworld_files ON reports_surfworld (received_at, id) WHERE file_bytes > 0;

ALTER TABLE reports_doopwatcher ADD COLUMN asn INTEGER;
ALTER TABLE reports_doopwatcher ADD COLUMN country TEXT;
ALTER TABLE reports_doopwatcher ADD COLUMN file_bytes INTEGER NOT NULL DEFAULT 0;
UPDATE reports_doopwatcher
  SET file_bytes = COALESCE((SELECT SUM(bytes) FROM files_doopwatcher WHERE report_id = reports_doopwatcher.id), 0);
DROP INDEX reports_doopwatcher_addr;
CREATE INDEX reports_doopwatcher_files ON reports_doopwatcher (received_at, id) WHERE file_bytes > 0;

CREATE TABLE report_limits (
  app TEXT NOT NULL,
  day INTEGER NOT NULL,
  key TEXT NOT NULL,
  n INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  PRIMARY KEY (app, day, key)
) WITHOUT ROWID;
INSERT INTO report_limits (app, day, key, n, bytes)
  SELECT 'surfworld', 0, 'total', COUNT(*), COALESCE(SUM(stored_bytes), 0) FROM reports_surfworld;
INSERT INTO report_limits (app, day, key, n, bytes)
  SELECT 'doopwatcher', 0, 'total', COUNT(*), COALESCE(SUM(stored_bytes), 0) FROM reports_doopwatcher;
DROP TABLE report_counters;

CREATE TABLE report_salts (
  day INTEGER PRIMARY KEY,
  salt TEXT NOT NULL
);

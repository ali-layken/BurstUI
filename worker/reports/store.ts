// Where reports live. Everything that knows about D1 is in this file, so moving the payloads (or everything) to R2
// later means replacing this one module. Table names come only from APPS in contract.ts; every value is a bound
// parameter.
//
// Per app: reports_<app> (one row per report: the context columns and the gzip payload without the files' bytes),
// files_<app> (one row per file, raw bytes: screenshots are already compressed, and gzipping them again with the rest
// cost more CPU than the free plan's 10 ms allow), and one row in report_counters (bytes stored today and in all, so
// the byte budget is one row read).
import { type AppSlug, APPS, type FileType, LIMITS } from "./contract";

export interface ReportRow {
  id: string;
  received_at: number;
  happened_at: string;
  build: string;
  build_number: number;
  kind: string;
  signature: string;
  os: string | null;
  runtime: string | null;
  install: string;
  session: string;
  note: string;
  log_lines: number;
  bytes: number;
  addr_hash: string;
  /** The validated report as JSON without the files' bytes, gzip. */
  payload: Uint8Array;
  files: { name: string; type: FileType; data: Uint8Array }[];
}

export interface LimitCounts {
  /** The id of this install's report with the same signature within the last LIMITS.sameSignatureMs, if any. */
  duplicateOf: string | null;
  installToday: number;
  addressToday: number;
  /** Capped at LIMITS.perAppPerDay, so the check never reads more rows than that. */
  appToday: number;
  /** Bytes stored for this app today (UTC) and in all. */
  bytesToday: number;
  bytesTotal: number;
}

export interface ReportStore {
  counts(app: AppSlug, q: { install: string; signature: string; addrHash: string; now: number; dayStart: number }): Promise<LimitCounts>;
  insert(app: AppSlug, row: ReportRow): Promise<void>;
  /** Deletes reports older than LIMITS.keepDays and drops the address hashes of days that are over. */
  purge(now: number): Promise<{ deleted: number; hashesCleared: number }>;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const utcDayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;
/** What a report costs against the byte budget. */
export const storedBytes = (r: Pick<ReportRow, "payload" | "files">) =>
  r.payload.byteLength + r.files.reduce((n, f) => n + f.data.byteLength, 0);

const filesTable = (app: AppSlug) => `files_${app}` as const;
const blob = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);

export function d1Store(db: D1Database): ReportStore {
  return {
    async counts(app, q) {
      const t = APPS[app].table;
      const row = await db
        .prepare(
          `SELECT
             (SELECT id FROM ${t} WHERE install = ?1 AND received_at >= ?3 AND signature = ?2
                ORDER BY received_at LIMIT 1) AS duplicate_of,
             (SELECT COUNT(*) FROM ${t} WHERE install = ?1 AND received_at >= ?4) AS install_today,
             (SELECT COUNT(*) FROM ${t} WHERE addr_hash = ?5 AND received_at >= ?4) AS address_today,
             (SELECT COUNT(*) FROM (SELECT 1 FROM ${t} WHERE received_at >= ?4 LIMIT ?6)) AS app_today,
             c.day AS budget_day, c.day_bytes, c.total_bytes
           FROM (SELECT 1) LEFT JOIN report_counters c ON c.app = ?7`,
        )
        .bind(q.install, q.signature, q.now - LIMITS.sameSignatureMs, q.dayStart, q.addrHash, LIMITS.perAppPerDay, app)
        .first<{
          duplicate_of: string | null;
          install_today: number;
          address_today: number;
          app_today: number;
          budget_day: number | null;
          day_bytes: number | null;
          total_bytes: number | null;
        }>();
      return {
        duplicateOf: row?.duplicate_of ?? null,
        installToday: row?.install_today ?? 0,
        addressToday: row?.address_today ?? 0,
        appToday: row?.app_today ?? 0,
        bytesToday: row?.budget_day === q.dayStart / DAY_MS ? (row?.day_bytes ?? 0) : 0,
        bytesTotal: row?.total_bytes ?? 0,
      };
    },

    async insert(app, r) {
      const t = APPS[app].table;
      const ft = filesTable(app);
      const size = storedBytes(r);
      const day = utcDayStart(r.received_at) / DAY_MS;
      // One batch is one transaction: the report, its files and the counters all land, or none do.
      await db.batch([
        db
          .prepare(
            `INSERT INTO ${t} (id, received_at, happened_at, build, build_number, kind, signature, os, runtime,
               install, session, note, log_lines, bytes, addr_hash, payload, file_count, stored_bytes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`,
          )
          .bind(
            r.id, r.received_at, r.happened_at, r.build, r.build_number, r.kind, r.signature, r.os, r.runtime,
            r.install, r.session, r.note, r.log_lines, r.bytes, r.addr_hash, blob(r.payload), r.files.length, size,
          ),
        ...r.files.map((f, n) =>
          db
            .prepare(`INSERT INTO ${ft} (report_id, n, name, type, bytes, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
            .bind(r.id, n, f.name, f.type, f.data.byteLength, blob(f.data)),
        ),
        db
          .prepare(
            `INSERT INTO report_counters (app, day, day_bytes, total_bytes) VALUES (?1, ?2, ?3, ?3)
             ON CONFLICT (app) DO UPDATE SET
               day_bytes = CASE WHEN day = excluded.day THEN day_bytes + excluded.day_bytes ELSE excluded.day_bytes END,
               day = excluded.day,
               total_bytes = total_bytes + excluded.total_bytes`,
          )
          .bind(app, day, size),
      ]);
    },

    async purge(now) {
      const oldest = now - LIMITS.keepDays * DAY_MS;
      const today = utcDayStart(now);
      let deleted = 0;
      let hashesCleared = 0;
      for (const app of Object.keys(APPS) as AppSlug[]) {
        const t = APPS[app].table;
        const [, , gone, cleared] = await db.batch([
          db
            .prepare(
              `UPDATE report_counters
                 SET total_bytes = MAX(0, total_bytes - (SELECT COALESCE(SUM(stored_bytes), 0) FROM ${t} WHERE received_at < ?1))
               WHERE app = ?2`,
            )
            .bind(oldest, app),
          db.prepare(`DELETE FROM ${filesTable(app)} WHERE report_id IN (SELECT id FROM ${t} WHERE received_at < ?1)`).bind(oldest),
          db.prepare(`DELETE FROM ${t} WHERE received_at < ?1`).bind(oldest),
          db.prepare(`UPDATE ${t} SET addr_hash = NULL WHERE addr_hash IS NOT NULL AND received_at < ?1`).bind(today),
        ]);
        deleted += gone.meta.changes ?? 0;
        hashesCleared += cleared.meta.changes ?? 0;
      }
      return { deleted, hashesCleared };
    },
  };
}


// Where reports live. Everything that knows about D1 is in this file, so moving the payloads (or everything) to R2
// later means replacing this one module. Table names come only from APPS in contract.ts; every value is a bound
// parameter.
//
// Per app: reports_<app> (one row per report: the context columns and the gzip payload without the files' bytes),
// files_<app> (one row per file, raw bytes). Shared: report_limits (the day's counts and bytes per key, and each app's
// total), report_salts (the day's random salt for address hashes).
//
// The limits are enforced by the insert itself: its first statement is an INSERT ... SELECT ... WHERE <every limit
// holds>, and the files and counters that follow are guarded on that row existing. A batch is one transaction, so
// parallel requests cannot all pass a check that only one of them should (docs/reports.md, "Limits").
import { type AppSlug, APPS, DAILY, EVICT_SCAN, type FileType, LIMITS, TOTAL_BYTES } from "./contract";

export interface ReportRow {
  id: string;
  received_at: number;
  happened_at: string;
  build: string;
  build_number: number;
  kind: "crash" | "problem";
  signature: string;
  os: string | null;
  runtime: string | null;
  install: string;
  session: string;
  /** Only its first LIMITS.noteColumnChars characters go in the column; the payload has all of it. */
  note: string;
  log_lines: number;
  bytes: number;
  addr_hash: string;
  asn: number | null;
  country: string | null;
  /** The validated report as JSON without the files' bytes, gzip. */
  payload: Uint8Array;
  files: { name: string; type: FileType; data: Uint8Array }[];
}

/** The keys a report is counted under today (report_limits.key). */
export interface LimitKeys {
  kind: string;
  addr: string;
  /** Null for IPv4. */
  net48: string | null;
  network: string;
}

export interface Usage {
  n: number;
  bytes: number;
}

export interface Counts {
  duplicateOf: string | null;
  install: number;
  kind: Usage;
  addr: Usage;
  net48: Usage;
  network: Usage;
  total: Usage;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const utcDayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;
export const dayNumber = (ms: number) => Math.floor(ms / DAY_MS);

// ---- what a row really takes ---------------------------------------------------------------------------------------

const utf8 = (s: string | null) => (s === null ? 0 : new TextEncoder().encode(s).byteLength);
/** SQLite row header, integer columns, rowid, and the entries of the five indexes on reports_<app>. */
const ROW_OVERHEAD = 256;
/** A files_<app> row's header, n and bytes columns, and its key (the report id again). */
const FILE_OVERHEAD = 64;

export const noteColumn = (note: string) => [...note].slice(0, LIMITS.noteColumnChars).join("");

/** The counted bytes of one file: its data, its name and type, and its row. */
export const fileCounted = (f: { name: string; type: string; data: Uint8Array }) =>
  f.data.byteLength + utf8(f.name) + utf8(f.type) + 18 + FILE_OVERHEAD;

/**
 * The counted bytes of a report: every column as stored (text columns that are also index keys twice), the payload,
 * the files and a fixed overhead per row. What the budget counts is what the database holds.
 */
export function countedBytes(r: Omit<ReportRow, "bytes"> & { bytes?: number }): { stored: number; files: number } {
  const files = r.files.reduce((n, f) => n + fileCounted(f), 0);
  const row =
    ROW_OVERHEAD +
    r.payload.byteLength +
    2 * utf8(r.id) +
    2 * utf8(r.signature) +
    2 * utf8(r.install) +
    utf8(r.happened_at) +
    utf8(r.build) +
    utf8(r.kind) +
    utf8(r.os) +
    utf8(r.runtime) +
    utf8(r.session) +
    utf8(noteColumn(r.note)) +
    utf8(r.addr_hash) +
    utf8(r.country);
  return { stored: row + files, files };
}

// ---- the store -----------------------------------------------------------------------------------------------------

const filesTable = (app: AppSlug) => `files_${app}` as const;
const blob = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
const ZERO: Usage = { n: 0, bytes: 0 };

export interface ReportStore {
  /** The day's random salt for address hashes (made on first use). */
  daySalt(day: number): Promise<string>;
  /** The counter rows of an address, its /48 and its network: read before the body is. */
  sources(app: AppSlug, day: number, keys: Omit<LimitKeys, "kind">): Promise<Pick<Counts, "addr" | "net48" | "network">>;
  /** Everything the insert will check, to choose which refusal to answer. */
  counts(app: AppSlug, q: { day: number; dayStart: number; now: number; install: string; signature: string; keys: LimitKeys }): Promise<Counts>;
  /** Frees at least `need` bytes of the app's total: the oldest reports' files first, then the oldest reports. */
  evict(app: AppSlug, need: number): Promise<number>;
  /** Stores the report if, inside the same transaction, every limit still holds. False: nothing was stored. */
  insert(app: AppSlug, row: ReportRow, q: { day: number; dayStart: number; now: number; keys: LimitKeys }): Promise<boolean>;
  /** The daily job: deletes old reports, past days' counters and salts, and recomputes each app's total. */
  purge(now: number): Promise<{ deleted: number }>;
}

let saltCache: { day: number; salt: string } | null = null;

export function d1Store(db: D1Database): ReportStore {
  const limitRows = async (app: AppSlug, day: number, keys: (string | null)[]) => {
    const wanted = keys.filter((k): k is string => k !== null);
    const { results } = await db
      .prepare(
        `SELECT day, key, n, bytes FROM report_limits
         WHERE app = ?1 AND ((day = ?2 AND key IN (SELECT value FROM json_each(?3))) OR (day = 0 AND key = 'total'))`,
      )
      .bind(app, day, JSON.stringify(wanted))
      .all<{ day: number; key: string; n: number; bytes: number }>();
    const get = (day0: boolean, key: string | null): Usage => {
      if (key === null) return ZERO;
      const r = results.find((x) => (day0 ? x.day === 0 : x.day !== 0) && x.key === key);
      return r ? { n: r.n, bytes: r.bytes } : ZERO;
    };
    return get;
  };

  return {
    async daySalt(day) {
      if (saltCache?.day === day) return saltCache.salt;
      const fresh = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const [, read] = await db.batch([
        db.prepare("INSERT INTO report_salts (day, salt) VALUES (?1, ?2) ON CONFLICT (day) DO NOTHING").bind(day, fresh),
        db.prepare("SELECT salt FROM report_salts WHERE day = ?1").bind(day),
      ]);
      const salt = (read.results[0] as { salt: string } | undefined)?.salt ?? fresh;
      saltCache = { day, salt };
      return salt;
    },

    async sources(app, day, keys) {
      const get = await limitRows(app, day, [keys.addr, keys.net48, keys.network]);
      return { addr: get(false, keys.addr), net48: get(false, keys.net48), network: get(false, keys.network) };
    },

    async counts(app, q) {
      const t = APPS[app].table;
      const [dup, get] = await Promise.all([
        db
          .prepare(
            `SELECT
               (SELECT id FROM ${t} WHERE install = ?1 AND received_at >= ?3 AND signature = ?2
                  ORDER BY received_at LIMIT 1) AS duplicate_of,
               (SELECT COUNT(*) FROM ${t} WHERE install = ?1 AND received_at >= ?4) AS install_today`,
          )
          .bind(q.install, q.signature, q.now - LIMITS.sameSignatureMs, q.dayStart)
          .first<{ duplicate_of: string | null; install_today: number }>(),
        limitRows(app, q.day, [q.keys.kind, q.keys.addr, q.keys.net48, q.keys.network]),
      ]);
      return {
        duplicateOf: dup?.duplicate_of ?? null,
        install: dup?.install_today ?? 0,
        kind: get(false, q.keys.kind),
        addr: get(false, q.keys.addr),
        net48: get(false, q.keys.net48),
        network: get(false, q.keys.network),
        total: get(true, "total"),
      };
    },

    async evict(app, need) {
      const t = APPS[app].table;
      const ft = filesTable(app);
      // 1. The files of the oldest reports that still have files, until `need` bytes are free.
      const { results: withFiles } = await db
        .prepare(
          `SELECT id, file_bytes FROM (
             SELECT id, file_bytes, SUM(file_bytes) OVER (ORDER BY received_at, id) AS cum
             FROM (SELECT id, received_at, file_bytes FROM ${t} WHERE file_bytes > 0 ORDER BY received_at, id LIMIT ?1))
           WHERE cum - file_bytes < ?2`,
        )
        .bind(EVICT_SCAN, need)
        .all<{ id: string; file_bytes: number }>();
      const fromFiles = withFiles.reduce((n, r) => n + r.file_bytes, 0);
      if (fromFiles >= need) {
        const ids = JSON.stringify(withFiles.map((r) => r.id));
        const set = `SELECT value FROM json_each(?1)`;
        // The counter takes off only what is still there when the batch runs, so two evictions racing for the same
        // reports cannot count them twice.
        await db.batch([
          db
            .prepare(
              `UPDATE report_limits SET bytes = bytes - (SELECT COALESCE(SUM(file_bytes), 0) FROM ${t} WHERE id IN (${set}))
               WHERE app = ?2 AND day = 0 AND key = 'total'`,
            )
            .bind(ids, app),
          db.prepare(`DELETE FROM ${ft} WHERE report_id IN (${set})`).bind(ids),
          db
            .prepare(`UPDATE ${t} SET stored_bytes = stored_bytes - file_bytes, file_count = 0, file_bytes = 0 WHERE id IN (${set})`)
            .bind(ids),
        ]);
        return fromFiles;
      }
      // 2. Not enough in files: the oldest reports themselves (rows, payloads and files).
      const { results: oldest } = await db
        .prepare(
          `SELECT id, stored_bytes FROM (
             SELECT id, stored_bytes, SUM(stored_bytes) OVER (ORDER BY received_at, id) AS cum
             FROM (SELECT id, received_at, stored_bytes FROM ${t} ORDER BY received_at, id LIMIT ?1))
           WHERE cum - stored_bytes < ?2`,
        )
        .bind(EVICT_SCAN, need)
        .all<{ id: string; stored_bytes: number }>();
      if (oldest.length === 0) return 0;
      const ids = JSON.stringify(oldest.map((r) => r.id));
      const set = `SELECT value FROM json_each(?1)`;
      await db.batch([
        db
          .prepare(
            `UPDATE report_limits SET
               bytes = bytes - (SELECT COALESCE(SUM(stored_bytes), 0) FROM ${t} WHERE id IN (${set})),
               n = n - (SELECT COUNT(*) FROM ${t} WHERE id IN (${set}))
             WHERE app = ?2 AND day = 0 AND key = 'total'`,
          )
          .bind(ids, app),
        db.prepare(`DELETE FROM ${ft} WHERE report_id IN (${set})`).bind(ids),
        db.prepare(`DELETE FROM ${t} WHERE id IN (${set})`).bind(ids),
      ]);
      return oldest.reduce((n, r) => n + r.stored_bytes, 0);
    },

    async insert(app, r, q) {
      const t = APPS[app].table;
      const ft = filesTable(app);
      const { stored, files } = countedBytes(r);
      const kindCap = DAILY.kind[r.kind];
      const exists = `EXISTS (SELECT 1 FROM ${t} WHERE id = ?1)`;
      const limit = (keyParam: string, col: "n" | "bytes") =>
        `COALESCE((SELECT ${col} FROM report_limits WHERE app = ?22 AND day = ?23 AND key = ${keyParam}), 0)`;
      const results = await db.batch([
        db
          .prepare(
            `INSERT INTO ${t} (id, received_at, happened_at, build, build_number, kind, signature, os, runtime,
               install, session, note, log_lines, bytes, addr_hash, payload, file_count, stored_bytes, asn, country, file_bytes)
             SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21
             WHERE ${limit("?24", "n")} < ?25 AND ${limit("?24", "bytes")} + ?18 <= ?26
               AND (?27 IS NULL OR ${limit("?27", "n")} < ?28)
               AND ${limit("?29", "n")} < ?30 AND ${limit("?29", "bytes")} + ?18 <= ?31
               AND ${limit("?32", "n")} < ?33 AND ${limit("?32", "bytes")} + ?18 <= ?34
               AND (SELECT COUNT(*) FROM ${t} WHERE install = ?10 AND received_at >= ?35) < ?36
               AND COALESCE((SELECT bytes FROM report_limits WHERE app = ?22 AND day = 0 AND key = 'total'), 0) + ?18 <= ?37
               AND (?6 <> 'crash' OR NOT EXISTS (SELECT 1 FROM ${t} WHERE install = ?10 AND received_at >= ?38 AND signature = ?7))`,
          )
          .bind(
            r.id, r.received_at, r.happened_at, r.build, r.build_number, r.kind, r.signature, r.os, r.runtime,
            r.install, r.session, noteColumn(r.note), r.log_lines, r.bytes, r.addr_hash, blob(r.payload), r.files.length,
            stored, r.asn, r.country, files,
            app, q.day,
            q.keys.addr, DAILY.address.reports, DAILY.address.bytes,
            q.keys.net48, DAILY.net48.reports,
            q.keys.network, DAILY.network.reports, DAILY.network.bytes,
            q.keys.kind, kindCap.reports, kindCap.bytes,
            q.dayStart, DAILY.install.reports,
            TOTAL_BYTES,
            q.now - LIMITS.sameSignatureMs,
          ),
        ...r.files.map((f, n) =>
          db
            .prepare(`INSERT INTO ${ft} (report_id, n, name, type, bytes, data) SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE ${exists}`)
            .bind(r.id, n, f.name, f.type, f.data.byteLength, blob(f.data)),
        ),
        db
          .prepare(
            `INSERT INTO report_limits (app, day, key, n, bytes)
             SELECT ?2, d, k, 1, ?3 FROM (
               SELECT ?4 AS d, ?5 AS k UNION ALL SELECT ?4, ?6 UNION ALL SELECT ?4, ?7 UNION ALL SELECT ?4, ?8
               UNION ALL SELECT 0, 'total')
             WHERE k IS NOT NULL AND ${exists}
             ON CONFLICT (app, day, key) DO UPDATE SET n = n + 1, bytes = bytes + excluded.bytes`,
          )
          .bind(r.id, app, stored, q.day, q.keys.kind, q.keys.addr, q.keys.net48, q.keys.network),
      ]);
      return (results[0].meta.changes ?? 0) === 1;
    },

    async purge(now) {
      const oldest = now - LIMITS.keepDays * DAY_MS;
      const today = dayNumber(now);
      let deleted = 0;
      for (const app of Object.keys(APPS) as AppSlug[]) {
        const t = APPS[app].table;
        const [, gone] = await db.batch([
          db.prepare(`DELETE FROM ${filesTable(app)} WHERE report_id IN (SELECT id FROM ${t} WHERE received_at < ?1)`).bind(oldest),
          db.prepare(`DELETE FROM ${t} WHERE received_at < ?1`).bind(oldest),
          // Recomputed from the table, not adjusted: a hand delete or any drift corrects itself every day.
          db
            .prepare(
              `INSERT INTO report_limits (app, day, key, n, bytes)
               SELECT ?1, 0, 'total', COUNT(*), COALESCE(SUM(stored_bytes), 0) FROM ${t} WHERE true
               ON CONFLICT (app, day, key) DO UPDATE SET n = excluded.n, bytes = excluded.bytes`,
            )
            .bind(app),
        ]);
        deleted += gone.meta.changes ?? 0;
      }
      // Past days' counters, and past days' salts: without its salt a day's address hashes cannot be linked to an
      // address any more, even by someone holding REPORT_SALT, so the hashes themselves need no rewriting.
      await db.batch([
        db.prepare("DELETE FROM report_limits WHERE day > 0 AND day < ?1").bind(today),
        db.prepare("DELETE FROM report_salts WHERE day < ?1").bind(today),
      ]);
      if (saltCache && saltCache.day < today) saltCache = null;
      return { deleted };
    },
  };
}


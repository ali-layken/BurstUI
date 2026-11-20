// Where reports live. Everything that knows about D1 is in this file, so moving the payloads (or everything) to R2
// later means replacing this one module. Table names come only from APPS in contract.ts; every value is a bound
// parameter.
import { APPS, type AppSlug, LIMITS } from "./contract";

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
  /** The whole validated report as JSON, gzip. */
  payload: Uint8Array;
}

export interface LimitCounts {
  /** The id of this install's report with the same signature within the last LIMITS.sameSignatureMs, if any. */
  duplicateOf: string | null;
  installToday: number;
  addressToday: number;
  /** Capped at LIMITS.perAppPerDay, so the check never reads more rows than that. */
  appToday: number;
}

export interface ReportStore {
  counts(app: AppSlug, q: { install: string; signature: string; addrHash: string; now: number; dayStart: number }): Promise<LimitCounts>;
  insert(app: AppSlug, row: ReportRow): Promise<void>;
  /** Deletes reports older than LIMITS.keepDays and drops the address hashes of days that are over. */
  purge(now: number): Promise<{ deleted: number; hashesCleared: number }>;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const utcDayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

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
             (SELECT COUNT(*) FROM (SELECT 1 FROM ${t} WHERE received_at >= ?4 LIMIT ?6)) AS app_today`,
        )
        .bind(q.install, q.signature, q.now - LIMITS.sameSignatureMs, q.dayStart, q.addrHash, LIMITS.perAppPerDay)
        .first<{ duplicate_of: string | null; install_today: number; address_today: number; app_today: number }>();
      return {
        duplicateOf: row?.duplicate_of ?? null,
        installToday: row?.install_today ?? 0,
        addressToday: row?.address_today ?? 0,
        appToday: row?.app_today ?? 0,
      };
    },

    async insert(app, r) {
      const t = APPS[app].table;
      await db
        .prepare(
          `INSERT INTO ${t} (id, received_at, happened_at, build, build_number, kind, signature, os, runtime,
             install, session, note, log_lines, bytes, addr_hash, payload)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`,
        )
        .bind(
          r.id, r.received_at, r.happened_at, r.build, r.build_number, r.kind, r.signature, r.os, r.runtime,
          r.install, r.session, r.note, r.log_lines, r.bytes, r.addr_hash,
          r.payload.buffer.slice(r.payload.byteOffset, r.payload.byteOffset + r.payload.byteLength),
        )
        .run();
    },

    async purge(now) {
      const oldest = now - LIMITS.keepDays * DAY_MS;
      const today = utcDayStart(now);
      const statements = Object.values(APPS).flatMap(({ table }) => [
        db.prepare(`DELETE FROM ${table} WHERE received_at < ?1`).bind(oldest),
        db.prepare(`UPDATE ${table} SET addr_hash = NULL WHERE addr_hash IS NOT NULL AND received_at < ?1`).bind(today),
      ]);
      const results = await db.batch(statements);
      let deleted = 0;
      let hashesCleared = 0;
      results.forEach((res, i) => {
        if (i % 2 === 0) deleted += res.meta.changes ?? 0;
        else hashesCleared += res.meta.changes ?? 0;
      });
      return { deleted, hashesCleared };
    },
  };
}

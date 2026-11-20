#!/usr/bin/env node
// The developer's reader for crash/problem reports (docs/reports.md). Goes through `wrangler d1 execute` under your own
// wrangler login; there is no public page that lists or shows reports.
//
//   npm run reports -- list [app] [--build N] [--signature S] [--days D] [--limit N]
//   npm run reports -- count [app] [--build N] [--days D]       how many of which signature on which build
//   npm run reports -- show ID [--out DIR] [--raw]               context, the log as a table, files written to DIR
//
//   app: surfworld | doopwatcher (default: both)   --days: default 7 (list, count)
//   --local reads the local dev database (wrangler dev) instead of the real one; --persist-to DIR implies --local.
//   --out: where `show` writes the report's files (default .reports/<id>/, gitignored).
//
// Everything in a report is hostile: values are printed with control and bidi characters escaped (so a report cannot
// drive your terminal), file names are checked again before anything is written, and no report byte ever becomes SQL
// text (the one report-derived filter, --signature, goes into the SQL as a hex blob literal).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPS = { surfworld: "reports_surfworld", doopwatcher: "reports_doopwatcher" };
const DAY_MS = 24 * 60 * 60 * 1000;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    build: { type: "string" },
    signature: { type: "string" },
    days: { type: "string", default: "7" },
    limit: { type: "string", default: "100" },
    out: { type: "string" },
    raw: { type: "boolean", default: false },
    local: { type: "boolean", default: false },
    "persist-to": { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const usage = () => {
  console.log(
    "usage: npm run reports -- list [app] [--build N] [--signature S] [--days D] [--limit N]\n" +
      "       npm run reports -- count [app] [--build N] [--days D]\n" +
      "       npm run reports -- show ID [--out DIR] [--raw]\n" +
      "       add --local (or --persist-to DIR) to read the local dev database",
  );
};
const die = (msg) => {
  console.error(`reports: ${msg}`);
  process.exit(2);
};

// ---- terminal-safe text -------------------------------------------------------------------------------------------

// C0/C1 controls, DEL, and the bidi controls that can reorder what a terminal shows.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g;
const escapeChar = (c) =>
  c === "\n" ? "\\n" : c === "\t" ? "\\t" : c === "\r" ? "\\r" : `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
/** Any value from a report, made safe to print. */
const safe = (v) => String(v ?? "").replace(UNSAFE, escapeChar);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function table(rows, columns) {
  if (rows.length === 0) return "(none)";
  const cells = rows.map((r) => columns.map((c) => safe(c.get(r))));
  const widths = columns.map((c, i) => Math.min(c.max ?? 200, Math.max(c.title.length, ...cells.map((row) => row[i].length))));
  const line = (vals) => vals.map((v, i) => (i === vals.length - 1 ? clip(v, widths[i]) : clip(v, widths[i]).padEnd(widths[i]))).join("  ");
  return [line(columns.map((c) => c.title)), line(widths.map((w) => "-".repeat(w))), ...cells.map(line)].join("\n");
}

// ---- wrangler -----------------------------------------------------------------------------------------------------

function d1(sql) {
  const where = opts["persist-to"] ? ["--local", "--persist-to", opts["persist-to"]] : opts.local ? ["--local"] : ["--remote"];
  const bin = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
  let out;
  try {
    out = execFileSync(bin, ["d1", "execute", "burst-reports", ...where, "--json", "--command", sql], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
  } catch (e) {
    die(`wrangler d1 execute failed:\n${e.stderr || e.stdout || e.message}`);
  }
  const parsed = JSON.parse(out.slice(out.indexOf("[")));
  return parsed.flatMap((set) => set.results ?? []);
}

const int = (s, name) => {
  if (!/^\d{1,9}$/.test(s)) die(`${name} must be a whole number`);
  return Number(s);
};
/** A developer-typed (or report-copied) string as an SQL text expression made only of hex digits. */
const textLiteral = (s) => `CAST(X'${Buffer.from(s, "utf8").toString("hex")}' AS TEXT)`;

function pickApps(arg) {
  if (arg === undefined) return Object.keys(APPS);
  if (!(arg in APPS)) die(`unknown app "${safe(arg)}" (surfworld | doopwatcher)`);
  return [arg];
}

function filters({ withSignature }) {
  const since = Date.now() - int(opts.days, "--days") * DAY_MS;
  const where = [`received_at >= ${since}`];
  if (opts.build !== undefined) where.push(`build_number = ${int(opts.build, "--build")}`);
  if (withSignature && opts.signature !== undefined) where.push(`signature = ${textLiteral(opts.signature)}`);
  return where.join(" AND ");
}

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

// ---- commands -----------------------------------------------------------------------------------------------------

function list(appArg) {
  const where = filters({ withSignature: true });
  const limit = int(opts.limit, "--limit");
  const sql = pickApps(appArg)
    .map((a) => `SELECT '${a}' AS app, id, received_at, build, kind, signature, os, runtime, log_lines, bytes, note FROM ${APPS[a]} WHERE ${where}`)
    .join(" UNION ALL ");
  const rows = d1(`SELECT * FROM (${sql}) ORDER BY received_at DESC LIMIT ${limit}`);
  console.log(
    table(rows, [
      { title: "id", get: (r) => r.id },
      { title: "received", get: (r) => iso(r.received_at) },
      { title: "app", get: (r) => r.app },
      { title: "build", get: (r) => r.build },
      { title: "kind", get: (r) => r.kind },
      { title: "signature", get: (r) => r.signature, max: 60 },
      { title: "os", get: (r) => r.os, max: 24 },
      { title: "runtime", get: (r) => r.runtime, max: 20 },
      { title: "lines", get: (r) => r.log_lines },
      { title: "bytes", get: (r) => r.bytes },
      { title: "note", get: (r) => r.note, max: 50 },
    ]),
  );
  console.log(`\n${rows.length} report(s), last ${opts.days} day(s)${rows.length === limit ? ` (showing the newest ${limit}; --limit for more)` : ""}`);
}

function count(appArg) {
  const where = filters({ withSignature: false });
  const sql = pickApps(appArg)
    .map(
      (a) => `SELECT '${a}' AS app, build_number, build, signature, COUNT(*) AS n, COUNT(DISTINCT install) AS installs,
                MIN(received_at) AS first, MAX(received_at) AS last FROM ${APPS[a]} WHERE ${where}
                GROUP BY build_number, build, signature`,
    )
    .join(" UNION ALL ");
  const rows = d1(`SELECT * FROM (${sql}) ORDER BY app, build_number DESC, n DESC`);
  console.log(
    table(rows, [
      { title: "app", get: (r) => r.app },
      { title: "build", get: (r) => r.build },
      { title: "signature", get: (r) => r.signature, max: 70 },
      { title: "reports", get: (r) => r.n },
      { title: "installs", get: (r) => r.installs },
      { title: "first", get: (r) => iso(r.first) },
      { title: "last", get: (r) => iso(r.last) },
    ]),
  );
}

function fmtT(ms) {
  const total = Math.max(0, Number(ms) || 0);
  const m = Math.floor(total / 60000);
  const s = ((total % 60000) / 1000).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function show(id) {
  if (!id || !/^r_[0-9a-z]{1,40}$/.test(id)) die("show needs a report id like r_7f3k2m");
  const sql = Object.entries(APPS)
    .map(([a, t]) => `SELECT '${a}' AS app, id, received_at, hex(payload) AS payload_hex FROM ${t} WHERE id = '${id}'`)
    .join(" UNION ALL ");
  const [row] = d1(sql);
  if (!row) die(`no report ${id}`);

  let report;
  try {
    const json = gunzipSync(Buffer.from(row.payload_hex, "hex"), { maxOutputLength: 2 * 1024 * 1024 }).toString("utf8");
    report = JSON.parse(json);
  } catch (e) {
    die(`report ${id}: payload does not unpack (${e.message})`);
  }
  if (opts.raw) {
    console.log(JSON.stringify(report, null, 2)); // JSON.stringify escapes control characters itself
    return;
  }

  const field = (k, v) => console.log(`${k.padEnd(10)} ${safe(v)}`);
  field("id", row.id);
  field("app", row.app);
  field("received", iso(row.received_at));
  field("happened", report.when);
  field("build", report.build);
  field("kind", report.kind);
  field("signature", report.signature);
  field("install", report.install);
  field("session", report.session);
  console.log("\nplatform");
  for (const [k, v] of Object.entries(report.platform ?? {})) console.log(`  ${safe(k).padEnd(12)} ${safe(v)}`);
  console.log("\ncontext");
  for (const [k, v] of Object.entries(report.context ?? {})) console.log(`  ${safe(k).padEnd(12)} ${safe(JSON.stringify(v))}`);
  if (report.note) console.log(`\nnote\n  ${safe(report.note)}`);

  const log = Array.isArray(report.log) ? report.log : [];
  console.log(`\nlog (${log.length} line(s), oldest first)`);
  console.log(
    table(log, [
      { title: "t", get: (l) => fmtT(l.t) },
      { title: "lvl", get: (l) => l.lvl },
      { title: "src", get: (l) => l.src },
      { title: "msg", get: (l) => l.msg, max: 300 },
      { title: "data", get: (l) => (l.data ? JSON.stringify(l.data) : ""), max: 120 },
    ]),
  );

  const files = Array.isArray(report.files) ? report.files : [];
  if (files.length) {
    const dir = path.resolve(opts.out ?? path.join(ROOT, ".reports", id));
    mkdirSync(dir, { recursive: true });
    console.log(`\nfiles -> ${dir}`);
    for (const f of files) {
      const name = String(f?.name ?? "");
      // The server allowed only these names; check again before touching the disk.
      if (!/^[A-Za-z0-9._-]{1,64}$/.test(name) || /^\.+$/.test(name) || path.basename(name) !== name) {
        console.log(`  skipped a file with an unusable name: ${safe(clip(name, 80))}`);
        continue;
      }
      const bytes = Buffer.from(String(f.b64 ?? ""), "base64");
      writeFileSync(path.join(dir, name), bytes, { mode: 0o644 });
      console.log(`  ${name}  ${bytes.length} bytes`);
    }
  }
}

// ---- main ---------------------------------------------------------------------------------------------------------

const [command, arg] = positionals;
if (opts.help || !command) {
  usage();
  process.exit(command ? 0 : 2);
}
if (command === "list") list(arg);
else if (command === "count") count(arg);
else if (command === "show") show(arg);
else {
  usage();
  process.exit(2);
}

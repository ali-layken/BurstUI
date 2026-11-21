#!/usr/bin/env node
// The developer's reader for crash/problem reports (docs/reports.md). Goes through `wrangler d1 execute` under your own
// wrangler login; there is no public page that lists or shows reports.
//
//   npm run reports -- list [app] [filters] [--limit N]
//   npm run reports -- count [app] [filters] [--by signature|network|country|install|build] [--limit N]
//   npm run reports -- show ID [--out DIR] [--raw]               context, the log as a table, files written to DIR
//                                                                (named by the type found in their bytes: .png .jpg ...)
//   npm run reports -- delete [app] [filters] [--yes]            without --yes only says what it would delete
//
//   filters: --id ID  --install HEX  --network ASN  --country CC  --signature S  --build N  --addr HASH
//            --days D | --since TIME [--until TIME]   (TIME: an ISO date/time or ms since 1970)
//   app: surfworld | doopwatcher (default: both)   --days: default 7 for list and count; delete has no default
//
// Everything the sender chose (build, signature, install...) can be junk made to look real; --network (request.cf.asn)
// and --country are what Cloudflare saw, the facts a sender cannot choose.
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
    id: { type: "string" },
    install: { type: "string" },
    network: { type: "string" },
    country: { type: "string" },
    addr: { type: "string" },
    build: { type: "string" },
    signature: { type: "string" },
    days: { type: "string" },
    since: { type: "string" },
    until: { type: "string" },
    by: { type: "string", default: "signature" },
    limit: { type: "string" },
    yes: { type: "boolean", default: false },
    out: { type: "string" },
    raw: { type: "boolean", default: false },
    local: { type: "boolean", default: false },
    "persist-to": { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const usage = () => {
  console.log(
    "usage: npm run reports -- list [app] [filters] [--limit N]\n" +
      "       npm run reports -- count [app] [filters] [--by signature|network|country|install|build] [--limit N]\n" +
      "       npm run reports -- show ID [--out DIR] [--raw]\n" +
      "       npm run reports -- delete [app] [filters] [--yes]\n" +
      "       filters: --id --install --network ASN --country CC --signature --build N --addr HASH\n" +
      "                --days D | --since TIME [--until TIME]\n" +
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

const time = (s, name) => {
  const ms = /^\d{1,15}$/.test(s) ? Number(s) : Date.parse(s);
  if (!Number.isFinite(ms)) die(`${name} must be an ISO date/time or ms since 1970`);
  return ms;
};

/**
 * The WHERE clause of the filters given. Every value is checked against a strict pattern or made a number; the one
 * free-text filter (--signature) goes in as a hex literal, so nothing typed or copied from a report becomes SQL text.
 */
function filters({ defaultDays }) {
  const where = [];
  const days = opts.days ?? (opts.since === undefined && defaultDays ? String(defaultDays) : undefined);
  if (days !== undefined) where.push(`received_at >= ${Date.now() - int(days, "--days") * DAY_MS}`);
  if (opts.since !== undefined) where.push(`received_at >= ${time(opts.since, "--since")}`);
  if (opts.until !== undefined) where.push(`received_at < ${time(opts.until, "--until")}`);
  if (opts.id !== undefined) {
    if (!/^r_[0-9a-z]{1,40}$/.test(opts.id)) die("--id must be a report id like r_7f3k2m");
    where.push(`id = '${opts.id}'`);
  }
  if (opts.install !== undefined) {
    if (!/^[0-9a-f]{32}$/i.test(opts.install)) die("--install must be 32 hex digits");
    where.push(`install = '${opts.install.toLowerCase()}'`);
  }
  if (opts.addr !== undefined) {
    if (!/^[0-9a-f]{32}$/i.test(opts.addr)) die("--addr must be an address hash (32 hex digits)");
    where.push(`addr_hash = '${opts.addr.toLowerCase()}'`);
  }
  if (opts.network !== undefined) where.push(`asn = ${int(opts.network, "--network")}`);
  if (opts.country !== undefined) {
    if (!/^[A-Za-z0-9]{2}$/.test(opts.country)) die("--country must be two letters, like DE");
    where.push(`country = '${opts.country.toUpperCase()}'`);
  }
  if (opts.build !== undefined) where.push(`build_number = ${int(opts.build, "--build")}`);
  if (opts.signature !== undefined) where.push(`signature = ${textLiteral(opts.signature)}`);
  return where;
}
const whereSql = (where) => (where.length ? where.join(" AND ") : "1");
/** --limit, at most `max` (so no query's answer can outgrow the 64 MB the reader reads from wrangler). */
const limitOf = (fallback, max) => Math.min(int(opts.limit ?? String(fallback), "--limit"), max);

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

// ---- commands -----------------------------------------------------------------------------------------------------

function list(appArg) {
  const where = whereSql(filters({ defaultDays: 7 }));
  const limit = limitOf(100, 10_000);
  const sql = pickApps(appArg)
    .map((a) => `SELECT '${a}' AS app, id, received_at, build, kind, signature, os, runtime, log_lines, file_count, bytes, asn, country, note FROM ${APPS[a]} WHERE ${where}`)
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
      { title: "files", get: (r) => r.file_count },
      { title: "bytes", get: (r) => r.bytes },
      { title: "network", get: (r) => (r.asn === null ? "" : `AS${r.asn}`) },
      { title: "cc", get: (r) => r.country ?? "" },
      { title: "note", get: (r) => r.note, max: 50 },
    ]),
  );
  console.log(`\n${rows.length} report(s)${rows.length === limit ? ` (showing the newest ${limit}; --limit for more)` : ""}`);
}

const COUNT_BY = {
  signature: { group: "build_number, build, signature", key: ["build", "signature"], extra: ["installs", "networks"] },
  network: { group: "asn", key: ["network"], extra: ["countries", "installs", "signatures"] },
  country: { group: "country", key: ["country"], extra: ["networks", "installs", "signatures"] },
  install: { group: "install", key: ["install"], extra: ["networks", "signatures"] },
  build: { group: "build_number, build", key: ["build"], extra: ["signatures", "networks"] },
};
const COUNT_COLS = {
  build: { title: "build", get: (r) => r.build },
  signature: { title: "signature", get: (r) => r.signature, max: 70 },
  network: { title: "network", get: (r) => (r.asn === null ? "?" : `AS${r.asn}`) },
  country: { title: "country", get: (r) => r.country ?? "?" },
  install: { title: "install", get: (r) => r.install },
  installs: { title: "installs", get: (r) => r.installs },
  networks: { title: "networks", get: (r) => r.networks },
  countries: { title: "countries", get: (r) => r.countries },
  signatures: { title: "signatures", get: (r) => r.signatures },
};

function count(appArg) {
  const by = Object.hasOwn(COUNT_BY, opts.by) ? COUNT_BY[opts.by] : null;
  if (!by) die(`--by must be one of ${Object.keys(COUNT_BY).join(", ")}`);
  const where = whereSql(filters({ defaultDays: 7 }));
  const limit = limitOf(50, 1000);
  const sql = pickApps(appArg)
    .map(
      (a) => `SELECT '${a}' AS app, ${by.group}, COUNT(*) AS n, COUNT(DISTINCT install) AS installs,
                COUNT(DISTINCT asn) AS networks, COUNT(DISTINCT country) AS countries, COUNT(DISTINCT signature) AS signatures,
                MIN(received_at) AS first, MAX(received_at) AS last FROM ${APPS[a]} WHERE ${where}
                GROUP BY ${by.group}`,
    )
    .join(" UNION ALL ");
  // Sorted by how many, never by a sender's build number; at most --limit rows come back.
  const rows = d1(`SELECT * FROM (${sql}) ORDER BY n DESC, last DESC LIMIT ${limit}`);
  console.log(
    table(rows, [
      { title: "app", get: (r) => r.app },
      ...by.key.map((c) => COUNT_COLS[c]),
      { title: "reports", get: (r) => r.n },
      ...by.extra.map((c) => COUNT_COLS[c]),
      { title: "first", get: (r) => iso(r.first) },
      { title: "last", get: (r) => iso(r.last) },
    ]),
  );
  if (rows.length === limit) console.log(`\n(the ${limit} largest groups; --limit for more)`);
}

function del(appArg) {
  const where = filters({ defaultDays: 0 });
  if (where.length === 0) die("delete needs at least one filter (--id, --install, --network, --signature, --build, --since...)");
  const w = whereSql(where);
  const apps = pickApps(appArg);
  const found = d1(
    apps
      .map((a) => `SELECT '${a}' AS app, COUNT(*) AS n, COALESCE(SUM(file_count), 0) AS files, COALESCE(SUM(stored_bytes), 0) AS bytes FROM ${APPS[a]} WHERE ${w}`)
      .join(" UNION ALL "),
  );
  for (const r of found) console.log(`${r.app}: ${r.n} report(s), ${r.files} file(s), ${r.bytes} counted bytes match`);
  if (!opts.yes) {
    console.log("\n(nothing deleted: add --yes to delete them)");
    return;
  }
  // Files, then reports, then each app's total recomputed from what is left (the same thing the daily job does), so
  // the counters are right afterwards even if a statement in between were to fail.
  const statements = apps.flatMap((a) => [
    `DELETE FROM files_${a} WHERE report_id IN (SELECT id FROM ${APPS[a]} WHERE ${w})`,
    `DELETE FROM ${APPS[a]} WHERE ${w}`,
    `INSERT INTO report_limits (app, day, key, n, bytes) SELECT '${a}', 0, 'total', COUNT(*), COALESCE(SUM(stored_bytes), 0)
       FROM ${APPS[a]} WHERE true ON CONFLICT (app, day, key) DO UPDATE SET n = excluded.n, bytes = excluded.bytes`,
  ]);
  d1(statements.join(";\n"));
  console.log(`deleted ${found.reduce((n, r) => n + r.n, 0)} report(s); totals recomputed`);
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
  if (!(row.app in APPS)) die(`report ${id}: unknown app`);

  let report;
  try {
    const json = gunzipSync(Buffer.from(row.payload_hex, "hex"), { maxOutputLength: 2 * 1024 * 1024 }).toString("utf8");
    report = JSON.parse(json);
  } catch (e) {
    die(`report ${id}: payload does not unpack (${e.message})`);
  }
  if (opts.raw) {
    // JSON.stringify escapes U+0000 to U+001F only. DEL, the C1 controls and the bidi controls are allowed in a report's
    // free text and would reach the terminal as they are (a C1 "CSI" or "OSC" drives VTE and xterm), so escape those
    // too: \uXXXX keeps the output valid JSON.
    const beyondJson = /[\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g; // not the newlines of the layout itself
    const text = JSON.stringify(report, null, 2);
    console.log(text.replace(beyondJson, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")));
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

  // Files: rows of files_<app> (raw bytes); reports stored before migration 0002 carry theirs inside the payload.
  const stored = d1(
    `SELECT n, name, type, bytes, hex(data) AS data_hex FROM files_${row.app} WHERE report_id = '${id}' ORDER BY n`,
  ).map((f) => ({ name: f.name, type: f.type, data: Buffer.from(f.data_hex, "hex") }));
  const legacy = (Array.isArray(report.files) ? report.files : [])
    .filter((f) => typeof f?.b64 === "string")
    .map((f) => {
      const data = Buffer.from(f.b64, "base64");
      return { name: f.name, type: detectType(data), data };
    });
  const files = stored.length ? stored : legacy;
  if (files.length) {
    const dir = path.resolve(opts.out ?? path.join(ROOT, ".reports", id));
    mkdirSync(dir, { recursive: true });
    console.log(`\nfiles -> ${dir}`);
    const used = new Set();
    for (const f of files) {
      const name = outputName(f.name, f.type, used);
      writeFileSync(path.join(dir, name), f.data, { mode: 0o644 });
      console.log(`  ${name.padEnd(30)} ${String(f.type).padEnd(5)} ${f.data.length} bytes`);
    }
  }
}

// ---- files --------------------------------------------------------------------------------------------------------

// The type the server found in the bytes -> the extension the file is written with. Never from the name.
const TYPE_EXT = { png: "png", jpeg: "jpg", webp: "webp", gif: "gif", swr: "swr", text: "txt" };
// A text file may keep one of these extensions from its name; a file of unknown type ("bin", only in an app's crash
// report) one of these, else it gets ".bin". Nothing that a desktop would open as a program or a link.
const TEXT_EXTS = new Set(["txt", "log", "json", "md", "cfg", "csv"]);
const BIN_EXTS = new Set([...TEXT_EXTS, "swr", "bin", "dat"]);

/** Same rules as worker/reports/files.ts, for reports stored before the server recorded the type. */
function detectType(b) {
  const at = (magic, i = 0) => [...magic].every((c, k) => b[i + k] === (typeof c === "string" ? c.charCodeAt(0) : c));
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (at([0xff, 0xd8, 0xff])) return "jpeg";
  if (at("RIFF") && at("WEBP", 8)) return "webp";
  if (at("GIF87a") || at("GIF89a")) return "gif";
  if (at("SWR1")) return "swr";
  if (!b.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(b);
      return "text";
    } catch {}
  }
  return "bin";
}

/** A file name that is safe to write: the stored name cleaned again, the extension from the detected type. */
function outputName(stored, type, used) {
  const clean = String(stored ?? "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[.]+/, "").slice(0, 64) || "file";
  const dot = clean.lastIndexOf(".");
  const base = (dot > 0 ? clean.slice(0, dot) : clean) || "file";
  const ext = dot > 0 ? clean.slice(dot + 1).toLowerCase() : "";
  let out;
  if (type in TYPE_EXT && type !== "text") out = `${base}.${TYPE_EXT[type]}`;
  else if (type === "text") out = TEXT_EXTS.has(ext) ? clean : `${base}.txt`;
  else out = BIN_EXTS.has(ext) ? clean : `${clean}.bin`;
  for (let i = 2; used.has(out.toLowerCase()); i++) {
    const d = out.lastIndexOf(".");
    out = `${out.slice(0, d).replace(/-\d+$/, "")}-${i}${out.slice(d)}`;
  }
  used.add(out.toLowerCase());
  return out;
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
else if (command === "delete") del(arg);
else {
  usage();
  process.exit(2);
}

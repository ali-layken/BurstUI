// Tests for the Worker's /api/report/<app> endpoint, /api/joke and the reader (scripts/reports.mjs), run against
// `wrangler dev --local` with a throwaway local D1: no Cloudflare account or network needed.
//
//   npm test          (needs dist/ from `npm run build` for the asset binding; an empty dist/ is made if missing)
//
// Each test uses its own install id and address (cf-connecting-ip, which local dev passes through), so the daily
// limits of one test do not bleed into another. The daily-cap test seeds the day's crash count in D1 and runs last.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzipSync, gunzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules", ".bin", "wrangler");
const ENV = { ...process.env, WRANGLER_SEND_METRICS: "false", CI: process.env.CI ?? "1", NO_COLOR: "1" };
const run = promisify(execFile);

let persist;
let base;
let dev;

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function sql(command) {
  const { stdout } = await run(
    WRANGLER,
    ["d1", "execute", "burst-reports", "--local", "--persist-to", persist, "--json", "--command", command],
    { cwd: ROOT, env: ENV, maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(stdout.slice(stdout.indexOf("["))).flatMap((set) => set.results ?? []);
}

async function reader(...args) {
  const { stdout } = await run(process.execPath, [path.join(ROOT, "scripts", "reports.mjs"), ...args, "--persist-to", persist], {
    cwd: ROOT,
    env: ENV,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

before(async () => {
  persist = mkdtempSync(path.join(tmpdir(), "burst-reports-test-"));
  if (!existsSync(path.join(ROOT, "dist"))) mkdirSync(path.join(ROOT, "dist"));
  await run(WRANGLER, ["d1", "migrations", "apply", "burst-reports", "--local", "--persist-to", persist], { cwd: ROOT, env: ENV });

  const port = await freePort();
  const inspector = await freePort();
  base = `http://127.0.0.1:${port}`;
  dev = spawn(
    WRANGLER,
    ["dev", "--local", "--persist-to", persist, "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", String(inspector),
      "--var", "REPORT_SALT:test-salt", "--show-interactive-dev-session=false"],
    { cwd: ROOT, env: ENV, detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  dev.stdout.on("data", (d) => (log += d));
  dev.stderr.on("data", (d) => (log += d));
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${base}/api/joke`)).ok) break;
    } catch {}
    if (i > 120 || dev.exitCode !== null) throw new Error(`wrangler dev did not start:\n${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
});

after(() => {
  if (dev && dev.exitCode === null) {
    try {
      process.kill(-dev.pid, "SIGTERM");
    } catch {}
  }
  if (persist) rmSync(persist, { recursive: true, force: true });
});

// ---- helpers ------------------------------------------------------------------------------------------------------

const hex = (n) => randomBytes(n).toString("hex");
let ipCounter = 0;
const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`;

function makeReport(app, over = {}) {
  return {
    v: 1,
    app,
    build: `${app}-3+6a41740`,
    kind: "crash",
    signature: `test-${hex(4)}`,
    when: "2026-11-20T17:01:22Z",
    install: hex(16),
    session: hex(8),
    platform: { os: "Windows 11", arch: "x86_64", runtime: app === "surfworld" ? "godot 4.2.2" : "overwolf 0.300", locale: "en_US" },
    context: { area: "tower", state: "wall_ride", online: false, players: 2 },
    note: "",
    log: [
      { t: 81234, lvl: "info", src: "net", msg: "joined", data: { players: 2 } },
      { t: 81300.5, lvl: "error", src: "move", msg: "wall ride lost its wall" },
    ],
    ...over,
  };
}

async function post(app, body, { ip = freshIp(), gzip = false, headers = {} } = {}) {
  const raw = typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body);
  const res = await fetch(`${base}/api/report/${app}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": ip,
      ...(gzip ? { "content-encoding": "gzip" } : {}),
      ...headers,
    },
    body: gzip ? gzipSync(Buffer.from(raw)) : raw,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, headers: res.headers };
}

// Local dev only: after the Worker answers a request without reading its whole body (413 while streaming), the dev
// proxy's next connection can drop once. A GET it may retry absorbs that before the next test posts.
const settle = async () => {
  for (let i = 0; i < 3; i++) {
    try {
      if ((await fetch(`${base}/api/joke`)).ok) return;
    } catch {}
  }
};

// ---- tests --------------------------------------------------------------------------------------------------------

test("/api/joke still answers", async () => {
  const res = await fetch(`${base}/api/joke`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/plain/);
  assert.ok((await res.text()).length > 10);
});

test("CORS preflight and headers", async () => {
  const res = await fetch(`${base}/api/report/surfworld`, {
    method: "OPTIONS",
    headers: { origin: "overwolf-extension://abc", "access-control-request-method": "POST", "access-control-request-headers": "content-type, content-encoding" },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "overwolf-extension://abc", "the allowed origin is echoed");
  assert.match(res.headers.get("access-control-allow-methods"), /POST/);
  assert.match(res.headers.get("access-control-allow-headers"), /content-type/);
  assert.match(res.headers.get("access-control-allow-headers"), /content-encoding/);
  assert.equal(res.headers.get("access-control-allow-credentials"), null);

  const refused = await post("surfworld", { nope: 1 });
  assert.equal(refused.status, 400);
  assert.equal(refused.headers.get("access-control-allow-origin"), "*", "errors carry CORS too, so an app can read them");
});

test("a valid report of each app is stored and comes back through the reader", async () => {
  const replay = Buffer.concat([Buffer.from("SWR1"), randomBytes(19_996)]); // a replay starts with its magic
  const surf = makeReport("surfworld", {
    signature: "unclean-exit",
    note: "",
    files: [{ name: "session.swr", b64: replay.toString("base64") }],
  });
  const doop = makeReport("doopwatcher", { kind: "problem", signature: "user report", note: "The overlay\u001b[31m vanished" });

  const a = await post("surfworld", surf, { gzip: true });
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.match(a.json.id, /^r_[0-9a-z]{16}$/);
  const b = await post("doopwatcher", doop);
  assert.equal(b.status, 200, JSON.stringify(b.json));

  const [row] = await sql(`SELECT * FROM reports_surfworld WHERE id = '${a.json.id}'`);
  assert.equal(row.build, "surfworld-3+6a41740");
  assert.equal(row.build_number, 3);
  assert.equal(row.kind, "crash");
  assert.equal(row.os, "Windows 11");
  assert.equal(row.runtime, "godot 4.2.2");
  assert.equal(row.log_lines, 2);
  assert.equal(row.install, surf.install);
  assert.match(row.addr_hash, /^[0-9a-f]{32}$/);
  assert.ok(row.bytes > 0 && row.bytes <= 64 * 1024);

  const listed = await reader("list");
  assert.ok(listed.includes(a.json.id) && listed.includes(b.json.id), listed);
  assert.ok((await reader("list", "doopwatcher")).includes(b.json.id));
  assert.ok(!(await reader("list", "doopwatcher")).includes(a.json.id));
  assert.ok((await reader("list", "surfworld", "--signature", "unclean-exit")).includes(a.json.id));
  assert.ok((await reader("list", "surfworld", "--build", "3")).includes(a.json.id));
  assert.ok(!(await reader("list", "surfworld", "--build", "4")).includes(a.json.id));
  assert.match(await reader("count", "surfworld"), /surfworld-3\+6a41740\s+unclean-exit\s+1\s+1/);

  const out = mkdtempSync(path.join(tmpdir(), "burst-reports-files-"));
  try {
    const shown = await reader("show", a.json.id, "--out", out);
    assert.match(shown, /signature\s+unclean-exit/);
    assert.match(shown, /1:21\.234\s+info\s+net\s+joined\s+\{"players":2\}/);
    assert.match(shown, /wall ride lost its wall/);
    assert.ok(readFileSync(path.join(out, "session.swr")).equals(replay), "the file comes back byte for byte");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }

  const shownDoop = await reader("show", b.json.id);
  assert.ok(shownDoop.includes("The overlay\\u001b[31m vanished"), "control characters are escaped, not sent to the terminal");
  assert.ok(!shownDoop.includes("\u001b"));

  const raw = JSON.parse(await reader("show", b.json.id, "--raw"));
  assert.deepEqual(raw, { ...doop, files: [] });
});

test("too large as sent is refused while reading", async () => {
  const big = makeReport("surfworld", { note: "x".repeat(70 * 1024) });
  assert.equal((await post("surfworld", big)).status, 413);
  await settle();

  // Without a content-length (streamed), the cap holds while reading.
  const chunk = new TextEncoder().encode(" ".repeat(16 * 1024));
  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (sent++ < 200) controller.enqueue(chunk);
      else controller.close();
    },
  });
  const res = await fetch(`${base}/api/report/surfworld`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": freshIp() },
    body: stream,
    duplex: "half",
  }).catch((e) => ({ status: `fetch failed: ${e.cause?.code ?? e.message}` }));
  // The Worker answers 413 and stops reading while the client is still sending. Whether
  // the client then reads that answer or sees its connection closed first is a race in
  // the local dev proxy (seen both ways on one machine, by load). Either is a refusal.
  const refused = res.status === 413 || /ECONNRESET|EPIPE|UND_ERR_SOCKET/.test(String(res.status));
  assert.ok(refused, `a streamed oversize body was not refused: ${res.status}`);
  await settle();
  // And nothing of it was stored.
  const rows = await sql("SELECT COUNT(*) AS n FROM reports_surfworld WHERE bytes > 65536");
  assert.equal(rows[0].n, 0);
});

test("too large unpacked (gzip bomb) is refused", async () => {
  const r = makeReport("surfworld");
  const json = JSON.stringify(r);
  const bomb = gzipSync(Buffer.from(`${json.slice(0, -1)},"note2":"${" ".repeat(30 * 1024 * 1024)}"}`), { level: 9 });
  assert.ok(bomb.length < 64 * 1024, `bomb is ${bomb.length} bytes as sent`);
  assert.equal((await post("surfworld", bomb, { headers: { "content-encoding": "gzip" } })).status, 413);
  await settle();

  // Just under the unpacked cap is fine (and over the sent cap if it were not gzip).
  const roomy = makeReport("surfworld", {
    log: Array.from({ length: 400 }, (_, i) => ({ t: i, lvl: "debug", src: "tick", msg: "y".repeat(300), data: { i } })),
  });
  const size = Buffer.byteLength(JSON.stringify(roomy));
  assert.ok(size > 64 * 1024 && size < 512 * 1024);
  assert.equal((await post("surfworld", roomy, { gzip: true })).status, 200);
});

test("bad build names are refused", async () => {
  for (const build of ["surfworld-3", "surfworld-3+", "Surfworld-3+abc", "surfworld-x+abc", "surfworld-3+ABC", "doopwatcher-3+abc",
    `surfworld-3+${"a".repeat(40)}`, "surfworld-99999999999999999999+abc"]) {
    const res = await post("surfworld", makeReport("surfworld", { build }));
    assert.equal(res.status, 400, build);
    assert.match(res.json.error, /^build/, build);
  }
  assert.equal((await post("surfworld", makeReport("surfworld", { build: "surfworld-12+dev" }))).status, 200);
  assert.equal((await post("surfworld", makeReport("surfworld", { build: "surfworld-12+6a41740.dirty" }))).status, 200);
});

test("unknown keys and bad fields are refused with the field named", async () => {
  const cases = [
    [{ extra: 1 }, /unknown key "extra"/],
    [{ v: 2 }, /^v:/],
    [{ kind: "oops" }, /^kind:/],
    [{ signature: "" }, /^signature:/],
    [{ signature: "s".repeat(121) }, /^signature:/],
    [{ when: "2026-11-20 17:01:22" }, /^when:/],
    [{ install: "abc" }, /^install:/],
    [{ session: hex(16) }, /^session:/],
    [{ platform: { os: { nested: 1 } } }, /^platform\.os:/],
    [{ platform: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`k${i}`, "v"])) }, /^platform:/],
    [{ context: { deep: { x: 1 } } }, /^context\.deep:/],
    [{ context: { s: "z".repeat(201) } }, /^context\.s:/],
    [{ note: "n".repeat(2001) }, /^note:/],
    [{ log: [{ t: 1, lvl: "info", src: "net", msg: "m", extra: 1 }] }, /^log\[0\]: unknown key/],
    [{ log: [{ t: 1, lvl: "fatal", src: "net", msg: "m" }] }, /^log\[0\]\.lvl:/],
    [{ log: [{ t: 1, lvl: "info", src: "Net", msg: "m" }] }, /^log\[0\]\.src:/],
    [{ log: [{ t: 1, lvl: "info", src: "net", msg: "m".repeat(301) }] }, /^log\[0\]\.msg:/],
    [{ files: [{ name: "../evil", b64: "" }] }, /^files\[0\]\.name:/],
    [{ files: [{ name: "a", b64: "!!!!" }] }, /^files\[0\]\.b64:/],
    [{ files: [{ name: "a", b64: randomBytes(48 * 1024 + 3).toString("base64") }] }, /^files\[0\]:/],
    [{ files: [1, 2, 3] }, /^files:/],
  ];
  for (const [over, error] of cases) {
    const res = await post("surfworld", makeReport("surfworld", over), { gzip: true });
    assert.equal(res.status, 400, JSON.stringify(over).slice(0, 80));
    assert.match(res.json.error, error, JSON.stringify(over).slice(0, 80));
  }
  assert.equal((await post("surfworld", "not json")).status, 400);
  assert.equal((await post("surfworld", "[]")).status, 400);
  assert.equal((await post("surfworld", makeReport("surfworld"), { headers: { "content-type": "text/plain" } })).status, 400);
});

test("too many log lines is refused", async () => {
  const line = { t: 1, lvl: "info", src: "net", msg: "m" };
  const res = await post("surfworld", makeReport("surfworld", { log: Array(401).fill(line) }), { gzip: true });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /^log: at most 400/);
  assert.equal((await post("surfworld", makeReport("surfworld", { log: Array(400).fill(line) }), { gzip: true })).status, 200);
});

test("wrong app is refused", async () => {
  assert.equal((await post("nope", makeReport("surfworld"))).status, 404);
  const res = await post("surfworld", makeReport("doopwatcher"));
  assert.equal(res.status, 400);
  assert.match(res.json.error, /^app:/);
  assert.equal((await fetch(`${base}/api/report/surfworld`)).status, 405);
});

test("per-install limit: 10 a day, then 429", async () => {
  const install = hex(16);
  for (let i = 0; i < 10; i++) {
    const res = await post("doopwatcher", makeReport("doopwatcher", { install }));
    assert.equal(res.status, 200, `report ${i + 1}`);
  }
  assert.equal((await post("doopwatcher", makeReport("doopwatcher", { install }))).status, 429);
  // A different install from the same kind of place is unaffected.
  assert.equal((await post("doopwatcher", makeReport("doopwatcher"))).status, 200);
});

test("same signature from the same install within a day: the first id, nothing stored", async () => {
  const install = hex(16);
  const first = await post("surfworld", makeReport("surfworld", { install, signature: "crash-loop" }));
  assert.equal(first.status, 200);
  const before = await sql(`SELECT COUNT(*) AS n FROM reports_surfworld WHERE install = '${install}'`);
  for (let i = 0; i < 3; i++) {
    const again = await post("surfworld", makeReport("surfworld", { install, signature: "crash-loop" }));
    assert.equal(again.status, 200);
    assert.equal(again.json.id, first.json.id);
  }
  assert.deepEqual(await sql(`SELECT COUNT(*) AS n FROM reports_surfworld WHERE install = '${install}'`), before);
  // Another install with the same signature is its own report.
  const other = await post("surfworld", makeReport("surfworld", { signature: "crash-loop" }));
  assert.notEqual(other.json.id, first.json.id);
  // Problems a person reports are not crash loops: both are kept.
  const p1 = await post("surfworld", makeReport("surfworld", { install, kind: "problem", signature: "report page", note: "one" }));
  const p2 = await post("surfworld", makeReport("surfworld", { install, kind: "problem", signature: "report page", note: "two" }));
  assert.equal(p1.status, 200);
  assert.equal(p2.status, 200);
  assert.notEqual(p1.json.id, p2.json.id);
});

test("per-address limit: 30 a day, then 429", async () => {
  const ip = "203.0.113.7";
  for (let i = 0; i < 30; i++) {
    const res = await post("surfworld", makeReport("surfworld"), { ip });
    assert.equal(res.status, 200, `report ${i + 1}`);
  }
  assert.equal((await post("surfworld", makeReport("surfworld"), { ip })).status, 429);
  // IPv6 is counted per /64.
  const v6 = "2001:db8:1:2::";
  for (let i = 0; i < 30; i++) assert.equal((await post("surfworld", makeReport("surfworld"), { ip: `${v6}${i + 1}` })).status, 200);
  assert.equal((await post("surfworld", makeReport("surfworld"), { ip: "2001:db8:1:2:ffff::9" })).status, 429);
  assert.equal((await post("surfworld", makeReport("surfworld"), { ip: "2001:db8:1:3::1" })).status, 200);
});

test("the scheduled job deletes after 90 days and drops yesterday's address salt", async () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const row = (id, at) =>
    `('${id}', ${at}, '2026-01-01T00:00:00Z', 'surfworld-1+dev', 1, 'crash', 'old', NULL, NULL, '${"0".repeat(32)}', '${"0".repeat(16)}', '', 0, 1, 'feedfacefeedfacefeedfacefeedface', X'00')`;
  await sql(
    `INSERT INTO reports_surfworld (id, received_at, happened_at, build, build_number, kind, signature, os, runtime, install,
       session, note, log_lines, bytes, addr_hash, payload) VALUES ${row("r_old", now - 91 * day)}, ${row("r_yesterday", now - day - 60_000)};
     INSERT INTO report_salts (day, salt) VALUES (${Math.floor(now / day) - 1}, 'yesterday')`,
  );
  const res = await fetch(`${base}/cdn-cgi/local/explorer/api/local/scheduled?worker=burstui`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cron: "5 0 * * *" }),
  });
  assert.equal(res.status, 200, await res.text());
  const rows = await sql(`SELECT id, addr_hash FROM reports_surfworld WHERE id IN ('r_old', 'r_yesterday')`);
  assert.deepEqual(rows, [{ id: "r_yesterday", addr_hash: "feedfacefeedfacefeedfacefeedface" }]);
  // Without yesterday's salt its hashes can no longer be linked to an address; today's salt stays.
  assert.deepEqual(await sql(`SELECT day FROM report_salts WHERE day < ${Math.floor(now / day)}`), []);
  const today = await sql(`SELECT COUNT(*) AS n FROM report_salts WHERE day = ${Math.floor(now / day)}`);
  assert.equal(today[0].n, 1, "today's salt is kept");
});

test("daily cap: 1,200 crashes stored per app, then 503 until midnight UTC", async () => {
  await sql(
    `INSERT INTO report_limits (app, day, key, n, bytes) VALUES ('doopwatcher', ${Math.floor(Date.now() / 86_400_000)}, 'kind:crash', 1200, 0)
     ON CONFLICT (app, day, key) DO UPDATE SET n = 1200`,
  );
  const res = await post("doopwatcher", makeReport("doopwatcher"));
  assert.equal(res.status, 503);
  assert.match(res.json.error, /used up/);
  // The other app has its own cap.
  assert.equal((await post("surfworld", makeReport("surfworld"))).status, 200);
});

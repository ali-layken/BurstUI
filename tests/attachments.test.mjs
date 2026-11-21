// Attachments on problem reports, typing files by their bytes, and the byte budget (docs/reports.md, "Files" and
// "Budget"). Runs against its own `wrangler dev --local` and local D1 (tests/harness.mjs); `npm test` runs the test
// files one after another, never two dev servers of this Worker at once.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { crc32, deflateSync, gzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { fakeFile, hex, makeReport, startDev } from "./harness.mjs";

let dev;
before(async () => {
  dev = await startDev();
});
after(() => dev?.stop());

const MB = 1024 * 1024;
const b64 = (b) => Buffer.from(b).toString("base64");
const problem = (app, over = {}) => makeReport(app, { kind: "problem", signature: "report page", note: "it broke", log: [], ...over });

/** A real, tiny PNG (2x2, RGB). */
function realPng() {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.from([0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0]);
  const rows = Buffer.from([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 0]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function showInto(id) {
  const out = mkdtempSync(path.join(tmpdir(), "burst-reports-files-"));
  const printed = await dev.reader("show", id, "--out", out);
  const files = Object.fromEntries(readdirSync(out).map((n) => [n, readFileSync(path.join(out, n))]));
  rmSync(out, { recursive: true, force: true });
  return { printed, files };
}

test("an image and a text file come back byte for byte, named by their type", async () => {
  const png = realPng();
  const log = Buffer.from("12:00:01 joined\n12:00:02 wall ride lost its wall — again\n", "utf8");
  const res = await dev.post(
    "surfworld",
    problem("surfworld", {
      files: [
        { name: "Screenshot_1.png", b64: b64(png) },
        { name: "godot.log", b64: b64(log) },
        { name: "evil.exe", b64: b64(png) }, // a PNG whatever its name says
      ],
    }),
    { gzip: true },
  );
  assert.equal(res.status, 200, JSON.stringify(res.json));

  const rows = await dev.sql(`SELECT n, name, type, bytes FROM files_surfworld WHERE report_id = '${res.json.id}' ORDER BY n`);
  assert.deepEqual(rows, [
    { n: 0, name: "Screenshot_1.png", type: "png", bytes: png.length },
    { n: 1, name: "godot.log", type: "text", bytes: log.length },
    { n: 2, name: "evil.exe", type: "png", bytes: png.length },
  ]);

  const { printed, files } = await showInto(res.json.id);
  assert.deepEqual(Object.keys(files).sort(), ["Screenshot_1.png", "evil.png", "godot.log"]);
  assert.ok(files["Screenshot_1.png"].equals(png));
  assert.ok(files["evil.png"].equals(png));
  assert.ok(files["godot.log"].equals(log));
  assert.match(printed, /godot\.log\s+text\s+\d+ bytes/);

  assert.match(await dev.reader("list", "surfworld"), new RegExp(`${res.json.id}.*problem.*\\s3\\s`));
  const raw = JSON.parse(await dev.reader("show", res.json.id, "--raw"));
  assert.deepEqual(raw.files, [
    { name: "Screenshot_1.png", type: "png", bytes: png.length },
    { name: "godot.log", type: "text", bytes: log.length },
    { name: "evil.exe", type: "png", bytes: png.length },
  ]);
});

test("the type comes from the bytes: text named .png is text, a misnamed text file is written as .txt", async () => {
  const text = Buffer.from("not a picture\n");
  const res = await dev.post("doopwatcher", problem("doopwatcher", { files: [{ name: "x.png", b64: b64(text) }, { name: "run.sh", b64: b64(text) }] }));
  assert.equal(res.status, 200, JSON.stringify(res.json));
  const { files } = await showInto(res.json.id);
  assert.deepEqual(Object.keys(files).sort(), ["run.txt", "x.txt"]);
});

test("every accepted image type and the replay", async () => {
  const files = ["webp", "gif", "jpeg"].map((t, i) => ({ name: `f${i}`, b64: b64(fakeFile(t, 2000)) }));
  const res = await dev.post("surfworld", problem("surfworld", { files }), { gzip: true });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  const types = await dev.sql(`SELECT type FROM files_surfworld WHERE report_id = '${res.json.id}' ORDER BY n`);
  assert.deepEqual(types.map((r) => r.type), ["webp", "gif", "jpeg"]);
  const { files: out } = await showInto(res.json.id);
  assert.deepEqual(Object.keys(out).sort(), ["f0.webp", "f1.gif", "f2.jpg"]);

  const swr = await dev.post("surfworld", problem("surfworld", { files: [{ name: "session.swr", b64: b64(fakeFile("swr", 40_000)) }] }), { gzip: true });
  assert.equal(swr.status, 200);
  const [row] = await dev.sql(`SELECT type FROM files_surfworld WHERE report_id = '${swr.json.id}'`);
  assert.equal(row.type, "swr");
});

test("a problem report refuses files of any other kind", async () => {
  const cases = [
    randomBytes(1000), // no magic, not UTF-8
    Buffer.concat([Buffer.from("text with a "), Buffer.from([0]), Buffer.from(" NUL")]),
    Buffer.from([0x68, 0x69, 0xc3, 0x28]), // invalid UTF-8
  ];
  for (const bytes of cases) {
    const res = await dev.post("surfworld", problem("surfworld", { files: [{ name: "a.png", b64: b64(bytes) }] }));
    assert.equal(res.status, 400);
    assert.match(res.json.error, /^files\[0\]: must be a PNG, JPEG, WebP or GIF image, a Surf World replay or UTF-8 text/);
  }
  // A crash report is held to the same types (hardening): the apps send SWR1 replays and UTF-8 logs.
  const crash = await dev.post("surfworld", makeReport("surfworld", { files: [{ name: "session.swr", b64: b64(randomBytes(1000)) }] }));
  assert.equal(crash.status, 400);
  assert.match(crash.json.error, /^files\[0\]: must be a PNG/);
});

test("problem limits: 3 files of 200 KB, 512 KB as sent, 1 MB unpacked", async () => {
  const text = (n) => Buffer.from("log line that compresses well\n".repeat(Math.ceil(n / 30)).slice(0, n));
  const three = [0, 1, 2].map((i) => ({ name: `t${i}.log`, b64: b64(text(200 * 1024)) }));
  const ok = await dev.post("doopwatcher", problem("doopwatcher", { files: three }), { gzip: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));

  const four = await dev.post("doopwatcher", problem("doopwatcher", { files: [...three, { name: "t3.log", b64: b64(text(10)) }] }), { gzip: true });
  assert.equal(four.status, 400);
  assert.match(four.json.error, /^files: at most 3 in a problem report/);

  const big = await dev.post("doopwatcher", problem("doopwatcher", { files: [{ name: "a.log", b64: b64(text(200 * 1024 + 1)) }] }), { gzip: true });
  assert.equal(big.status, 400);
  assert.match(big.json.error, /^files\[0\]: at most 204800 bytes/);

  // Three incompressible images of 199 KB: within every per-file limit, but over 512 KB as sent.
  const images = [0, 1, 2].map((i) => ({ name: `s${i}.webp`, b64: b64(fakeFile("webp", 199 * 1024)) }));
  const sent = gzipSync(Buffer.from(JSON.stringify(problem("doopwatcher", { files: images }))));
  assert.ok(sent.length > 512 * 1024);
  assert.equal((await dev.post("doopwatcher", sent, { headers: { "content-encoding": "gzip" } })).status, 413);
  await dev.settle();

  // Two of them fit.
  const two = await dev.post("doopwatcher", problem("doopwatcher", { files: images.slice(0, 2) }), { gzip: true });
  assert.equal(two.status, 200, JSON.stringify(two.json));

  // Unpacked over 1 MB (small as sent): refused while unpacking.
  const pad = `${JSON.stringify(problem("doopwatcher")).slice(0, -1)},"pad":"${" ".repeat(2 * MB)}"}`;
  const bomb = gzipSync(Buffer.from(pad));
  assert.ok(bomb.length < 64 * 1024);
  assert.equal((await dev.post("doopwatcher", bomb, { headers: { "content-encoding": "gzip" } })).status, 413);
  await dev.settle();
});

test("crash limits are unchanged: 2 files of 48 KB, 64 KB as sent, 512 KB unpacked", async () => {
  const file = (n, size = 40 * 1024) => ({ name: `c${n}.bin`, b64: b64(randomBytes(size)) });
  const three = await dev.post("surfworld", makeReport("surfworld", { files: [file(0, 1000), file(1, 1000), file(2, 1000)] }), { gzip: true });
  assert.equal(three.status, 400);
  assert.match(three.json.error, /^files: at most 2 in a crash report/);

  const big = await dev.post("surfworld", makeReport("surfworld", { files: [{ name: "a.bin", b64: b64(randomBytes(48 * 1024 + 1)) }] }), { gzip: true });
  assert.equal(big.status, 400);

  // Two incompressible 40 KB files: each fine, together over 64 KB as sent, and that is what a crash may weigh.
  const two = gzipSync(Buffer.from(JSON.stringify(makeReport("surfworld", { files: [file(0), file(1)] }))));
  assert.ok(two.length > 64 * 1024 && two.length < 512 * 1024);
  assert.equal((await dev.post("surfworld", two, { headers: { "content-encoding": "gzip" } })).status, 413);
  await dev.settle();

  // Unpacked between 512 KB and 1 MB: fine for a problem, too large for a crash.
  const padded = (kind) => gzipSync(Buffer.from(`${JSON.stringify(makeReport("surfworld", { kind })).slice(0, -1)},"pad":"${" ".repeat(600 * 1024)}"}`));
  assert.equal((await dev.post("surfworld", padded("crash"), { headers: { "content-encoding": "gzip" } })).status, 413);
  await dev.settle();
  const asProblem = await dev.post("surfworld", padded("problem"), { headers: { "content-encoding": "gzip" } });
  assert.equal(asProblem.status, 400, "a problem report that size is read, then refused for the unknown key");
  assert.match(asProblem.json.error, /unknown key "pad"/);
});

const today = () => Math.floor(Date.now() / 86_400_000);
const limitRow = async (app, day, key) =>
  (await dev.sql(`SELECT n, bytes FROM report_limits WHERE app = '${app}' AND day = ${day} AND key = '${key}'`))[0] ?? { n: 0, bytes: 0 };

test("the counters follow what is stored", async () => {
  const kindBefore = await limitRow("surfworld", today(), "kind:problem");
  const totalBefore = await limitRow("surfworld", 0, "total");
  const res = await dev.post("surfworld", problem("surfworld", { files: [{ name: "a.png", b64: b64(fakeFile("png", 5000)) }] }), { gzip: true });
  assert.equal(res.status, 200);
  const [row] = await dev.sql(`SELECT stored_bytes, file_count, file_bytes, length(payload) AS p FROM reports_surfworld WHERE id = '${res.json.id}'`);
  assert.equal(row.file_count, 1);
  assert.ok(row.file_bytes > 5000 && row.stored_bytes > row.file_bytes + row.p);
  const kindAfter = await limitRow("surfworld", today(), "kind:problem");
  const totalAfter = await limitRow("surfworld", 0, "total");
  assert.deepEqual(kindAfter, { n: kindBefore.n + 1, bytes: kindBefore.bytes + row.stored_bytes });
  assert.deepEqual(totalAfter, { n: totalBefore.n + 1, bytes: totalBefore.bytes + row.stored_bytes });
});

test("problem reports have their own day: with it used up, a crash is still stored", async () => {
  const saved = await limitRow("doopwatcher", today(), "kind:problem");
  await dev.sql(
    `INSERT INTO report_limits (app, day, key, n, bytes) VALUES ('doopwatcher', ${today()}, 'kind:problem', 0, ${40 * MB - 100})
     ON CONFLICT (app, day, key) DO UPDATE SET bytes = excluded.bytes`,
  );
  const junk = await dev.post("doopwatcher", problem("doopwatcher"));
  assert.equal(junk.status, 503);
  assert.match(junk.json.error, /used up/);
  assert.equal((await dev.post("doopwatcher", makeReport("doopwatcher"))).status, 200, "a crash is still stored");
  await dev.sql(`UPDATE report_limits SET n = 500, bytes = 0 WHERE app = 'doopwatcher' AND day = ${today()} AND key = 'kind:problem'`);
  assert.equal((await dev.post("doopwatcher", problem("doopwatcher"))).status, 503, "500 problems a day");
  assert.equal((await dev.post("doopwatcher", makeReport("doopwatcher"))).status, 200, "a crash is still stored");
  await dev.sql(`UPDATE report_limits SET n = ${saved.n}, bytes = ${saved.bytes} WHERE app = 'doopwatcher' AND day = ${today()} AND key = 'kind:problem'`);
});

test("the scheduled job deletes old reports with their files and recomputes the total", async () => {
  const now = Date.now();
  const id = `r_old${hex(4)}`;
  await dev.sql(
    `INSERT INTO reports_surfworld (id, received_at, happened_at, build, build_number, kind, signature, os, runtime, install,
       session, note, log_lines, bytes, addr_hash, payload, file_count, stored_bytes, file_bytes)
     VALUES ('${id}', ${now - 91 * 86_400_000}, '2026-01-01T00:00:00Z', 'surfworld-1+dev', 1, 'problem', 'old', NULL, NULL,
       '${"0".repeat(32)}', '${"0".repeat(16)}', '', 0, 1, NULL, X'00', 1, 1000, 900);
     INSERT INTO files_surfworld (report_id, n, name, type, bytes, data) VALUES ('${id}', 0, 'a.png', 'png', 999, X'00');
     UPDATE report_limits SET bytes = 123456789 WHERE app = 'surfworld' AND day = 0 AND key = 'total';`,
  );
  const res = await fetch(`${dev.base}/cdn-cgi/local/explorer/api/local/scheduled?worker=burstui`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cron: "5 0 * * *" }),
  });
  assert.equal(res.status, 200, await res.text());
  assert.deepEqual(await dev.sql(`SELECT id FROM reports_surfworld WHERE id = '${id}'`), []);
  assert.deepEqual(await dev.sql(`SELECT report_id FROM files_surfworld WHERE report_id = '${id}'`), []);
  const [sum] = await dev.sql("SELECT COUNT(*) AS n, SUM(stored_bytes) AS bytes FROM reports_surfworld");
  assert.deepEqual(await limitRow("surfworld", 0, "total"), sum, "the made-up total is replaced by what the table holds");
});

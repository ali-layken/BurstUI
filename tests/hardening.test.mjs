// The limits against someone who has read the source (docs/reports.md, "Limits", "Budget", "Who may send"): they hold
// under a real burst, per source and per kind, a full total evicts instead of refusing, and in every case a genuine
// report still gets through while the junk is refused. Own `wrangler dev --local` and local D1 (tests/harness.mjs).
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { fakeFile, hex, makeReport, startDev } from "./harness.mjs";

let dev;
before(async () => {
  dev = await startDev();
});
after(() => dev?.stop());

const MB = 1024 * 1024;
const b64 = (b) => Buffer.from(b).toString("base64");
const today = () => Math.floor(Date.now() / 86_400_000);
const problem = (app, over = {}) => makeReport(app, { kind: "problem", signature: "report page", note: "it broke", log: [], ...over });
const limitRow = async (app, day, key) =>
  (await dev.sql(`SELECT n, bytes FROM report_limits WHERE app = '${app}' AND day = ${day} AND key = '${key}'`))[0] ?? { n: 0, bytes: 0 };
/** The network every local request comes from (request.cf.asn in wrangler dev), as its counter key. */
let networkKey;
async function network(app) {
  if (!networkKey) {
    const res = await dev.post(app, makeReport(app));
    assert.equal(res.status, 200);
    const [row] = await dev.sql(`SELECT asn, country FROM reports_${app} WHERE id = '${res.json.id}'`);
    networkKey = `asn:${row.asn ?? 0}`;
  }
  return networkKey;
}
/** All local requests share one network; give each test that needs it the network's whole day again. */
const freshNetwork = async () => dev.sql(`DELETE FROM report_limits WHERE key LIKE 'asn:%'`);
const parallel = (n, f) => Promise.all(Array.from({ length: n }, (_, i) => f(i)));
const statuses = (results) => results.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});

test("the network and country Cloudflare saw are stored, and the reader groups and filters by them", async () => {
  const key = await network("surfworld");
  const res = await dev.post("surfworld", makeReport("surfworld", { signature: "facts" }));
  const [row] = await dev.sql(`SELECT asn, country FROM reports_surfworld WHERE id = '${res.json.id}'`);
  console.log(`  local request.cf: asn ${row.asn}, country ${row.country}`);
  assert.equal(key, `asn:${row.asn ?? 0}`);
  if (row.asn !== null) {
    assert.ok((await dev.reader("list", "surfworld", "--network", String(row.asn))).includes(res.json.id));
    assert.match(await dev.reader("count", "surfworld", "--by", "network"), new RegExp(`AS${row.asn}\\s+\\d+`));
  }
  assert.ok(!(await dev.reader("list", "surfworld", "--network", "1")).includes(res.json.id));
});

test("a burst from one address stores exactly 30: the limit is checked inside the insert", async () => {
  await freshNetwork();
  const ip = "198.51.100.77";
  const results = await parallel(60, () => dev.post("surfworld", makeReport("surfworld"), { ip }));
  assert.deepEqual(statuses(results), { 200: 30, 429: 30 });
  const stored = results.filter((r) => r.status === 200).map((r) => r.json.id);
  assert.equal(new Set(stored).size, 30);
  const [{ n }] = await dev.sql(`SELECT COUNT(*) AS n FROM reports_surfworld WHERE id IN (${stored.map((id) => `'${id}'`).join(",")})`);
  assert.equal(n, 30);
  // The address is now refused before its body is even read: junk gets a 429, not a 400.
  assert.equal((await dev.post("surfworld", "not json", { ip })).status, 429);
  // A genuine report from anywhere else is stored.
  assert.equal((await dev.post("surfworld", makeReport("surfworld"))).status, 200);
});

test("a burst from one install stores exactly 10, and a crash loop in parallel stores one", async () => {
  await freshNetwork();
  const install = hex(16);
  const results = await parallel(20, () => dev.post("doopwatcher", makeReport("doopwatcher", { install })));
  assert.deepEqual(statuses(results), { 200: 10, 429: 10 });

  const loop = hex(16);
  const same = await parallel(10, () => dev.post("doopwatcher", makeReport("doopwatcher", { install: loop, signature: "crash-loop" })));
  assert.deepEqual(statuses(same), { 200: 10 }, "every copy gets 200, as the apps expect");
  assert.equal(new Set(same.map((r) => r.json.id)).size, 1, "all with the first report's id");
  const [{ n }] = await dev.sql(`SELECT COUNT(*) AS n FROM reports_doopwatcher WHERE install = '${loop}'`);
  assert.equal(n, 1);
});

test("an address may store 2 MB a day", async () => {
  await freshNetwork();
  const ip = "198.51.100.88";
  const text = Buffer.from("log line that compresses well\n".repeat(7000).slice(0, 200 * 1024));
  const big = () => problem("doopwatcher", { files: [0, 1, 2].map((i) => ({ name: `t${i}.log`, b64: b64(text) })) });
  const got = [];
  for (let i = 0; i < 4; i++) got.push((await dev.post("doopwatcher", big(), { ip, gzip: true })).status);
  assert.deepEqual(got, [200, 200, 200, 429], "three reports of ~620 KB counted fit in 2 MB, the fourth does not");
  assert.equal((await dev.post("doopwatcher", makeReport("doopwatcher"), { ip })).status, 200, "a small crash still fits");
  assert.equal((await dev.post("doopwatcher", big(), { gzip: true })).status, 200, "another address is not affected");
});

test("an IPv6 /48 may store 100 a day, each /64 30", async () => {
  await freshNetwork();
  for (let i = 0; i < 100; i++) {
    const res = await dev.post("surfworld", makeReport("surfworld"), { ip: `2001:db8:aa:${(i + 1).toString(16)}::1` });
    assert.equal(res.status, 200, `/64 number ${i + 1}`);
  }
  const over = await dev.post("surfworld", makeReport("surfworld"), { ip: "2001:db8:aa:ffff::1" });
  assert.equal(over.status, 429);
  assert.match(over.json.error, /network/);
  assert.equal((await dev.post("surfworld", makeReport("surfworld"), { ip: "2001:db8:ab:1::1" })).status, 200, "the next /48 is not");
});

test("a network (ASN) may store 300 reports and 10 MB a day", async () => {
  await freshNetwork();
  const key = await network("surfworld");
  await dev.sql(`INSERT INTO report_limits (app, day, key, n, bytes) VALUES ('surfworld', ${today()}, '${key}', 299, 0)
                 ON CONFLICT (app, day, key) DO UPDATE SET n = 299, bytes = 0`);
  assert.equal((await dev.post("surfworld", makeReport("surfworld"))).status, 200);
  const over = await dev.post("surfworld", makeReport("surfworld"));
  assert.equal(over.status, 429);
  assert.match(over.json.error, /network/);
  assert.equal((await dev.post("doopwatcher", makeReport("doopwatcher"))).status, 200, "per app: the other app is not affected");

  await dev.sql(`UPDATE report_limits SET n = 0, bytes = ${10 * MB - 100} WHERE app = 'surfworld' AND day = ${today()} AND key = '${key}'`);
  assert.equal((await dev.post("surfworld", makeReport("surfworld"))).status, 429);
  await freshNetwork();
  assert.equal((await dev.post("surfworld", makeReport("surfworld"))).status, 200);
});

test("crashes have their own day: with it used up, a problem report is still stored", async () => {
  await freshNetwork();
  const saved = await limitRow("surfworld", today(), "kind:crash");
  await dev.sql(`INSERT INTO report_limits (app, day, key, n, bytes) VALUES ('surfworld', ${today()}, 'kind:crash', 0, ${10 * MB - 100})
                 ON CONFLICT (app, day, key) DO UPDATE SET n = 0, bytes = excluded.bytes`);
  const junk = await dev.post("surfworld", makeReport("surfworld"));
  assert.equal(junk.status, 503);
  assert.equal((await dev.post("surfworld", problem("surfworld"))).status, 200, "a problem report is still stored");
  await dev.sql(`UPDATE report_limits SET n = ${saved.n}, bytes = ${saved.bytes} WHERE app = 'surfworld' AND day = ${today()} AND key = 'kind:crash'`);
  assert.equal((await dev.post("surfworld", makeReport("surfworld"))).status, 200);
});

test("counted bytes are what the row takes; the note column keeps 200 characters, the payload all of it", async () => {
  await freshNetwork();
  const note = "\u{1F600}".repeat(2000); // 2,000 characters of 4 bytes
  const res = await dev.post("surfworld", problem("surfworld", { note }), { gzip: true });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  const [row] = await dev.sql(
    `SELECT length(note) AS chars, length(CAST(note AS BLOB)) AS note_bytes, length(payload) AS p, stored_bytes FROM reports_surfworld WHERE id = '${res.json.id}'`,
  );
  assert.equal(row.chars, 200);
  assert.ok(row.stored_bytes >= row.p + row.note_bytes + 256, `stored_bytes ${row.stored_bytes} counts the payload, the note column and the row`);
  const raw = JSON.parse(await dev.reader("show", res.json.id, "--raw"));
  assert.equal([...raw.note].length, 2000);
});

test("only this site's pages, other schemes and non-browsers may send", async () => {
  await freshNetwork();
  const post = (origin) => dev.post("surfworld", makeReport("surfworld"), { headers: origin === undefined ? {} : { origin } });
  for (const origin of ["https://evil.example", "http://burstui.bean-prod.workers.dev.evil.example", "null"]) {
    const res = await post(origin);
    assert.equal(res.status, 403, origin);
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  }
  const own = await post(dev.base);
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("access-control-allow-origin"), dev.base);
  const overwolf = await post("overwolf-extension://ncfgmpdlfeckhcapmmplmlfjhhhpbabkjlbbdjnj");
  assert.equal(overwolf.status, 200);
  assert.equal(overwolf.headers.get("access-control-allow-origin"), "overwolf-extension://ncfgmpdlfeckhcapmmplmlfjhhhpbabkjlbbdjnj");
  const none = await post(undefined);
  assert.equal(none.status, 200);
  assert.equal(none.headers.get("access-control-allow-origin"), "*");

  const preflight = (origin) =>
    fetch(`${dev.base}/api/report/surfworld`, {
      method: "OPTIONS",
      headers: { origin, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
    });
  assert.equal((await preflight("https://evil.example")).status, 403);
  const ok = await preflight("overwolf-extension://abc");
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("access-control-allow-origin"), "overwolf-extension://abc");
  assert.match(ok.headers.get("vary"), /Origin/);
});

test("a build number of a million or more is refused", async () => {
  const res = await dev.post("surfworld", makeReport("surfworld", { build: "surfworld-1000000+abc" }));
  assert.equal(res.status, 400);
  assert.match(res.json.error, /^build: the number must be below 1000000/);
  assert.equal((await dev.post("surfworld", makeReport("surfworld", { build: "surfworld-999999+abc" }))).status, 200);
});

test("the reader: count sorts by how many with --limit, delete has a dry run and fixes the totals", async () => {
  await freshNetwork();
  const install = hex(16);
  for (const [sig, times] of [["most", 4], ["some", 2], ["one", 1]]) {
    for (let i = 0; i < times; i++) {
      // Different installs so the same signature is not a crash loop.
      assert.equal((await dev.post("doopwatcher", makeReport("doopwatcher", { signature: `rank-${sig}`, build: "doopwatcher-999998+x" }))).status, 200);
    }
  }
  const counted = await dev.reader("count", "doopwatcher", "--build", "999998", "--limit", "2");
  const lines = counted.split("\n").filter((l) => l.includes("rank-"));
  assert.equal(lines.length, 2);
  assert.match(lines[0], /rank-most\s+4/);
  assert.match(lines[1], /rank-some\s+2/);

  const before = await limitRow("doopwatcher", 0, "total");
  const dry = await dev.reader("delete", "doopwatcher", "--build", "999998");
  assert.match(dry, /doopwatcher: 7 report\(s\)/);
  assert.match(dry, /nothing deleted/);
  const [{ n: still }] = await dev.sql("SELECT COUNT(*) AS n FROM reports_doopwatcher WHERE build_number = 999998");
  assert.equal(still, 7);

  const done = await dev.reader("delete", "doopwatcher", "--build", "999998", "--yes");
  assert.match(done, /deleted 7 report/);
  const [{ n: left }] = await dev.sql("SELECT COUNT(*) AS n FROM reports_doopwatcher WHERE build_number = 999998");
  assert.equal(left, 0);
  const [sum] = await dev.sql("SELECT COUNT(*) AS n, SUM(stored_bytes) AS bytes FROM reports_doopwatcher");
  const after = await limitRow("doopwatcher", 0, "total");
  assert.deepEqual(after, sum);
  assert.ok(after.n === before.n - 7);

  // No filter, no delete.
  await assert.rejects(dev.reader("delete", "doopwatcher", "--yes"), /needs at least one filter/);
  void install;
});

test("the daily job drops past days' counters and salts and keeps today's", async () => {
  const yesterday = today() - 1;
  await dev.sql(`INSERT INTO report_limits (app, day, key, n, bytes) VALUES ('surfworld', ${yesterday}, 'addr:old', 5, 5);
                 INSERT OR IGNORE INTO report_salts (day, salt) VALUES (${yesterday}, 'old')`);
  const res = await fetch(`${dev.base}/cdn-cgi/local/explorer/api/local/scheduled?worker=burstui`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cron: "5 0 * * *" }),
  });
  assert.equal(res.status, 200, await res.text());
  assert.deepEqual(await dev.sql(`SELECT key FROM report_limits WHERE day > 0 AND day < ${today()}`), []);
  assert.deepEqual(await dev.sql(`SELECT day FROM report_salts WHERE day < ${today()}`), []);
  const [{ n }] = await dev.sql(`SELECT COUNT(*) AS n FROM report_limits WHERE day = ${today()}`);
  assert.ok(n > 0, "today's counters stay");
});

// Last: these fill the total.
test("a full total evicts the oldest reports' files and stores the new report", async () => {
  await freshNetwork();
  const file = (kb) => [{ name: "shot.webp", b64: b64(fakeFile("webp", kb * 1024)) }];
  const a = await dev.post("doopwatcher", problem("doopwatcher", { files: file(100) }), { gzip: true });
  const b = await dev.post("doopwatcher", problem("doopwatcher", { files: file(100) }), { gzip: true });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  // Leave the oldest reports with files: only a and b.
  await dev.sql(`UPDATE reports_doopwatcher SET file_bytes = 0 WHERE id NOT IN ('${a.json.id}', '${b.json.id}')`);
  const total = await limitRow("doopwatcher", 0, "total");
  await dev.sql(`UPDATE report_limits SET bytes = ${200 * MB - 1000} WHERE app = 'doopwatcher' AND day = 0 AND key = 'total'`);

  const c = await dev.post("doopwatcher", problem("doopwatcher", { files: file(50) }), { gzip: true });
  assert.equal(c.status, 200, JSON.stringify(c.json));
  const rows = await dev.sql(
    `SELECT id, file_count, file_bytes, length(payload) > 0 AS has_payload FROM reports_doopwatcher WHERE id IN ('${a.json.id}', '${b.json.id}', '${c.json.id}') ORDER BY received_at`,
  );
  assert.deepEqual(
    rows.map((r) => [r.id, r.file_count, r.has_payload]),
    [[a.json.id, 0, 1], [b.json.id, 1, 1], [c.json.id, 1, 1]],
    "the oldest report keeps its row and payload but not its files; the next one is untouched",
  );
  assert.deepEqual(await dev.sql(`SELECT n FROM files_doopwatcher WHERE report_id = '${a.json.id}'`), []);
  const after = await limitRow("doopwatcher", 0, "total");
  assert.ok(after.bytes <= 200 * MB, `the total stays within the budget (${after.bytes})`);
  void total;
});

test("with no files left to evict, the oldest reports go, and a crash is still stored", async () => {
  await freshNetwork();
  await dev.sql(`UPDATE reports_doopwatcher SET file_bytes = 0`);
  const [oldest] = await dev.sql("SELECT id FROM reports_doopwatcher ORDER BY received_at, id LIMIT 1");
  await dev.sql(`UPDATE report_limits SET bytes = ${200 * MB} WHERE app = 'doopwatcher' AND day = 0 AND key = 'total'`);
  const res = await dev.post("doopwatcher", makeReport("doopwatcher"));
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.deepEqual(await dev.sql(`SELECT id FROM reports_doopwatcher WHERE id = '${oldest.id}'`), [], "the oldest report is gone");
  assert.equal((await dev.sql(`SELECT id FROM reports_doopwatcher WHERE id = '${res.json.id}'`)).length, 1);
  void randomBytes;
});

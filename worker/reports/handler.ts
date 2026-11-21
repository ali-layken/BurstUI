// POST /api/report/<app> (and its OPTIONS): docs/reports.md, "The request" / "The answer" / "Limits".
import { BadBody, gzip, readReportBody, TooLarge } from "./body";
import { type AppSlug, DAILY, isApp, KIND_LIMITS, READ_CAPS, TOTAL_BYTES } from "./contract";
import { type Counts, countedBytes, dayNumber, d1Store, type LimitKeys, type ReportRow, utcDayStart } from "./store";
import { buildNumber, Invalid, payloadOf, validateReport } from "./validate";

export interface ReportsEnv {
  /** D1 database burst-reports. Absent until the owner has created it (docs/reports.md, "Setting it up"). */
  REPORTS?: D1Database;
  /** Secret salt for the per-day address hash (wrangler secret put REPORT_SALT). */
  REPORT_SALT?: string;
}

export const REPORT_PATH = /^\/api\/report\/([^/]*)$/;

const CORS_BASE: Record<string, string> = {
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, content-encoding",
  "access-control-max-age": "86400",
  vary: "Origin",
};

/**
 * Which browsers may send. No Origin header (the game, curl): yes. Another http(s) origin, or "null" (a sandboxed
 * frame, a file: page): no, so no web page can make its visitors' browsers post reports. Any other scheme (an Overwolf
 * app's page is overwolf-extension://<its id>): yes; we do not know that id, so the rule is by scheme. The answer
 * echoes the allowed origin rather than "*". This only removes borrowed browsers: anything that is not a browser can
 * leave Origin out (docs/reports.md, "Who may send").
 */
export function originRule(request: Request): { ok: true; allow: string } | { ok: false } {
  const origin = request.headers.get("origin");
  if (origin === null) return { ok: true, allow: "*" };
  if (origin === "null") return { ok: false };
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return { ok: false };
  }
  if (url.protocol === "http:" || url.protocol === "https:") {
    return url.origin === new URL(request.url).origin ? { ok: true, allow: url.origin } : { ok: false };
  }
  return { ok: true, allow: origin };
}

function answer(status: number, body: Record<string, unknown> | null, allow: string | null, extra: Record<string, string> = {}): Response {
  const headers: Record<string, string> = { "cache-control": "no-store", ...CORS_BASE, ...extra };
  if (allow !== null) headers["access-control-allow-origin"] = allow;
  if (body !== null) headers["content-type"] = "application/json; charset=utf-8";
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

// Crockford base32, lower case: 16 characters = 80 random bits.
const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
export function newReportId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ID_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return `r_${out}`;
}

/** IPv6 addresses are limited per /64 (one home or phone usually gets a whole /64); IPv4 per address. */
export function addressKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const fill = tail === undefined ? [] : Array(Math.max(0, 8 - left.length - right.length)).fill("0");
  return [...left, ...fill, ...right].slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

/** IPv6: the /48 an address is in (null for IPv4), for the per-/48 limit. */
export function net48Key(ip: string): string | null {
  if (!ip.includes(":")) return null;
  return addressKey(ip).split(":").slice(0, 3).join(":") + "::/48";
}

async function hashKey(secret: string, daySalt: string, what: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}\n${daySalt}\n${what}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...digest.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Which refusal to answer for counts that do not let `size` more bytes in; null when nothing refuses. */
function refusal(c: Counts, kind: "crash" | "problem", size: number): [number, string] | null {
  if (c.addr.n >= DAILY.address.reports || c.addr.bytes + size > DAILY.address.bytes) return [429, "too many reports from this address today"];
  if (c.net48.n >= DAILY.net48.reports) return [429, "too many reports from this network today"];
  if (c.network.n >= DAILY.network.reports || c.network.bytes + size > DAILY.network.bytes) return [429, "too many reports from this network today"];
  if (c.install >= DAILY.install.reports) return [429, "too many reports from this install today"];
  const cap = DAILY.kind[kind];
  if (c.kind.n >= cap.reports || c.kind.bytes + size > cap.bytes) return [503, "the day's reports are used up; try again after midnight UTC"];
  return null;
}

export async function handleReport(request: Request, env: ReportsEnv, appParam: string): Promise<Response> {
  if (!isApp(appParam)) return answer(404, { ok: false, error: "no such app" }, "*");
  const app: AppSlug = appParam;

  const origin = originRule(request);
  if (!origin.ok) return answer(403, { ok: false, error: "this origin may not send reports" }, null);
  const allow = origin.allow;
  const refuse = (status: number, error: string) => answer(status, { ok: false, error }, allow);

  if (request.method === "OPTIONS") return answer(204, null, allow);
  if (request.method !== "POST") return answer(405, { ok: false, error: "use POST" }, allow, { allow: "POST, OPTIONS" });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return refuse(400, "content-type must be application/json");

  const db = env.REPORTS ? d1Store(env.REPORTS) : undefined;
  if (!db || !env.REPORT_SALT) return refuse(503, "reports are not set up yet");

  const now = Date.now();
  const day = dayNumber(now);
  const dayStart = utcDayStart(now);
  // Facts the sender cannot choose: where the request came from. The address itself is only ever hashed.
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const cf = (request as unknown as { cf?: { asn?: unknown; country?: unknown } }).cf;
  const asn = typeof cf?.asn === "number" && Number.isSafeInteger(cf.asn) ? cf.asn : null;
  const country = typeof cf?.country === "string" && /^[A-Z0-9]{2}$/.test(cf.country) ? cf.country : null;

  let keys: Omit<LimitKeys, "kind">;
  let addrHash: string;
  try {
    const salt = await db.daySalt(day);
    addrHash = await hashKey(env.REPORT_SALT, salt, `addr ${addressKey(ip)}`);
    const n48 = net48Key(ip);
    keys = {
      addr: `addr:${addrHash}`,
      net48: n48 === null ? null : `net48:${await hashKey(env.REPORT_SALT, salt, `net48 ${n48}`)}`,
      network: `asn:${asn ?? 0}`,
    };
    // The address, its /48 and its network first, before the body is read: a source that is over its count costs
    // three primary-key reads and nothing else.
    const src = await db.sources(app, day, keys);
    if (src.addr.n >= DAILY.address.reports) return refuse(429, "too many reports from this address today");
    if (src.net48.n >= DAILY.net48.reports || src.network.n >= DAILY.network.reports) return refuse(429, "too many reports from this network today");
  } catch (e) {
    console.error("report limits failed:", e instanceof Error ? e.message : String(e));
    return refuse(503, "storage failed");
  }

  let report;
  let sentBytes;
  try {
    // Read and unpack against the largest kind's caps, then hold the report to its own kind's numbers before anything
    // else is looked at: whatever is not a `problem` is held to the `crash` numbers.
    const body = await readReportBody(request, READ_CAPS.sentBytes, READ_CAPS.unpackedBytes);
    const value = body.value as { kind?: unknown } | null;
    const caps = typeof value === "object" && value !== null && value.kind === "problem" ? KIND_LIMITS.problem : KIND_LIMITS.crash;
    if (body.sentBytes > caps.sentBytes || body.unpackedBytes > caps.unpackedBytes) throw new TooLarge();
    sentBytes = body.sentBytes;
    report = validateReport(body.value, app);
  } catch (e) {
    if (e instanceof TooLarge) return refuse(413, "too large");
    if (e instanceof BadBody || e instanceof Invalid) return refuse(400, e.message);
    throw e;
  }

  try {
    const allKeys: LimitKeys = { ...keys, kind: `kind:${report.kind}` };
    const payload = await gzip(new TextEncoder().encode(JSON.stringify(payloadOf(report))));
    const row: ReportRow = {
      id: newReportId(),
      received_at: now,
      happened_at: report.when,
      build: report.build,
      build_number: buildNumber(report),
      kind: report.kind,
      signature: report.signature,
      os: report.platform.os ?? null,
      runtime: report.platform.runtime ?? null,
      install: report.install,
      session: report.session,
      note: report.note,
      log_lines: report.log.length,
      bytes: sentBytes,
      addr_hash: addrHash,
      asn,
      country,
      payload,
      files: report.files,
    };
    const size = countedBytes(row).stored;
    const q = { day, dayStart, now, install: report.install, signature: report.signature, keys: allKeys };

    // A cheap read to choose the answer; the insert checks everything again inside its own transaction.
    let counts = await db.counts(app, q);
    // A crash loop: answer as if stored, store nothing. Only for crashes: two problems a person reports in one day
    // are two reports even when the app gives them the same signature (docs/reports.md, "Server details").
    if (report.kind === "crash" && counts.duplicateOf) return answer(200, { ok: true, id: counts.duplicateOf }, allow);
    const no = refusal(counts, report.kind, size);
    if (no) return refuse(...no);

    // The total is full: make room by evicting the oldest reports' files (then the oldest reports), never by refusing.
    if (counts.total.bytes + size > TOTAL_BYTES) {
      if (size > TOTAL_BYTES) return refuse(503, "storage for this app is full");
      await db.evict(app, counts.total.bytes + size - TOTAL_BYTES);
    }

    if (await db.insert(app, row, q)) return answer(200, { ok: true, id: row.id }, allow);

    // Another request got there first (a burst): say which limit it was.
    counts = await db.counts(app, q);
    if (report.kind === "crash" && counts.duplicateOf) return answer(200, { ok: true, id: counts.duplicateOf }, allow);
    const why = refusal(counts, report.kind, size);
    return why ? refuse(...why) : refuse(503, "storage for this app is full; try again later");
  } catch (e) {
    // Never log the report itself: only that storage failed.
    console.error("report storage failed:", e instanceof Error ? e.message : String(e));
    return refuse(503, "storage failed");
  }
}

export async function purgeReports(env: ReportsEnv, now = Date.now()) {
  if (!env.REPORTS) return;
  const { deleted } = await d1Store(env.REPORTS).purge(now);
  console.log(`reports purge: ${deleted} deleted`);
}

// POST /api/report/<app> (and its OPTIONS): docs/reports.md, "The request" / "The answer" / "Limits".
import { BadBody, gzip, readReportBody, TooLarge } from "./body";
import { type AppSlug, isApp, LIMITS } from "./contract";
import { DAY_MS, d1Store, utcDayStart } from "./store";
import { buildNumber, Invalid, validateReport } from "./validate";

export interface ReportsEnv {
  /** D1 database burst-reports. Absent until the owner has created it (docs/reports.md, "Setting it up"). */
  REPORTS?: D1Database;
  /** Secret salt for the per-day address hash (wrangler secret put REPORT_SALT). */
  REPORT_SALT?: string;
}

export const REPORT_PATH = /^\/api\/report\/([^/]*)$/;

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, content-encoding",
  "access-control-max-age": "86400",
};

function answer(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS, ...extra },
  });
}
const refuse = (status: number, error: string) => answer(status, { ok: false, error });

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

async function addressHash(salt: string, day: number, ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}\n${day}\n${addressKey(ip)}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...digest.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleReport(request: Request, env: ReportsEnv, appParam: string): Promise<Response> {
  if (!isApp(appParam)) return refuse(404, "no such app");
  const app: AppSlug = appParam;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "cache-control": "no-store" } });
  if (request.method !== "POST") return answer(405, { ok: false, error: "use POST" }, { allow: "POST, OPTIONS" });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return refuse(400, "content-type must be application/json");

  let report;
  let sentBytes;
  try {
    const body = await readReportBody(request, LIMITS.sentBytes, LIMITS.unpackedBytes);
    sentBytes = body.sentBytes;
    report = validateReport(body.value, app);
  } catch (e) {
    if (e instanceof TooLarge) return refuse(413, "too large");
    if (e instanceof BadBody || e instanceof Invalid) return refuse(400, e.message);
    throw e;
  }

  const db = env.REPORTS ? d1Store(env.REPORTS) : undefined;
  if (!db || !env.REPORT_SALT) return refuse(503, "reports are not set up yet");

  const now = Date.now();
  const dayStart = utcDayStart(now);
  try {
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const addrHash = await addressHash(env.REPORT_SALT, dayStart / DAY_MS, ip);
    const counts = await db.counts(app, { install: report.install, signature: report.signature, addrHash, now, dayStart });

    // A crash loop: answer as if stored, store nothing. Only for crashes: two problems a person reports in one day
    // are two reports even when the app gives them the same signature (docs/reports.md, "Server details").
    if (report.kind === "crash" && counts.duplicateOf) return answer(200, { ok: true, id: counts.duplicateOf });
    if (counts.addressToday >= LIMITS.perAddressPerDay) return refuse(429, "too many reports from this address today");
    if (counts.installToday >= LIMITS.perInstallPerDay) return refuse(429, "too many reports from this install today");
    if (counts.appToday >= LIMITS.perAppPerDay) return refuse(503, "the day's reports are used up; try again after midnight UTC");

    const id = newReportId();
    const payload = await gzip(new TextEncoder().encode(JSON.stringify(report)));
    await db.insert(app, {
      id,
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
      payload,
    });
    return answer(200, { ok: true, id });
  } catch (e) {
    // Never log the report itself: only that storage failed.
    console.error("report storage failed:", e instanceof Error ? e.message : String(e));
    return refuse(503, "storage failed");
  }
}

export async function purgeReports(env: ReportsEnv, now = Date.now()) {
  if (!env.REPORTS) return;
  const { deleted, hashesCleared } = await d1Store(env.REPORTS).purge(now);
  console.log(`reports purge: ${deleted} deleted, ${hashesCleared} address hashes cleared`);
}

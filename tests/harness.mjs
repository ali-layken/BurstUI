// Shared set-up for tests that run against `wrangler dev --local` with a throwaway local D1 (no Cloudflare account or
// network). tests/reports.test.mjs predates this file and keeps its own copy, unchanged, as the proof that the
// version-1 behaviour the apps rely on still holds.
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "node_modules", ".bin", "wrangler");
const ENV = { ...process.env, WRANGLER_SEND_METRICS: "false", CI: process.env.CI ?? "1", NO_COLOR: "1" };
const run = promisify(execFile);

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

/** Starts wrangler dev on a fresh local D1 with every migration applied. */
export async function startDev() {
  const persist = mkdtempSync(path.join(tmpdir(), "burst-reports-test-"));
  if (!existsSync(path.join(ROOT, "dist"))) mkdirSync(path.join(ROOT, "dist"));
  await run(WRANGLER, ["d1", "migrations", "apply", "burst-reports", "--local", "--persist-to", persist], { cwd: ROOT, env: ENV });

  const port = await freePort();
  const inspector = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dev = spawn(
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

  let ipCounter = 0;
  const ctx = {
    base,
    persist,
    async sql(command) {
      const { stdout } = await run(
        WRANGLER,
        ["d1", "execute", "burst-reports", "--local", "--persist-to", persist, "--json", "--command", command],
        { cwd: ROOT, env: ENV, maxBuffer: 64 * 1024 * 1024 },
      );
      return JSON.parse(stdout.slice(stdout.indexOf("["))).flatMap((set) => set.results ?? []);
    },
    async reader(...args) {
      const { stdout } = await run(process.execPath, [path.join(ROOT, "scripts", "reports.mjs"), ...args, "--persist-to", persist], {
        cwd: ROOT,
        env: ENV,
        maxBuffer: 16 * 1024 * 1024,
      });
      return stdout;
    },
    freshIp: () => `10.1.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`,
    async post(app, body, { ip = ctx.freshIp(), gzip = false, headers = {} } = {}) {
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
    },
    /** Local dev only: after an early 413 the dev proxy may drop the next connection once; a GET absorbs that. */
    async settle() {
      for (let i = 0; i < 3; i++) {
        try {
          if ((await fetch(`${base}/api/joke`)).ok) return;
        } catch {}
      }
    },
    stop() {
      if (dev.exitCode === null) {
        try {
          process.kill(-dev.pid, "SIGTERM");
        } catch {}
      }
      rmSync(persist, { recursive: true, force: true });
    },
  };
  return ctx;
}

export const hex = (n) => randomBytes(n).toString("hex");

export function makeReport(app, over = {}) {
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
    context: { area: "tower", online: false },
    note: "",
    log: [{ t: 81234, lvl: "info", src: "net", msg: "joined", data: { players: 2 } }],
    ...over,
  };
}

/** Bytes that start like a file of the given type and are otherwise random (so they do not compress). */
export function fakeFile(type, size) {
  const magic = {
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    webp: [..."RIFF"].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBP"].map((c) => c.charCodeAt(0))),
    gif: [..."GIF89a"].map((c) => c.charCodeAt(0)),
    swr: [..."SWR1"].map((c) => c.charCodeAt(0)),
  }[type];
  const b = randomBytes(size);
  b.set(magic);
  return b;
}

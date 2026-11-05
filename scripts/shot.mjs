#!/usr/bin/env node
// Screenshot pages of a running BurstUI server - for eyeballing prototype changes, not a test suite.
//
//   npm run shot -- / /blog/Learning_C++_Through_Example:_Projection_Mapping
//   npm run shot -- /cube --viewport ultrawide,mobile --wait 3000 --full
//
// Uses the running `astro dev` server (starting one if needed); pass --base http://localhost:8787 to shoot
// `npm run preview` (wrangler, so real _headers / Worker routes) instead. Shots land in .shots/ (gitignored) as <path>@<viewport>.png; console errors and failed requests are printed so
// a broken island shows up even when the picture looks fine.
//
// Options:
//   --base <url>        server origin (default: the astro dev server)
//   --viewport <list>   comma list of names below or WxH (default desktop)
//   --wait <ms>         extra settle time after load, for three.js scenes / animations (default 3000)
//   --full              full-page screenshot instead of just the viewport
//   --selector <css>    screenshot only this element
//   --dark | --light    force prefers-color-scheme
//   --out <dir>         output directory (default .shots)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

const VIEWPORTS = {
  ultrawide: { width: 3440, height: 1440 }, // DP-3, top monitor
  desktop: { width: 2560, height: 1440 }, // DP-2, bottom monitor
  laptop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: "string" },
    viewport: { type: "string", default: "desktop" },
    wait: { type: "string", default: "3000" },
    full: { type: "boolean", default: false },
    selector: { type: "string" },
    dark: { type: "boolean", default: false },
    light: { type: "boolean", default: false },
    out: { type: "string", default: ".shots" },
  },
});

const paths = positionals.length ? positionals : ["/"];
const viewports = opts.viewport.split(",").map((name) => {
  const m = name.match(/^(\d+)x(\d+)$/);
  if (m) return { name, width: +m[1], height: +m[2] };
  if (!VIEWPORTS[name]) throw new Error(`unknown viewport "${name}" (known: ${Object.keys(VIEWPORTS).join(", ")}, or WxH)`);
  return { name, ...VIEWPORTS[name] };
});

// No --base: reuse the background dev server Astro 7 keeps (whatever port it landed on), or start one.
if (!opts.base) {
  const devUrl = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).match(/running at (http:\/\/\S+?)[\s(\\]/)?.[1];
  opts.base = devUrl("npx astro dev status");
  if (!opts.base) {
    console.log("no dev server running - starting one (npm run dev)");
    opts.base = devUrl("npm run dev");
  }
  if (!opts.base) throw new Error("couldn't find or start the dev server; pass --base");
}

await mkdir(opts.out, { recursive: true });

// Render on the real GPU (ANGLE/Vulkan), like a normal browser: SwiftShader's software compositor leaves stale holes
// in the ocean canvas under the /snake iframe and drops the Burst! text at 2560 wide. Without a usable GPU Chrome
// falls back to SwiftShader on its own (--enable-unsafe-swiftshader keeps WebGL working there).
const browser = await chromium.launch({
  args: ["--use-angle=vulkan", "--enable-features=Vulkan", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
let failures = 0;

for (const vp of viewports) {
  const { name, ...viewportOpts } = vp;
  const { width, height, ...rest } = viewportOpts;
  const context = await browser.newContext({
    viewport: { width, height },
    ...rest,
    colorScheme: opts.dark ? "dark" : opts.light ? "light" : undefined,
  });

  for (const p of paths) {
    const page = await context.newPage();
    const problems = [];
    page.on("console", (msg) => msg.type() === "error" && problems.push(`console: ${msg.text()}`));
    page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
    page.on("requestfailed", (req) => {
      // <video>/<audio> abort their own range requests once they've buffered enough - not a real failure.
      if (req.resourceType() === "media" && req.failure()?.errorText === "net::ERR_ABORTED") return;
      problems.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`);
    });
    page.on("response", (res) => res.status() >= 400 && problems.push(`HTTP ${res.status()}: ${res.url()}`));

    const url = new URL(p, opts.base).href;
    const res = await page.goto(url, { waitUntil: "load" }).catch((e) => (problems.push(`goto: ${e.message}`), null));
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(Number(opts.wait));
    // Astro's dev toolbar floats over the bottom of every page under `astro dev`.
    await page.addStyleTag({ content: "astro-dev-toolbar { display: none !important; }" }).catch(() => {});

    const slug = decodeURIComponent(p).replace(/^\/+|\/+$/g, "").replace(/[^\w.-]+/g, "_") || "index";
    const file = path.join(opts.out, `${slug}@${name}.png`);
    const target = opts.selector ? page.locator(opts.selector).first() : page;
    await target.screenshot({ path: file, ...(opts.selector ? {} : { fullPage: opts.full }) });

    console.log(`${res?.status() ?? "ERR"} ${url} [${name}] -> ${file}`);
    for (const line of problems) console.log(`  ! ${line}`);
    if (problems.length || !res?.ok()) failures++;
    await page.close();
  }
  await context.close();
}

await browser.close();
process.exitCode = failures ? 1 : 0;

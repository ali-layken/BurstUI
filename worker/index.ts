// The only server-side code. wrangler.jsonc routes just the paths in run_worker_first here; every other request is
// answered straight from the static asset bundle without invoking this Worker at all.
//
// Jobs:
//   1. /api/joke - the old Fresh API route (joke.ts).
//   2. /snake/index.wasm - too big for static assets, streamed from GitHub (large.ts).
//   3. /api/report/<app> - crash and problem reports from Surf World and DoopWatcher (reports/, docs/reports.md),
//      plus a daily scheduled job that deletes reports after 90 days.
import { joke } from "./joke";
import { LARGE_FILES, serveLarge } from "./large";
import { handleReport, purgeReports, REPORT_PATH, type ReportsEnv } from "./reports/handler";

interface Env extends ReportsEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/joke") return joke();

    const report = REPORT_PATH.exec(url.pathname);
    if (report) return handleReport(request, env, report[1]);

    if (url.pathname in LARGE_FILES && (request.method === "GET" || request.method === "HEAD")) {
      return serveLarge(request, ctx, url.pathname);
    }

    // Anything else we were handed: fall through to the asset layer so the
    // normal 404 page is served.
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeReports(env));
  },
} satisfies ExportedHandler<Env>;

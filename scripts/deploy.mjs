#!/usr/bin/env node
// `wrangler deploy`, except while wrangler.jsonc still holds the placeholder D1 id (before the owner has created the
// burst-reports database, docs/reports.md "Setting it up"): then it deploys a copy of the config without the
// <reports-d1> block, because Cloudflare refuses a Worker bound to a database that does not exist, and that would
// fail every deploy of the site. Without the binding /api/report/* answers 503 and everything else works as before.
//
//   node scripts/deploy.mjs [extra wrangler deploy flags]       (CI and `npm run deploy` run this)
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
const STRIPPED = "wrangler.no-reports.jsonc"; // gitignored; same folder so relative paths in it still resolve

const config = readFileSync("wrangler.jsonc", "utf8");
const args = ["wrangler", "deploy", ...process.argv.slice(2)];

if (config.includes(PLACEHOLDER)) {
  const stripped = config.replace(/^[ \t]*\/\/ <reports-d1>\n[\s\S]*?^[ \t]*\/\/ <\/reports-d1>\n/m, "");
  if (stripped === config || stripped.includes(PLACEHOLDER)) {
    console.error("scripts/deploy.mjs: wrangler.jsonc has the placeholder D1 id but no <reports-d1> ... </reports-d1> block to drop");
    process.exit(1);
  }
  writeFileSync(STRIPPED, stripped);
  args.push("--config", STRIPPED);
  console.warn("::warning::burst-reports D1 database not set up yet (placeholder id): deploying without the REPORTS binding; /api/report/* will answer 503.");
}

const run = spawnSync("npx", args, { stdio: "inherit" });
process.exit(run.status ?? 1);

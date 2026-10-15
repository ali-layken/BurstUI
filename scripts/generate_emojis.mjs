// Fetches GitHub's full emoji-name -> image-URL map and writes it to
// allemojislist.json at the repo root, as real, strictly-quoted JSON.
//
// GitHub's emoji endpoint only ever returns the WHOLE list in one call -
// there's no per-emoji lookup - which is exactly why this fetches it ONCE,
// offline, and commits the result as a static file instead of calling the
// API at build time. (The old Fresh site once did that at boot and a single
// 504 from GitHub took every route down - see git history for 2026-09-14.)
//
// src/lib/BlogRendererSS.tsx imports allemojislist.json at build time.
//
// Run manually via `npm run update-emojis`, or automatically on every merge
// to main - see .github/workflows/update-emojis.yml.

import { writeFile } from "node:fs/promises";

const OUTPUT_FILE = new URL("../allemojislist.json", import.meta.url);

const res = await fetch("https://api.github.com/emojis", {
  headers: {
    accept: "application/vnd.github+json",
    "user-agent": "BurstUI emoji snapshot (https://github.com/ali-layken/BurstUI)",
  },
});
if (!res.ok) {
  throw new Error(`GitHub emoji API returned ${res.status} ${res.statusText}`);
}
const data = await res.json();

// Sorted so a real content change is the only thing that shows up in a
// diff - the API doesn't document a stable key order.
const sorted = Object.fromEntries(
  Object.entries(data).sort(([a], [b]) => a.localeCompare(b)),
);

await writeFile(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + "\n");
console.log(`✔ Wrote ${Object.keys(sorted).length} emojis to allemojislist.json`);

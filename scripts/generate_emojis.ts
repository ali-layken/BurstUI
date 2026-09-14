// Fetches GitHub's full emoji-name -> image-URL map via Octokit and writes
// it to allemojislist.json at the repo root, as real, strictly-quoted JSON.
//
// GitHub's own emoji endpoint (what octokit.rest.emojis.get() calls) only
// ever returns the WHOLE list in one call - there's no per-emoji lookup
// endpoint, so "fetch just what we need, when we need it" isn't something
// the API offers. The whole list is the only unit you can fetch, which is
// exactly why this fetches it ONCE, offline, and commits the result as a
// static file instead of calling the API at request/boot time.
//
// components/BlogRendererSS.tsx reads allemojislist.json directly at module
// load instead of calling octokit.rest.emojis.get() itself - a live,
// unauthenticated GitHub API call sitting in a top-level await was exactly
// what took the whole app down on 2026-09-14 (a 504 from GitHub during boot
// crashed isolate startup for EVERY route, not just blog pages, since Fresh
// has to load the full route manifest - including that module - before it
// can serve anything at all).
//
// Run manually via `deno task update-emojis`, or automatically on every
// merge to main - see .github/workflows/update-emojis.yml, which runs this
// script and commits allemojislist.json if it changed.

import { Octokit } from "@octokit/rest";

const OUTPUT_FILE = new URL("../allemojislist.json", import.meta.url);

async function main() {
  const octokit = new Octokit();
  const res = await octokit.rest.emojis.get();

  // Sorted so a real content change (GitHub actually adding/removing an
  // emoji) is the only thing that shows up in a diff - the API doesn't
  // document a stable key order, so without this, re-running the script
  // with zero real changes could still produce a full-file diff purely
  // from key reordering.
  const sorted = Object.fromEntries(
    Object.entries(res.data).sort(([a], [b]) => a.localeCompare(b)),
  );

  await Deno.writeTextFile(OUTPUT_FILE, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(sorted).length} emoji entries to allemojislist.json`);
}

if (import.meta.main) {
  await main();
}

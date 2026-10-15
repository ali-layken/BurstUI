// Regenerates timestamps.json from the filesystem. Keys look like
// "posts/<filename>.md" (no "./"). Git checkouts don't preserve birthtime,
// so this is only meaningful on the machine where the posts were written;
// timestamps.json is committed and read at build time by src/lib/posts.ts.

import { readdir, stat, writeFile } from "node:fs/promises";

const POSTS_DIR = "posts";
const OUTPUT_FILE = "timestamps.json";

const result = {};
for (const name of (await readdir(POSTS_DIR)).sort()) {
  if (!name.endsWith(".md")) continue;
  const repoPath = `${POSTS_DIR}/${name}`;
  const s = await stat(repoPath);
  // birthtime can be the epoch on some filesystems; fall back to ctime/mtime
  const birth = s.birthtimeMs > 0 ? s.birthtime : s.ctime ?? s.mtime;
  result[repoPath] = {
    birthtime: birth.toISOString(),
    mtime: (s.mtime ?? birth).toISOString(),
  };
}

await writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n");
console.log(`✔ Wrote ${Object.keys(result).length} entries to ${OUTPUT_FILE}`);

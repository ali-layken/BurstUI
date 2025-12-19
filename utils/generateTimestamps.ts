// scripts/generate_timestamps.ts
// Outputs keys like: "posts/<filename>.md" (no "./")

const POSTS_DIR = "posts"; // repo folder
const OUTPUT_FILE = "timestamps.json";

type TimestampEntry = {
  birthtime: string;
  mtime: string;
};

function pickBirth(stat: Deno.FileInfo): Date {
  // birthtime can be null on some FS; fall back to ctime/mtime
  return stat.birthtime ?? stat.ctime ?? stat.mtime ?? new Date(0);
}

async function main() {
  const result: Record<string, TimestampEntry> = {};

  for await (const entry of Deno.readDir(POSTS_DIR)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;

    const repoPath = `${POSTS_DIR}/${entry.name}`; // "posts/whatever.md"
    const stat = await Deno.stat(repoPath);

    const birth = pickBirth(stat);
    const mtime = stat.mtime ?? birth;

    result[repoPath] = {
      birthtime: birth.toISOString(),
      mtime: mtime.toISOString(),
    };
  }

  await Deno.writeTextFile(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n");
  console.log(`✔ Wrote ${Object.keys(result).length} entries to ${OUTPUT_FILE}`);
}

if (import.meta.main) {
  await main();
}

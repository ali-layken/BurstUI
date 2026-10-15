// Build-time access to the posts/ folder. This runs inside `astro build`
// (Node), never at request time - the output is plain HTML.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import timestamps from "../../timestamps.json";

const ROOT = process.cwd();
const POSTS_DIR = join(ROOT, "posts");

export interface PostMeta {
  /** Filename without .md, exactly as it appears in the URL. */
  slug: string;
  /** Part before the first ":" with underscores as spaces. */
  name: string;
  /** Part after the first ":" with underscores as spaces, if any. */
  subtitle?: string;
  createdAt: Date;
  modifiedAt: Date;
  /** Filenames starting with "_" are routable but hidden from the index. */
  draft: boolean;
}

type TimestampMap = Record<string, { birthtime: string; mtime: string }>;

function metaFor(filename: string): PostMeta {
  const slug = filename.slice(0, -3);
  const stamp = (timestamps as TimestampMap)[`posts/${filename}`];
  const title = slug.replace(/_/g, " ");
  const [name, subtitle] = title.split(":");
  return {
    slug,
    name,
    subtitle,
    createdAt: new Date(stamp?.birthtime ?? 0),
    modifiedAt: new Date(stamp?.mtime ?? stamp?.birthtime ?? 0),
    draft: filename.startsWith("_"),
  };
}

export async function listPosts(): Promise<PostMeta[]> {
  const entries = await readdir(POSTS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => metaFor(e.name))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function readPost(slug: string): Promise<{ meta: PostMeta; content: string }> {
  const content = await readFile(join(POSTS_DIR, `${slug}.md`), "utf8");
  return { meta: metaFor(`${slug}.md`), content };
}
